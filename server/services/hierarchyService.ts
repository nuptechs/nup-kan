/**
 * 🏗️ HIERARCHY SERVICE - Modelo Formal de Hierarquia de Acesso
 * 
 * MODELO HIERÁRQUICO DEFINIDO:
 * User → Profile (direto) + User → Team → Profile (herdado)
 * 
 * RESOLUÇÃO DE PERMISSÕES:
 * Permissões_Finais = Profile_Direto_User ∪ UNION(Profiles_Teams_User)
 * 
 * Responsabilidades:
 * - Definir modelo hierárquico oficial
 * - Resolver permissões combinadas
 * - Validar acesso baseado na hierarquia
 * - Cache de resolução de permissões
 */

import { BaseService } from "./baseService";
import type { AuthContext } from "../auth/unifiedAuth";
import type { Permission, Profile, Team, User } from "@shared/schema";
import { TTL } from "../cache";

export interface UserHierarchy {
  user: User;
  directProfile: Profile | null;
  teams: Array<{
    team: Team;
    role: string;
    profiles: Profile[];
  }>;
  allPermissions: Permission[];
  effectiveRoles: string[];
}

export interface PermissionResolution {
  userId: string;
  directPermissions: Permission[];
  teamPermissions: Permission[];
  combinedPermissions: Permission[];
  sources: Array<{
    source: 'direct' | 'team';
    sourceId: string;
    sourceName: string;
    permissions: Permission[];
  }>;
}

export class HierarchyService extends BaseService {

  /**
   * 📊 MODELO HIERÁRQUICO FORMAL
   * 
   * User (profileId: direto) 
   *   ↓
   * UserTeams (role: member/lead/admin)
   *   ↓  
   * Team (via TeamProfiles)
   *   ↓
   * Profile (via ProfilePermissions)
   *   ↓
   * Permissions (granulares)
   */

  /**
   * Resolver hierarquia completa de um usuário
   */
  async resolveUserHierarchy(authContext: AuthContext, userId: string): Promise<UserHierarchy> {
    this.log('hierarchy-service', 'resolveUserHierarchy', { requestingUser: authContext.userId, targetUserId: userId });
    
    try {
      const cacheKey = `hierarchy:user:${userId}`;
      const cached = await this.cache.get<UserHierarchy>(cacheKey);
      if (cached) {
        return cached;
      }

      // 1. Buscar usuário e profile direto
      const user = await this.storage.getUser(userId);
      if (!user) {
        throw new Error(`Usuário ${userId} não encontrado`);
      }

      let directProfile: Profile | null = null;
      if (user.profileId) {
        const profile = await this.storage.getProfile(user.profileId);
        directProfile = profile || null;
      }

      // 2. Buscar teams do usuário
      const userTeams = await this.storage.getUserTeams(userId);
      
      // 3. Para cada team, buscar profiles
      const teamsWithProfiles = await Promise.all(
        userTeams.map(async (userTeam) => {
          const team = await this.storage.getTeam(userTeam.teamId);
          if (!team) return null;
          
          const teamProfiles = await this.storage.getTeamProfiles(userTeam.teamId);
          const profiles = await Promise.all(
            teamProfiles.map(tp => this.storage.getProfile(tp.profileId))
          );
          
          return {
            team,
            role: userTeam.role || 'member',
            profiles: profiles.filter((p): p is Profile => p !== undefined)
          };
        })
      );

      const validTeamsWithProfiles = teamsWithProfiles.filter((t): t is NonNullable<typeof t> => t !== null);

      // 4. Resolver todas as permissões
      const permissionResolution = await this.resolvePermissions(userId);

      const hierarchy: UserHierarchy = {
        user,
        directProfile,
        teams: validTeamsWithProfiles,
        allPermissions: permissionResolution.combinedPermissions,
        effectiveRoles: [
          'user', // Removido user.role pois não existe no schema
          ...validTeamsWithProfiles.map(t => `${t.team.name}:${t.role}`)
        ]
      };

      // Cache por 5 minutos (permissões mudam moderadamente)
      await this.cache.set(cacheKey, hierarchy, TTL.MEDIUM);
      
      return hierarchy;
    } catch (error) {
      this.logError('hierarchy-service', 'resolveUserHierarchy', error);
      throw error;
    }
  }

  /**
   * Resolver permissões combinadas (diretas + teams)
   */
  async resolvePermissions(userId: string): Promise<PermissionResolution> {
    this.log('hierarchy-service', 'resolvePermissions', { userId });
    
    try {
      const cacheKey = `permissions:resolved:${userId}`;
      const cached = await this.cache.get<PermissionResolution>(cacheKey);
      if (cached) {
        return cached;
      }

      const sources: PermissionResolution['sources'] = [];

      // 1. Permissões diretas do profile do usuário
      const directPermissions: Permission[] = [];
      const user = await this.storage.getUser(userId);
      
      if (user?.profileId) {
        const userPermissions = await this.storage.getUserPermissions(userId);
        directPermissions.push(...userPermissions);
        
        if (userPermissions.length > 0) {
          const directProfile = await this.storage.getProfile(user.profileId);
          sources.push({
            source: 'direct',
            sourceId: user.profileId,
            sourceName: directProfile?.name || 'Profile Direto',
            permissions: userPermissions
          });
        }
      }

      // 2. Permissões herdadas dos teams
      const teamPermissions: Permission[] = [];
      const userTeams = await this.storage.getUserTeams(userId);
      
      for (const userTeam of userTeams) {
        const teamPerms = await this.storage.getTeamPermissions(userTeam.teamId);
        teamPermissions.push(...teamPerms);
        
        if (teamPerms.length > 0) {
          const team = await this.storage.getTeam(userTeam.teamId);
          sources.push({
            source: 'team',
            sourceId: userTeam.teamId,
            sourceName: team?.name || 'Team',
            permissions: teamPerms
          });
        }
      }

      // 3. Combinar e deduplar permissões
      const allPermissions = [...directPermissions, ...teamPermissions];
      const uniquePermissions = allPermissions.filter((perm, index, arr) => 
        arr.findIndex(p => p.id === perm.id) === index
      );

      const resolution: PermissionResolution = {
        userId,
        directPermissions,
        teamPermissions, 
        combinedPermissions: uniquePermissions,
        sources
      };

      // Cache por 10 minutos (hierarquia estável)
      await this.cache.set(cacheKey, resolution, TTL.LONG);
      
      return resolution;
    } catch (error) {
      this.logError('hierarchy-service', 'resolvePermissions', error);
      throw error;
    }
  }

  /**
   * Verificar se usuário tem permissão específica (direto ou herdado)
   */
  async hasUserPermission(userId: string, permissionName: string): Promise<boolean> {
    try {
      const resolution = await this.resolvePermissions(userId);
      return resolution.combinedPermissions.some(p => p.name === permissionName);
    } catch (error) {
      this.logError('hierarchy-service', 'hasUserPermission', error);
      return false;
    }
  }

  /**
   * Invalidar cache de hierarquia quando dados mudam
   */
  async invalidateUserHierarchy(userId: string): Promise<void> {
    await this.invalidateCache([
      `hierarchy:user:${userId}`,
      `permissions:resolved:${userId}`
    ]);
  }

  /**
   * Invalidar cache para todos os usuários de um team
   */
  async invalidateTeamHierarchy(teamId: string): Promise<void> {
    try {
      const teamUsers = await this.storage.getTeamUsers(teamId);
      const cacheKeys = teamUsers.flatMap(user => [
        `hierarchy:user:${user.userId}`,
        `permissions:resolved:${user.userId}`
      ]);
      
      await this.invalidateCache(cacheKeys);
    } catch (error) {
      this.logError('hierarchy-service', 'invalidateTeamHierarchy', error);
    }
  }
}

// Instância singleton
export const hierarchyService = new HierarchyService();