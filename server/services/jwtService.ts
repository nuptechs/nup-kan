import jwt from "jsonwebtoken";
import { Request } from "express";

// 🔐 JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || "nupkan-jwt-secret-2025-super-secure";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  profileId?: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * 🚀 JWT Service - Gerenciamento profissional de tokens
 */
export class JWTService {
  
  /**
   * Gerar par de tokens (access + refresh)
   */
  static generateTokenPair(payload: Omit<JWTPayload, 'iat' | 'exp'>): TokenPair {
    const accessToken = jwt.sign(payload, JWT_SECRET, {
      expiresIn: '24h',
      issuer: 'nupkan-api',
      audience: 'nupkan-client'
    });

    const refreshToken = jwt.sign({ userId: payload.userId }, JWT_SECRET, {
      expiresIn: '7d',
      issuer: 'nupkan-api',
      audience: 'nupkan-refresh'
    });

    // Calcular tempo de expiração em segundos
    const decoded = jwt.decode(accessToken) as any;
    const expiresIn = decoded.exp - decoded.iat;

    return {
      accessToken,
      refreshToken,
      expiresIn
    };
  }

  /**
   * Verificar e decodificar token de acesso
   */
  static async verifyAccessToken(token: string): Promise<JWTPayload | null> {
    try {
      // Verificar se token está na blacklist primeiro
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        console.log('🚫 [JWT] Token está na blacklist');
        return null;
      }

      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'nupkan-api',
        audience: 'nupkan-client'
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        console.log('🔍 [JWT] Token expirado');
      } else if (error instanceof jwt.JsonWebTokenError) {
        console.log('🔍 [JWT] Token inválido');
      } else {
        console.error('🔍 [JWT] Erro ao verificar token:', error);
      }
      return null;
    }
  }

  /**
   * Verificar token de refresh
   */
  static async verifyRefreshToken(token: string): Promise<{ userId: string } | null> {
    try {
      // Verificar se token está na blacklist primeiro
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        console.log('🚫 [JWT] Refresh token está na blacklist');
        return null;
      }

      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'nupkan-api',
        audience: 'nupkan-refresh'
      }) as any;

      return { userId: decoded.userId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.log('🔍 [JWT] Refresh token inválido:', errorMessage);
      return null;
    }
  }

  /**
   * Extrair token do header Authorization
   */
  static extractTokenFromRequest(req: Request): string | null {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return null;
    }

    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  /**
   * Gerar novo access token usando refresh token
   */
  static async refreshAccessToken(refreshToken: string, getUserData: (userId: string) => Promise<any>): Promise<TokenPair | null> {
    const refreshPayload = await this.verifyRefreshToken(refreshToken);
    
    if (!refreshPayload) {
      return null;
    }

    try {
      // Buscar dados atualizados do usuário
      const userData = await getUserData(refreshPayload.userId);
      
      if (!userData) {
        return null;
      }

      // Invalidar refresh token antigo
      await this.blacklistToken(refreshToken);

      // Gerar novo par de tokens
      return this.generateTokenPair({
        userId: userData.id,
        email: userData.email,
        name: userData.name,
        profileId: userData.profileId
      });
    } catch (error) {
      console.error('🔍 [JWT] Erro ao refresh token:', error);
      return null;
    }
  }

  /**
   * Validar se token não está na blacklist
   */
  static async isTokenBlacklisted(token: string): Promise<boolean> {
    const { TokenBlacklistService } = await import('./tokenBlacklistService');
    return await TokenBlacklistService.isTokenBlacklisted(token);
  }

  /**
   * Adicionar token à blacklist (logout)
   */
  static async blacklistToken(token: string): Promise<void> {
    const decoded = this.decodeToken(token);
    if (decoded && decoded.exp) {
      const { TokenBlacklistService } = await import('./tokenBlacklistService');
      await TokenBlacklistService.blacklistToken(token, decoded.exp);
    }
  }

  /**
   * Decodificar token sem verificar assinatura (para debug)
   */
  static decodeToken(token: string): any {
    try {
      return jwt.decode(token);
    } catch {
      return null;
    }
  }
}