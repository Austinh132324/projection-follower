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

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

const dataDir = resolveFromRoot(process.env.PF_DATA_DIR ?? './data');

export interface Config {
  dataDir: string;
  dbPath: string;
  sessionDir: string;
  port: number;
  headless: boolean;
  /** Books included in a full `sync` run, in order. */
  books: string[];
  /** Per-book endpoint overrides, so a site redesign is an env change, not a code change. */
  overrides: {
    draftkingsWagersEndpoint?: string;
  };
}

export const config: Config = {
  dataDir,
  dbPath: path.join(dataDir, 'bets.sqlite'),
  sessionDir: path.join(dataDir, 'sessions'),
  port: Number(process.env.PF_PORT ?? 4000),
  headless: bool(process.env.PF_HEADLESS, true),
  books: (process.env.PF_BOOKS ?? 'draftkings')
    .split(',')
    .map((b) => b.trim().toLowerCase())
    .filter(Boolean),
  overrides: {
    draftkingsWagersEndpoint: process.env.PF_DK_WAGERS_ENDPOINT || undefined,
  },
};

/** Ensure the local data directories exist before anything writes to them. */
export function ensureDataDirs(): void {
  fs.mkdirSync(config.dataDir, { recursive: true });
  fs.mkdirSync(config.sessionDir, { recursive: true });
}
