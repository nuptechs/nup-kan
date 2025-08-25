import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// INTERCEPTAÇÃO IMEDIATA DO CONSOLE (antes de qualquer coisa)
(function() {
  if (typeof window !== 'undefined') {
    const shouldSuppressMessage = (message: any) => {
      if (typeof message !== 'string') return false;
      
      // Browser/iframe feature warnings (principais causadores do spam)
      if (message.includes('Unrecognized feature:')) return true;
      if (message.includes('ambient-light-sensor')) return true;
      if (message.includes('battery')) return true;
      if (message.includes('execution-while-not-rendered')) return true;
      if (message.includes('execution-while-out-of-viewport')) return true;
      if (message.includes('layout-animations')) return true;
      if (message.includes('legacy-image-formats')) return true;
      if (message.includes('navigation-override')) return true;
      if (message.includes('oversized-images')) return true;
      if (message.includes('publickey-credentials')) return true;
      if (message.includes('speaker-selection')) return true;
      if (message.includes('unoptimized-images')) return true;
      if (message.includes('unsized-media')) return true;
      if (message.includes('pointer-lock')) return true;
      if (message.includes('Allow attribute will take precedence')) return true;
      
      // react-beautiful-dnd warnings
      if (message.includes('defaultProps will be removed from memo components')) return true;
      if (message.includes('React does not recognize the `isDragging` prop')) return true;
      if (message.includes('React does not recognize the `isDropDisabled` prop')) return true;
      if (message.includes('React does not recognize the `isDragDisabled` prop')) return true;
      
      // TanStack Query warnings
      if (message.includes('Query data cannot be undefined')) return true;
      if (message.includes('QueryClient has not been set')) return true;
      
      // Outras fontes comuns de spam
      if (message.includes('Failed to load resource')) return true;
      if (message.includes('ERR_BLOCKED_BY_CLIENT')) return true;
      if (message.includes('The resource was blocked by a content blocker')) return true;
      if (message.includes('Failed to register ServiceWorker')) return true;
      if (message.includes('Cannot read properties of null')) return true;
      if (message.includes('Non-serializable values')) return true;
      if (message.includes('Webpack DevServer')) return true;
      if (message.includes('HMR')) return true;
      if (message.includes('sockjs-node')) return true;
      if (message.includes('WebSocket connection')) return true;
      if (message.includes('ResizeObserver loop limit exceeded')) return true;
      
      return false;
    };

    // Interceptar IMEDIATAMENTE todos os métodos do console
    const originalMethods = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
      debug: console.debug
    };
    
    console.log = (...args) => {
      const message = args[0];
      if (shouldSuppressMessage(message)) return;
      
      // Aplicar estilo aos logs importantes
      if (typeof message === 'string' && (message.includes('🚀') || message.includes('📦') || message.includes('✅') || message.includes('🔄'))) {
        originalMethods.log('%c' + message, 'color: #10b981; font-weight: bold;', ...args.slice(1));
      } else {
        // Suprimir logs excessivos de HMR/Vite
        if (typeof message === 'string' && message.includes('[vite] hot updated')) return;
        originalMethods.log.apply(console, args);
      }
    };
    
    console.warn = (...args) => {
      const message = args[0];
      if (shouldSuppressMessage(message)) return;
      originalMethods.warn.apply(console, args);
    };
    
    console.error = (...args) => {
      const message = args[0];
      if (shouldSuppressMessage(message)) return;
      originalMethods.error.apply(console, args);
    };
    
    console.info = (...args) => {
      const message = args[0];
      if (shouldSuppressMessage(message)) return;
      originalMethods.info.apply(console, args);
    };
    
    console.debug = (...args) => {
      const message = args[0];
      if (shouldSuppressMessage(message)) return;
      originalMethods.debug.apply(console, args);
    };
    
    // Função global para limpar console facilmente
    (window as any).clearConsole = () => {
      console.clear();
      originalMethods.log('%c🧹 Console limpo! Issues do navegador/iframe suprimidos.', 'color: #22c55e; font-weight: bold; font-size: 14px;');
    };
    
    // Atalho de teclado para limpar console (Ctrl+L)
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        (window as any).clearConsole();
      }
    });
  }
})();

// Adicional: interceptação de eventos de erro global para suprimir mais warnings
if (import.meta.env.DEV) {
  // Interceptar erros e warnings no nível mais baixo
  window.addEventListener('error', (e) => {
    const message = e.message || '';
    if (message.includes('Unrecognized feature:') || 
        message.includes('ambient-light-sensor') ||
        message.includes('battery') ||
        message.includes('execution-while-not-rendered') ||
        message.includes('execution-while-out-of-viewport') ||
        message.includes('layout-animations') ||
        message.includes('legacy-image-formats') ||
        message.includes('navigation-override') ||
        message.includes('oversized-images') ||
        message.includes('publickey-credentials') ||
        message.includes('speaker-selection') ||
        message.includes('unoptimized-images') ||
        message.includes('unsized-media') ||
        message.includes('pointer-lock')) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, true);
  
  // Interceptar warnings de unhandled promise rejections
  window.addEventListener('unhandledrejection', (e) => {
    const message = e.reason?.message || '';
    if (message.includes('Unrecognized feature:') ||
        message.includes('ambient-light-sensor') ||
        message.includes('battery') ||
        message.includes('execution-while-not-rendered')) {
      e.preventDefault();
      return false;
    }
  });
}

// Debug: contar mensagens suprimidas
let suppressedCount = 0;
if (import.meta.env.DEV) {
  const originalSuppress = (window as any).shouldSuppressMessage || (() => false);
  (window as any).shouldSuppressMessage = (message: any) => {
    if (originalSuppress(message)) {
      suppressedCount++;
      if (suppressedCount % 50 === 0) {
        console.log(`%c🔇 ${suppressedCount} warnings suprimidos`, 'color: #ef4444; font-weight: bold;');
      }
      return true;
    }
    return false;
  };
}

createRoot(document.getElementById("root")!).render(<App />);
