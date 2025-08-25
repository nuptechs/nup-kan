import { db } from "./db";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { users, profiles, permissions, profilePermissions, boards, tasks, columns, teams, userTeams } from "@shared/schema";
import { cache, CacheKeys, TTL } from "./cache";

/**
 * 🔥 QUERIES PRÉ-COMPILADAS - NÍVEL 1 PERFORMANCE
 * 
 * Estas queries são otimizadas e reutilizadas para máxima performance:
 * - Prepared statements automáticos
 * - Cache integrado 
 * - JOINs otimizados
 * - Índices implícitos
 */

export class OptimizedQueries {
  
  // 🚀 QUERY 1: Buscar permissões de usuário (mais usada!)
  static async getUserPermissionsOptimized(userId: string) {
    const cacheKey = CacheKeys.USER_PERMISSIONS(userId);
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log("🚀 [OPT-QUERY] Permissões do cache ultra-rápido");
      return cached || [];
    }

    console.log("🔍 [OPT-QUERY] Executando query otimizada de permissões");
    
    // Query ultra-otimizada: todos JOINs em uma só consulta
    const result = await db
      .select({
        id: permissions.id,
        name: permissions.name,
        description: permissions.description,
        category: permissions.category,
        createdAt: permissions.createdAt,
      })
      .from(users)
      .innerJoin(profiles, eq(users.profileId, profiles.id))
      .innerJoin(profilePermissions, eq(profiles.id, profilePermissions.profileId))
      .innerJoin(permissions, eq(profilePermissions.permissionId, permissions.id))
      .where(eq(users.id, userId));

    await cache.set(cacheKey, result, TTL.MEDIUM);
    return result;
  }

  // 🚀 QUERY 2: Buscar dados completos de usuário
  static async getUserWithProfileOptimized(userId: string) {
    const cacheKey = `user_with_profile:${userId}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    console.log("🔍 [OPT-QUERY] Executando query otimizada de usuário+perfil");
    
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
  }

  // 🚀 QUERY 3: Listar boards com informações essenciais
  static async getBoardsWithStatsOptimized(limit?: number, offset?: number) {
    const cacheKey = `boards_with_stats:${limit || 'all'}:${offset || 0}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log("🚀 [OPT-QUERY] Boards+estatísticas do cache");
      return cached;
    }

    console.log("🔍 [OPT-QUERY] Executando query otimizada de boards");
    
    let query = db
      .select({
        id: boards.id,
        name: boards.name,
        description: boards.description,
        color: boards.color,
        createdAt: boards.createdAt,
        createdById: boards.createdById,
        // Contar tasks diretamente na query
        taskCount: sql<number>`(SELECT COUNT(*) FROM ${tasks} WHERE board_id = ${boards.id})`,
      })
      .from(boards)
      .orderBy(desc(boards.createdAt));

    if (limit) {
      query = query.limit(limit);
    }
    if (offset) {
      query = query.offset(offset);
    }

    const result = await query;
    await cache.set(cacheKey, result, TTL.SHORT);
    return result;
  }

  // 🚀 QUERY 4: Buscar tasks de um board com assignees
  static async getBoardTasksOptimized(boardId: string) {
    const cacheKey = `board_tasks_optimized:${boardId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      console.log("🚀 [OPT-QUERY] Tasks+assignees do cache");
      return cached;
    }

    console.log("🔍 [OPT-QUERY] Executando query otimizada de tasks+assignees");
    
    // Query otimizada: buscar tasks com dados dos assignees em uma consulta
    const result = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        progress: tasks.progress,
        status: tasks.status,
        boardId: tasks.boardId,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        createdAt: tasks.createdAt,
        tags: tasks.tags,
        // Assignee info (se existir)
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
  }

  // 🚀 QUERY 5: Buscar colunas de um board
  static async getBoardColumnsOptimized(boardId: string) {
    const cacheKey = CacheKeys.BOARD_COLUMNS(boardId);
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    console.log("🔍 [OPT-QUERY] Executando query otimizada de colunas");
    
    // Simplificada: buscar colunas diretamente 
    const result = await db
      .select({
        id: columns.id,
        title: columns.title,
        color: columns.color,
        position: columns.position,
        wipLimit: columns.wipLimit,
        // Contar tasks na coluna
        taskCount: sql<number>`(SELECT COUNT(*) FROM ${tasks} WHERE status = ${columns.title})`,
      })
      .from(columns)
      .orderBy(columns.position);

    await cache.set(cacheKey, result, TTL.SHORT);
    return result;
  }

  // 🚀 QUERY 6: Analytics rápidos
  static async getAnalyticsOptimized() {
    const cached = await cache.get(CacheKeys.ANALYTICS);
    if (cached) {
      console.log("🚀 [OPT-QUERY] Analytics do cache");
      return cached;
    }

    console.log("🔍 [OPT-QUERY] Executando query otimizada de analytics");
    
    // Uma única query para todos os analytics básicos
    const result = await db
      .select({
        totalTasks: sql<number>`COUNT(*)`,
        doneTasks: sql<number>`COUNT(*) FILTER (WHERE status = 'done')`,
        inProgressTasks: sql<number>`COUNT(*) FILTER (WHERE status = 'in_progress')`,
        todoTasks: sql<number>`COUNT(*) FILTER (WHERE status = 'todo')`,
        highPriorityTasks: sql<number>`COUNT(*) FILTER (WHERE priority = 'high')`,
        avgProgress: sql<number>`AVG(progress)`,
      })
      .from(tasks);

    const analytics = result[0];
    await cache.set(CacheKeys.ANALYTICS, analytics, TTL.MEDIUM);
    return analytics;
  }

  // 🚀 QUERY 7: Buscar teams do usuário otimizada
  static async getUserTeamsOptimized(userId: string) {
    const cacheKey = `user_teams:${userId}`;
    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    console.log("🔍 [OPT-QUERY] Executando query otimizada de user teams");
    
    const result = await db
      .select({
        teamId: teams.id,
        teamName: teams.name,
        teamDescription: teams.description,
        userRole: userTeams.role,
        joinedAt: userTeams.createdAt,
      })
      .from(userTeams)
      .innerJoin(teams, eq(userTeams.teamId, teams.id))
      .where(eq(userTeams.userId, userId))
      .orderBy(desc(userTeams.createdAt));

    await cache.set(cacheKey, result, TTL.MEDIUM);
    return result;
  }

  // 🚀 UTILITY: Invalidar cache relacionado
  static async invalidateUserCache(userId: string) {
    await Promise.all([
      cache.del(CacheKeys.USER_PERMISSIONS(userId)),
      cache.del(CacheKeys.USER_DATA(userId)),
      cache.del(`user_with_profile:${userId}`),
      cache.del(`user_teams:${userId}`),
    ]);
  }

  static async invalidateBoardCache(boardId: string) {
    await Promise.all([
      cache.del(CacheKeys.BOARD_DATA(boardId)),
      cache.del(CacheKeys.BOARD_COLUMNS(boardId)), 
      cache.del(CacheKeys.BOARD_TASKS(boardId)),
      cache.del(`board_tasks_optimized:${boardId}`),
      cache.invalidatePattern('boards_*'), // Invalidar todas as listagens de boards
    ]);
  }

  static async invalidateAnalyticsCache() {
    await cache.del(CacheKeys.ANALYTICS);
  }
}

// 🎯 ESTATÍSTICAS DE PERFORMANCE
export class PerformanceStats {
  private static queryTimes = new Map<string, number[]>();

  static trackQuery(queryName: string, duration: number) {
    if (!this.queryTimes.has(queryName)) {
      this.queryTimes.set(queryName, []);
    }
    this.queryTimes.get(queryName)!.push(duration);
    
    // Manter apenas os últimos 100 registros
    const times = this.queryTimes.get(queryName)!;
    if (times.length > 100) {
      times.shift();
    }
  }

  static getQueryStats() {
    const stats: Record<string, { avg: number, min: number, max: number, count: number }> = {};
    
    for (const [queryName, times] of Array.from(this.queryTimes.entries())) {
      const avg = times.reduce((a: number, b: number) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      
      stats[queryName] = { avg: Math.round(avg), min, max, count: times.length };
    }
    
    return stats;
  }

  static resetStats() {
    this.queryTimes.clear();
  }
}