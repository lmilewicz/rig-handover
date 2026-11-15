import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NIGHT_PATTERN, type DigestRow, type ReadNight, type RunLine, type RunStatus } from './types.js';

const STATUSES: readonly RunStatus[] = ['ok', 'retry', 'fail'];

const isStatus = (v: unknown): v is RunStatus => STATUSES.some((s) => s === v);

// Parse one line at the edge: valid JSON that fits RunLine, or null.
const parseLine = (text: string): RunLine | null => {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const { at, job, status, owner, error } = value as Record<string, unknown>;
  if (typeof at !== 'string' || typeof job !== 'string' || !isStatus(status)) return null;
  if (owner !== null && typeof owner !== 'string') return null;
  if (error !== undefined && typeof error !== 'string') return null;
  return error === undefined ? { at, job, status, owner } : { at, job, status, owner, error };
};

// File contents, or null when there is no file for that path.
const readFile = (path: string): string | null => {
  try {
    return readFileSync(path, 'utf8');
  } catch (e) {
    if (e instanceof Error && 'code' in e && (e.code === 'ENOENT' || e.code === 'EISDIR')) return null;
    throw e;
  }
};

export const readNight: ReadNight = (runsDir, night) => {
  // Validate before building any path from `night`: no path traversal.
  if (!NIGHT_PATTERN.test(night)) return null;
  const text = readFile(join(runsDir, `${night}.jsonl`));
  if (text === null) return null;

  const byJob = new Map<string, DigestRow>();
  const counts = { ok: 0, retry: 0, fail: 0 };
  let badLines = 0;

  for (const raw of text.split(/\r?\n/)) {
    if (raw.trim() === '') continue;
    const line = parseLine(raw);
    if (line === null) {
      badLines++;
      continue;
    }
    counts[line.status]++;
    const row = byJob.get(line.job);
    if (row === undefined) {
      byJob.set(line.job, {
        job: line.job,
        owner: line.owner,
        runs: 1,
        retries: line.status === 'retry' ? 1 : 0,
        lastStatus: line.status,
        lastError: line.error ?? null,
        firstAt: line.at,
        lastAt: line.at,
      });
    } else {
      row.owner = line.owner;
      row.runs++;
      if (line.status === 'retry') row.retries++;
      row.lastStatus = line.status;
      if (line.error !== undefined) row.lastError = line.error;
      row.lastAt = line.at;
    }
  }

  const rows = [...byJob.values()].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
  return { night, rows, badLines, counts };
};
