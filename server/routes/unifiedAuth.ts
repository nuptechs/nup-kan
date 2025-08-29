/**
 * 🚀 ROTAS DO UNIFIED AUTH SERVICE
 * Endpoints limpos e consolidados para autenticação
 */

import { Router } from 'express';
import { UnifiedAuthService, requireAuth, AuthRequest } from '../auth/unifiedAuth';

const router = Router();

/**
 * 🔄 POST /api/auth/refresh - Renovar token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Missing refresh token',
        message: 'Refresh token is required'
      });
    }

    const newTokens = await UnifiedAuthService.refreshToken(refreshToken);
    
    if (!newTokens) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        message: 'Refresh token is expired or invalid'
      });
    }

    console.log('✅ [UNIFIED-AUTH] Token renovado com sucesso');
    
    res.json({
      tokens: newTokens,
      success: true
    });

  } catch (error) {
    console.error('❌ [UNIFIED-AUTH] Erro no refresh:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to refresh token'
    });
  }
});

/**
 * 🚪 POST /api/auth/logout - Logout seguro
 */
router.post('/logout', requireAuth, async (req: AuthRequest, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || '';
    
    if (token) {
      await UnifiedAuthService.logout(token);
    }

    console.log('✅ [UNIFIED-AUTH] Logout realizado para:', req.authContext?.userEmail);
    
    res.json({
      message: 'Logout realizado com sucesso',
      success: true
    });

  } catch (error) {
    console.error('❌ [UNIFIED-AUTH] Erro no logout:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to logout'
    });
  }
});

/**
 * 🚨 POST /api/auth/logout-all - Logout global
 */
router.post('/logout-all', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.authContext?.userId;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Valid authentication required'
      });
    }

    await UnifiedAuthService.revokeAllTokens(userId);

    console.log('✅ [UNIFIED-AUTH] Logout global para:', userId);
    
    res.json({
      message: 'Logout realizado em todas as sessões',
      success: true
    });

  } catch (error) {
    console.error('❌ [UNIFIED-AUTH] Erro no logout global:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to logout from all sessions'
    });
  }
});

/**
 * 👤 GET /api/auth/me - Dados do usuário atual
 */
router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    const authContext = req.authContext;
    
    if (!authContext?.isAuthenticated) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Valid authentication required'
      });
    }

    res.json({
      user: {
        id: authContext.userId,
        name: authContext.userName,
        email: authContext.userEmail,
        permissions: authContext.permissions,
        profileId: authContext.profileId,
        profileName: authContext.profileName,
        teams: authContext.teams
      },
      isAuthenticated: true
    });

  } catch (error) {
    console.error('❌ [UNIFIED-AUTH] Erro ao buscar usuário:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get user data'
    });
  }
});

export default router;