import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { NightDigest } from '../src/digest/types.js';

const NORMAL = '2026-10-29';
const EMPTY = '2026-10-30';
const BAD = '2026-10-31';

const normalLines = [
  '{"at":"2026-10-29T01:30:00+01:00","job":"fixtures/refresh","status":"retry","owner":"rook","error":"upstream 503"}',
  '{"at":"2026-10-29T01:31:00+01:00","job":"fixtures/refresh","status":"retry","owner":"rook","error":"upstream 503"}',
  '{"at":"2026-10-29T01:32:00+01:00","job":"fixtures/refresh","status":"retry","owner":"rook","error":"upstream 503"}',
  '{"at":"2026-10-29T01:37:00+01:00","job":"fixtures/refresh","status":"ok","owner":"rook"}',
  '{"at":"2026-10-29T02:00:00+01:00","job":"digest/render","status":"fail","owner":null,"error":"template error"}',
];

const badLines = [
  '{"at":"2026-10-31T01:00:00+01:00","job":"lane/sync","status":"ok","owner":"rook"}',
  '{"at":"2026-10-31T01:05:00+01:00","job":"lane/sync","status":"ok"',
];

const config = (runsDir: string) => ({
  adapter: 'shim',
  installed: '2026-10-29T14:06:00+01:00',
  beatEverySeconds: 60,
  runsDir,
});

// Job names in the order the page's table shows them (first cell of each body row).
const pageJobs = (html: string): string[] => {
  const body = /<tbody>([\s\S]*?)<\/tbody>/.exec(html)?.[1] ?? '';
  return [...body.matchAll(/<tr[^>]*>\s*<td>([^<]*)<\/td>/g)].map((m) => m[1] ?? '');
};

describe('digest routes', () => {
  let runsDir: string;

  beforeAll(() => {
    runsDir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
    writeFileSync(join(runsDir, `${NORMAL}.jsonl`), normalLines.join('\n') + '\n');
    writeFileSync(join(runsDir, `${EMPTY}.jsonl`), '');
    writeFileSync(join(runsDir, `${BAD}.jsonl`), badLines.join('\n') + '\n');
  });

  afterAll(() => {
    rmSync(runsDir, { recursive: true, force: true });
  });

  describe('GET /digest/:night', () => {
    it('200 for a normal night: shows the jobs, dash for null owner', async () => {
      const res = await createApp(config(runsDir)).request(`/digest/${NORMAL}`);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('fixtures/refresh');
      expect(html).toContain('digest/render');
      expect(html).toContain('<td>—</td>');
      expect(pageJobs(html)).toEqual(['digest/render', 'fixtures/refresh']);
    });

    it('404 for a night with no file', async () => {
      const res = await createApp(config(runsDir)).request('/digest/2099-01-01');
      expect(res.status).toBe(404);
    });

    it('404 for an invalid night', async () => {
      const res = await createApp(config(runsDir)).request('/digest/not-a-date');
      expect(res.status).toBe(404);
    });

    it('200 for the empty night and says nothing ran', async () => {
      const res = await createApp(config(runsDir)).request(`/digest/${EMPTY}`);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('nothing ran');
      expect(html).not.toContain('<table>');
    });

    it('200 for a night with a bad line and says 1 line could not be read', async () => {
      const res = await createApp(config(runsDir)).request(`/digest/${BAD}`);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain('1 line could not be read');
      expect(pageJobs(html)).toEqual(['lane/sync']);
    });
  });

  describe('GET /api/digest/:night', () => {
    it('200 for a normal night: rows match the page order', async () => {
      const app = createApp(config(runsDir));
      const page = await (await app.request(`/digest/${NORMAL}`)).text();
      const res = await app.request(`/api/digest/${NORMAL}`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as NightDigest;
      expect(body.night).toBe(NORMAL);
      expect(body.rows.map((r) => r.job)).toEqual(pageJobs(page));
      expect(body.rows.map((r) => r.job)).toEqual(['digest/render', 'fixtures/refresh']);

      const render = body.rows.find((r) => r.job === 'digest/render');
      expect(render?.owner).toBeNull();
      expect(render?.lastStatus).toBe('fail');
      const refresh = body.rows.find((r) => r.job === 'fixtures/refresh');
      expect(refresh?.retries).toBe(3);
      expect(refresh?.runs).toBe(4);
    });

    it('404 for a night with no file', async () => {
      const res = await createApp(config(runsDir)).request('/api/digest/2099-01-01');
      expect(res.status).toBe(404);
    });

    it('404 for an invalid night', async () => {
      const res = await createApp(config(runsDir)).request('/api/digest/not-a-date');
      expect(res.status).toBe(404);
    });

    it('200 for the empty night with rows []', async () => {
      const res = await createApp(config(runsDir)).request(`/api/digest/${EMPTY}`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as NightDigest;
      expect(body.rows).toEqual([]);
      expect(body.badLines).toBe(0);
    });

    it('200 for a night with a bad line: badLines 1, good rows kept', async () => {
      const res = await createApp(config(runsDir)).request(`/api/digest/${BAD}`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as NightDigest;
      expect(body.badLines).toBe(1);
      expect(body.rows.map((r) => r.job)).toEqual(['lane/sync']);
      expect(body.rows[0]?.runs).toBe(1);
    });
  });
});
