import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Only set WebSocket constructor if we're in a Node.js environment
if (typeof window === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// 🔥 CONNECTION POOL ESTÁVEL - OTIMIZADO PARA DESENVOLVIMENTO
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  
  // 🚀 POOL EQUILIBRADO PARA ESTABILIDADE
  max: 20,              // 20 conexões máximas (reduzido)
  min: 2,               // 2 conexões mínimas (mais eficiente)
  idleTimeoutMillis: 60000,     // 60s idle (mais tempo para dev)
  connectionTimeoutMillis: 20000, // 20s timeout (mais tolerante)
  
  // 🔧 OTIMIZAÇÕES NEON ESTÁVEIS
  allowExitOnIdle: false,
  
  // 🎯 CONFIGURAÇÕES BALANCEADAS
  statement_timeout: 30000,      // 30s para statements (mais tempo)
  idle_in_transaction_session_timeout: 30000, // 30s para transações idle
  
  // ⚡ KEEP-ALIVE BALANCEADO
  keepAlive: true,
  keepAliveInitialDelayMillis: 5000, // 5s inicial (reduzido)
  
  // 🛡️ CONFIGURAÇÕES DE SEGURANÇA
  maxUses: Infinity,
});

export const db = drizzle({ client: pool, schema });
