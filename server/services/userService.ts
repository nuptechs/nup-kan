/**
 * 👤 USER SERVICE - Gerenciamento de Usuários
 * 
 * Responsabilidades:
 * - CRUD completo de usuários com validação
 * - Lógica de negócio (permissões, autenticação, teams)
 * - Cache inteligente para performance
 * - Emissão de eventos de domínio
 * 
 * Arquitetura: Interface pública única para persistência de usuários
 */

import { BaseService, createSuccessResponse, createErrorResponse, PaginatedResponse, PaginationOptions } from "./baseService";
import type { AuthContext } from "../microservices/authService";
import type { User, InsertUser, UpdateUser } from "@shared/schema";
import { insertUserSchema, updateUserSchema } from "@shared/schema";
import { TTL } from "../cache";
import bcrypt from "bcryptjs";

export interface UserCreateRequest {
  name: string;
  email: string;
  password: string;
  role?: string;
  avatar?: string;
  profileId?: string;
}

export interface UserUpdateRequest {
  name?: string;
  email?: string;
  role?: string;
  avatar?: string;
  profileId?: string;
}

export interface UserWithDetails extends User {
  teams: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  permissions: string[];
  permissionCategories: string[];
  profileName?: string;
}

export class UserService extends BaseService {

  /**
   * Listar todos os usuários
   */
  async getUsers(authContext: AuthContext, options: PaginationOptions = {}): Promise<User[]> {
    this.log('user-service', 'getUsers', { userId: authContext.userId });
    
    try {
      this.requirePermission(authContext, 'Listar Users', 'listar usuários');

      const cacheKey = 'users:all';
      const cached = await this.cache.get<User[]>(cacheKey);
      if (cached) {
        this.log('user-service', 'cache hit', { cacheKey });
        return cached;
      }

      const users = await this.storage.getUsers();
      await this.cache.set(cacheKey, users, TTL.MEDIUM);
      
      return users;
    } catch (error) {
      this.logError('user-service', 'getUsers', error);
      throw error;
    }
  }

  /**
   * Obter usuário por ID com detalhes completos
   */
  async getUser(authContext: AuthContext, userId: string): Promise<UserWithDetails | null> {
    this.log('user-service', 'getUser', { requestingUserId: authContext.userId, targetUserId: userId });
    
    try {
      // Bypass de permissão para usuário 'system' (usado em refresh tokens)
      if (authContext.userId !== 'system') {
        this.requirePermission(authContext, 'Visualizar Users', 'visualizar usuário');
      }

      const cacheKey = `user:${userId}:full`;
      const cached = await this.cache.get<UserWithDetails>(cacheKey);
      if (cached) {
        return cached;
      }

      const user = await this.storage.getUser(userId);
      if (!user) {
        return null;
      }

      // Enriquecer com dados completos
      const [teams, permissions] = await Promise.all([
        this.storage.getUserTeams(userId),
        this.storage.getUserPermissions(userId)
      ]);

      const userWithDetails: UserWithDetails = {
        ...user,
        teams: teams.map(t => ({
          id: t.teamId,
          name: t.teamId, // Será preenchido com nome real
          role: t.role || 'member'
        })),
        permissions: permissions.map(p => p.name),
        permissionCategories: Array.from(new Set(permissions.map(p => p.category)))
      };

      await this.cache.set(cacheKey, userWithDetails, TTL.MEDIUM);
      return userWithDetails;
    } catch (error) {
      this.logError('user-service', 'getUser', error);
      throw error;
    }
  }

  /**
   * Criar novo usuário
   */
  async createUser(authContext: AuthContext, request: UserCreateRequest): Promise<User> {
    this.log('user-service', 'createUser', { userId: authContext.userId, email: request.email });
    
    try {
      this.requirePermission(authContext, 'Criar Users', 'criar usuário');

      // Validar dados
      const validatedData = insertUserSchema.parse({
        ...request,
        password: await bcrypt.hash(request.password, 10)
      });

      // Verificar se email já existe
      const existingUsers = await this.storage.getUsers();
      const emailExists = existingUsers.some(u => u.email.toLowerCase() === request.email.toLowerCase());
      if (emailExists) {
        throw new Error('Email já está em uso');
      }

      const user = await this.storage.createUser(validatedData);

      // Invalidar caches relacionados
      await this.invalidateCache([
        'users:all',
        `user:${user.id}:*`
      ]);

      // Emitir evento
      this.emitEvent('user.created', {
        userId: user.id,
        createdBy: authContext.userId,
        user: user
      });

      return user;
    } catch (error) {
      this.logError('user-service', 'createUser', error);
      throw error;
    }
  }

  /**
   * Atualizar usuário
   */
  async updateUser(authContext: AuthContext, userId: string, request: UserUpdateRequest): Promise<User> {
    this.log('user-service', 'updateUser', { userId: authContext.userId, targetUserId: userId });
    
    try {
      this.requirePermission(authContext, 'Editar Users', 'editar usuário');

      const existingUser = await this.storage.getUser(userId);
      if (!existingUser) {
        throw new Error('Usuário não encontrado');
      }

      // Validar dados
      const validatedData = updateUserSchema.parse(request);

      const user = await this.storage.updateUser(userId, validatedData);

      // Invalidar caches relacionados
      await this.invalidateCache([
        'users:all',
        `user:${userId}:*`
      ]);

      // Emitir evento
      this.emitEvent('user.updated', {
        userId: userId,
        updatedBy: authContext.userId,
        changes: validatedData
      });

      return user;
    } catch (error) {
      this.logError('user-service', 'updateUser', error);
      throw error;
    }
  }

  /**
   * Excluir usuário
   */
  async deleteUser(authContext: AuthContext, userId: string): Promise<void> {
    this.log('user-service', 'deleteUser', { userId: authContext.userId, targetUserId: userId });
    
    try {
      this.requirePermission(authContext, 'Excluir Users', 'excluir usuário');

      const user = await this.storage.getUser(userId);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      await this.storage.deleteUser(userId);

      // Invalidar caches relacionados
      await this.invalidateCache([
        'users:all',
        `user:${userId}:*`
      ]);

      // Emitir evento
      this.emitEvent('user.deleted', {
        userId: userId,
        deletedBy: authContext.userId,
        deletedUser: user
      });
    } catch (error) {
      this.logError('user-service', 'deleteUser', error);
      throw error;
    }
  }

  /**
   * Atualizar senha do usuário (alias para compatibility)
   */
  async updateUserPassword(authContext: AuthContext, userId: string, newPassword: string): Promise<void> {
    return this.updatePassword(authContext, userId, newPassword);
  }

  /**
   * Atualizar senha do usuário
   */
  async updatePassword(authContext: AuthContext, userId: string, newPassword: string): Promise<void> {
    this.log('user-service', 'updatePassword', { userId: authContext.userId, targetUserId: userId });
    
    try {
      // Permitir que usuários alterem suas próprias senhas ou admins alterem qualquer senha
      if (authContext.userId !== userId) {
        this.requirePermission(authContext, 'Editar Users', 'alterar senha de outro usuário');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await this.storage.updateUserPassword(userId, hashedPassword);

      // Invalidar caches relacionados
      await this.invalidateCache([`user:${userId}:*`]);

      // Emitir evento
      this.emitEvent('user.password_changed', {
        userId: userId,
        changedBy: authContext.userId
      });
    } catch (error) {
      this.logError('user-service', 'updatePassword', error);
      throw error;
    }
  }
}

// Instância singleton
export const userService = new UserService();