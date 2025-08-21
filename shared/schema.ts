import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("backlog"),
  priority: text("priority").notNull().default("medium"),
  assigneeId: varchar("assignee_id"),
  assigneeName: text("assignee_name"),
  assigneeAvatar: text("assignee_avatar"),
  progress: integer("progress").default(0),
  tags: jsonb("tags").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const columns = pgTable("columns", {
  id: varchar("id").primaryKey(),
  title: text("title").notNull(),
  position: integer("position").notNull(),
  wipLimit: integer("wip_limit"),
  color: text("color").notNull(),
});

export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  role: text("role"),
  avatar: text("avatar"),
  status: text("status").default("offline"),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateTaskSchema = insertTaskSchema.partial();

export const insertColumnSchema = createInsertSchema(columns);

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UpdateTask = z.infer<typeof updateTaskSchema>;
export type Column = typeof columns.$inferSelect;
export type InsertColumn = z.infer<typeof insertColumnSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
