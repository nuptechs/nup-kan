import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Configurar logs de desenvolvimento para melhor debugging
if (import.meta.env.DEV) {
  // Suprimir apenas avisos específicos de bibliotecas externas
  const originalWarn = console.warn;
  console.warn = (...args) => {
    // Filtrar avisos sobre defaultProps do react-beautiful-dnd
    if (args[0]?.includes?.('defaultProps will be removed from memo components')) {
      return;
    }
    originalWarn.apply(console, args);
  };
  
  // Adicionar estilo aos logs de debug da aplicação
  const originalLog = console.log;
  console.log = (...args) => {
    if (typeof args[0] === 'string' && (args[0].includes('🚀') || args[0].includes('📦') || args[0].includes('✅') || args[0].includes('🔄'))) {
      originalLog('%c' + args[0], 'color: #10b981; font-weight: bold;', ...args.slice(1));
    } else {
      originalLog.apply(console, args);
    }
  };
}

createRoot(document.getElementById("root")!).render(<App />);
