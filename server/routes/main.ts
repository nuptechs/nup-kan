import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import { promises as fs } from 'fs';
import { join } from 'path';
import { storage } from "../storage";
import { UnifiedAuthService, requireAuth } from '../auth/unifiedAuth';
import { PermissionSyncService } from "../permissionSync";
import { createAuthContextFromRequest } from "../utils/authUtils";


export async function registerRoutes(app: Express): Promise<Server> {
  // 🏗️ NOVA ARQUITETURA DE ROTAS MODULAR
  // Importar rotas separadas por domínio
  const apiRoutes = (await import('./api')).default;
  const remainingRoutes = (await import('./remaining')).default;

  // Registrar todas as rotas sob /api
  app.use('/api', apiRoutes);
  app.use('/api', remainingRoutes);

  // ===========================
  // 🔥 ROUTES LEGACY - System logs (ainda não refatorado)
  // ===========================

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
  // 🔥 ROTAS LEGACY NÃO REFATORADAS (REMOVIDAS - Movidas para arquivos específicos)
  // Teams, Notifications, Profiles, Permissions rotas foram movidas para arquivos separados
  // ===========================

  // Permissões sync (manter aqui pois é funcionalidade de sistema)
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