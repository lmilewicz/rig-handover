import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

describe('readNight on runs/2026-10-28.jsonl', () => {
  const digest = readNight('runs', '2026-10-28');

  it('reads 5 jobs sorted by job and counts the 1 bad line', () => {
    expect(digest).not.toBeNull();
    expect(digest?.night).toBe('2026-10-28');
    expect(digest?.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    expect(digest?.badLines).toBe(1);
    expect(digest?.counts).toEqual({ ok: 10, retry: 4, fail: 1 });
  });

  it('keeps the row with a null owner', () => {
    const row = digest?.rows.find((r) => r.job === 'digest/render');
    expect(row?.owner).toBeNull();
    expect(row?.runs).toBe(1);
  });

  it('groups fixtures/refresh with 3 retries, keeping the offset', () => {
    const row = digest?.rows.find((r) => r.job === 'fixtures/refresh');
    expect(row).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'upstream 503',
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
  });
});

describe('readNight edge cases', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns null when there is no file for the night', () => {
    expect(readNight(dir, '2026-01-01')).toBeNull();
  });

  it('returns null for a night that is not YYYY-MM-DD, even if the path exists', () => {
    writeFileSync(join(dir, 'x.jsonl'), '');
    expect(readNight(join(dir, 'sub'), '../x')).toBeNull();
    expect(readNight(dir, '2026-1-1')).toBeNull();
  });

  it('gives empty rows for an empty or blank-only file', () => {
    writeFileSync(join(dir, '2026-01-01.jsonl'), '');
    writeFileSync(join(dir, '2026-01-02.jsonl'), '\n  \n\n');
    for (const night of ['2026-01-01', '2026-01-02']) {
      expect(readNight(dir, night)).toEqual({
        night,
        rows: [],
        badLines: 0,
        counts: { ok: 0, retry: 0, fail: 0 },
      });
    }
  });

  it('counts lines that do not fit RunLine as bad, never throws', () => {
    const lines = [
      'not json',
      '[]',
      'null',
      '{"at":"t","job":"a","status":"skipped","owner":null}',
      '{"at":"t","job":"a","status":"ok","owner":7}',
      '{"at":"t","job":"a","status":"ok","owner":null,"error":5}',
      '{"at":"t","job":"a","status":"ok"}',
      '{"at":"t","job":"a","status":"fail","owner":"x","error":"boom"}',
    ];
    writeFileSync(join(dir, '2026-01-03.jsonl'), lines.join('\n'));
    const digest = readNight(dir, '2026-01-03');
    expect(digest?.badLines).toBe(7);
    expect(digest?.rows).toHaveLength(1);
    expect(digest?.counts).toEqual({ ok: 0, retry: 0, fail: 1 });
  });
});
