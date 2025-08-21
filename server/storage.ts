import { type Task, type InsertTask, type UpdateTask, type Column, type InsertColumn, type TeamMember, type InsertTeamMember } from "@shared/schema";
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
  updateColumn(id: string, column: Partial<Column>): Promise<Column>;
  
  // Team Members
  getTeamMembers(): Promise<TeamMember[]>;
  createTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  updateTeamMemberStatus(id: string, status: string): Promise<TeamMember>;
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
        assigneeId: members[0]?.id,
        assigneeName: members[0]?.name,
        assigneeAvatar: members[0]?.avatar,
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
        assigneeId: members[1]?.id,
        assigneeName: members[1]?.name,
        assigneeAvatar: members[1]?.avatar,
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
        assigneeId: members[3]?.id,
        assigneeName: members[3]?.name,
        assigneeAvatar: members[3]?.avatar,
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
        assigneeId: members[0]?.id,
        assigneeName: members[0]?.name,
        assigneeAvatar: members[0]?.avatar,
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
        assigneeId: members[2]?.id,
        assigneeName: members[2]?.name,
        assigneeAvatar: members[2]?.avatar,
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
        assigneeId: members[3]?.id,
        assigneeName: members[3]?.name,
        assigneeAvatar: members[3]?.avatar,
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

  async createColumn(column: InsertColumn): Promise<Column> {
    this.columns.set(column.id, column);
    return column;
  }

  async updateColumn(id: string, updateData: Partial<Column>): Promise<Column> {
    const existingColumn = this.columns.get(id);
    if (!existingColumn) {
      throw new Error(`Column with id ${id} not found`);
    }
    
    const updatedColumn: Column = {
      ...existingColumn,
      ...updateData,
    };
    
    this.columns.set(id, updatedColumn);
    return updatedColumn;
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

export const storage = new MemStorage();
