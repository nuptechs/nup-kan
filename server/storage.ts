import { type Board, type InsertBoard, type UpdateBoard, type Task, type InsertTask, type UpdateTask, type Column, type InsertColumn, type UpdateColumn, type TeamMember, type InsertTeamMember, type Tag, type InsertTag, type Team, type InsertTeam, type UpdateTeam, type User, type InsertUser, type UpdateUser, type Profile, type InsertProfile, type UpdateProfile, type Permission, type InsertPermission, type ProfilePermission, type InsertProfilePermission, type TeamProfile, type InsertTeamProfile, type UserTeam, type InsertUserTeam, type BoardShare, type InsertBoardShare, type UpdateBoardShare, type TaskEvent, type InsertTaskEvent, type ExportHistory, type InsertExportHistory, type TaskStatus, type InsertTaskStatus, type UpdateTaskStatus, type TaskPriority, type InsertTaskPriority, type UpdateTaskPriority, type TaskAssignee, type InsertTaskAssignee } from "@shared/schema";
import { db } from "./db";
import { boards, tasks, columns, teamMembers, tags, teams, users, profiles, permissions, profilePermissions, teamProfiles, userTeams, boardShares, taskEvents, exportHistory, taskStatuses, taskPriorities, taskAssignees } from "@shared/schema";
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

  // Board initialization
  initializeBoardWithDefaults(boardId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private boards: Map<string, Board>;
  private tasks: Map<string, Task>;
  private columns: Map<string, Column>;
  private teamMembers: Map<string, TeamMember>;

  constructor() {
    this.boards = new Map();
    this.tasks = new Map();
    this.columns = new Map();
    this.teamMembers = new Map();
    
    // Initialize default boards, columns, team members and tasks
    this.initializeDefaultBoards();
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
      color: insertTeam.color || "#3b82f6",
      description: insertTeam.description || null,
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
      { id: "1", name: "Ana Maria", email: "ana.maria@example.com", password: null, role: "Designer UX/UI", avatar: "AM", status: "online", profileId: "profile-designer", createdAt: new Date(), updatedAt: new Date() },
      { id: "2", name: "João Silva", email: "joao.silva@example.com", password: null, role: "Full Stack Developer", avatar: "JS", status: "busy", profileId: "profile-developer", createdAt: new Date(), updatedAt: new Date() },
      { id: "3", name: "Maria Costa", email: "maria.costa@example.com", password: null, role: "Product Manager", avatar: "MC", status: "online", profileId: "profile-manager", createdAt: new Date(), updatedAt: new Date() },
      { id: "4", name: "Rafael Santos", email: "rafael.santos@example.com", password: null, role: "Backend Developer", avatar: "RF", status: "offline", profileId: "profile-developer", createdAt: new Date(), updatedAt: new Date() },
      { id: "5", name: "Lucas Oliveira", email: "lucas.oliveira@example.com", password: null, role: "DevOps Engineer", avatar: "LC", status: "online", profileId: "profile-devops", createdAt: new Date(), updatedAt: new Date() },
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
      password: insertUser.password || null,
      role: insertUser.role || null,
      avatar: insertUser.avatar || insertUser.name.split(' ').map(n => n[0]).join('').toUpperCase(),
      status: insertUser.status || "offline",
      profileId: insertUser.profileId || null,
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

  async updateUserPassword(id: string, newPassword: string): Promise<void> {
    const existingUser = await this.getUser(id);
    if (!existingUser) {
      throw new Error(`User with id ${id} not found`);
    }
    // In memory storage simulation - password updated conceptually
  }

  async deleteUser(id: string): Promise<void> {
    const existingUser = await this.getUser(id);
    if (!existingUser) {
      throw new Error(`User with id ${id} not found`);
    }
  }

  // User Teams methods for MemStorage
  async getAllUserTeams(): Promise<UserTeam[]> {
    return [
      { id: "ut-1", userId: "1", teamId: "team-2", role: "member", createdAt: new Date() },
      { id: "ut-2", userId: "2", teamId: "team-1", role: "lead", createdAt: new Date() },
      { id: "ut-3", userId: "3", teamId: "team-3", role: "admin", createdAt: new Date() },
      { id: "ut-4", userId: "4", teamId: "team-1", role: "member", createdAt: new Date() },
      { id: "ut-5", userId: "5", teamId: "team-1", role: "member", createdAt: new Date() },
    ];
  }

  async getUserTeams(userId: string): Promise<UserTeam[]> {
    const userTeamsMock = await this.getAllUserTeams();
    return userTeamsMock.filter(ut => ut.userId === userId);
  }

  async getTeamUsers(teamId: string): Promise<UserTeam[]> {
    const userTeamsMock = [
      { id: "ut-1", userId: "1", teamId: "team-2", role: "member", createdAt: new Date() },
      { id: "ut-2", userId: "2", teamId: "team-1", role: "lead", createdAt: new Date() },
      { id: "ut-3", userId: "3", teamId: "team-3", role: "admin", createdAt: new Date() },
      { id: "ut-4", userId: "4", teamId: "team-1", role: "member", createdAt: new Date() },
      { id: "ut-5", userId: "5", teamId: "team-1", role: "member", createdAt: new Date() },
    ];
    return userTeamsMock.filter(ut => ut.teamId === teamId);
  }

  async addUserToTeam(insertUserTeam: InsertUserTeam): Promise<UserTeam> {
    const userTeam: UserTeam = {
      id: randomUUID(),
      ...insertUserTeam,
      role: insertUserTeam.role || "member",
      createdAt: new Date(),
    };
    return userTeam;
  }

  async removeUserFromTeam(userId: string, teamId: string): Promise<void> {
    // In memory storage simulation - no actual removal needed
  }

  async updateUserTeamRole(userId: string, teamId: string, role: string): Promise<UserTeam> {
    const userTeamsMock = await this.getUserTeams(userId);
    const userTeam = userTeamsMock.find(ut => ut.teamId === teamId);
    if (!userTeam) {
      throw new Error(`User ${userId} not found in team ${teamId}`);
    }
    return { ...userTeam, role };
  }

  // Profiles methods for MemStorage
  async getProfiles(): Promise<Profile[]> {
    return [
      { id: "profile-admin", name: "Administrador", description: "Acesso total ao sistema", color: "#ef4444", isDefault: "false", createdAt: new Date(), updatedAt: new Date() },
      { id: "profile-manager", name: "Gerente", description: "Gerenciamento de projetos e equipes", color: "#8b5cf6", isDefault: "false", createdAt: new Date(), updatedAt: new Date() },
      { id: "profile-developer", name: "Desenvolvedor", description: "Desenvolvimento e edição de tarefas", color: "#3b82f6", isDefault: "true", createdAt: new Date(), updatedAt: new Date() },
      { id: "profile-designer", name: "Designer", description: "Design e prototipação", color: "#06b6d4", isDefault: "false", createdAt: new Date(), updatedAt: new Date() },
      { id: "profile-devops", name: "DevOps", description: "Infraestrutura e deploy", color: "#10b981", isDefault: "false", createdAt: new Date(), updatedAt: new Date() },
    ];
  }

  async getProfile(id: string): Promise<Profile | undefined> {
    const profiles = await this.getProfiles();
    return profiles.find(profile => profile.id === id);
  }

  async createProfile(insertProfile: InsertProfile): Promise<Profile> {
    const profile: Profile = {
      id: randomUUID(),
      ...insertProfile,
      description: insertProfile.description || null,
      color: insertProfile.color || "#3b82f6",
      isDefault: insertProfile.isDefault || "false",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return profile;
  }

  async updateProfile(id: string, updateData: UpdateProfile): Promise<Profile> {
    const existingProfile = await this.getProfile(id);
    if (!existingProfile) {
      throw new Error(`Profile with id ${id} not found`);
    }
    return { ...existingProfile, ...updateData, updatedAt: new Date() };
  }

  async deleteProfile(id: string): Promise<void> {
    const existingProfile = await this.getProfile(id);
    if (!existingProfile) {
      throw new Error(`Profile with id ${id} not found`);
    }
  }

  // Permissions methods for MemStorage
  async getPermissions(): Promise<Permission[]> {
    return [
      // Tarefas
      { id: "perm-task-create", name: "Criar Tarefas", description: "Permitir criação de novas tarefas", category: "tasks", createdAt: new Date() },
      { id: "perm-task-edit", name: "Editar Tarefas", description: "Permitir edição de tarefas existentes", category: "tasks", createdAt: new Date() },
      { id: "perm-task-delete", name: "Excluir Tarefas", description: "Permitir exclusão de tarefas", category: "tasks", createdAt: new Date() },
      { id: "perm-task-assign", name: "Atribuir Tarefas", description: "Permitir atribuição de tarefas a usuários", category: "tasks", createdAt: new Date() },
      
      // Colunas
      { id: "perm-column-create", name: "Criar Colunas", description: "Permitir criação de novas colunas", category: "columns", createdAt: new Date() },
      { id: "perm-column-edit", name: "Editar Colunas", description: "Permitir edição de colunas existentes", category: "columns", createdAt: new Date() },
      { id: "perm-column-delete", name: "Excluir Colunas", description: "Permitir exclusão de colunas", category: "columns", createdAt: new Date() },
      { id: "perm-column-reorder", name: "Reordenar Colunas", description: "Permitir reordenação de colunas", category: "columns", createdAt: new Date() },
      
      // Times
      { id: "perm-team-create", name: "Criar Times", description: "Permitir criação de novos times", category: "teams", createdAt: new Date() },
      { id: "perm-team-edit", name: "Editar Times", description: "Permitir edição de times existentes", category: "teams", createdAt: new Date() },
      { id: "perm-team-delete", name: "Excluir Times", description: "Permitir exclusão de times", category: "teams", createdAt: new Date() },
      { id: "perm-team-manage", name: "Gerenciar Membros", description: "Permitir gerenciamento de membros do time", category: "teams", createdAt: new Date() },
      
      // Usuários
      { id: "perm-user-create", name: "Criar Usuários", description: "Permitir criação de novos usuários", category: "users", createdAt: new Date() },
      { id: "perm-user-edit", name: "Editar Usuários", description: "Permitir edição de usuários existentes", category: "users", createdAt: new Date() },
      { id: "perm-user-delete", name: "Excluir Usuários", description: "Permitir exclusão de usuários", category: "users", createdAt: new Date() },
      
      // Perfis
      { id: "perm-profile-create", name: "Criar Perfis", description: "Permitir criação de novos perfis", category: "profiles", createdAt: new Date() },
      { id: "perm-profile-edit", name: "Editar Perfis", description: "Permitir edição de perfis existentes", category: "profiles", createdAt: new Date() },
      { id: "perm-profile-delete", name: "Excluir Perfis", description: "Permitir exclusão de perfis", category: "profiles", createdAt: new Date() },
      
      // Analytics
      { id: "perm-analytics-view", name: "Ver Analytics", description: "Permitir visualização de métricas e relatórios", category: "analytics", createdAt: new Date() },
    ];
  }

  async getPermission(id: string): Promise<Permission | undefined> {
    const permissions = await this.getPermissions();
    return permissions.find(permission => permission.id === id);
  }

  async createPermission(insertPermission: InsertPermission): Promise<Permission> {
    const permission: Permission = {
      id: randomUUID(),
      ...insertPermission,
      description: insertPermission.description || null,
      createdAt: new Date(),
    };
    return permission;
  }

  async updatePermission(id: string, updateData: Partial<Permission>): Promise<Permission> {
    const existingPermission = await this.getPermission(id);
    if (!existingPermission) {
      throw new Error(`Permission with id ${id} not found`);
    }
    return { ...existingPermission, ...updateData };
  }

  async deletePermission(id: string): Promise<void> {
    const existingPermission = await this.getPermission(id);
    if (!existingPermission) {
      throw new Error(`Permission with id ${id} not found`);
    }
  }

  // Profile Permissions methods for MemStorage
  async getAllProfilePermissions(): Promise<ProfilePermission[]> {
    // Retorna todas as associações perfil-permissão simuladas
    const allPermissions: ProfilePermission[] = [];
    
    const defaultProfilePermissions: { [key: string]: string[] } = {
      "profile-admin": ["perm-create-tasks", "perm-edit-tasks", "perm-delete-tasks", "perm-manage-users"],
      "profile-developer": ["perm-create-tasks", "perm-edit-tasks", "perm-view-tasks"],
      "profile-designer": ["perm-create-tasks", "perm-edit-tasks"],
    };

    Object.entries(defaultProfilePermissions).forEach(([profileId, permissionIds]) => {
      permissionIds.forEach(permissionId => {
        allPermissions.push({
          id: randomUUID(),
          profileId,
          permissionId,
          createdAt: new Date(),
        });
      });
    });

    return allPermissions;
  }

  async getProfilePermissions(profileId: string): Promise<ProfilePermission[]> {
    // Retorna permissões baseadas no perfil
    const defaultPermissions: { [key: string]: string[] } = {
      "profile-admin": ["perm-task-create", "perm-task-edit", "perm-task-delete", "perm-task-assign", "perm-column-create", "perm-column-edit", "perm-column-delete", "perm-column-reorder", "perm-team-create", "perm-team-edit", "perm-team-delete", "perm-team-manage", "perm-user-create", "perm-user-edit", "perm-user-delete", "perm-profile-create", "perm-profile-edit", "perm-profile-delete", "perm-analytics-view"],
      "profile-manager": ["perm-task-create", "perm-task-edit", "perm-task-assign", "perm-column-edit", "perm-team-edit", "perm-team-manage", "perm-user-edit", "perm-analytics-view"],
      "profile-developer": ["perm-task-create", "perm-task-edit", "perm-task-assign"],
      "profile-designer": ["perm-task-create", "perm-task-edit"],
      "profile-devops": ["perm-task-create", "perm-task-edit", "perm-column-edit", "perm-analytics-view"],
    };

    const permissionIds = defaultPermissions[profileId] || [];
    return permissionIds.map(permissionId => ({
      id: randomUUID(),
      profileId,
      permissionId,
      createdAt: new Date(),
    }));
  }

  async addPermissionToProfile(profileId: string, permissionId: string): Promise<ProfilePermission> {
    const profilePermission: ProfilePermission = {
      id: randomUUID(),
      profileId,
      permissionId,
      createdAt: new Date(),
    };
    return profilePermission;
  }

  async removePermissionFromProfile(profileId: string, permissionId: string): Promise<void> {
    // Simulação de remoção
  }

  // Team Profiles methods for MemStorage
  async getTeamProfiles(teamId: string): Promise<TeamProfile[]> {
    // Associações padrão de perfis por time
    const defaultTeamProfiles: { [key: string]: string[] } = {
      "team-1": ["profile-developer", "profile-devops"], // Desenvolvimento
      "team-2": ["profile-designer"], // Design
      "team-3": ["profile-manager"], // Product
    };

    const profileIds = defaultTeamProfiles[teamId] || [];
    return profileIds.map(profileId => ({
      id: randomUUID(),
      teamId,
      profileId,
      createdAt: new Date(),
    }));
  }

  async assignProfileToTeam(teamId: string, profileId: string): Promise<TeamProfile> {
    const teamProfile: TeamProfile = {
      id: randomUUID(),
      teamId,
      profileId,
      createdAt: new Date(),
    };
    return teamProfile;
  }

  async getAllTeamProfiles(): Promise<TeamProfile[]> {
    // Retorna todas as associações de perfis por time usando dados simulados
    const allProfiles: TeamProfile[] = [];
    const defaultTeamProfiles: { [key: string]: string[] } = {
      "team-1": ["profile-developer", "profile-devops"],
      "team-2": ["profile-designer"],
      "team-3": ["profile-manager"],
    };

    Object.entries(defaultTeamProfiles).forEach(([teamId, profileIds]) => {
      profileIds.forEach(profileId => {
        allProfiles.push({
          id: randomUUID(),
          teamId,
          profileId,
          createdAt: new Date(),
        });
      });
    });

    return allProfiles;
  }

  async removeProfileFromTeam(teamId: string, profileId: string): Promise<void> {
    // Simulação de remoção
  }

  async deleteTeamProfile(id: string): Promise<void> {
    // Simulação de remoção por ID
  }

  // User Permissions methods for MemStorage
  async getUserPermissions(userId: string): Promise<Permission[]> {
    const startTime = Date.now();
    try {
      // 🚀 USAR QUERY ULTRA-OTIMIZADA
      const result = await OptimizedQueries.getUserPermissionsOptimized(userId);
      
      if (result.length === 0) {
        console.log("⚠️ [SECURITY] Usuário sem permissões ou não encontrado");
        return [];
      }

      const duration = Date.now() - startTime;
      PerformanceStats.trackQuery('getUserPermissions', duration);
      console.log(`🔑 [PERF] ${result.length} permissões em ${duration}ms:`, result.map(p => p.name).slice(0, 5), '...');
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      PerformanceStats.trackQuery('getUserPermissions_error', duration);
      console.error("❌ [SECURITY] Erro em getUserPermissions:", error);
      return [];
    }
  }

  // Task Events methods for MemStorage
  async getTaskEvents(taskId: string): Promise<TaskEvent[]> {
    return [];
  }

  async createTaskEvent(event: InsertTaskEvent): Promise<TaskEvent> {
    const taskEvent: TaskEvent = {
      id: randomUUID(),
      ...event,
      userId: event.userId || null,
      userName: event.userName || null,
      userAvatar: event.userAvatar || null,
      metadata: event.metadata || null,
      createdAt: new Date(),
    };
    return taskEvent;
  }

  // Export History methods for MemStorage
  async getExportHistory(userId: string): Promise<ExportHistory[]> {
    // Return mock export history for memory storage
    return [
      {
        id: randomUUID(),
        userId,
        exportType: "full",
        status: "completed",
        fileName: "kanban-data-2025-08-22.json",
        fileSize: 15624,
        recordsCount: 25,
        errorMessage: null,
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
        completedAt: new Date(Date.now() - 86400000 + 5000), // 5 seconds later
      }
    ];
  }

  async createExportHistory(exportData: InsertExportHistory): Promise<ExportHistory> {
    const exportHistory: ExportHistory = {
      id: randomUUID(),
      userId: exportData.userId,
      exportType: exportData.exportType,
      status: exportData.status || "pending",
      fileName: exportData.fileName || null,
      fileSize: exportData.fileSize || null,
      recordsCount: exportData.recordsCount || null,
      errorMessage: exportData.errorMessage || null,
      createdAt: new Date(),
      completedAt: null,
    };
    return exportHistory;
  }

  async updateExportHistory(id: string, updates: Partial<ExportHistory>): Promise<ExportHistory> {
    // Mock update for memory storage
    const mockExport: ExportHistory = {
      id,
      userId: updates.userId || "mock-user",
      exportType: updates.exportType || "full",
      status: updates.status || "completed",
      fileName: updates.fileName || null,
      fileSize: updates.fileSize || null,
      recordsCount: updates.recordsCount || null,
      errorMessage: updates.errorMessage || null,
      createdAt: new Date(),
      completedAt: updates.completedAt || new Date(),
    };
    return mockExport;
  }

  private initializeDefaultBoards() {
    const defaultBoard: Board = {
      id: "default-board",
      name: "Main Kanban Board",
      description: "Principal quadro Kanban",
      color: "#3b82f6",
      createdById: "system",
      isActive: "true",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.boards.set(defaultBoard.id, defaultBoard);
  }

  private initializeDefaultColumns() {
    const defaultBoardId = "default-board";
    const defaultColumns: Column[] = [
      { id: "backlog", boardId: defaultBoardId, title: "Backlog", position: 0, wipLimit: null, color: "gray" },
      { id: "todo", boardId: defaultBoardId, title: "To Do", position: 1, wipLimit: 5, color: "blue" },
      { id: "inprogress", boardId: defaultBoardId, title: "In Progress", position: 2, wipLimit: 3, color: "yellow" },
      { id: "review", boardId: defaultBoardId, title: "Review", position: 3, wipLimit: 4, color: "purple" },
      { id: "done", boardId: defaultBoardId, title: "Done", position: 4, wipLimit: null, color: "green" },
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
    const defaultBoardId = "default-board";
    
    const defaultTasks: Omit<Task, 'id'>[] = [
      {
        boardId: defaultBoardId,
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
        boardId: defaultBoardId,
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
        boardId: defaultBoardId,
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
        boardId: defaultBoardId,
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
        boardId: defaultBoardId,
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
        boardId: defaultBoardId,
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

  // Board methods
  async getBoards(): Promise<Board[]> {
    return Array.from(this.boards.values());
  }

  async getBoard(id: string): Promise<Board | undefined> {
    return this.boards.get(id);
  }

  async initializeBoardWithDefaults(boardId: string): Promise<void> {
    console.log(`Initializing board ${boardId} with default data`);
    
    // No default columns - board starts completely empty
    // Users can create columns as needed

    console.log(`Board ${boardId} initialized with 0 columns and 0 tasks`);
  }

  async createBoard(insertBoard: InsertBoard): Promise<Board> {
    const board: Board = {
      id: randomUUID(),
      ...insertBoard,
      description: insertBoard.description || "",
      color: insertBoard.color || "#3b82f6",
      isActive: insertBoard.isActive || "true",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.boards.set(board.id, board);
    return board;
  }

  async updateBoard(id: string, updateData: UpdateBoard): Promise<Board> {
    const existingBoard = this.boards.get(id);
    if (!existingBoard) {
      throw new Error(`Board with id ${id} not found`);
    }
    const updatedBoard = { ...existingBoard, ...updateData, updatedAt: new Date() };
    this.boards.set(id, updatedBoard);
    return updatedBoard;
  }

  async deleteBoard(id: string): Promise<void> {
    if (!this.boards.has(id)) {
      throw new Error(`Board with id ${id} not found`);
    }
    this.boards.delete(id);
  }

  async getBoardTasks(boardId: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.boardId === boardId);
  }

  async getBoardColumns(boardId: string): Promise<Column[]> {
    return Array.from(this.columns.values()).filter(column => column.boardId === boardId).sort((a, b) => a.position - b.position);
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

  // Task Assignees methods (placeholder for MemStorage)
  async getTaskAssignees(taskId: string): Promise<(TaskAssignee & { user: User })[]> {
    return [];
  }

  async addTaskAssignee(assignee: InsertTaskAssignee): Promise<TaskAssignee> {
    const taskAssignee: TaskAssignee = {
      id: randomUUID(),
      ...assignee,
      assignedAt: new Date(),
    };
    return taskAssignee;
  }

  async removeTaskAssignee(taskId: string, userId: string): Promise<void> {
    // Placeholder implementation for MemStorage
  }

  async setTaskAssignees(taskId: string, userIds: string[]): Promise<void> {
    // Placeholder implementation for MemStorage
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

  // Board Shares - placeholder implementations for MemStorage
  async getBoardShares(boardId: string): Promise<BoardShare[]> {
    return [];
  }

  async getAllBoardShares(): Promise<BoardShare[]> {
    return [];
  }

  async getUserSharedBoards(userId: string): Promise<BoardShare[]> {
    return [];
  }

  async getTeamSharedBoards(teamId: string): Promise<BoardShare[]> {
    return [];
  }

  async getBoardMembers(boardId: string): Promise<User[]> {
    return [];
  }

  async getBoardMemberCount(boardId: string): Promise<number> {
    return 0;
  }

  async createBoardShare(share: InsertBoardShare): Promise<BoardShare> {
    throw new Error("Board sharing not implemented in MemStorage");
  }

  async updateBoardShare(id: string, share: UpdateBoardShare): Promise<BoardShare> {
    throw new Error("Board sharing not implemented in MemStorage");
  }

  async deleteBoardShare(id: string): Promise<void> {
    throw new Error("Board sharing not implemented in MemStorage");
  }

  async getUserBoardPermission(userId: string, boardId: string): Promise<string | null> {
    return null;
  }

  // Task Status methods for MemStorage (basic implementation)
  async getTaskStatuses(): Promise<TaskStatus[]> {
    return [
      { 
        id: "1", 
        name: "backlog", 
        displayName: "Backlog", 
        color: "#6b7280", 
        isDefault: "true", 
        position: 0, 
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        id: "2", 
        name: "todo", 
        displayName: "To Do", 
        color: "#3b82f6", 
        isDefault: "false", 
        position: 1, 
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        id: "3", 
        name: "inprogress", 
        displayName: "In Progress", 
        color: "#f59e0b", 
        isDefault: "false", 
        position: 2, 
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        id: "4", 
        name: "done", 
        displayName: "Done", 
        color: "#10b981", 
        isDefault: "false", 
        position: 3, 
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  async getTaskStatus(id: string): Promise<TaskStatus | undefined> {
    const statuses = await this.getTaskStatuses();
    return statuses.find(status => status.id === id);
  }

  async createTaskStatus(status: InsertTaskStatus): Promise<TaskStatus> {
    throw new Error("Task Status creation not implemented in MemStorage");
  }

  async updateTaskStatus(id: string, status: UpdateTaskStatus): Promise<TaskStatus> {
    throw new Error("Task Status updates not implemented in MemStorage");
  }

  async deleteTaskStatus(id: string): Promise<void> {
    throw new Error("Task Status deletion not implemented in MemStorage");
  }

  // Task Priority methods for MemStorage (basic implementation)
  async getTaskPriorities(): Promise<TaskPriority[]> {
    return [
      { 
        id: "1", 
        name: "low", 
        displayName: "Baixa", 
        color: "#3b82f6", 
        isDefault: "false", 
        level: 1, 
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        id: "2", 
        name: "medium", 
        displayName: "Média", 
        color: "#f59e0b", 
        isDefault: "true", 
        level: 2, 
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { 
        id: "3", 
        name: "high", 
        displayName: "Alta", 
        color: "#ef4444", 
        isDefault: "false", 
        level: 3, 
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  }

  async getTaskPriority(id: string): Promise<TaskPriority | undefined> {
    const priorities = await this.getTaskPriorities();
    return priorities.find(priority => priority.id === id);
  }

  async createTaskPriority(priority: InsertTaskPriority): Promise<TaskPriority> {
    throw new Error("Task Priority creation not implemented in MemStorage");
  }

  async updateTaskPriority(id: string, priority: UpdateTaskPriority): Promise<TaskPriority> {
    throw new Error("Task Priority updates not implemented in MemStorage");
  }

  async deleteTaskPriority(id: string): Promise<void> {
    throw new Error("Task Priority deletion not implemented in MemStorage");
  }
}

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
    // 🚀 CACHE: Verificar cache primeiro
    const cached = await cache.get<Board[]>(CacheKeys.ALL_BOARDS);
    if (cached) {
      console.log("🚀 [CACHE HIT] Boards servidos do cache");
      return cached;
    }

    console.log("🔍 [CACHE MISS] Buscando boards no banco");
    const result = await db.select().from(boards).orderBy(desc(boards.createdAt));
    
    // Cache por 1 minuto (boards podem mudar mais frequentemente)
    await cache.set(CacheKeys.ALL_BOARDS, result, TTL.SHORT);
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
    console.log(`Initializing database board ${boardId} with default data`);
    
    // Check if board already has columns
    const existingColumns = await this.getBoardColumns(boardId);
    if (existingColumns.length > 0) {
      return; // Already initialized
    }
    
    // No default columns - board starts completely empty
    // Users can create columns as needed
    
    console.log(`Board ${boardId} initialized with 0 columns and 0 tasks`);
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
    console.log("🔄 DatabaseStorage: Starting createTask with data:", insertTask);
    
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
      
      console.log("✅ DatabaseStorage: Task inserted successfully:", task.id);
      
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
        console.log("✅ DatabaseStorage: Task event created successfully");
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
    
    // Create event for task update
    if (oldTask && task.status !== oldTask.status) {
      await this.createTaskEvent({
        taskId: task.id,
        eventType: "moved",
        description: `Task movida para ${task.status}`,
        userName: "Sistema",
        userAvatar: "S",
        metadata: `De ${oldTask.status} para ${task.status}`
      });
    } else {
      await this.createTaskEvent({
        taskId: task.id,
        eventType: "updated",
        description: "Task atualizada",
        userName: "Sistema", 
        userAvatar: "S",
        metadata: ""
      });
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
      
      if (result.length === 0) {
        console.log("⚠️ [SECURITY] Usuário sem permissões ou não encontrado");
        return [];
      }

      const duration = Date.now() - startTime;
      PerformanceStats.trackQuery('getUserPermissions_DB', duration);
      console.log(`🚀 [DB-PERF] ${result.length} permissões em ${duration}ms (OTIMIZADO)`);
      return result;
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
}

export const storage = new DatabaseStorage();
