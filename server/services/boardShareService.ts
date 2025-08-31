/**
 * 🔗 BOARD SHARE SERVICE - Gerenciamento de Compartilhamento de Boards
 * 
 * Responsabilidades:
 * - CRUD completo de compartilhamentos
 * - Lógica de negócio (permissões, acessos)
 * - Cache inteligente para performance
 * - Emissão de eventos de domínio
 */

import { BaseService, createSuccessResponse, createErrorResponse, PaginatedResponse, PaginationOptions } from "./baseService";
import type { AuthContext } from "../auth/unifiedAuth";
import type { BoardShare, InsertBoardShare, UpdateBoardShare, User } from "@shared/schema";
import { insertBoardShareSchema, updateBoardShareSchema } from "@shared/schema";
import { TTL } from "../../cache";
import { PERMISSIONS } from "../config/permissions";

export interface BoardShareCreateRequest {
  boardId: string;
  shareType: 'user' | 'team';
  shareWithId: string;
  permission: 'view' | 'edit' | 'admin';
  sharedByUserId: string;
}

export class BoardShareService extends BaseService {

  async getBoardShares(authContext: AuthContext, boardId: string): Promise<BoardShare[]> {
    this.log('board-share-service', 'getBoardShares', { userId: authContext.userId, boardId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.BOARDS.VIEW, 'visualizar compartilhamentos');

      const shares = await this.storage.getBoardShares(boardId);
      return shares;
    } catch (error) {
      this.logError('board-share-service', 'getBoardShares', error);
      throw error;
    }
  }

  async getBoardMembers(authContext: AuthContext, boardId: string): Promise<User[]> {
    this.log('board-share-service', 'getBoardMembers', { userId: authContext.userId, boardId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.BOARDS.VIEW, 'visualizar membros do board');

      const members = await this.storage.getBoardMembers(boardId);
      return members;
    } catch (error) {
      this.logError('board-share-service', 'getBoardMembers', error);
      throw error;
    }
  }

  async getBoardMemberCount(authContext: AuthContext, boardId: string): Promise<number> {
    this.log('board-share-service', 'getBoardMemberCount', { userId: authContext.userId, boardId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.BOARDS.VIEW, 'contar membros do board');

      const count = await this.storage.getBoardMemberCount(boardId);
      return count;
    } catch (error) {
      this.logError('board-share-service', 'getBoardMemberCount', error);
      throw error;
    }
  }

  async getAllBoardShares(authContext: AuthContext): Promise<BoardShare[]> {
    this.log('board-share-service', 'getAllBoardShares', { userId: authContext.userId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.BOARDS.LIST, 'listar todos os compartilhamentos');

      const shares = await this.storage.getAllBoardShares();
      return shares;
    } catch (error) {
      this.logError('board-share-service', 'getAllBoardShares', error);
      throw error;
    }
  }

  async getUserSharedBoards(authContext: AuthContext, userId: string): Promise<BoardShare[]> {
    this.log('board-share-service', 'getUserSharedBoards', { userId: authContext.userId, targetUserId: userId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.BOARDS.VIEW, 'view shared boards');

      const shares = await this.storage.getUserSharedBoards(userId);
      return shares;
    } catch (error) {
      this.logError('board-share-service', 'getUserSharedBoards', error);
      throw error;
    }
  }

  async getTeamSharedBoards(authContext: AuthContext, teamId: string): Promise<BoardShare[]> {
    this.log('board-share-service', 'getTeamSharedBoards', { userId: authContext.userId, teamId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TEAMS.VIEW, 'view team boards');

      const shares = await this.storage.getTeamSharedBoards(teamId);
      return shares;
    } catch (error) {
      this.logError('board-share-service', 'getTeamSharedBoards', error);
      throw error;
    }
  }

  async createBoardShare(authContext: AuthContext, request: BoardShareCreateRequest): Promise<BoardShare> {
    this.log('board-share-service', 'createBoardShare', { userId: authContext.userId, boardId: request.boardId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.BOARDS.EDIT, 'share board');

      const validData = insertBoardShareSchema.parse(request);
      const share = await this.storage.createBoardShare(validData);

      // Event will be added to registry later if needed

      return share;
    } catch (error) {
      this.logError('board-share-service', 'createBoardShare', error);
      throw error;
    }
  }

  async updateBoardShare(authContext: AuthContext, shareId: string, request: Partial<BoardShareCreateRequest>): Promise<BoardShare> {
    this.log('board-share-service', 'updateBoardShare', { userId: authContext.userId, shareId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.BOARDS.EDIT, 'edit board share');

      const validData = updateBoardShareSchema.parse(request);
      const share = await this.storage.updateBoardShare(shareId, validData);

      // Event will be added to registry later if needed

      return share;
    } catch (error) {
      this.logError('board-share-service', 'updateBoardShare', error);
      throw error;
    }
  }

  async deleteBoardShare(authContext: AuthContext, shareId: string): Promise<void> {
    this.log('board-share-service', 'deleteBoardShare', { userId: authContext.userId, shareId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.BOARDS.EDIT, 'delete board share');

      await this.storage.deleteBoardShare(shareId);

      // Event will be added to registry later if needed

    } catch (error) {
      this.logError('board-share-service', 'deleteBoardShare', error);
      throw error;
    }
  }

  async getUserBoardPermission(authContext: AuthContext, userId: string, boardId: string): Promise<string | null> {
    this.log('board-share-service', 'getUserBoardPermission', { userId: authContext.userId, targetUserId: userId, boardId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.BOARDS.VIEW, 'verificar permissão do board');

      const permission = await this.storage.getUserBoardPermission(userId, boardId);
      return permission;
    } catch (error) {
      this.logError('board-share-service', 'getUserBoardPermission', error);
      throw error;
    }
  }
}

export const boardShareService = new BoardShareService();