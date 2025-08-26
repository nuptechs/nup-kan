import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// 🔥 CONNECTION POOL DE ALTA PERFORMANCE - SISTEMA DE PONTA
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  
  // 🚀 POOL OTIMIZADO PARA LATÊNCIA MÍNIMA
  max: 50,              // 50 conexões para alta concorrência
  min: 10,              // 10 conexões sempre ativas
  idleTimeoutMillis: 30000,     // 30s idle (mais tempo)
  connectionTimeoutMillis: 2000, // 2s timeout (ultra-rápido)
  
  // 🔧 OTIMIZAÇÕES NEON DE PONTA
  allowExitOnIdle: false,
  
  // 🎯 CONFIGURAÇÕES DE PERFORMANCE
  statement_timeout: 5000,      // 5s para statements
  idle_in_transaction_session_timeout: 10000, // 10s para transações idle
  
  // ⚡ KEEP-ALIVE OTIMIZADO
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

export const db = drizzle({ client: pool, schema });
