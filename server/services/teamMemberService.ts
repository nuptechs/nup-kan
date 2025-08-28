/**
 * 👥 TEAM MEMBER SERVICE - Gerenciamento de Membros de Equipe
 * 
 * Responsabilidades:
 * - CRUD completo de membros de equipe
 * - Lógica de negócio (status, roles)
 * - Cache inteligente para performance
 * - Emissão de eventos de domínio
 */

import { BaseService, createSuccessResponse, createErrorResponse, PaginatedResponse, PaginationOptions } from "./baseService";
import type { AuthContext } from "../microservices/authService";
import type { TeamMember, InsertTeamMember } from "@shared/schema";
import { insertTeamMemberSchema } from "@shared/schema";
import { TTL } from "../cache";

export interface TeamMemberCreateRequest {
  teamId: string;
  userId: string;
  role?: string;
  status?: string;
}

export class TeamMemberService extends BaseService {

  async getTeamMembers(authContext: AuthContext): Promise<TeamMember[]> {
    this.log('team-member-service', 'getTeamMembers', { userId: authContext.userId });
    
    try {
      this.requirePermission(authContext, 'Listar Teams', 'listar membros de equipe');

      const cacheKey = 'team_members:all';
      const cached = await this.cache.get<TeamMember[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const members = await this.storage.getTeamMembers();
      await this.cache.set(cacheKey, members, TTL.MEDIUM);
      
      return members;
    } catch (error) {
      this.logError('team-member-service', 'getTeamMembers', error);
      throw error;
    }
  }

  async createTeamMember(authContext: AuthContext, request: TeamMemberCreateRequest): Promise<TeamMember> {
    this.log('team-member-service', 'createTeamMember', { userId: authContext.userId });
    
    try {
      this.requirePermission(authContext, 'Atribuir Membros', 'adicionar membro à equipe');

      const validData = insertTeamMemberSchema.parse(request);
      const member = await this.storage.createTeamMember(validData);

      await this.invalidateCache(['team_members:*']);

      this.emitEvent('team_member.created', {
        memberId: member.id,
        teamId: request.teamId,
        userId: authContext.userId,
      });

      return member;
    } catch (error) {
      this.logError('team-member-service', 'createTeamMember', error);
      throw error;
    }
  }

  async updateTeamMemberStatus(authContext: AuthContext, memberId: string, status: string): Promise<TeamMember> {
    this.log('team-member-service', 'updateTeamMemberStatus', { userId: authContext.userId, memberId, status });
    
    try {
      this.requirePermission(authContext, 'Editar Teams', 'atualizar status do membro');

      const member = await this.storage.updateTeamMemberStatus(memberId, status);

      await this.invalidateCache(['team_members:*']);

      this.emitEvent('team_member.status_updated', {
        memberId,
        status,
        userId: authContext.userId,
      });

      return member;
    } catch (error) {
      this.logError('team-member-service', 'updateTeamMemberStatus', error);
      throw error;
    }
  }
}

export const teamMemberService = new TeamMemberService();