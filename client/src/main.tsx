import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Suprimir avisos específicos de bibliotecas externas em desenvolvimento
if (import.meta.env.DEV) {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    // Filtrar avisos sobre defaultProps do react-beautiful-dnd
    if (args[0]?.includes?.('defaultProps will be removed from memo components')) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

createRoot(document.getElementById("root")!).render(<App />);
