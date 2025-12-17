import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import type { DB } from '../types/database';
import { env } from './env';

const isSupabase = env.DB_HOST?.includes('supabase.co') || env.SUPABASE_URL;
const dbPassword = env.DB_PASSWORD || env.SUPABASE_DB_PASSWORD;

const poolConfig = {
  host: env.DB_HOST || 'db.retdeavipeqdeugirrri.supabase.co',
  port: parseInt(env.DB_PORT || '5432'),
  database: env.DB_NAME || 'postgres',
  user: env.DB_USER || 'postgres',
  password: dbPassword,
  ssl: isSupabase || env.NODE_ENV === 'production' 
    ? { 
        rejectUnauthorized: false,
        require: true 
      } 
    : false,
  max: 10,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  retryDelayMs: 2000,
};

const pool = new Pool(poolConfig);

pool.on('error', () => {});

pool.query('SELECT NOW()', () => {});

const dialect = new PostgresDialect({
  pool,
});

export const db = new Kysely<DB>({
  dialect,
});

export default db;

