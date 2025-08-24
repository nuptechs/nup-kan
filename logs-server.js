import express from 'express';
import { promises as fs } from 'fs';
import { join } from 'path';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;
const LOGS_FILE = join(process.cwd(), 'system-logs.json');

// Middleware para CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

app.use(express.static(path.join(__dirname, 'logs-viewer')));

// Função para carregar logs do arquivo
async function loadLogs() {
  try {
    const data = await fs.readFile(LOGS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.log('📄 [LOGS-SERVER] Arquivo de logs não encontrado ou vazio, retornando array vazio');
    return [];
  }
}

// Endpoint para obter logs
app.get('/api/logs', async (req, res) => {
  try {
    const { level, type, search, limit = "100" } = req.query;
    let logs = await loadLogs();
    
    if (level && level !== 'all') {
      logs = logs.filter(log => log.level === level);
    }
    
    if (type && type !== 'all') {
      logs = logs.filter(log => log.actionType === type);
    }
    
    if (search) {
      const searchTerm = search.toLowerCase();
      logs = logs.filter(log => 
        log.message.toLowerCase().includes(searchTerm) ||
        (log.action && log.action.toLowerCase().includes(searchTerm)) ||
        (log.userName && log.userName.toLowerCase().includes(searchTerm)) ||
        (log.context && log.context.toLowerCase().includes(searchTerm))
      );
    }
    
    const limitNum = parseInt(limit, 10);
    const result = logs.slice(0, Math.min(limitNum, 500));
    
    res.json({
      logs: result,
      total: logs.length,
      levels: ['info', 'warn', 'error', 'debug'],
      types: ['user_action', 'system', 'api']
    });
  } catch (error) {
    console.error('❌ [LOGS-SERVER] Erro ao carregar logs:', error);
    res.status(500).json({ 
      error: 'Falha ao carregar logs',
      message: error.message
    });
  }
});

// Endpoint de status
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'running',
    server: 'uP-Kan Logs Server',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Rota principal - servir o HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'logs-viewer', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`📊 [LOGS-SERVER] uP-Kan Logs Server rodando em http://localhost:${PORT}`);
  console.log(`📊 [LOGS-SERVER] Servidor independente para visualização de logs do sistema`);
  console.log(`📊 [LOGS-SERVER] Arquivo de logs: ${LOGS_FILE}`);
});