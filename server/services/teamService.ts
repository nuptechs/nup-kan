/**
 * 👥 TEAM SERVICE - Gerenciamento de Times
 * 
 * Responsabilidades:
 * - CRUD completo de times com validação
 * - Lógica de negócio (membros, roles, permissões)
 * - Cache inteligente para performance
 * - Emissão de eventos de domínio
 * 
 * Arquitetura: Interface pública única para persistência de times
 */

import { BaseService, createSuccessResponse, createErrorResponse, PaginatedResponse, PaginationOptions } from "./baseService";
import type { AuthContext } from "../auth/unifiedAuth";
import type { Team, InsertTeam, UpdateTeam, UserTeam, InsertUserTeam } from "@shared/schema";
import { insertTeamSchema, updateTeamSchema } from "@shared/schema";
import { TTL } from "../cache";
import { PERMISSIONS } from "../config/permissions";

export interface TeamCreateRequest {
  name: string;
  description?: string;
  settings?: any;
}

export interface TeamUpdateRequest {
  name?: string;
  description?: string;
  settings?: any;
}

export interface TeamWithMembers extends Team {
  members: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    avatar?: string;
    joinedAt: Date | null;
  }>;
  memberCount: number;
  permissions?: string[];
}

export class TeamService extends BaseService {

  /**
   * Listar todos os times
   */
  async getTeams(authContext: AuthContext, options: PaginationOptions = {}): Promise<Team[]> {
    this.log('team-service', 'getTeams', { userId: authContext.userId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TEAMS.LIST, 'listar times');

      const cacheKey = 'teams:all';
      const cached = await this.cache.get<Team[]>(cacheKey);
      if (cached) {
        this.log('team-service', 'cache hit', { cacheKey });
        return cached;
      }

      const teams = await this.storage.getTeams();
      await this.cache.set(cacheKey, teams, TTL.MEDIUM);
      
      return teams;
    } catch (error) {
      this.logError('team-service', 'getTeams', error);
      throw error;
    }
  }

  /**
   * Obter time por ID com membros
   */
  async getTeam(authContext: AuthContext, teamId: string): Promise<TeamWithMembers | null> {
    this.log('team-service', 'getTeam', { userId: authContext.userId, teamId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TEAMS.VIEW, 'visualizar time');

      const cacheKey = `team:${teamId}:full`;
      const cached = await this.cache.get<TeamWithMembers>(cacheKey);
      if (cached) {
        return cached;
      }

      const team = await this.storage.getTeam(teamId);
      if (!team) {
        return null;
      }

      // Buscar membros do time
      const userTeams = await this.storage.getTeamUsers(teamId);
      const members = await Promise.all(
        userTeams.map(async (ut) => {
          const user = await this.storage.getUser(ut.userId);
          return {
            id: ut.userId,
            name: user?.name || 'Usuário',
            email: user?.email || '',
            role: ut.role || 'member',
            avatar: user?.avatar || undefined,
            joinedAt: ut.createdAt
          };
        })
      );

      const teamWithMembers: TeamWithMembers = {
        ...team,
        members,
        memberCount: members.length
      };

      await this.cache.set(cacheKey, teamWithMembers, TTL.MEDIUM);
      return teamWithMembers;
    } catch (error) {
      this.logError('team-service', 'getTeam', error);
      throw error;
    }
  }

  /**
   * Criar novo time
   */
  async createTeam(authContext: AuthContext, request: TeamCreateRequest): Promise<Team> {
    this.log('team-service', 'createTeam', { userId: authContext.userId, teamName: request.name });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TEAMS.CREATE, 'criar time');

      // Validar dados
      const validatedData = insertTeamSchema.parse({
        ...request,
        createdById: authContext.userId
      });

      const team = await this.storage.createTeam(validatedData);

      // Automaticamente adicionar o criador como administrador do time
      await this.storage.addUserToTeam({
        userId: authContext.userId,
        teamId: team.id,
        role: 'admin'
      });

      // Invalidar caches relacionados
      await this.invalidateCache([
        'teams:all',
        `team:${team.id}:*`,
        `user:${authContext.userId}:teams`
      ]);

      // Emitir evento
      this.emitEvent('team.created', {
        teamId: team.id,
        createdBy: authContext.userId,
        team: team
      });

      return team;
    } catch (error) {
      this.logError('team-service', 'createTeam', error);
      throw error;
    }
  }

  /**
   * Atualizar time
   */
  async updateTeam(authContext: AuthContext, teamId: string, request: TeamUpdateRequest): Promise<Team> {
    this.log('team-service', 'updateTeam', { userId: authContext.userId, teamId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TEAMS.EDIT, 'editar time');

      const existingTeam = await this.storage.getTeam(teamId);
      if (!existingTeam) {
        throw new Error('Time não encontrado');
      }

      // Verificar se o usuário tem permissão para editar este time específico
      const hasTeamAccess = await this.hasTeamAdminAccess(authContext.userId, teamId);
      if (!hasTeamAccess && !this.hasPermission(authContext, 'Gerenciar Times')) {
        throw new Error('Acesso negado para editar este time');
      }

      // Validar dados
      const validatedData = updateTeamSchema.parse(request);

      const team = await this.storage.updateTeam(teamId, validatedData);

      // Invalidar caches relacionados
      await this.invalidateCache([
        'teams:all',
        `team:${teamId}:*`
      ]);

      // Emitir evento
      this.emitEvent('team.updated', {
        teamId: teamId,
        updatedBy: authContext.userId,
        changes: validatedData
      });

      return team;
    } catch (error) {
      this.logError('team-service', 'updateTeam', error);
      throw error;
    }
  }

  /**
   * Excluir time
   */
  async deleteTeam(authContext: AuthContext, teamId: string): Promise<void> {
    this.log('team-service', 'deleteTeam', { userId: authContext.userId, teamId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TEAMS.DELETE, 'excluir time');

      const team = await this.storage.getTeam(teamId);
      if (!team) {
        throw new Error('Time não encontrado');
      }

      // Verificar se o usuário tem permissão para excluir este time específico
      const hasTeamAccess = await this.hasTeamAdminAccess(authContext.userId, teamId);
      if (!hasTeamAccess && !this.hasPermission(authContext, 'Gerenciar Times')) {
        throw new Error('Acesso negado para excluir este time');
      }

      await this.storage.deleteTeam(teamId);

      // Invalidar caches relacionados
      await this.invalidateCache([
        'teams:all',
        `team:${teamId}:*`,
        'user:*:teams' // Invalida o cache de times de todos os usuários
      ]);

      // Emitir evento
      this.emitEvent('team.deleted', {
        teamId: teamId,
        deletedBy: authContext.userId,
        deletedTeam: team
      });
    } catch (error) {
      this.logError('team-service', 'deleteTeam', error);
      throw error;
    }
  }



  /**
   * Remover usuário do time
   */
  async removeUserFromTeam(authContext: AuthContext, userId: string, teamId: string): Promise<void> {
    this.log('team-service', 'removeUserFromTeam', { requestingUser: authContext.userId, userId, teamId });
    
    try {
      this.requirePermission(authContext, 'Atribuir Membros', 'remover membro do time');

      // Verificar se o usuário tem permissão para gerenciar este time
      const hasTeamAccess = await this.hasTeamAdminAccess(authContext.userId, teamId);
      if (!hasTeamAccess && !this.hasPermission(authContext, 'Gerenciar Times')) {
        throw new Error('Acesso negado para remover membros neste time');
      }

      await this.storage.removeUserFromTeam(userId, teamId);

      // Invalidar caches relacionados
      await this.invalidateCache([
        `team:${teamId}:*`,
        `user:${userId}:teams`
      ]);

      // Emitir evento
      this.emitEvent('team.member_removed', {
        teamId,
        userId,
        removedBy: authContext.userId
      });
    } catch (error) {
      this.logError('team-service', 'removeUserFromTeam', error);
      throw error;
    }
  }

  /**
   * Atualizar role do usuário no time
   */
  async updateUserTeamRole(authContext: AuthContext, userId: string, teamId: string, newRole: string): Promise<UserTeam> {
    this.log('team-service', 'updateUserTeamRole', { requestingUser: authContext.userId, userId, teamId, newRole });
    
    try {
      this.requirePermission(authContext, 'Atribuir Membros', 'alterar role do membro');

      // Verificar se o usuário tem permissão para gerenciar este time
      const hasTeamAccess = await this.hasTeamAdminAccess(authContext.userId, teamId);
      if (!hasTeamAccess && !this.hasPermission(authContext, 'Gerenciar Times')) {
        throw new Error('Acesso negado para alterar roles neste time');
      }

      const userTeam = await this.storage.updateUserTeamRole(userId, teamId, newRole);

      // Invalidar caches relacionados
      await this.invalidateCache([
        `team:${teamId}:*`,
        `user:${userId}:teams`
      ]);

      // Emitir evento
      this.emitEvent('team.member_role_updated', {
        teamId,
        userId,
        newRole,
        updatedBy: authContext.userId
      });

      return userTeam;
    } catch (error) {
      this.logError('team-service', 'updateUserTeamRole', error);
      throw error;
    }
  }

  /**
   * Obter times do usuário
   */
  async getUserTeams(authContext: AuthContext, userId: string): Promise<UserTeam[]> {
    this.log('team-service', 'getUserTeams', { requestingUser: authContext.userId, userId });
    
    try {
      // Usuários podem ver seus próprios times, admins podem ver de qualquer usuário
      if (authContext.userId !== userId && !this.hasPermission(authContext, 'Visualizar Users')) {
        throw new Error('Acesso negado para visualizar times de outro usuário');
      }

      const cacheKey = `user:${userId}:teams`;
      const cached = await this.cache.get<UserTeam[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const userTeams = await this.storage.getUserTeams(userId);
      await this.cache.set(cacheKey, userTeams, TTL.MEDIUM);
      
      return userTeams;
    } catch (error) {
      this.logError('team-service', 'getUserTeams', error);
      throw error;
    }
  }

  /**
   * Verificar se usuário tem acesso de admin no time
   */
  private async hasTeamAdminAccess(userId: string, teamId: string): Promise<boolean> {
    try {
      const userTeams = await this.storage.getUserTeams(userId);
      const userTeam = userTeams.find(ut => ut.teamId === teamId);
      return userTeam?.role === 'admin' || userTeam?.role === 'owner';
    } catch (error) {
      return false;
    }
  }
}

// Instância singleton
export const teamService = new TeamService();