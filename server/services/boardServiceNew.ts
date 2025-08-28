/**
 * 🏢 BOARD SERVICE - Gerenciamento de Boards
 * 
 * Responsabilidades:
 * - CRUD completo de boards com validação
 * - Lógica de negócio (permissões, compartilhamento, etc)
 * - Cache inteligente
 * - Emissão de eventos
 * 
 * Arquitetura: Interface pública única para persistência de boards
 */

import { BaseService, createSuccessResponse, createErrorResponse, PaginatedResponse, PaginationOptions } from "./baseService";
import type { AuthContext } from "../microservices/authService";
import type { Board, InsertBoard, UpdateBoard } from "@shared/schema";
import { insertBoardSchema, updateBoardSchema } from "@shared/schema";
import { TTL } from "../cache";

export interface BoardCreateRequest {
  name: string;
  description?: string;
  color?: string;
  createDefaultColumns?: boolean;
}

export interface BoardUpdateRequest {
  name?: string;
  description?: string;
  color?: string;
  settings?: any;
}

export interface BoardWithStats extends Board {
  taskCount: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  columns: Array<{
    id: string;
    title: string;
    color: string;
    position: number;
    wipLimit: number;
    taskCount: number;
  }>;
  activeMembers: Array<{
    id: string;
    name: string;
    avatar: string;
    role: string;
  }>;
  metrics: {
    avgTaskCompletion: number;
    cycleTime: number;
    throughput: number;
    lastActivity: Date;
  };
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canManageMembers: boolean;
  };
}

export class BoardService extends BaseService {

  /**
   * Listar todos os boards com estatísticas
   */
  async getBoards(authContext: AuthContext, options: PaginationOptions = {}): Promise<BoardWithStats[]> {
    this.log('board-service', 'getBoards', { userId: authContext.userId, options });
    
    try {
      // Verificar permissão básica - ajustando para permitir acesso aos próprios boards
      if (!this.hasPermission(authContext, 'Listar Boards') && !this.hasPermission(authContext, 'Visualizar Boards')) {
        // Se não tem permissão geral, só pode ver os próprios boards - isso será filtrado mais tarde
        console.log('⚠️ [BOARD-SERVICE] Usuário sem permissão geral, filtrando apenas próprios boards');
      }

      const { page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      // TEMPORARIAMENTE DESABILITAR CACHE para debug
      // const cacheKey = `boards:user:${authContext.userId}:${page}:${limit}`;
      // const cached = await this.cache.get<BoardWithStats[]>(cacheKey);
      // if (cached) {
      //   this.log('board-service', 'cache hit', { cacheKey });
      //   return cached;
      // }
      
      console.log('💫 [BOARD-SERVICE] Cache desabilitado para debug - forçando busca nova');

      // 🔒 SECURITY FIX: Usuários só veem boards próprios ou compartilhados
      // Independente das permissões gerais, aplicar controle de acesso por usuário
      console.log('🔒 [BOARD-SERVICE] Aplicando controle de acesso - usuário só vê boards próprios ou compartilhados');
      
      // TEMP: Invalidar cache específico para debug
      await this.cache.del(`boards_user_access:${authContext.userId}:${limit}:${offset}`);
      console.log(`🔧 [DEBUG] Cache invalidado para usuário ${authContext.userId}`);
      
      const boards = await this.storage.getBoardsForUser(authContext.userId, limit, offset);
      
      // Enriquecer com estatísticas e permissões de forma defensiva
      const enrichedBoards: BoardWithStats[] = [];
      
      for (const board of boards) {
        try {
          console.log(`🔍 [BOARD-SERVICE] Processando board: ${board.id} - ${board.name}`);
          
          // Calcular estatísticas (com fallback)
          let stats;
          try {
            stats = await this.calculateBoardStats(board.id);
            console.log(`✅ [BOARD-SERVICE] Stats calculadas para ${board.id}:`, stats);
          } catch (error) {
            console.error(`❌ [BOARD-SERVICE] Erro calculando stats para ${board.id}:`, error);
            stats = { taskCount: 0, completedTasks: 0, inProgressTasks: 0, pendingTasks: 0 };
          }
          
          // Verificar permissões específicas (com fallback)
          let permissions;
          try {
            permissions = await this.calculateBoardPermissions(authContext, board.id);
            console.log(`✅ [BOARD-SERVICE] Permissões calculadas para ${board.id}:`, permissions);
          } catch (error) {
            console.error(`❌ [BOARD-SERVICE] Erro calculando permissões para ${board.id}:`, error);
            permissions = { canEdit: false, canDelete: false, canManageMembers: false };
          }
          
          // Buscar membros ativos (com fallback)
          let members: Array<{
            id: string;
            name: string;
            avatar: string;
            role: string;
          }>;
          try {
            members = await this.getBoardMembers(board.id);
            console.log(`✅ [BOARD-SERVICE] Membros encontrados para ${board.id}:`, members.length);
          } catch (error) {
            console.error(`❌ [BOARD-SERVICE] Erro buscando membros para ${board.id}:`, error);
            members = [];
          }
          
          // Buscar colunas (com fallback)
          let columns: Array<{
            id: string;
            title: string;
            color: string;
            position: number;
            wipLimit: number;
            taskCount: number;
          }>;
          try {
            columns = await this.getBoardColumns(board.id);
            console.log(`✅ [BOARD-SERVICE] Colunas encontradas para ${board.id}:`, columns.length);
          } catch (error) {
            console.error(`❌ [BOARD-SERVICE] Erro buscando colunas para ${board.id}:`, error);
            columns = [];
          }

          const enrichedBoard: BoardWithStats = {
            ...board,
            ...stats,
            columns,
            activeMembers: members,
            permissions,
            metrics: {
              avgTaskCompletion: stats.completedTasks / Math.max(stats.taskCount, 1) * 100,
              cycleTime: 0, // Será calculado quando implementado
              throughput: 0, // Será calculado quando implementado
              lastActivity: board.updatedAt || board.createdAt || new Date(),
            }
          };
          
          enrichedBoards.push(enrichedBoard);
          console.log(`✅ [BOARD-SERVICE] Board ${board.id} processado com sucesso`);
          
        } catch (boardError) {
          console.error(`❌ [BOARD-SERVICE] Erro processando board ${board.id}:`, boardError);
          // Continua processamento dos outros boards
        }
      }

      // Cache temporariamente desabilitado para debug
      // await this.cache.set(cacheKey, enrichedBoards, TTL.SHORT);
      
      this.log('board-service', 'boards retrieved', { count: enrichedBoards.length });
      return enrichedBoards;

    } catch (error) {
      this.logError('board-service', 'getBoards', error);
      throw error;
    }
  }

  /**
   * Obter um board específico por ID
   */
  async getBoard(authContext: AuthContext, boardId: string): Promise<BoardWithStats | null> {
    this.log('board-service', 'getBoard', { userId: authContext.userId, boardId });
    
    try {
      this.requirePermission(authContext, 'Visualizar Boards', 'visualizar board');

      // Tentar cache primeiro
      const cacheKey = `board:${boardId}:full`;
      const cached = await this.cache.get<BoardWithStats>(cacheKey);
      if (cached) {
        return cached;
      }

      // Buscar board básico
      const board = await this.storage.getBoard(boardId);
      if (!board) {
        return null;
      }

      // Verificar se usuário tem acesso a este board
      const hasAccess = await this.checkBoardAccess(authContext.userId, boardId);
      if (!hasAccess) {
        throw new Error('Acesso negado ao board solicitado');
      }

      // Enriquecer com dados completos
      const [stats, permissions, members, columns] = await Promise.all([
        this.calculateBoardStats(boardId),
        this.calculateBoardPermissions(authContext, boardId),
        this.getBoardMembers(boardId),
        this.getBoardColumns(boardId),
      ]);

      const enrichedBoard: BoardWithStats = {
        ...board,
        ...stats,
        columns,
        activeMembers: members,
        permissions,
        metrics: {
          avgTaskCompletion: stats.completedTasks / Math.max(stats.taskCount, 1) * 100,
          cycleTime: 0,
          throughput: 0,
          lastActivity: board.updatedAt || board.createdAt || new Date(),
        }
      };

      // Cache por 5 minutos
      await this.cache.set(cacheKey, enrichedBoard, TTL.MEDIUM);
      
      return enrichedBoard;

    } catch (error) {
      this.logError('board-service', 'getBoard', error);
      throw error;
    }
  }

  /**
   * Criar novo board
   */
  async createBoard(authContext: AuthContext, request: BoardCreateRequest): Promise<Board> {
    this.log('board-service', 'createBoard', { userId: authContext.userId, name: request.name });
    
    try {
      this.requirePermission(authContext, 'Criar Boards', 'criar boards');

      // Validar dados
      const validData = insertBoardSchema.parse({
        name: request.name,
        description: request.description || '',
        color: request.color || '#3B82F6',
        createdById: authContext.userId,
      });

      // Criar board via DAO
      const board = await this.storage.createBoard(validData);
      
      // Inicializar com colunas padrão se solicitado
      if (request.createDefaultColumns !== false) {
        await this.storage.initializeBoardWithDefaults(board.id);
      }

      // Invalidar caches
      await this.invalidateCache([
        `boards:user:${authContext.userId}:*`,
        'boards:all',
        'boards_count*'
      ]);

      // Emitir evento
      this.emitEvent('board.created', {
        boardId: board.id,
        userId: authContext.userId,
        boardName: board.name,
      });

      this.log('board-service', 'board created successfully', { boardId: board.id });
      return board;

    } catch (error) {
      this.logError('board-service', 'createBoard', error);
      throw error;
    }
  }

  /**
   * Atualizar board existente
   */
  async updateBoard(authContext: AuthContext, boardId: string, request: BoardUpdateRequest): Promise<Board> {
    this.log('board-service', 'updateBoard', { userId: authContext.userId, boardId });
    
    try {
      this.requirePermission(authContext, 'Editar Boards', 'editar boards');

      // Verificar se board existe e usuário tem acesso
      const existingBoard = await this.storage.getBoard(boardId);
      if (!existingBoard) {
        throw new Error('Board não encontrado');
      }

      const hasAccess = await this.checkBoardAccess(authContext.userId, boardId);
      if (!hasAccess) {
        throw new Error('Acesso negado ao board');
      }

      // Validar dados de atualização
      const validData = updateBoardSchema.parse(request);
      
      // Atualizar via DAO
      const updatedBoard = await this.storage.updateBoard(boardId, validData);

      // Invalidar caches
      await this.invalidateCache([
        `board:${boardId}:*`,
        `boards:user:${authContext.userId}:*`,
        'boards:all'
      ]);

      // Emitir evento
      this.emitEvent('board.updated', {
        boardId,
        userId: authContext.userId,
        changes: validData,
      });

      this.log('board-service', 'board updated successfully', { boardId });
      return updatedBoard;

    } catch (error) {
      this.logError('board-service', 'updateBoard', error);
      throw error;
    }
  }

  /**
   * Excluir board
   */
  async deleteBoard(authContext: AuthContext, boardId: string): Promise<void> {
    this.log('board-service', 'deleteBoard', { userId: authContext.userId, boardId });
    
    try {
      this.requirePermission(authContext, 'Excluir Boards', 'excluir boards');

      // Verificar se board existe
      const board = await this.storage.getBoard(boardId);
      if (!board) {
        throw new Error('Board não encontrado');
      }

      // Verificar acesso
      const hasAccess = await this.checkBoardAccess(authContext.userId, boardId);
      if (!hasAccess) {
        throw new Error('Acesso negado ao board');
      }

      // Excluir via DAO
      await this.storage.deleteBoard(boardId);

      // Invalidar todos os caches relacionados
      await this.invalidateCache([
        `board:${boardId}:*`,
        `boards:user:${authContext.userId}:*`,
        'boards:all',
        'boards_count*',
        `board_tasks:${boardId}*`
      ]);

      // Emitir evento
      this.emitEvent('board.deleted', {
        boardId,
        userId: authContext.userId,
        boardName: board.name,
      });

      this.log('board-service', 'board deleted successfully', { boardId });

    } catch (error) {
      this.logError('board-service', 'deleteBoard', error);
      throw error;
    }
  }

  // === MÉTODOS PRIVADOS DE APOIO ===

  private async calculateBoardStats(boardId: string) {
    try {
      // Buscar tasks do board para calcular estatísticas
      const tasks = await this.storage.getBoardTasks(boardId);
      
      const taskCount = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'done' || t.status === 'completed').length;
      const inProgressTasks = tasks.filter(t => t.status === 'in-progress' || t.status === 'doing').length;
      const pendingTasks = tasks.filter(t => t.status === 'todo' || t.status === 'backlog').length;

      return {
        taskCount,
        completedTasks,
        inProgressTasks,
        pendingTasks,
      };
    } catch (error) {
      console.error('Erro calculando estatísticas do board:', error);
      return {
        taskCount: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        pendingTasks: 0,
      };
    }
  }

  private async calculateBoardPermissions(authContext: AuthContext, boardId: string) {
    // Lógica para calcular permissões específicas do board
    // Por enquanto, retorna baseado nas permissões gerais do usuário
    return {
      canEdit: this.hasPermission(authContext, 'Editar Boards'),
      canDelete: this.hasPermission(authContext, 'Excluir Boards'),
      canManageMembers: this.hasPermission(authContext, 'Gerenciar Times'),
    };
  }

  private async getBoardMembers(boardId: string) {
    try {
      // Buscar membros através do DAO
      const shares = await this.storage.getBoardShares(boardId);
      
      // Converter para formato esperado
      return shares.map(share => ({
        id: share.shareWithId || '',
        name: 'User', // Será buscado depois se necessário
        avatar: '',
        role: share.permission || 'member',
      }));
    } catch (error) {
      console.error('Erro buscando membros do board:', error);
      return [];
    }
  }

  private async getBoardColumns(boardId: string) {
    try {
      const columns = await this.storage.getBoardColumns(boardId);
      
      return columns.map(col => ({
        id: col.id,
        title: col.title,
        color: col.color || '#gray',
        position: col.position,
        wipLimit: col.wipLimit || 0,
        taskCount: 0, // Será calculado se necessário
      }));
    } catch (error) {
      console.error('Erro buscando colunas do board:', error);
      return [];
    }
  }

  private async checkBoardAccess(userId: string, boardId: string): Promise<boolean> {
    try {
      // Verificar se usuário é criador ou tem compartilhamento
      const board = await this.storage.getBoard(boardId);
      if (board?.createdById === userId) {
        return true;
      }

      const shares = await this.storage.getBoardShares(boardId);
      return shares.some(share => share.shareWithId === userId);
    } catch (error) {
      console.error('Erro verificando acesso ao board:', error);
      return false;
    }
  }
}

// Export singleton instance
export const boardService = new BoardService();