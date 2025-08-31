/**
 * 👥 TEAM PROFILE SERVICE - Gerenciamento de Perfis de Equipe
 * 
 * Responsabilidades:
 * - Relacionamentos team-profile
 * - Cache inteligente para performance
 * - Emissão de eventos de domínio
 */

import { BaseService } from "./baseService";
import type { AuthContext } from "../auth/unifiedAuth";
import type { TeamProfile, InsertTeamProfile } from "@shared/schema";
import { insertTeamProfileSchema } from "@shared/schema";
import { TTL } from "../../cache";
import { PERMISSIONS } from "../config/permissions";

export interface TeamProfileRequest {
  teamId: string;
  profileId: string;
}

export class TeamProfileService extends BaseService {

  async getAllTeamProfiles(authContext: AuthContext) {
    this.log('team-profile-service', 'getAllTeamProfiles', { userId: authContext.userId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TEAMS.LIST, 'listar perfis de equipes');

      const teamProfiles = await this.storage.getAllTeamProfiles();
      return teamProfiles;
    } catch (error) {
      this.logError('team-profile-service', 'getAllTeamProfiles', error);
      throw error;
    }
  }

  async getTeamProfiles(authContext: AuthContext, teamId: string) {
    this.log('team-profile-service', 'getTeamProfiles', { userId: authContext.userId, teamId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TEAMS.VIEW, 'visualizar perfis da equipe');

      const teamProfiles = await this.storage.getTeamProfiles(teamId);
      return teamProfiles;
    } catch (error) {
      this.logError('team-profile-service', 'getTeamProfiles', error);
      throw error;
    }
  }

  async assignProfileToTeam(authContext: AuthContext, teamId: string, profileId: string) {
    this.log('team-profile-service', 'assignProfileToTeam', { userId: authContext.userId, teamId, profileId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TEAMS.EDIT, 'atribuir perfil à equipe');

      const teamProfile = await this.storage.assignProfileToTeam(teamId, profileId);

      this.emitEvent('team_profile.assigned', {
        teamProfileId: teamProfile.id,
        teamId,
        profileId,
        userId: authContext.userId,
      });

      return teamProfile;
    } catch (error) {
      this.logError('team-profile-service', 'assignProfileToTeam', error);
      throw error;
    }
  }

  async deleteTeamProfile(authContext: AuthContext, teamProfileId: string) {
    this.log('team-profile-service', 'deleteTeamProfile', { userId: authContext.userId, teamProfileId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TEAMS.EDIT, 'remover perfil da equipe');

      await this.storage.deleteTeamProfile(teamProfileId);

      this.emitEvent('team_profile.deleted', {
        teamProfileId,
        userId: authContext.userId,
      });

    } catch (error) {
      this.logError('team-profile-service', 'deleteTeamProfile', error);
      throw error;
    }
  }

  async removeProfileFromTeam(authContext: AuthContext, teamId: string, profileId: string) {
    this.log('team-profile-service', 'removeProfileFromTeam', { userId: authContext.userId, teamId, profileId });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.TEAMS.EDIT, 'remover perfil da equipe');

      await this.storage.removeProfileFromTeam(teamId, profileId);

      this.emitEvent('team_profile.removed', {
        teamId,
        profileId,
        userId: authContext.userId,
      });

    } catch (error) {
      this.logError('team-profile-service', 'removeProfileFromTeam', error);
      throw error;
    }
  }
}

export const teamProfileService = new TeamProfileService();