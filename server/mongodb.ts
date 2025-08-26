import { MongoClient, Db, Collection } from 'mongodb';

// MongoDB Read Model for CQRS architecture

interface ReadModels {
  // Boards desnormalizados com todas as informações
  boardsWithStats: Collection<{
    _id: string;
    name: string;
    description: string;
    color: string;
    createdAt: Date;
    createdById: string;
    
    // Dados pré-calculados para performance
    taskCount: number;
    completedTasks: number;
    inProgressTasks: number;
    pendingTasks: number;
    
    // Colunas incluídas
    columns: Array<{
      id: string;
      title: string;
      color: string;
      position: number;
      wipLimit: number;
      taskCount: number;
    }>;
    
    // Membros ativos
    activeMembers: Array<{
      id: string;
      name: string;
      avatar: string;
      role: string;
    }>;
    
    // Métricas pré-calculadas
    metrics: {
      avgTaskCompletion: number;
      cycleTime: number;
      throughput: number;
      lastActivity: Date;
    };
  }>;
  
  // Tasks ultra-otimizadas
  tasksOptimized: Collection<{
    _id: string;
    boardId: string;
    columnId: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    progress: number;
    assigneeId?: string;
    assigneeName?: string;
    assigneeAvatar?: string;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
    dueDate?: Date;
    
    // Dados desnormalizados para performance
    boardName: string;
    columnTitle: string;
    
    // Histórico simplificado
    recentActivity: Array<{
      action: string;
      timestamp: Date;
      userId: string;
      userName: string;
    }>;
  }>;
  
  // Usuários com permissões pré-calculadas
  usersWithPermissions: Collection<{
    _id: string;
    name: string;
    email: string;
    avatar: string;
    profileId: string;
    profileName: string;
    
    // Permissões pré-calculadas (não precisa de JOINs!)
    permissions: string[];
    permissionCategories: string[];
    
    // Teams do usuário
    teams: Array<{
      id: string;
      name: string;
      role: string;
    }>;
    
    // Estatísticas do usuário
    stats: {
      activeTasks: number;
      completedTasks: number;
      boardsAccess: number;
      lastActivity: Date;
    };
  }>;
  
  // Analytics pré-processados
  analytics: Collection<{
    _id: string;
    type: 'global' | 'board' | 'user';
    targetId: string; // 'global', boardId, ou userId
    date: string; // YYYY-MM-DD para agregação diária
    
    data: {
      totalTasks: number;
      completedTasks: number;
      inProgressTasks: number;
      pendingTasks: number;
      avgProgress: number;
      
      // Métricas avançadas
      cycleTime: number;
      throughput: number;
      burndownRate: number;
      velocityPoints: number;
    };
    
    updatedAt: Date;
  }>;
}

class MongoReadStore {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  public collections: ReadModels | null = null;

  constructor() {
    this.connect();
  }

  private async connect() {
    try {
      // Tentar conectar MongoDB (local ou Atlas)
      const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017';
      
      this.client = new MongoClient(mongoUrl, {
        maxPoolSize: 50, // Pool otimizado para reads massivos
        minPoolSize: 5,
        connectTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 0, // Sem timeout para queries longas
      });

      await this.client.connect();
      this.db = this.client.db(process.env.MONGODB_DATABASE || 'nupkan_reads');
      
      // Inicializar coleções
      this.collections = {
        boardsWithStats: this.db.collection('boards_with_stats'),
        tasksOptimized: this.db.collection('tasks_optimized'),
        usersWithPermissions: this.db.collection('users_with_permissions'),
        analytics: this.db.collection('analytics'),
      };

      // Criar índices para performance máxima
      await this.createIndexes();
      
      console.log('🟢 [MONGO] MongoDB Read Store conectado com sucesso');
    } catch (error) {
      console.log('🟡 [MONGO] MongoDB não disponível, usando PostgreSQL apenas');
      // Graceful fallback - don't throw error, just continue without MongoDB
      this.client = null;
      this.db = null;
      this.collections = null;
    }
  }

  private async createIndexes() {
    if (!this.collections) return;

    try {
      // Índices para boards
      await this.collections.boardsWithStats.createIndex({ createdAt: -1 });
      await this.collections.boardsWithStats.createIndex({ 'activeMembers.id': 1 });
      await this.collections.boardsWithStats.createIndex({ taskCount: -1 });

      // Índices para tasks
      await this.collections.tasksOptimized.createIndex({ boardId: 1, status: 1 });
      await this.collections.tasksOptimized.createIndex({ assigneeId: 1 });
      await this.collections.tasksOptimized.createIndex({ createdAt: -1 });
      await this.collections.tasksOptimized.createIndex({ priority: 1, status: 1 });

      // Índices para users
      await this.collections.usersWithPermissions.createIndex({ email: 1 }, { unique: true });
      await this.collections.usersWithPermissions.createIndex({ permissions: 1 });
      await this.collections.usersWithPermissions.createIndex({ 'teams.id': 1 });

      // Índices para analytics
      await this.collections.analytics.createIndex({ type: 1, targetId: 1 });
      await this.collections.analytics.createIndex({ date: -1 });
      
      console.log('🔍 [MONGO] Índices criados com sucesso');
    } catch (error) {
      console.error('❌ [MONGO] Erro criando índices:', error);
    }
  }

  // Método de saúde
  async health(): Promise<boolean> {
    try {
      if (!this.client) return false;
      await this.client.db('admin').command({ ping: 1 });
      return true;
    } catch {
      return false;
    }
  }

  // Fechar conexão
  async close() {
    if (this.client) {
      await this.client.close();
    }
  }
}

// Singleton
export const mongoStore = new MongoReadStore();
export type { ReadModels };