/**
 * 👥 USER TEAM SERVICE - Gerenciamento de Usuários e Times
 * 
 * Responsabilidades:
 * - Relacionamentos usuário-time
 * - Cache inteligente para performance
 * - Emissão de eventos de domínio
 */

import { BaseService } from "./baseService";
import type { AuthContext } from "../auth/unifiedAuth";
import type { UserTeam, InsertUserTeam } from "@shared/schema";
import { insertUserTeamSchema } from "@shared/schema";
import { TTL } from "../cache";
import { PERMISSIONS } from "../config/permissions";

export interface UserTeamRequest {
  userId: string;
  teamId: string;
  role?: string;
}

export class UserTeamService extends BaseService {

  async getAllUserTeams(authContext: AuthContext) {
    this.log('user-team-service', 'getAllUserTeams', { userId: authContext.userId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TEAMS.LIST, 'listar relações usuário-time');

      const userTeams = await this.storage.getAllUserTeams();
      return userTeams;
    } catch (error) {
      this.logError('user-team-service', 'getAllUserTeams', error);
      throw error;
    }
  }

  async getUserTeams(authContext: AuthContext, userId: string) {
    this.log('user-team-service', 'getUserTeams', { userId: authContext.userId, targetUserId: userId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TEAMS.VIEW, 'visualizar times do usuário');

      const userTeams = await this.storage.getUserTeams(userId);
      return userTeams;
    } catch (error) {
      this.logError('user-team-service', 'getUserTeams', error);
      throw error;
    }
  }

  async getTeamUsers(authContext: AuthContext, teamId: string) {
    this.log('user-team-service', 'getTeamUsers', { userId: authContext.userId, teamId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TEAMS.VIEW, 'visualizar usuários do time');

      const teamUsers = await this.storage.getTeamUsers(teamId);
      return teamUsers;
    } catch (error) {
      this.logError('user-team-service', 'getTeamUsers', error);
      throw error;
    }
  }

  async addUserToTeam(authContext: AuthContext, request: UserTeamRequest) {
    this.log('user-team-service', 'addUserToTeam', { userId: authContext.userId, request });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TEAMS.EDIT, 'adicionar usuário ao time');

      const validData = insertUserTeamSchema.parse(request);
      const userTeam = await this.storage.addUserToTeam(validData);

      this.emitEvent('user_team.created', {
        userTeamId: userTeam.id,
        userId: request.userId,
        teamId: request.teamId,
        createdBy: authContext.userId,
      });

      return userTeam;
    } catch (error) {
      this.logError('user-team-service', 'addUserToTeam', error);
      throw error;
    }
  }
}

export const userTeamService = new UserTeamService();