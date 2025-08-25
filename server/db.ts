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

// Connection Pool Otimizado para Performance Máxima
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Pool otimizado para performance
  max: 20,              // Máx 20 conexões simultâneas
  idleTimeoutMillis: 20000, // 20s timeout para conexões idle
  connectionTimeoutMillis: 10000, // 10s timeout para novas conexões
  
  // Otimizações específicas do Neon
  allowExitOnIdle: false,
});

export const db = drizzle({ client: pool, schema });
