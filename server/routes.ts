import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTaskSchema, updateTaskSchema, insertColumnSchema, updateColumnSchema, insertTeamMemberSchema, insertTagSchema, insertTeamSchema, updateTeamSchema, insertUserSchema, updateUserSchema, insertProfileSchema, updateProfileSchema, insertPermissionSchema, insertProfilePermissionSchema, insertTeamProfileSchema } from "@shared/schema";
import { sendWelcomeEmail, sendNotificationEmail } from "./emailService";

export async function registerRoutes(app: Express): Promise<Server> {
  // Task routes
  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      res.status(400).json({ message: "Invalid task data" });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const taskData = updateTaskSchema.parse(req.body);
      const task = await storage.updateTask(req.params.id, taskData);
      res.json(task);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.status(400).json({ message: "Invalid task data" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      await storage.deleteTask(req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Column routes
  app.get("/api/columns", async (req, res) => {
    try {
      const columns = await storage.getColumns();
      res.json(columns);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch columns" });
    }
  });

  app.get("/api/columns/:id", async (req, res) => {
    try {
      const column = await storage.getColumn(req.params.id);
      if (!column) {
        return res.status(404).json({ message: "Column not found" });
      }
      res.json(column);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch column" });
    }
  });

  app.post("/api/columns", async (req, res) => {
    try {
      const columnData = insertColumnSchema.parse(req.body);
      const column = await storage.createColumn(columnData);
      res.status(201).json(column);
    } catch (error) {
      res.status(400).json({ message: "Invalid column data" });
    }
  });

  app.put("/api/columns/:id", async (req, res) => {
    try {
      const columnData = updateColumnSchema.parse(req.body);
      const column = await storage.updateColumn(req.params.id, columnData);
      res.json(column);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Column not found" });
      }
      res.status(400).json({ message: "Invalid column data" });
    }
  });

  app.patch("/api/columns/:id", async (req, res) => {
    try {
      const columnData = updateColumnSchema.parse(req.body);
      const column = await storage.updateColumn(req.params.id, columnData);
      res.json(column);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Column not found" });
      }
      res.status(400).json({ message: "Invalid column data" });
    }
  });

  app.delete("/api/columns/:id", async (req, res) => {
    try {
      await storage.deleteColumn(req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Column not found" });
      }
      res.status(500).json({ message: "Failed to delete column" });
    }
  });

  app.post("/api/columns/reorder", async (req, res) => {
    try {
      const reorderedColumns = req.body.columns;
      await storage.reorderColumns(reorderedColumns);
      res.status(200).json({ message: "Columns reordered successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to reorder columns" });
    }
  });

  // Team member routes
  app.get("/api/team-members", async (req, res) => {
    try {
      const members = await storage.getTeamMembers();
      res.json(members);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  app.post("/api/team-members", async (req, res) => {
    try {
      const memberData = insertTeamMemberSchema.parse(req.body);
      const member = await storage.createTeamMember(memberData);
      res.status(201).json(member);
    } catch (error) {
      res.status(400).json({ message: "Invalid team member data" });
    }
  });

  app.patch("/api/team-members/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const member = await storage.updateTeamMemberStatus(req.params.id, status);
      res.json(member);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Team member not found" });
      }
      res.status(400).json({ message: "Invalid status data" });
    }
  });

  // Analytics endpoint
  app.get("/api/analytics", async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      const columns = await storage.getColumns();
      
      // Calculate basic metrics
      const doneTasks = tasks.filter(task => task.status === "done");
      const inProgressTasks = tasks.filter(task => task.status === "inprogress");
      const totalTasks = tasks.length;
      
      // Calculate average cycle time (mock calculation)
      const averageCycleTime = doneTasks.length > 0 ? 
        Math.round((Math.random() * 5 + 1) * 10) / 10 : 0;
      
      // Calculate throughput (tasks completed this week)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const throughput = doneTasks.filter(task => 
        task.updatedAt && new Date(task.updatedAt) >= oneWeekAgo
      ).length;
      
      // Calculate efficiency
      const efficiency = totalTasks > 0 ? 
        Math.round((doneTasks.length / totalTasks) * 100) : 0;
      
      // Count blockers (tasks that haven't moved in a while or high priority in progress)
      const blockers = inProgressTasks.filter(task => 
        task.priority === "high" && task.progress < 50
      ).length;
      
      res.json({
        averageCycleTime,
        throughput,
        efficiency,
        blockers,
        totalTasks,
        doneTasks: doneTasks.length,
        inProgressTasks: inProgressTasks.length,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Tag routes
  app.get("/api/tags", async (req, res) => {
    try {
      const tags = await storage.getTags();
      res.json(tags);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tags" });
    }
  });

  app.get("/api/tags/:id", async (req, res) => {
    try {
      const tag = await storage.getTag(req.params.id);
      if (!tag) {
        return res.status(404).json({ message: "Tag not found" });
      }
      res.json(tag);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tag" });
    }
  });

  app.post("/api/tags", async (req, res) => {
    try {
      const tagData = insertTagSchema.parse(req.body);
      const tag = await storage.createTag(tagData);
      res.status(201).json(tag);
    } catch (error) {
      res.status(400).json({ message: "Invalid tag data" });
    }
  });

  app.put("/api/tags/:id", async (req, res) => {
    try {
      const tagData = insertTagSchema.parse(req.body);
      const tag = await storage.updateTag(req.params.id, tagData);
      res.json(tag);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Tag not found" });
      }
      res.status(400).json({ message: "Invalid tag data" });
    }
  });

  app.delete("/api/tags/:id", async (req, res) => {
    try {
      await storage.deleteTag(req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Tag not found" });
      }
      res.status(500).json({ message: "Failed to delete tag" });
    }
  });

  // User routes
  app.get("/api/users/me", async (req, res) => {
    try {
      // For development, return the first user as current user
      const users = await storage.getUsers();
      const currentUser = users[0];
      if (currentUser) {
        res.json(currentUser);
      } else {
        res.status(404).json({ message: "Current user not found" });
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
      res.status(500).json({ message: "Failed to fetch current user" });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      
      // Enviar email de boas-vindas
      if (user.email) {
        try {
          await sendWelcomeEmail({
            to: user.email,
            userName: user.name,
            userRole: user.role || undefined
          });
          console.log(`Welcome email sent to ${user.email}`);
        } catch (emailError) {
          console.error(`Failed to send welcome email to ${user.email}:`, emailError);
          // Não falha a criação do usuário se o email falhar
        }
      }
      
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const userData = updateUserSchema.parse(req.body);
      const user = await storage.updateUser(req.params.id, userData);
      res.json(user);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const userData = req.body;
      const user = await storage.updateUser(req.params.id, userData);
      res.json(user);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // User Teams routes
  app.get("/api/users/:userId/teams", async (req, res) => {
    try {
      const userTeams = await storage.getUserTeams(req.params.userId);
      res.json(userTeams);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user teams" });
    }
  });

  app.get("/api/teams/:teamId/users", async (req, res) => {
    try {
      const teamUsers = await storage.getTeamUsers(req.params.teamId);
      res.json(teamUsers);
    } catch (error) {
      res.status(500).json({ message: "Failed to get team users" });
    }
  });

  app.post("/api/users/:userId/teams/:teamId", async (req, res) => {
    try {
      const { role = "member" } = req.body;
      const userTeam = await storage.addUserToTeam({
        userId: req.params.userId,
        teamId: req.params.teamId,
        role,
      });
      res.status(201).json(userTeam);
    } catch (error) {
      res.status(400).json({ message: "Failed to add user to team" });
    }
  });

  app.delete("/api/users/:userId/teams/:teamId", async (req, res) => {
    try {
      await storage.removeUserFromTeam(req.params.userId, req.params.teamId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "User not found in team" });
      }
      res.status(500).json({ message: "Failed to remove user from team" });
    }
  });

  app.patch("/api/users/:userId/teams/:teamId", async (req, res) => {
    try {
      const { role } = req.body;
      const userTeam = await storage.updateUserTeamRole(req.params.userId, req.params.teamId, role);
      res.json(userTeam);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "User not found in team" });
      }
      res.status(400).json({ message: "Failed to update user role in team" });
    }
  });

  // Team routes
  app.get("/api/teams", async (req, res) => {
    try {
      const teams = await storage.getTeams();
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  app.get("/api/teams/:id", async (req, res) => {
    try {
      const team = await storage.getTeam(req.params.id);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      res.json(team);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team" });
    }
  });

  app.post("/api/teams", async (req, res) => {
    try {
      const teamData = insertTeamSchema.parse(req.body);
      const team = await storage.createTeam(teamData);
      res.status(201).json(team);
    } catch (error) {
      res.status(400).json({ message: "Invalid team data" });
    }
  });

  app.put("/api/teams/:id", async (req, res) => {
    try {
      const teamData = updateTeamSchema.parse(req.body);
      const team = await storage.updateTeam(req.params.id, teamData);
      res.json(team);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Team not found" });
      }
      res.status(400).json({ message: "Invalid team data" });
    }
  });

  app.patch("/api/teams/:id", async (req, res) => {
    try {
      const teamData = req.body;
      const team = await storage.updateTeam(req.params.id, teamData);
      res.json(team);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Team not found" });
      }
      res.status(400).json({ message: "Invalid team data" });
    }
  });

  app.delete("/api/teams/:id", async (req, res) => {
    try {
      await storage.deleteTeam(req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Team not found" });
      }
      res.status(500).json({ message: "Failed to delete team" });
    }
  });

  // Profile routes
  app.get("/api/profiles", async (req, res) => {
    try {
      const profiles = await storage.getProfiles();
      res.json(profiles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch profiles" });
    }
  });

  app.get("/api/profiles/:id", async (req, res) => {
    try {
      const profile = await storage.getProfile(req.params.id);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.post("/api/profiles", async (req, res) => {
    try {
      const profileData = insertProfileSchema.parse(req.body);
      const profile = await storage.createProfile(profileData);
      res.status(201).json(profile);
    } catch (error) {
      res.status(400).json({ message: "Invalid profile data" });
    }
  });

  app.patch("/api/profiles/:id", async (req, res) => {
    try {
      const profileData = updateProfileSchema.parse(req.body);
      const profile = await storage.updateProfile(req.params.id, profileData);
      res.json(profile);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.status(400).json({ message: "Invalid profile data" });
    }
  });

  app.delete("/api/profiles/:id", async (req, res) => {
    try {
      await storage.deleteProfile(req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Profile not found" });
      }
      res.status(500).json({ message: "Failed to delete profile" });
    }
  });

  // Permission routes
  app.get("/api/permissions", async (req, res) => {
    try {
      const permissions = await storage.getPermissions();
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch permissions" });
    }
  });

  app.get("/api/permissions/:id", async (req, res) => {
    try {
      const permission = await storage.getPermission(req.params.id);
      if (!permission) {
        return res.status(404).json({ message: "Permission not found" });
      }
      res.json(permission);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch permission" });
    }
  });

  app.post("/api/permissions", async (req, res) => {
    try {
      const permissionData = insertPermissionSchema.parse(req.body);
      const permission = await storage.createPermission(permissionData);
      res.status(201).json(permission);
    } catch (error) {
      res.status(400).json({ message: "Invalid permission data" });
    }
  });

  app.patch("/api/permissions/:id", async (req, res) => {
    try {
      const permissionData = req.body;
      const permission = await storage.updatePermission(req.params.id, permissionData);
      res.json(permission);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Permission not found" });
      }
      res.status(400).json({ message: "Invalid permission data" });
    }
  });

  app.delete("/api/permissions/:id", async (req, res) => {
    try {
      await storage.deletePermission(req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Permission not found" });
      }
      res.status(500).json({ message: "Failed to delete permission" });
    }
  });

  // Profile Permissions routes
  app.get("/api/profiles/:id/permissions", async (req, res) => {
    try {
      const profilePermissions = await storage.getProfilePermissions(req.params.id);
      res.json(profilePermissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch profile permissions" });
    }
  });

  app.post("/api/profiles/:profileId/permissions", async (req, res) => {
    try {
      const { permissionId } = req.body;
      const profilePermission = await storage.addPermissionToProfile(req.params.profileId, permissionId);
      res.status(201).json(profilePermission);
    } catch (error) {
      res.status(400).json({ message: "Failed to add permission to profile" });
    }
  });

  app.post("/api/profiles/:profileId/permissions/:permissionId", async (req, res) => {
    try {
      const profilePermission = await storage.addPermissionToProfile(req.params.profileId, req.params.permissionId);
      res.status(201).json(profilePermission);
    } catch (error) {
      res.status(400).json({ message: "Failed to add permission to profile" });
    }
  });

  app.delete("/api/profiles/:profileId/permissions/:permissionId", async (req, res) => {
    try {
      await storage.removePermissionFromProfile(req.params.profileId, req.params.permissionId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Profile permission not found" });
      }
      res.status(500).json({ message: "Failed to remove permission from profile" });
    }
  });

  // User permissions route
  app.get("/api/users/:userId/permissions", async (req, res) => {
    try {
      const permissions = await storage.getUserPermissions(req.params.userId);
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user permissions" });
    }
  });

  // Current user route (simulando usuário logado)
  app.get("/api/auth/current-user", async (req, res) => {
    try {
      // Por enquanto, vamos retornar o primeiro usuário como usuário "logado"
      const users = await storage.getUsers();
      const currentUser = users[0];
      if (!currentUser) {
        return res.status(404).json({ message: "No user found" });
      }
      res.json(currentUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch current user" });
    }
  });

  // Team Profiles routes
  app.get("/api/teams/:id/profiles", async (req, res) => {
    try {
      const teamProfiles = await storage.getTeamProfiles(req.params.id);
      res.json(teamProfiles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team profiles" });
    }
  });

  app.post("/api/teams/:teamId/profiles/:profileId", async (req, res) => {
    try {
      const teamProfile = await storage.assignProfileToTeam(req.params.teamId, req.params.profileId);
      res.status(201).json(teamProfile);
    } catch (error) {
      res.status(400).json({ message: "Failed to assign profile to team" });
    }
  });

  app.delete("/api/teams/:teamId/profiles/:profileId", async (req, res) => {
    try {
      await storage.removeProfileFromTeam(req.params.teamId, req.params.profileId);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Team profile not found" });
      }
      res.status(500).json({ message: "Failed to remove profile from team" });
    }
  });

  // Task Events endpoints
  app.get("/api/tasks/:taskId/events", async (req, res) => {
    try {
      const { taskId } = req.params;
      const events = await storage.getTaskEvents(taskId);
      res.json(events);
    } catch (error) {
      console.error("Error fetching task events:", error);
      res.status(500).json({ message: "Failed to fetch task events" });
    }
  });

  app.post("/api/tasks/:taskId/events", async (req, res) => {
    try {
      const { taskId } = req.params;
      const eventData = req.body;
      
      const event = await storage.createTaskEvent({
        ...eventData,
        taskId
      });
      
      res.status(201).json(event);
    } catch (error) {
      console.error("Error creating task event:", error);
      res.status(500).json({ message: "Failed to create task event" });
    }
  });

  // Email settings routes
  app.post("/api/settings/sendgrid-key", async (req, res) => {
    try {
      const { apiKey, senderDomain } = req.body;
      
      if (!apiKey || !apiKey.startsWith('SG.')) {
        return res.status(400).json({ 
          message: "Invalid API key format. SendGrid API keys must start with 'SG.'" 
        });
      }

      // Update environment variables (this is runtime only, not persistent)
      process.env.SENDGRID_API_KEY = apiKey;
      if (senderDomain) {
        process.env.SENDER_DOMAIN = senderDomain;
      }
      
      // Reinitialize SendGrid with new key
      const mailModule = await import('@sendgrid/mail');
      const mailService = mailModule.default;
      mailService.setApiKey(apiKey);
      
      // Also update the main emailService module
      const { reinitializeMailService } = await import('./emailService');
      reinitializeMailService(apiKey);
      
      console.log("SendGrid API key updated successfully");
      res.json({ message: "SendGrid API key updated successfully" });
    } catch (error) {
      console.error("Error updating SendGrid API key:", error);
      res.status(500).json({ message: "Failed to update API key" });
    }
  });

  app.post("/api/settings/test-email", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email address is required" });
      }

      const success = await sendNotificationEmail({
        to: email,
        subject: "🧪 Teste de Configuração - uP - Kan",
        message: `
          Parabéns! O envio de emails está funcionando corretamente.
          
          Este é um email de teste enviado em ${new Date().toLocaleString('pt-BR')}.
          
          Configurações:
          ✅ SendGrid API configurada
          ✅ Sistema de emails ativo
          ✅ Templates funcionando
          
          Agora o sistema pode enviar emails de boas-vindas para novos usuários automaticamente!
        `,
        type: 'success'
      });

      if (success) {
        res.json({ message: "Test email sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send test email" });
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ message: "Failed to send test email" });
    }
  });

  // Export History Routes
  app.get("/api/exports/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const exports = await storage.getExportHistory(userId);
      res.json(exports);
    } catch (error) {
      console.error("Error fetching export history:", error);
      res.status(500).json({ message: "Failed to fetch export history" });
    }
  });

  // User Permission Management routes
  app.post("/api/users/:userId/permissions", async (req, res) => {
    try {
      const { permissionId } = req.body;
      const result = await storage.addPermissionToUser(req.params.userId, permissionId);
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ message: "Failed to add permission to user" });
    }
  });

  app.delete("/api/users/:userId/permissions/:permissionId", async (req, res) => {
    try {
      await storage.removePermissionFromUser(req.params.userId, req.params.permissionId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove permission from user" });
    }
  });

  // Team Permission Management routes
  app.get("/api/teams/:teamId/permissions", async (req, res) => {
    try {
      const permissions = await storage.getTeamPermissions(req.params.teamId);
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team permissions" });
    }
  });

  app.post("/api/teams/:teamId/permissions", async (req, res) => {
    try {
      const { permissionId } = req.body;
      console.log("Adding permission to team:", req.params.teamId, permissionId);
      const result = await storage.addPermissionToTeam(req.params.teamId, permissionId);
      res.status(201).json(result);
    } catch (error) {
      console.error("Error adding permission to team:", error);
      res.status(400).json({ message: "Failed to add permission to team", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.delete("/api/teams/:teamId/permissions/:permissionId", async (req, res) => {
    try {
      await storage.removePermissionFromTeam(req.params.teamId, req.params.permissionId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove permission from team" });
    }
  });

  app.post("/api/exports", async (req, res) => {
    try {
      const exportData = req.body;
      const newExport = await storage.createExportHistory(exportData);
      res.status(201).json(newExport);
    } catch (error) {
      console.error("Error creating export history:", error);
      res.status(500).json({ message: "Failed to create export history" });
    }
  });

  app.patch("/api/exports/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedExport = await storage.updateExportHistory(id, updates);
      res.json(updatedExport);
    } catch (error) {
      console.error("Error updating export history:", error);
      res.status(500).json({ message: "Failed to update export history" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
