import { type Task, type InsertTask, type UpdateTask, type Column, type InsertColumn, type UpdateColumn, type TeamMember, type InsertTeamMember, type Tag, type InsertTag, type Team, type InsertTeam, type UpdateTeam, type User, type InsertUser, type UpdateUser } from "@shared/schema";
import { db } from "./db";
import { tasks, columns, teamMembers, tags, teams, users } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Tasks
  getTasks(): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: UpdateTask): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  
  // Columns
  getColumns(): Promise<Column[]>;
  getColumn(id: string): Promise<Column | undefined>;
  createColumn(column: InsertColumn): Promise<Column>;
  updateColumn(id: string, data: UpdateColumn): Promise<Column>;
  deleteColumn(id: string): Promise<void>;
  reorderColumns(reorderedColumns: { id: string; position: number }[]): Promise<void>;
  
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
  deleteUser(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private tasks: Map<string, Task>;
  private columns: Map<string, Column>;
  private teamMembers: Map<string, TeamMember>;

  constructor() {
    this.tasks = new Map();
    this.columns = new Map();
    this.teamMembers = new Map();
    
    // Initialize default columns
    this.initializeDefaultColumns();
    this.initializeDefaultTeamMembers();
    this.initializeDefaultTasks();
  }

  // Tags methods for MemStorage
  async getTags(): Promise<Tag[]> {
    // Return default tags for memory storage
    return [
      { id: "1", name: "design", color: "#8b5cf6", createdAt: new Date() },
      { id: "2", name: "ui", color: "#06b6d4", createdAt: new Date() },
      { id: "3", name: "backend", color: "#f59e0b", createdAt: new Date() },
      { id: "4", name: "api", color: "#ef4444", createdAt: new Date() },
      { id: "5", name: "performance", color: "#10b981", createdAt: new Date() },
      { id: "6", name: "optimization", color: "#3b82f6", createdAt: new Date() },
    ];
  }

  async getTag(id: string): Promise<Tag | undefined> {
    const tags = await this.getTags();
    return tags.find(tag => tag.id === id);
  }

  async createTag(insertTag: InsertTag): Promise<Tag> {
    const tag: Tag = {
      id: randomUUID(),
      ...insertTag,
      color: insertTag.color || "#3b82f6",
      createdAt: new Date(),
    };
    return tag;
  }

  async updateTag(id: string, updateData: Partial<Tag>): Promise<Tag> {
    const existingTag = await this.getTag(id);
    if (!existingTag) {
      throw new Error(`Tag with id ${id} not found`);
    }
    return { ...existingTag, ...updateData };
  }

  async deleteTag(id: string): Promise<void> {
    const existingTag = await this.getTag(id);
    if (!existingTag) {
      throw new Error(`Tag with id ${id} not found`);
    }
  }

  // Teams methods for MemStorage
  async getTeams(): Promise<Team[]> {
    return [
      { id: "team-1", name: "Desenvolvimento", description: "Equipe responsável pelo desenvolvimento", color: "#3b82f6", createdAt: new Date(), updatedAt: new Date() },
      { id: "team-2", name: "Design", description: "Equipe de design e UX", color: "#8b5cf6", createdAt: new Date(), updatedAt: new Date() },
      { id: "team-3", name: "Product", description: "Gestão de produto e estratégia", color: "#10b981", createdAt: new Date(), updatedAt: new Date() },
    ];
  }

  async getTeam(id: string): Promise<Team | undefined> {
    const teams = await this.getTeams();
    return teams.find(team => team.id === id);
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const team: Team = {
      id: randomUUID(),
      ...insertTeam,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return team;
  }

  async updateTeam(id: string, updateData: UpdateTeam): Promise<Team> {
    const existingTeam = await this.getTeam(id);
    if (!existingTeam) {
      throw new Error(`Team with id ${id} not found`);
    }
    return { ...existingTeam, ...updateData, updatedAt: new Date() };
  }

  async deleteTeam(id: string): Promise<void> {
    const existingTeam = await this.getTeam(id);
    if (!existingTeam) {
      throw new Error(`Team with id ${id} not found`);
    }
  }

  // Users methods for MemStorage
  async getUsers(): Promise<User[]> {
    return [
      { id: "1", name: "Ana Maria", email: "ana.maria@example.com", role: "Designer UX/UI", avatar: "AM", status: "online", teamId: "team-2", createdAt: new Date(), updatedAt: new Date() },
      { id: "2", name: "João Silva", email: "joao.silva@example.com", role: "Full Stack Developer", avatar: "JS", status: "busy", teamId: "team-1", createdAt: new Date(), updatedAt: new Date() },
      { id: "3", name: "Maria Costa", email: "maria.costa@example.com", role: "Product Manager", avatar: "MC", status: "online", teamId: "team-3", createdAt: new Date(), updatedAt: new Date() },
      { id: "4", name: "Rafael Santos", email: "rafael.santos@example.com", role: "Backend Developer", avatar: "RF", status: "offline", teamId: "team-1", createdAt: new Date(), updatedAt: new Date() },
      { id: "5", name: "Lucas Oliveira", email: "lucas.oliveira@example.com", role: "DevOps Engineer", avatar: "LC", status: "online", teamId: "team-1", createdAt: new Date(), updatedAt: new Date() },
    ];
  }

  async getUser(id: string): Promise<User | undefined> {
    const users = await this.getUsers();
    return users.find(user => user.id === id);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      id: randomUUID(),
      ...insertUser,
      role: insertUser.role || null,
      avatar: insertUser.avatar || insertUser.name.split(' ').map(n => n[0]).join('').toUpperCase(),
      status: insertUser.status || "offline",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return user;
  }

  async updateUser(id: string, updateData: UpdateUser): Promise<User> {
    const existingUser = await this.getUser(id);
    if (!existingUser) {
      throw new Error(`User with id ${id} not found`);
    }
    return { ...existingUser, ...updateData, updatedAt: new Date() };
  }

  async deleteUser(id: string): Promise<void> {
    const existingUser = await this.getUser(id);
    if (!existingUser) {
      throw new Error(`User with id ${id} not found`);
    }
  }

  private initializeDefaultColumns() {
    const defaultColumns: Column[] = [
      { id: "backlog", title: "Backlog", position: 0, wipLimit: null, color: "gray" },
      { id: "todo", title: "To Do", position: 1, wipLimit: 5, color: "blue" },
      { id: "inprogress", title: "In Progress", position: 2, wipLimit: 3, color: "yellow" },
      { id: "review", title: "Review", position: 3, wipLimit: 4, color: "purple" },
      { id: "done", title: "Done", position: 4, wipLimit: null, color: "green" },
    ];
    
    defaultColumns.forEach(column => {
      this.columns.set(column.id, column);
    });
  }

  private initializeDefaultTeamMembers() {
    const defaultMembers: TeamMember[] = [
      { id: randomUUID(), name: "Ana Maria", role: "Designer UX/UI", avatar: "AM", status: "online" },
      { id: randomUUID(), name: "João Silva", role: "Full Stack Developer", avatar: "JS", status: "busy" },
      { id: randomUUID(), name: "Maria Costa", role: "Product Manager", avatar: "MC", status: "online" },
      { id: randomUUID(), name: "Rafael Santos", role: "Backend Developer", avatar: "RF", status: "offline" },
      { id: randomUUID(), name: "Lucas Oliveira", role: "DevOps Engineer", avatar: "LC", status: "online" },
    ];
    
    defaultMembers.forEach(member => {
      this.teamMembers.set(member.id, member);
    });
  }

  private initializeDefaultTasks() {
    // Get team members for assignment
    const members = Array.from(this.teamMembers.values());
    
    const defaultTasks: Omit<Task, 'id'>[] = [
      {
        title: "Redesign da página inicial",
        description: "Atualizar o design da landing page com nova identidade visual e melhorar conversão",
        status: "backlog",
        priority: "high",
        assigneeId: members[0]?.id || "",
        assigneeName: members[0]?.name || "",
        assigneeAvatar: members[0]?.avatar || "",
        progress: 0,
        tags: ["design", "ui"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "Integração com API de pagamento",
        description: "Implementar gateway de pagamento para checkout",
        status: "backlog",
        priority: "medium",
        assigneeId: members[1]?.id || "",
        assigneeName: members[1]?.name || "",
        assigneeAvatar: members[1]?.avatar || "",
        progress: 0,
        tags: ["backend", "api"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "Otimização de performance",
        description: "Melhorar tempo de carregamento das páginas principais",
        status: "todo",
        priority: "high",
        assigneeId: members[3]?.id || "",
        assigneeName: members[3]?.name || "",
        assigneeAvatar: members[3]?.avatar || "",
        progress: 0,
        tags: ["performance", "optimization"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "Dashboard analytics",
        description: "Implementar gráficos e métricas no painel administrativo",
        status: "inprogress",
        priority: "high",
        assigneeId: members[0]?.id || "",
        assigneeName: members[0]?.name || "",
        assigneeAvatar: members[0]?.avatar || "",
        progress: 65,
        tags: ["analytics", "dashboard"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "Sistema de notificações",
        description: "Implementação de notificações push e email",
        status: "review",
        priority: "medium",
        assigneeId: members[2]?.id || "",
        assigneeName: members[2]?.name || "",
        assigneeAvatar: members[2]?.avatar || "",
        progress: 100,
        tags: ["notifications", "backend"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "Login social OAuth",
        description: "Integração com Google, Facebook e GitHub",
        status: "done",
        priority: "high",
        assigneeId: members[3]?.id || "",
        assigneeName: members[3]?.name || "",
        assigneeAvatar: members[3]?.avatar || "",
        progress: 100,
        tags: ["auth", "oauth"],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    
    defaultTasks.forEach(taskData => {
      const task: Task = {
        id: randomUUID(),
        ...taskData,
      };
      this.tasks.set(task.id, task);
    });
  }

  // Task methods
  async getTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async getTask(id: string): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = randomUUID();
    const task: Task = {
      ...insertTask,
      id,
      description: insertTask.description || "",
      status: insertTask.status || "backlog",
      priority: insertTask.priority || "medium",
      assigneeId: insertTask.assigneeId || "",
      assigneeName: insertTask.assigneeName || "",
      assigneeAvatar: insertTask.assigneeAvatar || "",
      tags: insertTask.tags || [],
      progress: insertTask.progress || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: string, updateData: UpdateTask): Promise<Task> {
    const existingTask = this.tasks.get(id);
    if (!existingTask) {
      throw new Error(`Task with id ${id} not found`);
    }
    
    const updatedTask: Task = {
      ...existingTask,
      ...updateData,
      updatedAt: new Date(),
    };
    
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteTask(id: string): Promise<void> {
    if (!this.tasks.has(id)) {
      throw new Error(`Task with id ${id} not found`);
    }
    this.tasks.delete(id);
  }

  // Column methods
  async getColumns(): Promise<Column[]> {
    return Array.from(this.columns.values()).sort((a, b) => a.position - b.position);
  }

  async getColumn(id: string): Promise<Column | undefined> {
    return this.columns.get(id);
  }

  async createColumn(insertColumn: InsertColumn): Promise<Column> {
    const id = insertColumn.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const column: Column = {
      id: id || `column-${Date.now()}`,
      ...insertColumn,
      wipLimit: insertColumn.wipLimit || null,
    };
    this.columns.set(column.id, column);
    return column;
  }

  async updateColumn(id: string, data: UpdateColumn): Promise<Column> {
    const existingColumn = this.columns.get(id);
    if (!existingColumn) {
      throw new Error(`Column with id ${id} not found`);
    }
    
    const updatedColumn = { ...existingColumn, ...data };
    this.columns.set(id, updatedColumn);
    return updatedColumn;
  }

  async deleteColumn(id: string): Promise<void> {
    const existingColumn = this.columns.get(id);
    if (!existingColumn) {
      throw new Error(`Column with id ${id} not found`);
    }
    
    // Move tasks from deleted column to backlog
    const tasks = Array.from(this.tasks.values());
    tasks.forEach(task => {
      if (task.status === id) {
        this.tasks.set(task.id, { ...task, status: "backlog" });
      }
    });
    
    this.columns.delete(id);
  }

  async reorderColumns(reorderedColumns: { id: string; position: number }[]): Promise<void> {
    reorderedColumns.forEach(({ id, position }) => {
      const column = this.columns.get(id);
      if (column) {
        this.columns.set(id, { ...column, position });
      }
    });
  }

  // Team member methods
  async getTeamMembers(): Promise<TeamMember[]> {
    return Array.from(this.teamMembers.values());
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const id = randomUUID();
    const teamMember: TeamMember = {
      ...member,
      id,
      role: member.role || "",
      avatar: member.avatar || "",
      status: member.status || "offline",
    };
    this.teamMembers.set(id, teamMember);
    return teamMember;
  }

  async updateTeamMemberStatus(id: string, status: string): Promise<TeamMember> {
    const existingMember = this.teamMembers.get(id);
    if (!existingMember) {
      throw new Error(`Team member with id ${id} not found`);
    }
    
    const updatedMember: TeamMember = {
      ...existingMember,
      status,
    };
    
    this.teamMembers.set(id, updatedMember);
    return updatedMember;
  }
}

export class DatabaseStorage implements IStorage {
  // Task methods
  async getTasks(): Promise<Task[]> {
    return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
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
    return task;
  }

  async updateTask(id: string, updateData: UpdateTask): Promise<Task> {
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
    
    return task;
  }

  async deleteTask(id: string): Promise<void> {
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    if (result.rowCount === 0) {
      throw new Error(`Task with id ${id} not found`);
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
    // Move tasks from deleted column to backlog
    await db
      .update(tasks)
      .set({ status: "backlog" })
      .where(eq(tasks.status, id));
    
    const result = await db.delete(columns).where(eq(columns.id, id));
    if (result.rowCount === 0) {
      throw new Error(`Column with id ${id} not found`);
    }
  }

  async reorderColumns(reorderedColumns: { id: string; position: number }[]): Promise<void> {
    for (const { id, position } of reorderedColumns) {
      await db
        .update(columns)
        .set({ position })
        .where(eq(columns.id, id));
    }
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

  async deleteUser(id: string): Promise<void> {
    const result = await db.delete(users).where(eq(users.id, id));
    if (result.rowCount === 0) {
      throw new Error(`User with id ${id} not found`);
    }
  }
}

export const storage = new DatabaseStorage();
