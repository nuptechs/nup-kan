import { db } from "./db";
import { boards, boardShares, users, profiles, permissions, profilePermissions, tasks, columns } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

/**
 * 🔥 PREPARED STATEMENTS DE ALTA PERFORMANCE
 * 
 * Estas queries são pré-compiladas e cachadas para máxima velocidade:
 * - Reuso de planos de execução
 * - Cache de parsing SQL
 * - Latência sub-50ms
 */

export class PreparedStatements {
  
  // 📋 PREPARED: Criar Board (ultra-otimizado)
  static readonly createBoard = db
    .insert(boards)
    .values({
      id: sql.placeholder('id'),
      name: sql.placeholder('name'),
      description: sql.placeholder('description'),
      color: sql.placeholder('color'),
      createdById: sql.placeholder('createdById'),
      createdAt: sql.placeholder('createdAt'),
      updatedAt: sql.placeholder('updatedAt'),
    })
    .returning()
    .prepare('createBoard');

  // 🔗 PREPARED: Criar Board Share (ultra-otimizado)
  static readonly createBoardShare = db
    .insert(boardShares)
    .values({
      id: sql.placeholder('id'),
      boardId: sql.placeholder('boardId'),
      shareType: sql.placeholder('shareType'),
      shareWithId: sql.placeholder('shareWithId'),
      permission: sql.placeholder('permission'),
      sharedByUserId: sql.placeholder('sharedByUserId'),
      createdAt: sql.placeholder('createdAt'),
    })
    .prepare('createBoardShare');

  // 👤 PREPARED: Buscar Usuário com Profile (ultra-otimizado)
  static readonly getUserWithProfile = db
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
    .where(eq(users.id, sql.placeholder('userId')))
    .prepare('getUserWithProfile');

  // 🔑 PREPARED: Buscar Permissões do Usuário (ultra-otimizado)
  static readonly getUserPermissions = db
    .select({
      id: permissions.id,
      name: permissions.name,
      description: permissions.description,
      category: permissions.category,
      createdAt: permissions.createdAt,
    })
    .from(permissions)
    .innerJoin(profilePermissions, eq(permissions.id, profilePermissions.permissionId))
    .innerJoin(profiles, eq(profilePermissions.profileId, profiles.id))
    .innerJoin(users, eq(profiles.id, users.profileId))
    .where(eq(users.id, sql.placeholder('userId')))
    .prepare('getUserPermissions');

  // 📊 PREPARED: Buscar Board por ID (ultra-otimizado)
  static readonly getBoardById = db
    .select()
    .from(boards)
    .where(eq(boards.id, sql.placeholder('boardId')))
    .prepare('getBoardById');

  // 📋 PREPARED: Buscar Tasks do Board (ultra-otimizado)
  static readonly getBoardTasks = db
    .select()
    .from(tasks)
    .where(eq(tasks.boardId, sql.placeholder('boardId')))
    .prepare('getBoardTasks');

  // 📐 PREPARED: Buscar Colunas do Board (ultra-otimizado)
  static readonly getBoardColumns = db
    .select()
    .from(columns)
    .where(eq(columns.boardId, sql.placeholder('boardId')))
    .prepare('getBoardColumns');

  // 📊 PREPARED: Contar Tasks por Status (ultra-otimizado)
  static readonly countTasksByStatus = db
    .select({
      status: tasks.status,
      count: sql<number>`count(*)::int`,
    })
    .from(tasks)
    .where(eq(tasks.boardId, sql.placeholder('boardId')))
    .groupBy(tasks.status)
    .prepare('countTasksByStatus');
}