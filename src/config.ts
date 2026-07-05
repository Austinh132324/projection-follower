import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(__dirname, '..');

function resolveFromRoot(p: string): string {
  return path.isAbsolute(p) ? p : path.resolve(PROJECT_ROOT, p);
}

const dataDir = resolveFromRoot(process.env.PF_DATA_DIR ?? './data');

export interface Config {
  dataDir: string;
  dbPath: string;
  port: number;
}

export const config: Config = {
  dataDir,
  dbPath: path.join(dataDir, 'bets.sqlite'),
  port: Number(process.env.PF_PORT ?? 4000),
};

/** Ensure the local data directory exists before anything writes to it. */
export function ensureDataDirs(): void {
  fs.mkdirSync(config.dataDir, { recursive: true });
}
