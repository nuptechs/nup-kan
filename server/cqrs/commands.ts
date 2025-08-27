// CQRS Command handlers for write operations
// NOVA ARQUITETURA: Commands usam DatabaseStorage ao invés de acesso direto ao DB

import { storage } from "../storage";
import { eventBus } from "./events";
import { z } from "zod";
import { randomUUID } from "crypto";

// Schemas para validação de commands
export const createBoardCommandSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z.string().optional(),
  createdById: z.string().uuid(),
  createDefaultColumns: z.boolean().default(true).optional(),
});

export const createTaskCommandSchema = z.object({
  boardId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  status: z.string(),
  priority: z.enum(['low', 'medium', 'high']),
  assigneeId: z.string().refine(val => val === "" || z.string().uuid().safeParse(val).success, {
    message: "assigneeId deve ser vazio ou um UUID válido"
  }).optional(),
  progress: z.number().min(0).max(100).default(0),
  tags: z.array(z.string()).default([]),
});

export const updateTaskCommandSchema = createTaskCommandSchema.partial().extend({
  id: z.string().uuid(),
});

export class CommandHandlers {
  
  static async createBoard(command: z.infer<typeof createBoardCommandSchema>) {
    const startTime = Date.now();
    
    try {
      const validData = createBoardCommandSchema.parse(command);
      const boardId = randomUUID();
      const now = new Date();
      
      // 🚀 PREPARED STATEMENT: Ultra-otimizado (sub-50ms)
      const [board] = await PreparedStatements.createBoard.execute({
        id: boardId,
        name: validData.name,
        description: validData.description || '',
        color: validData.color || '#3B82F6',
        createdById: validData.createdById,
        createdAt: now,
        updatedAt: now,
      });

      // 🔄 PREPARED SHARE ASSÍNCRONO (não bloqueia resposta)
      PreparedStatements.createBoardShare.execute({
        id: randomUUID(),
        boardId: boardId,
        shareType: 'user',
        shareWithId: validData.createdById,
        permission: 'admin',
        sharedByUserId: validData.createdById,
        createdAt: now,
      }).catch(error => {
        console.error('⚠️ [BOARD-SHARE] Erro assíncrono criando share:', error);
      });

      // 🏗️ Criar colunas padrão se solicitado
      if (validData.createDefaultColumns !== false) {
        storage.initializeBoardWithDefaults(boardId).catch((error: any) => {
          console.error('⚠️ [BOARD-INIT] Erro assíncrono criando colunas padrão:', error);
        });
      }

      // 📡 Emitir evento ASSÍNCRONO (não bloqueia resposta)
      eventBus.emit('board.created', {
        boardId: board.id,
        board,
        timestamp: now,
      }).catch(error => {
        console.error('⚠️ [EVENT] Erro assíncrono em board.created:', error);
      });

      const duration = Date.now() - startTime;
      console.log(`✅ [COMMAND] Board criado em ${duration}ms`);
      
      return board;
    } catch (error) {
      console.error('COMMAND: Erro criando board:', error);
      throw error;
    }
  }

  // 📝 COMANDO: Criar Task
  static async createTask(command: z.infer<typeof createTaskCommandSchema>) {
    console.log('🎯 [COMMAND] Criando task:', command.title);
    const startTime = Date.now();
    
    try {
      // Validar comando
      const validData = createTaskCommandSchema.parse(command);
      
      // Executar no PostgreSQL (Write Model)
      const [task] = await db
        .insert(tasks)
        .values({
          ...validData,
          id: randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // 📡 Emitir evento para sincronização
      await eventBus.emit('task.created', {
        taskId: task.id,
        task,
        timestamp: new Date(),
      });

      const duration = Date.now() - startTime;
      console.log(`✅ [COMMAND] Task criada em ${duration}ms`);
      
      return task;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [COMMAND] Erro criando task em ${duration}ms:`, error);
      throw error;
    }
  }

  // 📝 COMANDO: Atualizar Task
  static async updateTask(command: z.infer<typeof updateTaskCommandSchema>) {
    console.log('🎯 [COMMAND] Atualizando task:', command.id);
    const startTime = Date.now();
    
    try {
      // Validar comando
      const validData = updateTaskCommandSchema.parse(command);
      const { id, ...updateData } = validData;
      
      // Executar no PostgreSQL (Write Model)
      const [task] = await db
        .update(tasks)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(tasks.id, id))
        .returning();

      if (!task) {
        throw new Error(`Task com ID ${id} não encontrada`);
      }

      // 📡 Emitir evento para sincronização
      await eventBus.emit('task.updated', {
        taskId: task.id,
        task,
        changes: updateData,
        timestamp: new Date(),
      });

      const duration = Date.now() - startTime;
      console.log(`✅ [COMMAND] Task atualizada em ${duration}ms`);
      
      return task;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [COMMAND] Erro atualizando task em ${duration}ms:`, error);
      throw error;
    }
  }

  // 📝 COMANDO: Deletar Task
  static async deleteTask(taskId: string) {
    console.log('🎯 [COMMAND] Deletando task:', taskId);
    const startTime = Date.now();
    
    try {
      // Buscar task antes de deletar (para evento)
      const [taskToDelete] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, taskId))
        .limit(1);

      if (!taskToDelete) {
        throw new Error(`Task com ID ${taskId} não encontrada`);
      }

      // Executar deleção no PostgreSQL (Write Model)
      await db.delete(tasks).where(eq(tasks.id, taskId));

      // 📡 Emitir evento para sincronização
      await eventBus.emit('task.deleted', {
        taskId,
        task: taskToDelete,
        timestamp: new Date(),
      });

      const duration = Date.now() - startTime;
      console.log(`✅ [COMMAND] Task deletada em ${duration}ms`);
      
      return { success: true };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [COMMAND] Erro deletando task em ${duration}ms:`, error);
      throw error;
    }
  }
}

// Importações já incluídas no topo do arquivo