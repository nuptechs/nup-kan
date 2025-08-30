import { db } from "./db";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { users, profiles, permissions, profilePermissions, boards, tasks, columns, teams, userTeams } from "@shared/schema";
import { cache, CacheKeys, TTL } from "./cache";

/**
 * 🔥 QUERIES PRÉ-COMPILADAS - NÍVEL 1 PERFORMANCE
 */

export class OptimizedQueries {
  
  static async getUserPermissionsOptimized(userId: string) {
    const cacheKey = CacheKeys.USER_PERMISSIONS(userId);
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      // 🚀 QUERY COMPLETA: Usuário com permissões e dados do perfil
      const userData = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          avatar: users.avatar,
          profileId: users.profileId,
          profileName: profiles.name,
        })
        .from(users)
        .leftJoin(profiles, eq(users.profileId, profiles.id))
        .where(eq(users.id, userId))
        .limit(1);

      if (!userData.length) {
        return null;
      }

      // ✅ CORREÇÃO: Retornar objetos Permission completos
      const userPermissions = await db
        .select({
          id: permissions.id,
          name: permissions.name,
          category: permissions.category,
          description: permissions.description,
        })
        .from(permissions)
        .innerJoin(profilePermissions, eq(permissions.id, profilePermissions.permissionId))
        .innerJoin(profiles, eq(profilePermissions.profileId, profiles.id))
        .innerJoin(users, eq(profiles.id, users.profileId))
        .where(eq(users.id, userId));

      const user = userData[0];
      const result = {
        ...user,
        permissions: userPermissions.map(p => p.name), // Array de strings para compatibilidade
        permissionObjects: userPermissions, // Objetos Permission completos
        permissionCategories: Array.from(new Set(userPermissions.map(p => p.category))),
      };

      // ✅ PADRONIZAÇÃO TTL: Permissões com TTL.MEDIUM (30 minutos)
      await cache.set(cacheKey, result, TTL.MEDIUM);
      return result;
    } catch (error) {
      console.error('❌ [QUERY] Erro em getUserPermissionsOptimized:', error);
      return null;
    }
  }

  static async getUserWithProfileOptimized(userId: string) {
    const cacheKey = `user_with_profile:${userId}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;
    
    try {
      const result = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          avatar: users.avatar,
          profileId: users.profileId,
          profileName: profiles.name,
          profileDescription: profiles.description,
          createdAt: users.createdAt,
        })
        .from(users)
        .leftJoin(profiles, eq(users.profileId, profiles.id))
        .where(eq(users.id, userId))
        .limit(1);

      const user = result[0] || null;
      await cache.set(cacheKey, user, TTL.MEDIUM);
      return user;
    } catch (error) {
      console.error('❌ [QUERY] Erro em getUserWithProfileOptimized:', error);
      return null;
    }
  }

  static async getBoardsWithStatsOptimized(limit?: number, offset?: number) {
    const cacheKey = `boards_with_stats:${limit || 'all'}:${offset || 0}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const baseQuery = db
        .select({
          id: boards.id,
          name: boards.name,
          description: boards.description,
          color: boards.color,
          isActive: boards.isActive,
          createdAt: boards.createdAt,
          createdById: boards.createdById,
          taskCount: sql<number>`(SELECT COUNT(*) FROM ${tasks} WHERE board_id = ${boards.id})`,
        })
        .from(boards)
        .orderBy(desc(boards.createdAt));

      let finalQuery;
      if (limit && offset) {
        finalQuery = baseQuery.limit(limit).offset(offset);
      } else if (limit) {
        finalQuery = baseQuery.limit(limit);
      } else if (offset) {
        finalQuery = baseQuery.offset(offset);
      } else {
        finalQuery = baseQuery;
      }

      const result = await finalQuery;
      await cache.set(cacheKey, result, TTL.SHORT);
      return result;
    } catch (error) {
      console.error('❌ [QUERY] Erro em getBoardsWithStatsOptimized:', error);
      return [];
    }
  }

  static async getBoardTasksOptimized(boardId: string) {
    const cacheKey = `board_tasks_optimized:${boardId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const result = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          description: tasks.description,
          status: tasks.status,
          priority: tasks.priority,
          progress: tasks.progress,
          boardId: tasks.boardId,
          createdAt: tasks.createdAt,
          updatedAt: tasks.updatedAt,
          assigneeId: tasks.assigneeId,
          assigneeName: users.name,
          assigneeAvatar: users.avatar,
        })
        .from(tasks)
        .leftJoin(users, eq(tasks.assigneeId, users.id))
        .where(eq(tasks.boardId, boardId))
        .orderBy(desc(tasks.createdAt));

      await cache.set(cacheKey, result, TTL.SHORT);
      return result;
    } catch (error) {
      console.error('❌ [QUERY] Erro em getBoardTasksOptimized:', error);
      return [];
    }
  }

  static async getBoardColumnsOptimized(boardId: string) {
    const cacheKey = CacheKeys.BOARD_COLUMNS(boardId);
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const result = await db
        .select()
        .from(columns)
        .where(eq(columns.boardId, boardId))
        .orderBy(columns.position);
      
      await cache.set(cacheKey, result, TTL.SHORT);
      return result;
    } catch (error) {
      console.error('❌ [QUERY] Erro em getBoardColumnsOptimized:', error);
      return [];
    }
  }

  static async getAnalyticsOptimized() {
    const cached = await cache.get(CacheKeys.ANALYTICS);
    if (cached) {
      return cached;
    }

    const result = {
      totalBoards: 0,
      totalTasks: 0,
      totalUsers: 0,
      completedTasks: 0,
      tasksInProgress: 0,
      pendingTasks: 0,
    };

    await cache.set(CacheKeys.ANALYTICS, result, TTL.SHORT);
    return result;
  }
}