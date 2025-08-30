/**
 * 🛡️ PERMISSION ERROR BOUNDARY - Tratamento de erros robusto para sistema de permissões
 */

import React, { Component, ReactNode } from 'react';
import { PermissionSystemError } from '../errors/PermissionSystemError';
import { Button } from './ui/button';
import { AlertTriangle, RefreshCw, Shield } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

export class PermissionErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log para monitoramento
    console.error('🚨 [PERMISSION-ERROR-BOUNDARY] Erro capturado:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });

    // Callback personalizado se fornecido
    this.props.onError?.(error, errorInfo);

    // Reportar erro crítico
    if (error instanceof PermissionSystemError && error.isCritical()) {
      console.error('🔥 [CRITICAL-PERMISSION-ERROR]', error.toJSON());
    }
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: this.state.retryCount + 1
      });
    } else {
      // Máximo de tentativas atingido, recarregar página
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      // Fallback customizado se fornecido
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isPermissionError = this.state.error instanceof PermissionSystemError;
      const isCritical = isPermissionError && (this.state.error as PermissionSystemError).isCritical();

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-red-200 rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              {isCritical ? (
                <AlertTriangle className="h-6 w-6 text-red-600" />
              ) : (
                <Shield className="h-6 w-6 text-orange-600" />
              )}
              <h3 className="text-lg font-semibold text-gray-900">
                {isCritical ? 'Sistema Temporariamente Indisponível' : 'Erro de Permissões'}
              </h3>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-2">
                {isCritical 
                  ? 'Falha crítica no sistema de permissões. Contate o administrador.'
                  : 'Ocorreu um problema ao verificar suas permissões. Tente novamente.'
                }
              </p>
              
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-3">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                    Detalhes técnicos (desenvolvimento)
                  </summary>
                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono text-gray-600">
                    <p><strong>Erro:</strong> {this.state.error?.message}</p>
                    {isPermissionError && (
                      <>
                        <p><strong>Código:</strong> {(this.state.error as PermissionSystemError).code}</p>
                        <p><strong>Usuário:</strong> {(this.state.error as PermissionSystemError).userId || 'N/A'}</p>
                      </>
                    )}
                    <p><strong>Tentativas:</strong> {this.state.retryCount}/{this.maxRetries}</p>
                  </div>
                </details>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={this.handleRetry}
                className="flex-1 flex items-center gap-2"
                variant={isCritical ? "secondary" : "default"}
                data-testid="button-retry-permissions"
              >
                <RefreshCw className="h-4 w-4" />
                {this.state.retryCount < this.maxRetries ? 'Tentar Novamente' : 'Recarregar Página'}
              </Button>
              
              {!isCritical && (
                <Button
                  onClick={() => window.location.href = '/login'}
                  variant="outline"
                  data-testid="button-logout-permissions"
                >
                  Fazer Login Novamente
                </Button>
              )}
            </div>

            {isCritical && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-xs text-red-600">
                  <strong>Para administradores:</strong> Verifique os logs do servidor e a conectividade 
                  com o banco de dados. Este erro indica falha crítica no sistema de autenticação.
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook para usar com functional components
 */
export const usePermissionErrorBoundary = () => {
  const throwError = (error: Error) => {
    throw error;
  };

  return { throwError };
};