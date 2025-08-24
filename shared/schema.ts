import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Board/Kanban management table
export const boards = pgTable("boards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").default(""),
  color: text("color").notNull().default("#3b82f6"),
  createdById: varchar("created_by_id").notNull(),
  isActive: text("is_active").notNull().default("true"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  boardId: varchar("board_id").notNull().references(() => boards.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").default(""),
  status: text("status").notNull().default("backlog"),
  priority: text("priority").notNull().default("medium"),
  assigneeId: varchar("assignee_id").default(""),
  assigneeName: text("assignee_name").default(""),
  assigneeAvatar: text("assignee_avatar").default(""),
  progress: integer("progress").notNull().default(0),
  tags: text("tags").array().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const columns = pgTable("columns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  boardId: varchar("board_id").notNull().references(() => boards.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  position: integer("position").notNull(),
  wipLimit: integer("wip_limit"),
  color: text("color").notNull(),
});

export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  role: text("role").default(""),
  avatar: text("avatar").default(""),
  status: text("status").default("offline"),
});

export const tags = pgTable("tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#3b82f6"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").default(""),
  color: text("color").notNull().default("#3b82f6"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password"), // Optional for backward compatibility
  role: text("role").default(""),
  avatar: text("avatar").default(""),
  status: text("status").default("offline"),
  profileId: varchar("profile_id").references(() => profiles.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userTeams = pgTable("user_teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  role: text("role").default("member"), // member, lead, admin
  createdAt: timestamp("created_at").defaultNow(),
});

export const profiles = pgTable("profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description").default(""),
  color: text("color").notNull().default("#3b82f6"),
  isDefault: text("is_default").default("false"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const permissions = pgTable("permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description").default(""),
  category: text("category").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const profilePermissions = pgTable("profile_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: varchar("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  permissionId: varchar("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const taskEvents = pgTable("task_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(), // created, updated, moved, assigned, completed, comment
  description: text("description").notNull(),
  userId: varchar("user_id").references(() => users.id),
  userName: text("user_name").default(""),
  userAvatar: text("user_avatar").default(""),
  metadata: text("metadata").default(""), // JSON string for additional data
  createdAt: timestamp("created_at").defaultNow(),
});

// Task auxiliary data tables
export const taskStatuses = pgTable("task_statuses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  color: text("color").notNull().default("#3b82f6"),
  isDefault: text("is_default").default("false"),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const taskPriorities = pgTable("task_priorities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  color: text("color").notNull().default("#3b82f6"),
  isDefault: text("is_default").default("false"),
  level: integer("level").notNull().default(0), // 0=lowest, higher numbers = higher priority
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Task assignees many-to-many table
export const taskAssignees = pgTable("task_assignees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  assignedAt: timestamp("assigned_at").defaultNow(),
});

export const teamProfiles = pgTable("team_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  profileId: varchar("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Board sharing table - allows boards to be shared with users or teams
export const boardShares = pgTable("board_shares", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  boardId: varchar("board_id").notNull().references(() => boards.id, { onDelete: "cascade" }),
  shareType: text("share_type").notNull(), // "user" | "team"
  shareWithId: varchar("share_with_id").notNull(), // userId or teamId
  permission: text("permission").notNull().default("view"), // "view" | "edit" | "admin"
  sharedByUserId: varchar("shared_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Custom fields definition table
export const customFields = pgTable("custom_fields", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  label: text("label").notNull(),
  type: text("type").notNull(), // text, number, date, select, boolean, url, email
  required: text("required").default("false"),
  options: text("options").array().default([]), // for select type
  placeholder: text("placeholder").default(""),
  validation: text("validation").default(""), // regex or validation rules
  position: integer("position").notNull().default(0),
  isActive: text("is_active").default("true"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Task custom field values table  
export const taskCustomValues = pgTable("task_custom_values", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: "cascade" }),
  customFieldId: varchar("custom_field_id").notNull().references(() => customFields.id, { onDelete: "cascade" }),
  value: text("value").default(""),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBoardSchema = createInsertSchema(boards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(3, "O nome do board deve conter pelo menos 3 caracteres").trim(),
});

export const updateBoardSchema = insertBoardSchema.partial();

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(3, "O título deve conter pelo menos 3 caracteres").trim(),
});

export const insertTaskAssigneeSchema = createInsertSchema(taskAssignees).omit({
  id: true,
  assignedAt: true,
});

export const updateTaskSchema = insertTaskSchema.partial();

export const insertColumnSchema = createInsertSchema(columns).omit({
  id: true,
}).extend({
  title: z.string().min(3, "O título deve conter pelo menos 3 caracteres").trim(),
});

export const updateColumnSchema = insertColumnSchema.partial();

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
});

export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
  createdAt: true,
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(3, "O nome do time deve conter pelo menos 3 caracteres").trim(),
});

export const updateTeamSchema = insertTeamSchema.partial();

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserSchema = insertUserSchema.partial();

export const insertProfileSchema = createInsertSchema(profiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(3, "O nome do perfil deve conter pelo menos 3 caracteres").trim(),
});

export const updateProfileSchema = insertProfileSchema.partial();

export const insertPermissionSchema = createInsertSchema(permissions).omit({
  id: true,
  createdAt: true,
});

export const insertProfilePermissionSchema = createInsertSchema(profilePermissions).omit({
  id: true,
  createdAt: true,
});

export const insertTeamProfileSchema = createInsertSchema(teamProfiles).omit({
  id: true,
  createdAt: true,
});

export const insertUserTeamSchema = createInsertSchema(userTeams).omit({
  id: true,
  createdAt: true,
});

export const insertBoardShareSchema = createInsertSchema(boardShares).omit({
  id: true,
  createdAt: true,
}).extend({
  shareType: z.enum(["user", "team"]),
  permission: z.enum(["view", "edit", "admin"]).default("view"),
});

export const updateBoardShareSchema = insertBoardShareSchema.partial();

export type Board = typeof boards.$inferSelect;
export type InsertBoard = z.infer<typeof insertBoardSchema>;
export type UpdateBoard = z.infer<typeof updateBoardSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
export type Column = typeof columns.$inferSelect;
export type InsertColumn = z.infer<typeof insertColumnSchema>;
export type UpdateColumn = z.infer<typeof updateColumnSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type Tag = typeof tags.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;
export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type UpdateTeam = z.infer<typeof updateTeamSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type ProfilePermission = typeof profilePermissions.$inferSelect;
export type InsertProfilePermission = z.infer<typeof insertProfilePermissionSchema>;
export type TeamProfile = typeof teamProfiles.$inferSelect;
export type InsertTeamProfile = z.infer<typeof insertTeamProfileSchema>;
export type UserTeam = typeof userTeams.$inferSelect;
export type InsertUserTeam = z.infer<typeof insertUserTeamSchema>;
export type BoardShare = typeof boardShares.$inferSelect;
export type InsertBoardShare = z.infer<typeof insertBoardShareSchema>;
export type UpdateBoardShare = z.infer<typeof updateBoardShareSchema>;
export type TaskAssignee = typeof taskAssignees.$inferSelect;
export type InsertTaskAssignee = z.infer<typeof insertTaskAssigneeSchema>;
export type TaskEvent = typeof taskEvents.$inferSelect;
export type InsertTaskEvent = typeof taskEvents.$inferInsert;

// Export History table for tracking exports
export const exportHistory = pgTable("export_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  exportType: varchar("export_type").notNull(), // 'full', 'tasks', 'analytics', etc.
  status: varchar("status").notNull().default("pending"), // 'pending', 'in_progress', 'completed', 'failed'
  fileName: varchar("file_name"),
  fileSize: integer("file_size"),
  recordsCount: integer("records_count"),
  errorMessage: varchar("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export type InsertExportHistory = typeof exportHistory.$inferInsert;
export type ExportHistory = typeof exportHistory.$inferSelect;

export const insertTaskEventSchema = createInsertSchema(taskEvents).omit({
  id: true,
  createdAt: true,
});

// Task auxiliary data schemas
export const insertTaskStatusSchema = createInsertSchema(taskStatuses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Nome obrigatório").trim(),
  displayName: z.string().min(1, "Nome de exibição obrigatório").trim(),
});

export const updateTaskStatusSchema = insertTaskStatusSchema.partial();

export const insertTaskPrioritySchema = createInsertSchema(taskPriorities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Nome obrigatório").trim(),
  displayName: z.string().min(1, "Nome de exibição obrigatório").trim(),
});

export const updateTaskPrioritySchema = insertTaskPrioritySchema.partial();

// Custom Fields schemas
export const insertCustomFieldSchema = createInsertSchema(customFields).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  name: z.string().min(1, "Nome do campo obrigatório").trim()
    .refine((val) => /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(val), {
      message: "Nome deve começar com letra e conter apenas letras, números, traços e underscore"
    })
    .transform((val) => val.toLowerCase())
    .refine((val) => val.length <= 50, { message: "Nome muito longo (máximo 50 caracteres)" }),
  label: z.string().min(1, "Rótulo obrigatório").trim(),
  type: z.enum(["text", "number", "date", "select", "boolean", "url", "email"], { message: "Tipo de campo inválido" }),
  required: z.enum(["true", "false"]).default("false"),
  isActive: z.enum(["true", "false"]).default("true"),
});

export const updateCustomFieldSchema = insertCustomFieldSchema.partial();

export const insertTaskCustomValueSchema = createInsertSchema(taskCustomValues).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateTaskCustomValueSchema = insertTaskCustomValueSchema.partial();

// Task auxiliary data types
export type TaskStatus = typeof taskStatuses.$inferSelect;
export type InsertTaskStatus = z.infer<typeof insertTaskStatusSchema>;
export type UpdateTaskStatus = z.infer<typeof updateTaskStatusSchema>;
export type TaskPriority = typeof taskPriorities.$inferSelect;
export type InsertTaskPriority = z.infer<typeof insertTaskPrioritySchema>;
export type UpdateTaskPriority = z.infer<typeof updateTaskPrioritySchema>;

// Custom Fields types
export type CustomField = typeof customFields.$inferSelect;
export type InsertCustomField = z.infer<typeof insertCustomFieldSchema>;
export type UpdateCustomField = z.infer<typeof updateCustomFieldSchema>;
export type TaskCustomValue = typeof taskCustomValues.$inferSelect;
export type InsertTaskCustomValue = z.infer<typeof insertTaskCustomValueSchema>;
export type UpdateTaskCustomValue = z.infer<typeof updateTaskCustomValueSchema>;
