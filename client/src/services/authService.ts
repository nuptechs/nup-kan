/**
 * 🔐 AUTH SERVICE FRONTEND - Gerenciamento de autenticação JWT
 */

interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  profileId?: string;
}

interface LoginResponse {
  user: UserData;
  tokens: TokenData;
  isAuthenticated: boolean;
}

export class AuthService {
  private static readonly TOKEN_KEY = 'nupkan_access_token';
  private static readonly REFRESH_TOKEN_KEY = 'nupkan_refresh_token';
  private static readonly USER_KEY = 'nupkan_user_data';
  
  // Event para notificar mudanças de autenticação
  private static readonly AUTH_CHANGE_EVENT = 'auth-state-changed';

  /**
   * Armazenar tokens e dados do usuário
   */
  static setAuthData(loginResponse: LoginResponse): void {
    localStorage.setItem(this.TOKEN_KEY, loginResponse.tokens.accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, loginResponse.tokens.refreshToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(loginResponse.user));
    
    // Notificar mudança de autenticação
    this.notifyAuthChange();
  }

  /**
   * Obter token de acesso
   */
  static getAccessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Obter token de refresh
   */
  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Obter dados do usuário armazenados
   */
  static getUserData(): UserData | null {
    const userData = localStorage.getItem(this.USER_KEY);
    if (!userData) return null;
    
    try {
      return JSON.parse(userData);
    } catch {
      return null;
    }
  }

  /**
   * Verificar se está autenticado
   */
  static isAuthenticated(): boolean {
    const token = this.getAccessToken();
    const userData = this.getUserData();
    
    if (!token || !userData) {
      return false;
    }

    // Verificar se token não expirou
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  }

  /**
   * Fazer logout (limpar tokens)
   */
  static logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    
    // Notificar mudança de autenticação
    this.notifyAuthChange();
  }

  /**
   * Notificar mudança no estado de autenticação
   */
  private static notifyAuthChange(): void {
    window.dispatchEvent(new CustomEvent(this.AUTH_CHANGE_EVENT));
  }

  /**
   * Ouvir mudanças no estado de autenticação
   */
  static onAuthChange(callback: () => void): () => void {
    const handler = () => callback();
    window.addEventListener(this.AUTH_CHANGE_EVENT, handler);
    
    // Retornar função de cleanup
    return () => window.removeEventListener(this.AUTH_CHANGE_EVENT, handler);
  }

  /**
   * Obter header de autorização para requisições
   */
  static getAuthHeader(): Record<string, string> {
    const token = this.getAccessToken();
    if (!token) return {};
    
    return {
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Verificar se token está próximo do vencimento (menos de 5 minutos)
   */
  static isTokenExpiringSoon(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      const fiveMinutes = 5 * 60;
      return payload.exp - currentTime < fiveMinutes;
    } catch {
      return true;
    }
  }

  /**
   * Tentar renovar token usando refresh token
   */
  static async refreshAccessToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${refreshToken}`
        }
      });

      if (!response.ok) {
        this.logout();
        return false;
      }

      const newTokens: TokenData = await response.json();
      
      // Atualizar apenas os tokens, manter dados do usuário
      localStorage.setItem(this.TOKEN_KEY, newTokens.accessToken);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, newTokens.refreshToken);
      
      return true;
    } catch (error) {
      console.error('Erro ao renovar token:', error);
      this.logout();
      return false;
    }
  }
}