import { type Board, type InsertBoard, type UpdateBoard, type Task, type InsertTask, type UpdateTask, type Column, type InsertColumn, type UpdateColumn, type TeamMember, type InsertTeamMember, type Tag, type InsertTag, type Team, type InsertTeam, type UpdateTeam, type User, type InsertUser, type UpdateUser, type Profile, type InsertProfile, type UpdateProfile, type Permission, type InsertPermission, type ProfilePermission, type InsertProfilePermission, type TeamProfile, type InsertTeamProfile, type UserTeam, type InsertUserTeam, type BoardShare, type InsertBoardShare, type UpdateBoardShare, type TaskEvent, type InsertTaskEvent, type ExportHistory, type InsertExportHistory, type TaskStatus, type InsertTaskStatus, type UpdateTaskStatus, type TaskPriority, type InsertTaskPriority, type UpdateTaskPriority, type TaskAssignee, type InsertTaskAssignee, type Notification, type InsertNotification, type UpdateNotification } from "@shared/schema";
import { db } from "./db";
import { boards, tasks, columns, teamMembers, tags, teams, users, profiles, permissions, profilePermissions, teamProfiles, userTeams, boardShares, taskEvents, exportHistory, taskStatuses, taskPriorities, taskAssignees, notifications } from "@shared/schema";
import { eq, desc, and, inArray, sql, or } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { cache, CacheKeys, TTL } from "./cache";
import { OptimizedQueries, PerformanceStats } from "./optimizedQueries";

export interface IStorage {
  // Boards
  getBoards(): Promise<Board[]>;
  getBoard(id: string): Promise<Board | undefined>;
  createBoard(board: InsertBoard): Promise<Board>;
  updateBoard(id: string, board: UpdateBoard): Promise<Board>;
  deleteBoard(id: string): Promise<void>;
  getBoardTasks(boardId: string): Promise<Task[]>;
  getBoardColumns(boardId: string): Promise<Column[]>;
  getBoardsPaginated(limit: number, offset: number): Promise<Board[]>;
  getBoardsByCreator(creatorId: string, limit: number, offset: number): Promise<Board[]>;
  
  // Tasks
  getTasks(): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: UpdateTask): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  
  // Task Assignees
  getTaskAssignees(taskId: string): Promise<(TaskAssignee & { user: User })[]>;
  addTaskAssignee(assignee: InsertTaskAssignee): Promise<TaskAssignee>;
  removeTaskAssignee(taskId: string, userId: string): Promise<void>;
  setTaskAssignees(taskId: string, userIds: string[]): Promise<void>;
  
  // Columns
  getColumns(): Promise<Column[]>;
  getColumn(id: string): Promise<Column | undefined>;
  createColumn(column: InsertColumn): Promise<Column>;
  updateColumn(id: string, data: UpdateColumn): Promise<Column>;
  deleteColumn(id: string): Promise<void>;
  reorderColumns(reorderedColumns: { id: string; position: number }[]): Promise<void>;
  reorderTasks(reorderedTasks: { id: string; position: number }[]): Promise<void>;
  
  // Team Members
  getTeamMembers(): Promise<TeamMember[]>;
  createTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  updateTeamMemberStatus(id: string, status: string): Promise<TeamMember>;
  
  // Tags
  getTags(): Promise<Tag[]>;
  getTag(id: string): Promise<Tag | undefined>;
  createTag(tag: InsertTag): Promise<Tag>;
  updateTag(id: string, tag: Partial<Tag>): Promise<Tag>;
  deleteTag(id: string): Promise<void>;

  // Teams
  getTeams(): Promise<Team[]>;
  getTeam(id: string): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: string, team: UpdateTeam): Promise<Team>;
  deleteTeam(id: string): Promise<void>;
  
  // Users
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: UpdateUser): Promise<User>;
  updateUserPassword(id: string, newPassword: string): Promise<void>;
  deleteUser(id: string): Promise<void>;
  
  // User Teams (many-to-many relationship)
  getAllUserTeams(): Promise<UserTeam[]>;
  getUserTeams(userId: string): Promise<UserTeam[]>;
  getTeamUsers(teamId: string): Promise<UserTeam[]>;
  addUserToTeam(userTeam: InsertUserTeam): Promise<UserTeam>;
  removeUserFromTeam(userId: string, teamId: string): Promise<void>;
  updateUserTeamRole(userId: string, teamId: string, role: string): Promise<UserTeam>;

  // Profiles
  getProfiles(): Promise<Profile[]>;
  getProfile(id: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(id: string, profile: UpdateProfile): Promise<Profile>;
  deleteProfile(id: string): Promise<void>;

  // Permissions
  getPermissions(): Promise<Permission[]>;
  getPermission(id: string): Promise<Permission | undefined>;
  createPermission(permission: InsertPermission): Promise<Permission>;
  updatePermission(id: string, permission: Partial<Permission>): Promise<Permission>;
  deletePermission(id: string): Promise<void>;

  // Profile Permissions
  getAllProfilePermissions(): Promise<ProfilePermission[]>;
  getProfilePermissions(profileId: string): Promise<ProfilePermission[]>;
  addPermissionToProfile(profileId: string, permissionId: string): Promise<ProfilePermission>;
  removePermissionFromProfile(profileId: string, permissionId: string): Promise<void>;

  // Team Profiles
  getAllTeamProfiles(): Promise<TeamProfile[]>;
  getTeamProfiles(teamId: string): Promise<TeamProfile[]>;
  assignProfileToTeam(teamId: string, profileId: string): Promise<TeamProfile>;
  removeProfileFromTeam(teamId: string, profileId: string): Promise<void>;
  deleteTeamProfile(id: string): Promise<void>;

  // User Permissions
  getUserPermissions(userId: string): Promise<Permission[]>;

  // Board Shares
  getBoardShares(boardId: string): Promise<BoardShare[]>;
  getAllBoardShares(): Promise<BoardShare[]>;
  getUserSharedBoards(userId: string): Promise<BoardShare[]>;
  getTeamSharedBoards(teamId: string): Promise<BoardShare[]>;
  getBoardMembers(boardId: string): Promise<User[]>;
  getBoardMemberCount(boardId: string): Promise<number>;
  createBoardShare(share: InsertBoardShare): Promise<BoardShare>;
  updateBoardShare(id: string, share: UpdateBoardShare): Promise<BoardShare>;
  deleteBoardShare(id: string): Promise<void>;
  getUserBoardPermission(userId: string, boardId: string): Promise<string | null>;

  // Task Events  
  getTaskEvents(taskId: string): Promise<TaskEvent[]>;
  createTaskEvent(event: InsertTaskEvent): Promise<TaskEvent>;

  // Export History
  getExportHistory(userId: string): Promise<ExportHistory[]>;
  createExportHistory(exportData: InsertExportHistory): Promise<ExportHistory>;
  updateExportHistory(id: string, updates: Partial<ExportHistory>): Promise<ExportHistory>;

  // Task Statuses
  getTaskStatuses(): Promise<TaskStatus[]>;
  getTaskStatus(id: string): Promise<TaskStatus | undefined>;
  createTaskStatus(status: InsertTaskStatus): Promise<TaskStatus>;
  updateTaskStatus(id: string, status: UpdateTaskStatus): Promise<TaskStatus>;
  deleteTaskStatus(id: string): Promise<void>;

  // Task Priorities
  getTaskPriorities(): Promise<TaskPriority[]>;
  getTaskPriority(id: string): Promise<TaskPriority | undefined>;
  createTaskPriority(priority: InsertTaskPriority): Promise<TaskPriority>;
  updateTaskPriority(id: string, priority: UpdateTaskPriority): Promise<TaskPriority>;
  deleteTaskPriority(id: string): Promise<void>;

  // Notifications
  getNotifications(userId: string): Promise<Notification[]>;
  getNotification(id: string): Promise<Notification | undefined>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  updateNotification(id: string, notification: UpdateNotification): Promise<Notification>;
  deleteNotification(id: string): Promise<void>;
  markNotificationAsRead(id: string): Promise<Notification>;
  markAllNotificationsAsRead(userId: string): Promise<number>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  deleteExpiredNotifications(): Promise<number>;

  // Board initialization
  initializeBoardWithDefaults(boardId: string): Promise<void>;
}

// MemStorage removido - Sistema de produção usa apenas DatabaseStorage com PostgreSQL

export class DatabaseStorage implements IStorage {
  // Cache simples para permissões (dados raramente modificados)
  private permissionsCache = new Map<string, { data: Permission[], timestamp: number }>();
  private readonly CACHE_TTL = 300000; // 5 minutos

  private getCachedPermissions(userId: string): Permission[] | null {
    const cached = this.permissionsCache.get(userId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  private setCachedPermissions(userId: string, permissions: Permission[]): void {
    this.permissionsCache.set(userId, {
      data: permissions,
      timestamp: Date.now()
    });
  }
  // Board methods
  async getBoards(): Promise<Board[]> {
    // 🚀 CACHE SIMPLES - ESTRATÉGIA UNIFICADA
    const cacheKey = 'boards:all';
    const cached = await cache.get<Board[]>(cacheKey);
    if (cached) return cached;
    
    const result = await db.select().from(boards).orderBy(desc(boards.createdAt));
    await cache.set(cacheKey, result, TTL.SHORT);
    return result;
  }

  // 🚀 NOVA: Paginação para boards
  async getBoardsPaginated(limit: number, offset: number): Promise<Board[]> {
    const cacheKey = `boards_paginated:${limit}:${offset}`;
    const cached = await cache.get<Board[]>(cacheKey);
    if (cached) {
      console.log("🚀 [CACHE HIT] Boards paginados servidos do cache");
      return cached;
    }

    console.log("🔍 [CACHE MISS] Buscando boards paginados no banco");
    const result = await db
      .select()
      .from(boards)
      .orderBy(desc(boards.createdAt))
      .limit(limit)
      .offset(offset);
    
    // Cache por 30 segundos (dados paginados mudam mais)
    await cache.set(cacheKey, result, TTL.SHORT / 2);
    return result;
  }

  // 🚀 NOVA: Contar total de boards
  async getBoardsCount(): Promise<number> {
    const cached = await cache.get<number>('boards_count');
    if (cached !== null) {
      return cached;
    }

    const result = await db.select({ count: sql<number>`count(*)` }).from(boards);
    const count = result[0]?.count || 0;
    
    // Cache por 2 minutos
    await cache.set('boards_count', count, TTL.MEDIUM / 2);
    return count;
  }

  // 🚀 NOVA: Buscar boards por criador com paginação
  async getBoardsByCreator(creatorId: string, limit: number, offset: number): Promise<Board[]> {
    const cacheKey = `boards_creator:${creatorId}:${limit}:${offset}`;
    const cached = await cache.get<Board[]>(cacheKey);
    if (cached) {
      console.log("🚀 [CACHE HIT] Boards por criador servidos do cache");
      return cached;
    }

    console.log("🔍 [CACHE MISS] Buscando boards do criador no banco:", creatorId);
    const result = await db
      .select()
      .from(boards)
      .where(eq(boards.createdById, creatorId))
      .orderBy(desc(boards.createdAt))
      .limit(limit)
      .offset(offset);
    
    // Cache por 30 segundos
    await cache.set(cacheKey, result, TTL.SHORT / 2);
    return result;
  }

  async getBoard(id: string): Promise<Board | undefined> {
    const [board] = await db.select().from(boards).where(eq(boards.id, id));
    return board || undefined;
  }

  async createBoard(insertBoard: InsertBoard): Promise<Board> {
    const [board] = await db
      .insert(boards)
      .values({
        ...insertBoard,
        description: insertBoard.description || "",
      })
      .returning();
    
    // Automatically add creator as admin member
    if (insertBoard.createdById && insertBoard.createdById !== "system") {
      await this.createBoardShare({
        boardId: board.id,
        shareType: "user",
        shareWithId: insertBoard.createdById,
        permission: "admin",
        sharedByUserId: insertBoard.createdById
      });
    }
    
    return board;
  }

  async updateBoard(id: string, updateData: UpdateBoard): Promise<Board> {
    const [board] = await db
      .update(boards)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(boards.id, id))
      .returning();
    
    if (!board) {
      throw new Error(`Board with id ${id} not found`);
    }
    
    return board;
  }

  async deleteBoard(id: string): Promise<void> {
    const result = await db.delete(boards).where(eq(boards.id, id));
    if (result.rowCount === 0) {
      throw new Error(`Board with id ${id} not found`);
    }
  }

  async getBoardTasks(boardId: string): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.boardId, boardId)).orderBy(desc(tasks.createdAt));
  }

  async getBoardColumns(boardId: string): Promise<Column[]> {
    return await db.select().from(columns).where(eq(columns.boardId, boardId)).orderBy(columns.position);
  }

  async initializeBoardWithDefaults(boardId: string): Promise<void> {
    console.log(`🔄 [TRANSACTION] Initializing board ${boardId} with default data`);
    
    // Check if board already has columns
    const existingColumns = await this.getBoardColumns(boardId);
    if (existingColumns.length > 0) {
      console.log(`⚠️ [TRANSACTION] Board ${boardId} already has columns, skipping initialization`);
      return; // Already initialized
    }
    
    // 🔒 TRANSAÇÃO: Garantir que todas as colunas sejam criadas ou nenhuma
    await db.transaction(async (tx) => {
      console.log(`🔒 [TRANSACTION] Iniciando transação para board ${boardId}`);
      
      const defaultColumns = [
        { boardId, title: "Backlog", position: 0, wipLimit: null, color: "gray" },
        { boardId, title: "To Do", position: 1, wipLimit: 5, color: "blue" },
        { boardId, title: "In Progress", position: 2, wipLimit: 3, color: "yellow" },
        { boardId, title: "Review", position: 3, wipLimit: 4, color: "purple" },
        { boardId, title: "Done", position: 4, wipLimit: null, color: "green" },
      ];
      
      // Insert todas as colunas em uma única transação
      for (const column of defaultColumns) {
        await tx.insert(columns).values(column);
        console.log(`✅ [TRANSACTION] Coluna "${column.title}" inserida para board ${boardId}`);
      }
      
      console.log(`✅ [TRANSACTION] Board ${boardId} inicializado com ${defaultColumns.length} colunas (transação concluída)`);
    });
  }

  // Task methods
  async getTasks(): Promise<Task[]> {
    return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    
    try {
      const [task] = await db
        .insert(tasks)
        .values({
          ...insertTask,
          description: insertTask.description || "",
          assigneeId: insertTask.assigneeId || "",
          assigneeName: insertTask.assigneeName || "",
          assigneeAvatar: insertTask.assigneeAvatar || "",
          tags: insertTask.tags || [],
        })
        .returning();
      
      
      // Create initial event for task creation (with error handling)
      try {
        await this.createTaskEvent({
          taskId: task.id,
          eventType: "created",
          description: "Task criada",
          userName: "Sistema",
          userAvatar: "S",
          metadata: ""
        });
      } catch (eventError) {
        console.error("⚠️  DatabaseStorage: Event creation failed, but task was created:", eventError);
        // Continue without failing - task is already created
      }
      
      return task;
    } catch (error) {
      console.error("❌ DatabaseStorage: Task creation failed:", error);
      throw error;
    }
  }

  async updateTask(id: string, updateData: UpdateTask): Promise<Task> {
    const oldTask = await this.getTask(id);
    
    const [task] = await db
      .update(tasks)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();
    
    if (!task) {
      throw new Error(`Task with id ${id} not found`);
    }
    
    // Only create events for significant changes
    if (oldTask) {
      // Status change - task moved between columns
      if (task.status !== oldTask.status) {
        const statusNames: Record<string, string> = {
          'backlog': 'Backlog',
          'todo': 'To Do', 
          'inprogress': 'In Progress',
          'review': 'Review',
          'done': 'Done'
        };
        
        await this.createTaskEvent({
          taskId: task.id,
          eventType: "moved",
          description: `Task movida para ${statusNames[task.status] || task.status}`,
          userName: "Sistema",
          userAvatar: "S",
          metadata: `De ${statusNames[oldTask.status] || oldTask.status} para ${statusNames[task.status] || task.status}`
        });
      }
      // Title change
      else if (task.title !== oldTask.title) {
        await this.createTaskEvent({
          taskId: task.id,
          eventType: "updated",
          description: "Título alterado",
          userName: "Sistema",
          userAvatar: "S",
          metadata: `De "${oldTask.title}" para "${task.title}"`
        });
      }
      // Priority change
      else if (task.priority !== oldTask.priority) {
        const priorityNames: Record<string, string> = {
          'low': 'Baixa',
          'medium': 'Média', 
          'high': 'Alta'
        };
        
        await this.createTaskEvent({
          taskId: task.id,
          eventType: "updated",
          description: "Prioridade alterada",
          userName: "Sistema",
          userAvatar: "S",
          metadata: `De ${priorityNames[oldTask.priority] || oldTask.priority} para ${priorityNames[task.priority] || task.priority}`
        });
      }
      // Progress change - only for significant changes (>= 10%)
      else if (Math.abs((task.progress || 0) - (oldTask.progress || 0)) >= 10) {
        await this.createTaskEvent({
          taskId: task.id,
          eventType: "updated",
          description: "Progresso atualizado",
          userName: "Sistema",
          userAvatar: "S",
          metadata: `${oldTask.progress || 0}% → ${task.progress || 0}%`
        });
      }
      // Skip events for minor changes (tags, assignees, etc.)
    }
    
    return task;
  }

  async deleteTask(id: string): Promise<void> {
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    if (result.rowCount === 0) {
      throw new Error(`Task with id ${id} not found`);
    }
  }

  // Task Assignees methods
  async getTaskAssignees(taskId: string): Promise<(TaskAssignee & { user: User })[]> {
    const assignees = await db
      .select({
        id: taskAssignees.id,
        taskId: taskAssignees.taskId,
        userId: taskAssignees.userId,
        assignedAt: taskAssignees.assignedAt,
        user: users,
      })
      .from(taskAssignees)
      .leftJoin(users, eq(taskAssignees.userId, users.id))
      .where(eq(taskAssignees.taskId, taskId));
    
    return assignees.filter(a => a.user !== null) as (TaskAssignee & { user: User })[];
  }

  async addTaskAssignee(assignee: InsertTaskAssignee): Promise<TaskAssignee> {
    const [newAssignee] = await db
      .insert(taskAssignees)
      .values(assignee)
      .returning();
    return newAssignee;
  }

  async removeTaskAssignee(taskId: string, userId: string): Promise<void> {
    const result = await db
      .delete(taskAssignees)
      .where(and(eq(taskAssignees.taskId, taskId), eq(taskAssignees.userId, userId)));
    
    if (result.rowCount === 0) {
      throw new Error(`Assignee ${userId} not found for task ${taskId}`);
    }
  }

  async setTaskAssignees(taskId: string, userIds: string[]): Promise<void> {
    // Remove all existing assignees for this task
    await db.delete(taskAssignees).where(eq(taskAssignees.taskId, taskId));
    
    // Add new assignees
    if (userIds.length > 0) {
      const newAssignees = userIds.map(userId => ({ taskId, userId }));
      await db.insert(taskAssignees).values(newAssignees);
    }
  }

  // Column methods
  async getColumns(): Promise<Column[]> {
    return await db.select().from(columns).orderBy(columns.position);
  }

  async getColumn(id: string): Promise<Column | undefined> {
    const [column] = await db.select().from(columns).where(eq(columns.id, id));
    return column || undefined;
  }

  async createColumn(insertColumn: InsertColumn): Promise<Column> {
    const id = insertColumn.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const column: Column = {
      id: id || `column-${Date.now()}`,
      ...insertColumn,
      wipLimit: insertColumn.wipLimit || null,
    };
    const [newColumn] = await db
      .insert(columns)
      .values(column)
      .returning();
    return newColumn;
  }

  async updateColumn(id: string, data: UpdateColumn): Promise<Column> {
    const [column] = await db
      .update(columns)
      .set(data)
      .where(eq(columns.id, id))
      .returning();
    
    if (!column) {
      throw new Error(`Column with id ${id} not found`);
    }
    
    return column;
  }

  async deleteColumn(id: string): Promise<void> {
    // First, get the column to find out its title
    const [column] = await db.select().from(columns).where(eq(columns.id, id));
    if (!column) {
      throw new Error(`Column with id ${id} not found`);
    }

    // Map column title to status value
    const statusMap: Record<string, string> = {
      "Backlog": "backlog",
      "To Do": "todo", 
      "In Progress": "inprogress",
      "Review": "review",
      "Done": "done"
    };
    
    const columnStatus = statusMap[column.title];
    
    // If this column has tasks, delete them along with the column
    // This prevents orphaned tasks and referential integrity issues
    if (columnStatus) {
      await db
        .delete(tasks)
        .where(eq(tasks.status, columnStatus));
    }
    
    const result = await db.delete(columns).where(eq(columns.id, id));
    if (result.rowCount === 0) {
      throw new Error(`Column with id ${id} not found`);
    }
  }

  async reorderColumns(reorderedColumns: { id: string; position: number }[]): Promise<void> {
    console.log("🔄 [TRANSACTION] Reordenando columns:", reorderedColumns.map(c => ({ id: c.id, position: c.position })));
    
    // 🔒 TRANSAÇÃO: Garantir que todas as posições sejam atualizadas ou nenhuma
    await db.transaction(async (tx) => {
      console.log(`🔒 [TRANSACTION] Iniciando transação para reordenar ${reorderedColumns.length} columns`);
      
      for (const { id, position } of reorderedColumns) {
        const result = await tx
          .update(columns)
          .set({ position })
          .where(eq(columns.id, id));
        
        console.log(`✅ [TRANSACTION] Column ${id} -> position ${position}, rowCount: ${result.rowCount}`);
        
        if (result.rowCount === 0) {
          console.log(`❌ [TRANSACTION] Column ${id} não foi atualizada`);
          throw new Error(`Column with id ${id} not found during transaction`);
        }
      }
      
      console.log("✅ [TRANSACTION] Todas as columns reordenadas com sucesso (transação concluída)");
    });
  }

  async reorderTasks(reorderedTasks: { id: string; position: number }[]): Promise<void> {
    console.log("🔄 [TRANSACTION] Reordenando tasks:", reorderedTasks.map(t => ({ id: t.id, position: t.position })));
    
    // Validar se todas as tasks existem antes da transação
    const taskIds = reorderedTasks.map(t => t.id);
    const existingTasks = await db.select({ id: tasks.id, title: tasks.title }).from(tasks).where(inArray(tasks.id, taskIds));
    console.log("🔍 [TRANSACTION] Tasks existentes no DB:", existingTasks);
    
    const foundTaskIds = existingTasks.map(t => t.id);
    const missingTaskIds = taskIds.filter(id => !foundTaskIds.includes(id));
    
    if (missingTaskIds.length > 0) {
      console.log("❌ [TRANSACTION] Tasks não encontradas:", missingTaskIds);
      throw new Error(`Tasks not found: ${missingTaskIds.join(', ')}`);
    }
    
    // 🔒 TRANSAÇÃO: Garantir que todas as posições sejam atualizadas ou nenhuma
    await db.transaction(async (tx) => {
      console.log(`🔒 [TRANSACTION] Iniciando transação para reordenar ${reorderedTasks.length} tasks`);
      
      for (const { id, position } of reorderedTasks) {
        const result = await tx
          .update(tasks)
          .set({ position })
          .where(eq(tasks.id, id));
        
        console.log(`✅ [TRANSACTION] Task ${id} -> position ${position}, rowCount: ${result.rowCount}`);
        
        if (result.rowCount === 0) {
          console.log(`❌ [TRANSACTION] Task ${id} não foi atualizada`);
          throw new Error(`Task with id ${id} not found during transaction`);
        }
      }
      
      console.log("✅ [TRANSACTION] Todas as tasks reordenadas com sucesso (transação concluída)");
    });
  }

  // Team Members methods
  async getTeamMembers(): Promise<TeamMember[]> {
    return await db.select().from(teamMembers);
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const [newMember] = await db
      .insert(teamMembers)
      .values(member)
      .returning();
    return newMember;
  }

  async updateTeamMemberStatus(id: string, status: string): Promise<TeamMember> {
    const [member] = await db
      .update(teamMembers)
      .set({ status })
      .where(eq(teamMembers.id, id))
      .returning();
    
    if (!member) {
      throw new Error(`Team member with id ${id} not found`);
    }
    
    return member;
  }

  // Tags methods
  async getTags(): Promise<Tag[]> {
    return await db.select().from(tags).orderBy(tags.name);
  }

  async getTag(id: string): Promise<Tag | undefined> {
    const [tag] = await db.select().from(tags).where(eq(tags.id, id));
    return tag || undefined;
  }

  async createTag(insertTag: InsertTag): Promise<Tag> {
    const [tag] = await db
      .insert(tags)
      .values(insertTag)
      .returning();
    return tag;
  }

  async updateTag(id: string, updateData: Partial<Tag>): Promise<Tag> {
    const [tag] = await db
      .update(tags)
      .set(updateData)
      .where(eq(tags.id, id))
      .returning();
    
    if (!tag) {
      throw new Error(`Tag with id ${id} not found`);
    }
    
    return tag;
  }

  async deleteTag(id: string): Promise<void> {
    const result = await db.delete(tags).where(eq(tags.id, id));
    if (result.rowCount === 0) {
      throw new Error(`Tag with id ${id} not found`);
    }
  }

  // Teams methods
  async getTeams(): Promise<Team[]> {
    return await db.select().from(teams).orderBy(teams.name);
  }

  async getTeam(id: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team || undefined;
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const [team] = await db
      .insert(teams)
      .values(insertTeam)
      .returning();
    return team;
  }

  async updateTeam(id: string, updateData: UpdateTeam): Promise<Team> {
    const [team] = await db
      .update(teams)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, id))
      .returning();
    
    if (!team) {
      throw new Error(`Team with id ${id} not found`);
    }
    
    return team;
  }

  async deleteTeam(id: string): Promise<void> {
    const result = await db.delete(teams).where(eq(teams.id, id));
    if (result.rowCount === 0) {
      throw new Error(`Team with id ${id} not found`);
    }
  }

  // Users methods
  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.name);
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        avatar: insertUser.avatar || insertUser.name.split(' ').map(n => n[0]).join('').toUpperCase()
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updateData: UpdateUser): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    
    if (!user) {
      throw new Error(`User with id ${id} not found`);
    }
    
    return user;
  }

  async updateUserPassword(id: string, newPassword: string): Promise<void> {
    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const result = await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));
    
    if (result.rowCount === 0) {
      throw new Error(`User with id ${id} not found`);
    }
  }

  async deleteUser(id: string): Promise<void> {
    const result = await db.delete(users).where(eq(users.id, id));
    if (result.rowCount === 0) {
      throw new Error(`User with id ${id} not found`);
    }
  }

  // User Teams methods for DatabaseStorage
  async getAllUserTeams(): Promise<UserTeam[]> {
    return await db.select().from(userTeams);
  }

  async getUserTeams(userId: string): Promise<UserTeam[]> {
    return await db.select().from(userTeams).where(eq(userTeams.userId, userId));
  }

  async getTeamUsers(teamId: string): Promise<UserTeam[]> {
    return await db.select().from(userTeams).where(eq(userTeams.teamId, teamId));
  }

  async addUserToTeam(insertUserTeam: InsertUserTeam): Promise<UserTeam> {
    const [userTeam] = await db
      .insert(userTeams)
      .values(insertUserTeam)
      .returning();
    return userTeam;
  }

  async removeUserFromTeam(userId: string, teamId: string): Promise<void> {
    const result = await db
      .delete(userTeams)
      .where(and(eq(userTeams.userId, userId), eq(userTeams.teamId, teamId)));
    
    if (result.rowCount === 0) {
      throw new Error(`User ${userId} not found in team ${teamId}`);
    }
  }

  async updateUserTeamRole(userId: string, teamId: string, role: string): Promise<UserTeam> {
    const [userTeam] = await db
      .update(userTeams)
      .set({ role })
      .where(and(eq(userTeams.userId, userId), eq(userTeams.teamId, teamId)))
      .returning();
    
    if (!userTeam) {
      throw new Error(`User ${userId} not found in team ${teamId}`);
    }
    
    return userTeam;
  }

  // Profiles methods for DatabaseStorage
  async getProfiles(): Promise<Profile[]> {
    return await db.select().from(profiles).orderBy(profiles.name);
  }

  async getProfile(id: string): Promise<Profile | undefined> {
    const [profile] = await db.select().from(profiles).where(eq(profiles.id, id));
    return profile || undefined;
  }

  async createProfile(insertProfile: InsertProfile): Promise<Profile> {
    const [profile] = await db
      .insert(profiles)
      .values(insertProfile)
      .returning();
    return profile;
  }

  async updateProfile(id: string, updateData: UpdateProfile): Promise<Profile> {
    const [profile] = await db
      .update(profiles)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, id))
      .returning();
    
    if (!profile) {
      throw new Error(`Profile with id ${id} not found`);
    }
    
    return profile;
  }

  async deleteProfile(id: string): Promise<void> {
    const result = await db.delete(profiles).where(eq(profiles.id, id));
    if (result.rowCount === 0) {
      throw new Error(`Profile with id ${id} not found`);
    }
  }

  // Permissions methods for DatabaseStorage
  async getPermissions(): Promise<Permission[]> {
    return await db.select().from(permissions).orderBy(permissions.category, permissions.name);
  }

  async getPermission(id: string): Promise<Permission | undefined> {
    const [permission] = await db.select().from(permissions).where(eq(permissions.id, id));
    return permission || undefined;
  }

  async createPermission(insertPermission: InsertPermission): Promise<Permission> {
    const [permission] = await db
      .insert(permissions)
      .values(insertPermission)
      .returning();
    return permission;
  }

  async updatePermission(id: string, updateData: Partial<Permission>): Promise<Permission> {
    const [permission] = await db
      .update(permissions)
      .set(updateData)
      .where(eq(permissions.id, id))
      .returning();
    
    if (!permission) {
      throw new Error(`Permission with id ${id} not found`);
    }
    
    return permission;
  }

  async deletePermission(id: string): Promise<void> {
    const result = await db.delete(permissions).where(eq(permissions.id, id));
    if (result.rowCount === 0) {
      throw new Error(`Permission with id ${id} not found`);
    }
  }

  // Profile Permissions methods for DatabaseStorage
  async getAllProfilePermissions(): Promise<ProfilePermission[]> {
    return await db.select().from(profilePermissions);
  }

  async getProfilePermissions(profileId: string): Promise<ProfilePermission[]> {
    return await db.select().from(profilePermissions).where(eq(profilePermissions.profileId, profileId));
  }

  async addPermissionToProfile(profileId: string, permissionId: string): Promise<ProfilePermission> {
    // Verificar se já existe antes de inserir
    const existing = await db
      .select()
      .from(profilePermissions)
      .where(and(eq(profilePermissions.profileId, profileId), eq(profilePermissions.permissionId, permissionId)));
    
    if (existing.length > 0) {
      return existing[0];
    }
    
    const [profilePermission] = await db
      .insert(profilePermissions)
      .values({ profileId, permissionId })
      .returning();
    return profilePermission;
  }

  async removePermissionFromProfile(profileId: string, permissionId: string): Promise<void> {
    const result = await db
      .delete(profilePermissions)
      .where(and(eq(profilePermissions.profileId, profileId), eq(profilePermissions.permissionId, permissionId)));
    if (result.rowCount === 0) {
      throw new Error(`Profile permission not found`);
    }
  }

  // Team Profiles methods for DatabaseStorage
  async getAllTeamProfiles(): Promise<TeamProfile[]> {
    return await db.select().from(teamProfiles);
  }

  async getTeamProfiles(teamId: string): Promise<TeamProfile[]> {
    return await db.select().from(teamProfiles).where(eq(teamProfiles.teamId, teamId));
  }

  async assignProfileToTeam(teamId: string, profileId: string): Promise<TeamProfile> {
    const [teamProfile] = await db
      .insert(teamProfiles)
      .values({ teamId, profileId })
      .returning();
    return teamProfile;
  }

  async deleteTeamProfile(id: string): Promise<void> {
    const result = await db.delete(teamProfiles).where(eq(teamProfiles.id, id));
    if (result.rowCount === 0) {
      throw new Error("Team profile not found");
    }
  }

  async removeProfileFromTeam(teamId: string, profileId: string): Promise<void> {
    const result = await db
      .delete(teamProfiles)
      .where(and(eq(teamProfiles.teamId, teamId), eq(teamProfiles.profileId, profileId)));
    if (result.rowCount === 0) {
      throw new Error(`Team profile not found`);
    }
  }

  // 🚀 OPTIMIZED: User Permissions para DatabaseStorage
  async getUserPermissions(userId: string): Promise<Permission[]> {
    const startTime = Date.now();
    try {
      // 🚀 USAR QUERY ULTRA-OTIMIZADA COM CACHE
      const result = await OptimizedQueries.getUserPermissionsOptimized(userId);
      
      // Ensure result is an array
      const permissions = Array.isArray(result) ? result : [];
      
      if (permissions.length === 0) {
        console.log("⚠️ [SECURITY] Usuário sem permissões ou não encontrado");
        return [];
      }

      const duration = Date.now() - startTime;
      PerformanceStats.trackQuery('getUserPermissions_DB', duration);
      console.log(`🚀 [DB-PERF] ${permissions.length} permissões em ${duration}ms (OTIMIZADO)`);
      return permissions;
    } catch (error) {
      const duration = Date.now() - startTime;
      PerformanceStats.trackQuery('getUserPermissions_DB_error', duration);
      console.error("❌ [SECURITY] Erro em getUserPermissions:", error);
      return [];
    }
  }

  async addPermissionToUser(userId: string, permissionId: string): Promise<any> {
    // Para demonstração, atribuir via perfil padrão do usuário
    const user = await this.getUser(userId);
    if (user?.profileId) {
      return await this.addPermissionToProfile(user.profileId, permissionId);
    }
    throw new Error("User has no profile assigned");
  }

  async removePermissionFromUser(userId: string, permissionId: string): Promise<void> {
    // Para demonstração, remover via perfil padrão do usuário
    const user = await this.getUser(userId);
    if (user?.profileId) {
      return await this.removePermissionFromProfile(user.profileId, permissionId);
    }
    throw new Error("User has no profile assigned");
  }

  async getTeamPermissions(teamId: string): Promise<Permission[]> {
    try {
      // Buscar perfis associados ao time
      const teamProfilesData = await this.getTeamProfiles(teamId);
      
      if (teamProfilesData.length === 0) {
        return [];
      }
      
      // Buscar permissões de todos os perfis do time
      const allPermissions: Permission[] = [];
      for (const teamProfile of teamProfilesData) {
        const profilePerms = await this.getProfilePermissions(teamProfile.profileId);
        for (const pp of profilePerms) {
          const permission = await this.getPermission(pp.permissionId);
          if (permission && !allPermissions.find(p => p.id === permission.id)) {
            allPermissions.push(permission);
          }
        }
      }
      
      return allPermissions;
    } catch (error) {
      console.error("Error in getTeamPermissions:", error);
      return [];
    }
  }

  async addPermissionToTeam(teamId: string, permissionId: string): Promise<any> {
    try {
      // Buscar perfis do time
      const teamProfilesData = await this.getTeamProfiles(teamId);
      
      if (teamProfilesData.length === 0) {
        // Se não tem perfil, criar um perfil padrão para o time
        const defaultProfile = await this.createProfile({
          name: `Perfil ${teamId}`,
          description: `Perfil automático para o time ${teamId}`,
          color: '#6366f1'
        });
        
        await this.assignProfileToTeam(teamId, defaultProfile.id);
        return await this.addPermissionToProfile(defaultProfile.id, permissionId);
      } else {
        // Adicionar permissão ao primeiro perfil do time
        return await this.addPermissionToProfile(teamProfilesData[0].profileId, permissionId);
      }
    } catch (error) {
      console.error("Error adding permission to team:", error);
      throw error;
    }
  }

  async removePermissionFromTeam(teamId: string, permissionId: string): Promise<void> {
    try {
      // Buscar perfis do time
      const teamProfilesData = await this.getTeamProfiles(teamId);
      
      // Remover a permissão de todos os perfis do time
      for (const teamProfile of teamProfilesData) {
        try {
          await this.removePermissionFromProfile(teamProfile.profileId, permissionId);
        } catch (error) {
          // Continuar mesmo se não encontrar a permissão em um perfil
          console.warn(`Permission ${permissionId} not found in profile ${teamProfile.profileId}`);
        }
      }
    } catch (error) {
      console.error("Error removing permission from team:", error);
      throw error;
    }
  }

  // Board Shares methods
  async getBoardShares(boardId: string): Promise<BoardShare[]> {
    return await db.select().from(boardShares).where(eq(boardShares.boardId, boardId)).orderBy(desc(boardShares.createdAt));
  }

  async getAllBoardShares(): Promise<BoardShare[]> {
    return await db.select().from(boardShares).orderBy(desc(boardShares.createdAt));
  }

  async getUserSharedBoards(userId: string): Promise<BoardShare[]> {
    return await db.select().from(boardShares).where(and(eq(boardShares.shareWithId, userId), eq(boardShares.shareType, "user")));
  }

  async getTeamSharedBoards(teamId: string): Promise<BoardShare[]> {
    return await db.select().from(boardShares).where(and(eq(boardShares.shareWithId, teamId), eq(boardShares.shareType, "team")));
  }

  async getBoardMembers(boardId: string): Promise<User[]> {
    // Query otimizada: busca todos os usuários em uma única consulta com UNION
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        password: users.password,
        role: users.role,
        avatar: users.avatar,
        status: users.status,
        profileId: users.profileId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(
        or(
          // Usuários diretamente compartilhados
          inArray(
            users.id,
            db.select({ userId: boardShares.shareWithId })
              .from(boardShares)
              .where(
                and(
                  eq(boardShares.boardId, boardId),
                  eq(boardShares.shareType, "user")
                )
              )
          ),
          // Usuários de teams compartilhados
          inArray(
            users.id,
            db.select({ userId: userTeams.userId })
              .from(userTeams)
              .innerJoin(
                boardShares,
                and(
                  eq(userTeams.teamId, boardShares.shareWithId),
                  eq(boardShares.boardId, boardId),
                  eq(boardShares.shareType, "team")
                )
              )
          )
        )
      );

    return allUsers;
  }

  async getBoardMemberCount(boardId: string): Promise<number> {
    const members = await this.getBoardMembers(boardId);
    return members.length;
  }

  async createBoardShare(share: InsertBoardShare): Promise<BoardShare> {
    const [newShare] = await db
      .insert(boardShares)
      .values(share)
      .returning();
    return newShare;
  }

  async updateBoardShare(id: string, share: UpdateBoardShare): Promise<BoardShare> {
    const [updatedShare] = await db
      .update(boardShares)
      .set(share)
      .where(eq(boardShares.id, id))
      .returning();

    if (!updatedShare) {
      throw new Error(`BoardShare with id ${id} not found`);
    }

    return updatedShare;
  }

  async deleteBoardShare(id: string): Promise<void> {
    const result = await db.delete(boardShares).where(eq(boardShares.id, id));
    if (result.rowCount === 0) {
      throw new Error(`BoardShare with id ${id} not found`);
    }
  }

  async getUserBoardPermission(userId: string, boardId: string): Promise<string | null> {
    // Check direct user share
    const [userShare] = await db
      .select()
      .from(boardShares)
      .where(
        and(
          eq(boardShares.boardId, boardId),
          eq(boardShares.shareWithId, userId),
          eq(boardShares.shareType, "user")
        )
      );

    if (userShare) {
      return userShare.permission;
    }

    // Check team shares for user
    const userTeams = await this.getUserTeams(userId);
    for (const userTeam of userTeams) {
      const [teamShare] = await db
        .select()
        .from(boardShares)
        .where(
          and(
            eq(boardShares.boardId, boardId),
            eq(boardShares.shareWithId, userTeam.teamId),
            eq(boardShares.shareType, "team")
          )
        );

      if (teamShare) {
        return teamShare.permission;
      }
    }

    return null;
  }

  // Task Events methods
  async getTaskEvents(taskId: string): Promise<TaskEvent[]> {
    return await db.select().from(taskEvents).where(eq(taskEvents.taskId, taskId)).orderBy(desc(taskEvents.createdAt));
  }

  async createTaskEvent(event: InsertTaskEvent): Promise<TaskEvent> {
    const [newEvent] = await db
      .insert(taskEvents)
      .values(event)
      .returning();
    return newEvent;
  }

  // Export History Methods
  async getExportHistory(userId: string): Promise<ExportHistory[]> {
    return await db.select().from(exportHistory)
      .where(eq(exportHistory.userId, userId))
      .orderBy(desc(exportHistory.createdAt))
      .limit(50);
  }

  async createExportHistory(exportData: InsertExportHistory): Promise<ExportHistory> {
    const [export_record] = await db.insert(exportHistory)
      .values(exportData)
      .returning();
    return export_record;
  }

  async updateExportHistory(id: string, updates: Partial<ExportHistory>): Promise<ExportHistory> {
    const [updated] = await db.update(exportHistory)
      .set(updates)
      .where(eq(exportHistory.id, id))
      .returning();
    return updated;
  }

  // Task Status methods
  async getTaskStatuses(): Promise<TaskStatus[]> {
    return await db.select().from(taskStatuses).orderBy(taskStatuses.position);
  }

  async getTaskStatus(id: string): Promise<TaskStatus | undefined> {
    const [status] = await db.select().from(taskStatuses).where(eq(taskStatuses.id, id));
    return status || undefined;
  }

  async createTaskStatus(insertStatus: InsertTaskStatus): Promise<TaskStatus> {
    const [status] = await db
      .insert(taskStatuses)
      .values({
        ...insertStatus,
      })
      .returning();
    return status;
  }

  async updateTaskStatus(id: string, updateData: UpdateTaskStatus): Promise<TaskStatus> {
    const [status] = await db
      .update(taskStatuses)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(taskStatuses.id, id))
      .returning();
    
    if (!status) {
      throw new Error(`TaskStatus with id ${id} not found`);
    }
    
    return status;
  }

  async deleteTaskStatus(id: string): Promise<void> {
    const result = await db.delete(taskStatuses).where(eq(taskStatuses.id, id));
    if (result.rowCount === 0) {
      throw new Error(`TaskStatus with id ${id} not found`);
    }
  }

  // Task Priority methods
  async getTaskPriorities(): Promise<TaskPriority[]> {
    return await db.select().from(taskPriorities).orderBy(taskPriorities.level);
  }

  async getTaskPriority(id: string): Promise<TaskPriority | undefined> {
    const [priority] = await db.select().from(taskPriorities).where(eq(taskPriorities.id, id));
    return priority || undefined;
  }

  async createTaskPriority(insertPriority: InsertTaskPriority): Promise<TaskPriority> {
    const [priority] = await db
      .insert(taskPriorities)
      .values({
        ...insertPriority,
      })
      .returning();
    return priority;
  }

  async updateTaskPriority(id: string, updateData: UpdateTaskPriority): Promise<TaskPriority> {
    const [priority] = await db
      .update(taskPriorities)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(taskPriorities.id, id))
      .returning();
    
    if (!priority) {
      throw new Error(`TaskPriority with id ${id} not found`);
    }
    
    return priority;
  }

  async deleteTaskPriority(id: string): Promise<void> {
    const result = await db.delete(taskPriorities).where(eq(taskPriorities.id, id));
    if (result.rowCount === 0) {
      throw new Error(`TaskPriority with id ${id} not found`);
    }
  }

  // Notifications Implementation
  async getNotifications(userId: string): Promise<Notification[]> {
    const cacheKey = `notifications:user:${userId}`;
    const cached = await cache.get<Notification[]>(cacheKey);
    if (cached) return cached;

    const result = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
    
    await cache.set(cacheKey, result, TTL.SHORT);
    return result;
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    const cacheKey = `notification:${id}`;
    const cached = await cache.get<Notification>(cacheKey);
    if (cached) return cached;

    const result = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id));
    
    const notification = result[0];
    if (notification) {
      await cache.set(cacheKey, notification, TTL.SHORT);
    }
    return notification;
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values({
        ...insertNotification,
        metadata: insertNotification.metadata || "{}",
      })
      .returning();
    
    // Invalidate user cache
    await cache.del(`notifications:user:${notification.userId}`);
    await cache.del(`notifications:unread:${notification.userId}`);
    
    return notification;
  }

  async updateNotification(id: string, updateData: UpdateNotification): Promise<Notification> {
    const [notification] = await db
      .update(notifications)
      .set({
        ...updateData,
      })
      .where(eq(notifications.id, id))
      .returning();
    
    if (!notification) {
      throw new Error(`Notification with id ${id} not found`);
    }

    // Invalidate caches
    await cache.del(`notification:${id}`);
    await cache.del(`notifications:user:${notification.userId}`);
    await cache.del(`notifications:unread:${notification.userId}`);
    
    return notification;
  }

  async deleteNotification(id: string): Promise<void> {
    const notification = await this.getNotification(id);
    if (!notification) {
      throw new Error(`Notification with id ${id} not found`);
    }

    const result = await db.delete(notifications).where(eq(notifications.id, id));
    if (result.rowCount === 0) {
      throw new Error(`Notification with id ${id} not found`);
    }

    // Invalidate caches
    await cache.del(`notification:${id}`);
    await cache.del(`notifications:user:${notification.userId}`);
    await cache.del(`notifications:unread:${notification.userId}`);
  }

  async markNotificationAsRead(id: string): Promise<Notification> {
    const [notification] = await db
      .update(notifications)
      .set({
        isRead: "true",
        readAt: new Date(),
      })
      .where(eq(notifications.id, id))
      .returning();
    
    if (!notification) {
      throw new Error(`Notification with id ${id} not found`);
    }

    // Invalidate caches
    await cache.del(`notification:${id}`);
    await cache.del(`notifications:user:${notification.userId}`);
    await cache.del(`notifications:unread:${notification.userId}`);
    
    return notification;
  }

  async markAllNotificationsAsRead(userId: string): Promise<number> {
    const result = await db
      .update(notifications)
      .set({
        isRead: "true",
        readAt: new Date(),
      })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, "false")
      ));

    // Invalidate caches
    await cache.del(`notifications:user:${userId}`);
    await cache.del(`notifications:unread:${userId}`);
    
    return result.rowCount || 0;
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const cacheKey = `notifications:unread:${userId}`;
    const cached = await cache.get<number>(cacheKey);
    if (cached !== null) return cached;

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, "false")
      ));
    
    const count = result[0]?.count || 0;
    await cache.set(cacheKey, count, TTL.SHORT);
    return count;
  }

  async deleteExpiredNotifications(): Promise<number> {
    const result = await db
      .delete(notifications)
      .where(and(
        sql`expires_at IS NOT NULL`,
        sql`expires_at < NOW()`
      ));
    
    // Clear all notification caches since we don't know which users were affected
    await cache.invalidatePattern("notifications:*");
    
    return result.rowCount || 0;
  }

}

export const storage = new DatabaseStorage();
