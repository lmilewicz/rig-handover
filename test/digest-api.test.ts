import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

describe('digest JSON', () => {
  it('returns the night rows in job order with bad lines counted', async () => {
    const res = await createApp(config).request('/api/digest/2026-10-28');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { rows: { job: string }[]; badLines: number };
    const jobs = body.rows.map((r) => r.job);
    expect(jobs).toHaveLength(5);
    expect(jobs).toEqual([...jobs].sort());
    expect(body.badLines).toBe(1);
  });

  it('answers 404 for a night with no run log', async () => {
    const res = await createApp(config).request('/api/digest/2099-01-01');
    expect(res.status).toBe(404);
  });
});
