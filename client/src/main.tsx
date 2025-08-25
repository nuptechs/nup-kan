import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Configurar logs de desenvolvimento para melhor debugging
if (import.meta.env.DEV) {
  // Função para verificar se uma mensagem deve ser suprimida
  const shouldSuppressMessage = (message) => {
    if (typeof message !== 'string') return false;
    
    // Browser/iframe feature warnings (principais causadores do spam)
    if (message.includes('Unrecognized feature:')) return true;
    if (message.includes('Allow attribute will take precedence')) return true;
    
    // Permissions Policy warnings específicos
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

  // Interceptar TODOS os métodos do console
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalInfo = console.info;
  const originalDebug = console.debug;
  
  console.log = (...args) => {
    const message = args[0];
    if (shouldSuppressMessage(message)) return;
    
    // Aplicar estilo aos logs importantes
    if (typeof message === 'string' && (message.includes('🚀') || message.includes('📦') || message.includes('✅') || message.includes('🔄'))) {
      originalLog('%c' + message, 'color: #10b981; font-weight: bold;', ...args.slice(1));
    } else {
      // Suprimir logs excessivos de HMR/Vite
      if (typeof message === 'string' && message.includes('[vite] hot updated')) return;
      originalLog.apply(console, args);
    }
  };
  
  console.warn = (...args) => {
    const message = args[0];
    if (shouldSuppressMessage(message)) return;
    originalWarn.apply(console, args);
  };
  
  console.error = (...args) => {
    const message = args[0];
    if (shouldSuppressMessage(message)) return;
    originalError.apply(console, args);
  };
  
  console.info = (...args) => {
    const message = args[0];
    if (shouldSuppressMessage(message)) return;
    originalInfo.apply(console, args);
  };
  
  console.debug = (...args) => {
    const message = args[0];
    if (shouldSuppressMessage(message)) return;
    originalDebug.apply(console, args);
  };

  // Função global para limpar console facilmente
  (window as any).clearConsole = () => {
    console.clear();
    console.log('%c🧹 Console limpo! Issues do navegador/iframe suprimidos.', 'color: #22c55e; font-weight: bold; font-size: 14px;');
  };
  
  // Atalho de teclado para limpar console (Ctrl+L)
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      (window as any).clearConsole();
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
