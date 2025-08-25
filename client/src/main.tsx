import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Configurar logs de desenvolvimento para melhor debugging
if (import.meta.env.DEV) {
  // Suprimir avisos conhecidos de bibliotecas externas que causam spam no console
  const originalWarn = console.warn;
  console.warn = (...args) => {
    const message = args[0];
    
    // Suprimir avisos conhecidos de bibliotecas que causam spam
    if (typeof message === 'string') {
      // react-beautiful-dnd warnings
      if (message.includes('defaultProps will be removed from memo components')) return;
      if (message.includes('React does not recognize the `isDragging` prop')) return;
      if (message.includes('React does not recognize the `isDropDisabled` prop')) return;
      if (message.includes('React does not recognize the `isDragDisabled` prop')) return;
      
      // TanStack Query warnings já resolvidos
      if (message.includes('Query data cannot be undefined')) return;
      if (message.includes('QueryClient has not been set')) return;
    }
    
    originalWarn.apply(console, args);
  };
  
  // Adicionar estilo aos logs de debug da aplicação e reduzir spam
  const originalLog = console.log;
  console.log = (...args) => {
    if (typeof args[0] === 'string' && (args[0].includes('🚀') || args[0].includes('📦') || args[0].includes('✅') || args[0].includes('🔄'))) {
      originalLog('%c' + args[0], 'color: #10b981; font-weight: bold;', ...args.slice(1));
    } else {
      // Suprimir logs excessivos de HMR/Vite para reduzir spam no console
      if (typeof args[0] === 'string' && args[0].includes('[vite] hot updated')) {
        return; // Não mostrar logs de hot reload excessivos
      }
      originalLog.apply(console, args);
    }
  };

  // Função global para limpar console facilmente
  (window as any).clearConsole = () => {
    console.clear();
    console.log('%c🧹 Console limpo!', 'color: #22c55e; font-weight: bold; font-size: 14px;');
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
