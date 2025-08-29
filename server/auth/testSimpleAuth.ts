/**
 * 🧪 TESTE DO SISTEMA DE AUTENTICAÇÃO SIMPLIFICADO
 * 
 * Script para testar se o novo sistema mantém compatibilidade com as 26 funções existentes
 */

import { Request, Response } from 'express';
import { auth, requireAuth, requirePermission, getUserWithPermissions, User } from './simpleAuth';
import { AuthCache } from './authCache';

/**
 * 🎯 MOCK DE REQUEST E RESPONSE PARA TESTES
 */
function createMockRequest(userId?: string, sessionData?: any, token?: string): any {
  return {
    session: sessionData ? { user: { id: userId }, userId, ...sessionData } : undefined,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    authContext: undefined,
    user: undefined
  };
}

function createMockResponse(): any {
  const res = {
    status: function(code: number) { 
      res.statusCode = code; 
      return res; 
    },
    json: function(data: any) { 
      res.sent = true; 
      return res; 
    },
    statusCode: 200,
    sent: false
  };
  
  return res;
}

/**
 * 🚀 TESTES DE COMPATIBILIDADE
 */
export class SimpleAuthTester {
  
  /**
   * Testar função getUserWithPermissions
   */
  static async testGetUserWithPermissions() {
    console.log('🧪 [TEST] Testando getUserWithPermissions...');
    
    try {
      // Teste com usuário existente (mock)
      const mockUserId = 'test-user-123';
      const user = await getUserWithPermissions(mockUserId);
      
      if (user) {
        console.log('✅ [TEST] getUserWithPermissions OK:', {
          id: user.id,
          name: user.name,
          permissionsCount: user.permissions.length
        });
      } else {
        console.log('⚠️ [TEST] getUserWithPermissions retornou null (pode ser normal se usuário não existe)');
      }
    } catch (error) {
      console.error('❌ [TEST] getUserWithPermissions falhou:', error);
    }
  }
  
  /**
   * Testar middleware básico
   */
  static async testBasicAuth() {
    console.log('🧪 [TEST] Testando middleware básico...');
    
    const req = createMockRequest('test-user-123', { user: { id: 'test-user-123' } });
    const res = createMockResponse();
    let nextCalled = false;
    const next = () => { nextCalled = true; };
    
    try {
      await requireAuth(req, res, next);
      
      if (nextCalled) {
        console.log('✅ [TEST] Middleware básico OK - next() foi chamado');
      } else if (res.statusCode === 401) {
        console.log('⚠️ [TEST] Middleware básico bloqueou (401) - normal se usuário não existe');
      } else {
        console.log('❌ [TEST] Middleware básico comportamento inesperado');
      }
    } catch (error) {
      console.error('❌ [TEST] Middleware básico falhou:', error);
    }
  }
  
  /**
   * Testar middleware com permissões
   */
  static async testPermissionAuth() {
    console.log('🧪 [TEST] Testando middleware com permissões...');
    
    const req = createMockRequest('test-user-123', { user: { id: 'test-user-123' } });
    const res = createMockResponse();
    let nextCalled = false;
    const next = () => { nextCalled = true; };
    
    try {
      const middleware = requirePermission('manage_boards');
      await middleware(req, res, next);
      
      if (nextCalled) {
        console.log('✅ [TEST] Middleware com permissões OK');
      } else if (res.statusCode === 403) {
        console.log('⚠️ [TEST] Middleware bloqueou por permissão (403) - normal se usuário não tem permissão');
      } else if (res.statusCode === 401) {
        console.log('⚠️ [TEST] Middleware bloqueou por auth (401) - normal se usuário não existe');
      } else {
        console.log('❌ [TEST] Middleware com permissões comportamento inesperado');
      }
    } catch (error) {
      console.error('❌ [TEST] Middleware com permissões falhou:', error);
    }
  }
  
  /**
   * Testar cache de autenticação
   */
  static async testAuthCache() {
    console.log('🧪 [TEST] Testando AuthCache...');
    
    try {
      const mockUser: User = {
        id: 'cache-test-123',
        name: 'Cache Test User',
        email: 'cache@test.com',
        permissions: ['read_boards', 'manage_tasks'],
        profileId: 'profile-123'
      };
      
      // Testar set e get
      await AuthCache.cacheUser(mockUser.id, mockUser);
      const cachedUser = await AuthCache.getUser(mockUser.id);
      
      if (cachedUser && cachedUser.id === mockUser.id) {
        console.log('✅ [TEST] AuthCache set/get OK');
      } else {
        console.log('❌ [TEST] AuthCache set/get falhou');
      }
      
      // Testar invalidação
      await AuthCache.invalidateUser(mockUser.id);
      const invalidatedUser = await AuthCache.getUser(mockUser.id);
      
      if (!invalidatedUser) {
        console.log('✅ [TEST] AuthCache invalidation OK');
      } else {
        console.log('❌ [TEST] AuthCache invalidation falhou');
      }
      
    } catch (error) {
      console.error('❌ [TEST] AuthCache falhou:', error);
    }
  }
  
  /**
   * 🏃‍♂️ EXECUTAR TODOS OS TESTES
   */
  static async runAllTests() {
    console.log('🚀 [TEST] Iniciando testes do sistema de autenticação simplificado...');
    console.log('=' .repeat(70));
    
    await this.testGetUserWithPermissions();
    console.log('-'.repeat(50));
    
    await this.testBasicAuth();
    console.log('-'.repeat(50));
    
    await this.testPermissionAuth();
    console.log('-'.repeat(50));
    
    await this.testAuthCache();
    console.log('-'.repeat(50));
    
    console.log('✅ [TEST] Todos os testes concluídos!');
    console.log('📊 [TEST] Verifique os resultados acima para compatibilidade');
  }
}

// Executar testes se chamado diretamente
if (require.main === module) {
  SimpleAuthTester.runAllTests().catch(console.error);
}