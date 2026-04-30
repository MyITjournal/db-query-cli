import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';

export const BASE_URL = 'https://db-query-backend-myitjournal8137-tp61obq3.leapcell.dev';

const CONFIG_DIR = join(homedir(), '.insighta');
const CREDENTIALS_FILE = join(CONFIG_DIR, 'credentials.json');

async function ensureConfigDir() {
  await mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
}

export async function saveCredentials(data) {
  await ensureConfigDir();
  await writeFile(CREDENTIALS_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
}

export async function loadCredentials() {
  try {
    const raw = await readFile(CREDENTIALS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function clearCredentials() {
  try {
    await rm(CREDENTIALS_FILE, { force: true });
  } catch {
      }
}
