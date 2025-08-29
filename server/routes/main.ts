import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import { promises as fs } from 'fs';
import { join } from 'path';
import { storage } from "../storage";
import { db } from "../db";
import { insertBoardSchema, updateBoardSchema, insertTaskSchema, updateTaskSchema, insertColumnSchema, updateColumnSchema, insertTagSchema, insertTeamSchema, updateTeamSchema, insertUserSchema, updateUserSchema, insertProfileSchema, updateProfileSchema, insertPermissionSchema, insertProfilePermissionSchema, insertTeamProfileSchema, insertBoardShareSchema, updateBoardShareSchema, insertTaskAssigneeSchema, insertCustomFieldSchema, updateCustomFieldSchema, insertTaskCustomValueSchema, updateTaskCustomValueSchema, customFields, taskCustomValues, insertNotificationSchema, updateNotificationSchema } from "@shared/schema";

// 🏗️ SERVICES - Camada única oficial de persistência
import { boardService, taskService, userService, teamService, notificationService, columnService, tagService, profileService, permissionService, boardShareService, taskStatusService, userTeamService, taskEventService, exportService, teamProfileService, assigneeService, hierarchyService } from "../services";
import { eq, sql, and } from "drizzle-orm";
import { sendWelcomeEmail, sendNotificationEmail } from "../emailService";
import { PermissionSyncService } from "../permissionSync";
import { OptimizedQueries, PerformanceStats } from "../optimizedQueries";
import { cache } from "../cache";

// 🚀 MICROSERVIÇOS IMPORTADOS
import { UnifiedAuthService, auth, requireAuth, requirePermission, AuthRequest } from '../auth/unifiedAuth';
import { mongoStore } from '../mongodb';

// Helper para criar AuthContext a partir da request
function createAuthContextFromRequest(req: any): any {
  // JWT Auth: usar dados do authContext configurado pelo middleware JWT
  const authContextJWT = req.authContext;
  if (authContextJWT) {
    // Converter AuthContextJWT para AuthContext adicionando sessionId
    return {
      userId: authContextJWT.userId,
      userName: authContextJWT.userName,
      userEmail: authContextJWT.userEmail,
      permissions: authContextJWT.permissions,
      permissionCategories: authContextJWT.permissionCategories,
      profileId: authContextJWT.profileId || '',
      profileName: authContextJWT.profileName,
      teams: authContextJWT.teams,
      sessionId: `jwt-${authContextJWT.userId}-${Date.now()}`, // Fake sessionId for JWT
      isAuthenticated: authContextJWT.isAuthenticated,
      lastActivity: authContextJWT.lastActivity
    };
  }
  
  // Fallback para session auth (compatibilidade)
  const userId = req.session?.user?.id || req.session?.userId;
  const user = req.user;
  const permissions = req.userPermissions || [];
  
  return {
    userId: userId,
    userName: user?.name || 'Unknown',
    userEmail: user?.email || '',
    permissions: permissions.map((p: any) => p.name),
    permissionCategories: Array.from(new Set(permissions.map((p: any) => p.category))),
    profileId: user?.profileId || '',
    profileName: null,
    teams: [],
    sessionId: req.session?.id || 'no-session',
    isAuthenticated: !!userId,
    lastActivity: new Date()
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // 🏗️ NOVA ARQUITETURA DE ROTAS MODULAR
  // Importar rotas separadas por domínio
  const apiRoutes = (await import('./api')).default;
  const remainingRoutes = (await import('./remaining')).default;

  // Registrar todas as rotas sob /api
  app.use('/api', apiRoutes);
  app.use('/api', remainingRoutes);

  // ===========================
  // 🔥 ROUTES LEGACY - Manter compatibilidade temporária para algumas funcionalidades não refatoradas
  // ===========================

  // 💾 System logs and admin routes

  // 💾 System logs management (ainda não refatorado)
  app.get("/api/system/logs", requireAuth, async (req, res) => {
    try {
      const path = join(process.cwd(), 'logs');
      
      try {
        const files = await fs.readdir(path);
        const logFiles = files
          .filter(file => file.endsWith('.log'))
          .sort((a, b) => b.localeCompare(a)) // Mais recentes primeiro
          .slice(0, 10); // Últimos 10 arquivos
        
        const logs = await Promise.all(
          logFiles.map(async (file) => {
            try {
              const content = await fs.readFile(join(path, file), 'utf-8');
              const lines = content.split('\n').filter(line => line.trim());
              
              return {
                file,
                date: file.replace('.log', ''),
                entries: lines.slice(-100).map(line => { // Últimas 100 linhas
                  try {
                    return JSON.parse(line);
                  } catch {
                    return { message: line, timestamp: new Date() };
                  }
                })
              };
            } catch {
              return { file, date: file.replace('.log', ''), entries: [] };
            }
          })
        );
        
        res.json({ logs });
      } catch {
        res.json({ logs: [], message: "Nenhum log encontrado" });
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  app.delete("/api/system/logs", requireAuth, async (req, res) => {
    try {
      const path = join(process.cwd(), 'logs');
      
      try {
        const files = await fs.readdir(path);
        await Promise.all(
          files
            .filter(file => file.endsWith('.log'))
            .map(file => fs.unlink(join(path, file)))
        );
        res.json({ message: "Logs limpos com sucesso" });
      } catch {
        res.json({ message: "Nenhum log para limpar" });
      }
    } catch (error) {
      console.error("Error clearing logs:", error);
      res.status(500).json({ error: "Failed to clear logs" });
    }
  });

  // ✅ Log viewer HTML page  
  app.get("/logs-viewer", (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>System Logs Viewer</title>
      <style>
        body { font-family: monospace; padding: 20px; background: #1a1a1a; color: #fff; }
        .log-entry { margin: 5px 0; padding: 5px; border-left: 3px solid #333; }
        .error { border-left-color: #ff4444; background: #330000; }
        .warn { border-left-color: #ffaa00; background: #332200; }
        .info { border-left-color: #0088ff; background: #002233; }
        .debug { border-left-color: #888; background: #111; }
        button { margin: 10px; padding: 10px 20px; font-size: 16px; }
        .refresh { background: #007700; color: white; border: none; border-radius: 5px; cursor: pointer; }
        .clear { background: #cc0000; color: white; border: none; border-radius: 5px; cursor: pointer; }
      </style>
    </head>
    <body>
      <h1>🔍 System Logs Viewer</h1>
      <button class="refresh" onclick="loadLogs()">🔄 Refresh</button>
      <button class="clear" onclick="clearLogs()">🗑️ Clear All Logs</button>
      <div id="logs"></div>
      
      <script>
        async function loadLogs() {
          try {
            const response = await fetch('/api/system/logs');
            const data = await response.json();
            
            const logsDiv = document.getElementById('logs');
            logsDiv.innerHTML = '';
            
            data.logs.forEach(log => {
              const logDiv = document.createElement('div');
              logDiv.innerHTML = '<h3>' + log.file + '</h3>';
              
              log.entries.forEach(entry => {
                const entryDiv = document.createElement('div');
                entryDiv.className = 'log-entry ' + (entry.level || 'info');
                entryDiv.innerHTML = 
                  '<strong>' + (entry.timestamp || 'N/A') + '</strong>: ' +
                  (entry.message || JSON.stringify(entry));
                logDiv.appendChild(entryDiv);
              });
              
              logsDiv.appendChild(logDiv);
            });
          } catch (error) {
            document.getElementById('logs').innerHTML = '<p style="color: red;">Error loading logs: ' + error.message + '</p>';
          }
        }
        
        async function clearLogs() {
          if (confirm('Are you sure you want to clear all logs?')) {
            try {
              await fetch('/api/system/logs', { method: 'DELETE' });
              loadLogs();
            } catch (error) {
              alert('Error clearing logs: ' + error.message);
            }
          }
        }
        
        // Load logs on page load
        loadLogs();
        
        // Auto-refresh every 30 seconds
        setInterval(loadLogs, 30000);
      </script>
    </body>
    </html>
    `);
  });

  // ===========================
  // 🔥 ROTAS LEGACY NÃO REFATORADAS
  // ===========================

  // Teams related routes (ainda precisam ser refatoradas)
  app.get("/api/user-teams", requireAuth, async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const userTeams = await userTeamService.getUserTeams(authContext, authContext.userId);
      res.json(userTeams);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user teams" });
    }
  });

  app.get("/api/users/:userId/teams", requireAuth, async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const teams = await userTeamService.getUserTeams(authContext, req.params.userId);
      res.json(teams);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user teams" });
    }
  });

  app.get("/api/teams/:teamId/users", requireAuth, async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const users = await userTeamService.getTeamUsers(authContext, req.params.teamId);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch team users" });
    }
  });

  app.post("/api/users/:userId/teams/:teamId", async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const result = await userTeamService.addUserToTeam(authContext, {
        userId: req.params.userId,
        teamId: req.params.teamId,
        role: req.body.role || 'member'
      });
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ message: "Failed to add user to team" });
    }
  });

  app.delete("/api/users/:userId/teams/:teamId", async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      await teamService.removeUserFromTeam(authContext, req.params.userId, req.params.teamId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove user from team" });
    }
  });

  app.patch("/api/users/:userId/teams/:teamId", async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const result = await teamService.updateUserTeamRole(authContext, req.params.userId, req.params.teamId, req.body.role);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: "Failed to update user team role" });
    }
  });

  // Teams routes
  app.get("/api/teams", async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const teams = await teamService.getTeams(authContext);
      res.json(teams);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  app.get("/api/teams/:id", async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const team = await teamService.getTeam(authContext, req.params.id);
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
      const authContext = createAuthContextFromRequest(req);
      const team = await teamService.createTeam(authContext, req.body);
      res.status(201).json(team);
    } catch (error) {
      res.status(400).json({ message: "Invalid team data" });
    }
  });

  app.put("/api/teams/:id", async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const updatedTeam = await teamService.updateTeam(authContext, req.params.id, req.body);
      res.json(updatedTeam);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Team not found" });
      }
      res.status(400).json({ message: "Invalid team data" });
    }
  });

  app.patch("/api/teams/:id", async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const updatedTeam = await teamService.updateTeam(authContext, req.params.id, req.body);
      res.json(updatedTeam);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Team not found" });
      }
      res.status(400).json({ message: "Invalid team data" });
    }
  });

  app.delete("/api/teams/:id", async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      await teamService.deleteTeam(authContext, req.params.id);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ message: "Team not found" });
      }
      res.status(500).json({ message: "Failed to delete team" });
    }
  });

  // Notification routes
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const notifications = await notificationService.getNotifications(authContext);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread-count", requireAuth, async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const count = await notificationService.getUnreadCount(authContext);
      res.json(count);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch unread notifications count" });
    }
  });

  // Profiles routes
  app.get("/api/profiles", async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const profiles = await profileService.getProfiles(authContext);
      res.json(profiles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch profiles" });
    }
  });

  app.get("/api/profiles/:id", async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const profile = await profileService.getProfile(authContext, req.params.id);
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
      const authContext = createAuthContextFromRequest(req);
      const profile = await profileService.createProfile(authContext, req.body);
      res.status(201).json(profile);
    } catch (error) {
      res.status(400).json({ message: "Invalid profile data" });
    }
  });

  // Permissions routes
  app.get("/api/permissions", async (req, res) => {
    try {
      const authContext = createAuthContextFromRequest(req);
      const permissions = await permissionService.getPermissions(authContext);
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch permissions" });
    }
  });

  app.post("/api/permissions/sync", requireAuth, async (req, res) => {
    try {
      const permissionSyncService = PermissionSyncService.getInstance();
      const result = await permissionSyncService.syncPermissions(app);
      res.json(result);
    } catch (error) {
      console.error("Permission sync error:", error);
      res.status(500).json({ error: "Failed to sync permissions" });
    }
  });

  // Password change route
  app.patch("/api/users/:id/password", async (req, res) => {
    try {
      // Verificar autenticação
      const token = req.headers.authorization?.replace('Bearer ', '') || '';
      const authContext = await UnifiedAuthService.validateToken(token);
      if (!authContext) {
        return res.status(401).json({ 
          error: 'Authentication required',
          message: 'Valid JWT token required to access this resource'
        });
      }

      // Implementar changePassword diretamente aqui temporariamente
      const hashedPassword = await bcrypt.hash(req.body.newPassword, 10);
      await storage.updateUser(req.params.id, { password: hashedPassword });
      const result = { success: true, message: 'Password updated successfully' };
      res.json(result);
    } catch (error) {
      console.error("Error changing password:", error);
      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          return res.status(404).json({ message: "User not found" });
        }
        if (error.message.includes("incorrect")) {
          return res.status(400).json({ message: "Current password is incorrect" });
        }
        if (error.message.includes("permission")) {
          return res.status(403).json({ message: error.message });
        }
      }
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  const httpServer = createServer(app);
  
  // Sincronizar permissões automaticamente na inicialização
  setTimeout(async () => {
    try {
      const permissionSyncService = PermissionSyncService.getInstance();
      await permissionSyncService.syncPermissions(app);
    } catch (error) {
      console.error("❌ [STARTUP] Erro na sincronização automática de permissões:", error);
    }
  }, 5000); // Aguardar 5 segundos após inicialização
  
  return httpServer;
}