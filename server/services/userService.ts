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
import type { AuthContext } from "../auth/unifiedAuth";
import type { User, InsertUser, UpdateUser } from "@shared/schema";
import { insertUserSchema, updateUserSchema } from "@shared/schema";
import { TTL } from "../cache";
import { PERMISSIONS } from "../config/permissions";
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
      this.requirePermission(authContext, PERMISSIONS.USERS.LIST, 'listar usuários');

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
        this.requirePermission(authContext, PERMISSIONS.USERS.VIEW, 'visualizar usuário');
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
   * Gerar senha padrão baseada no email e nome do usuário
   */
  private generateDefaultPassword(name: string, email: string): string {
    // Pegar primeiras letras do nome (maiúsculas)
    const nameInitials = name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('');
    
    // Pegar primeiros 3 caracteres do email antes do @
    const emailPrefix = email.split('@')[0].substring(0, 3).toLowerCase();
    
    // Gerar 3 números baseados no email (determinístico)
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      const char = email.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    const numbers = Math.abs(hash).toString().substring(0, 3).padStart(3, '0');
    
    return `${nameInitials}${emailPrefix}${numbers}`;
  }

  /**
   * Criar novo usuário
   */
  async createUser(authContext: AuthContext, request: UserCreateRequest): Promise<User> {
    this.log('user-service', 'createUser', { userId: authContext.userId, email: request.email });
    
    try {
      this.requirePermission(authContext, PERMISSIONS.USERS.CREATE, 'criar usuário');

      // Verificar se email já existe
      const existingUsers = await this.storage.getUsers();
      const emailExists = existingUsers.some(u => u.email.toLowerCase() === request.email.toLowerCase());
      if (emailExists) {
        throw new Error('Email já está em uso');
      }

      // Gerar senha padrão se não foi fornecida ou estiver vazia
      const defaultPassword = this.generateDefaultPassword(request.name, request.email);
      const passwordToUse = (request.password && request.password.trim()) ? request.password : defaultPassword;
      
      console.log(`🔍 [PASSWORD-DEBUG] request.password:`, request.password);
      console.log(`🔍 [PASSWORD-DEBUG] defaultPassword:`, defaultPassword);
      console.log(`🔍 [PASSWORD-DEBUG] passwordToUse:`, passwordToUse);
      
      const hashedPassword = await bcrypt.hash(passwordToUse, 10);
      console.log(`🔍 [PASSWORD-DEBUG] hashedPassword:`, hashedPassword.substring(0, 20) + '...');

      // Validar dados
      const validatedData = insertUserSchema.parse({
        ...request,
        password: hashedPassword,
        firstLogin: true // Marcar como primeiro login
      });

      const user = await this.storage.createUser(validatedData);

      // Invalidar caches relacionados
      await this.invalidateCache([
        'users:all',
        `user:${user.id}:*`
      ]);

      // Log da senha utilizada (apenas para desenvolvimento)
      if (passwordToUse === defaultPassword) {
        console.log(`🔐 [USER-PASSWORD] Nova senha gerada para ${user.email}: ${defaultPassword}`);
      } else {
        console.log(`🔐 [USER-PASSWORD] Senha fornecida utilizada para ${user.email}`);
      }

      // Emitir evento
      this.emitEvent('user.created', {
        userId: user.id,
        createdBy: authContext.userId,
        user: user,
        generatedPassword: defaultPassword
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
      this.requirePermission(authContext, PERMISSIONS.USERS.EDIT, 'editar usuário');

      const existingUser = await this.storage.getUser(userId);
      if (!existingUser) {
        throw new Error('Usuário não encontrado');
      }

      // Validar dados
      const validatedData = updateUserSchema.parse(request);

      const user = await this.storage.updateUser(userId, validatedData);

      // ✅ INVALIDAÇÃO COORDENADA: Usuários + contexto de usuário (especialmente se profileId mudou)
      await this.invalidateCache([
        'users:all',
        `user:${userId}:*`
      ]);
      // Se profileId mudou, invalidar cache de contexto de usuário
      if (validatedData.profileId && validatedData.profileId !== existingUser.profileId) {
        const { UnifiedAuthService } = await import('../auth/unifiedAuth');
        await UnifiedAuthService.invalidateUserCache(userId);
      }

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
      this.requirePermission(authContext, PERMISSIONS.USERS.DELETE, 'excluir usuário');

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
        this.requirePermission(authContext, PERMISSIONS.USERS.EDIT, 'alterar senha de outro usuário');
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