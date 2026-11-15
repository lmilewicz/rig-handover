// Contract for the run log reader (plan.md section 1). Types only; the reader lives elsewhere.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One parsed line of runs/<night>.jsonl.
export type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

// One row per job.
export type DigestRow = {
  job: string;
  owner: string | null; // null renders as '—'
  runs: number; // parsed lines for this job
  retries: number; // lines with status 'retry'
  lastStatus: RunStatus; // status of the latest line
  lastError: string | null; // error of the latest line that had one, else null
  firstAt: string; // 'at' as in the log, offset kept
  lastAt: string; // 'at' as in the log, offset kept
};

export type NightDigest = {
  night: string; // YYYY-MM-DD
  rows: DigestRow[]; // sorted by job
  badLines: number; // lines that did not parse; counted, never thrown
  counts: { ok: number; retry: number; fail: number }; // parsed lines by status
};

// Reads runs/<night>.jsonl from runsDir.
// Returns null when there is no file for that night (the route answers 404).
// An empty file gives rows: [].
// A night that does not match NIGHT_PATTERN must be treated as "no file" (return null)
// before any path is built from it: no path traversal.
export type ReadNight = (runsDir: string, night: string) => NightDigest | null;

export const NIGHT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
