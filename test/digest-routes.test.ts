import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

function appWith(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'rig-'));
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, `${name}.jsonl`), body);
  return createApp({ adapter: 'shim', installed: 'x', beatEverySeconds: 60, runsDir: dir });
}

const good =
  '{"at":"2026-01-01T01:00:00+01:00","job":"b","status":"ok","owner":null}\n' +
  '{"at":"2026-01-01T02:00:00+01:00","job":"a","status":"fail","owner":"x","error":"boom"}\n';

describe('digest routes', () => {
  it('200 on page and JSON, same jobs in same order', async () => {
    const app = appWith({ '2026-01-01': good });
    const page = await app.request('/digest/2026-01-01');
    const api = await app.request('/api/digest/2026-01-01');
    expect(page.status).toBe(200);
    expect(api.status).toBe(200);
    const html = await page.text();
    const jobs = ((await api.json()) as { rows: { job: string }[] }).rows.map((r) => r.job);
    expect(jobs).toEqual(['a', 'b']);
    expect(html.indexOf('<td>a</td>')).toBeLessThan(html.indexOf('<td>b</td>'));
    expect(html).toContain('—');
  });

  it('404 for a night with no file', async () => {
    const app = appWith({});
    expect((await app.request('/digest/2026-01-02')).status).toBe(404);
    expect((await app.request('/api/digest/2026-01-02')).status).toBe(404);
  });

  it('empty night renders "nothing ran"', async () => {
    const app = appWith({ '2026-01-03': '' });
    const res = await app.request('/digest/2026-01-03');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
    expect(((await (await app.request('/api/digest/2026-01-03')).json()) as { rows: unknown[] }).rows).toEqual([]);
  });

  it('a bad line is counted, the night still renders', async () => {
    const app = appWith({ '2026-01-04': good + 'garbage\n' });
    const res = await app.request('/digest/2026-01-04');
    expect(res.status).toBe(200);
    const api = (await (await app.request('/api/digest/2026-01-04')).json()) as { badLines: number };
    expect(api.badLines).toBe(1);
  });

  it('board links each night with counts', async () => {
    const html = await (await createApp({ adapter: 's', installed: 'x', beatEverySeconds: 60, runsDir: 'runs' }).request('/')).text();
    expect(html).toContain('href="/digest/2026-10-28"');
    expect(html).toContain('href="/digest/2026-10-27"');
    expect(html).toContain('fail 1');
  });
});
