import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

describe('readNight', () => {
  it('reads 2026-10-28: 5 jobs, 1 bad line', () => {
    const n = readNight('runs', '2026-10-28');
    expect(n).not.toBeNull();
    expect(n!.rows).toHaveLength(5);
    expect(n!.badLines).toBe(1);
    expect(n!.rows.map((r) => r.job)).toEqual([...n!.rows.map((r) => r.job)].sort());
  });

  it('returns null for a night with no file', () => {
    expect(readNight('runs', '1999-01-01')).toBeNull();
    expect(readNight('runs', '../package')).toBeNull();
  });

  it('keeps owner null and counts retries', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-'));
    writeFileSync(
      join(dir, '2026-01-01.jsonl'),
      [
        '{"at":"2026-01-01T01:00:00+01:00","job":"a","status":"retry","owner":null,"error":"x"}',
        '{"at":"2026-01-01T01:05:00+01:00","job":"a","status":"ok","owner":null}',
        'not json',
      ].join('\n'),
    );
    const n = readNight(dir, '2026-01-01')!;
    expect(n.badLines).toBe(1);
    expect(n.rows).toEqual([
      { job: 'a', owner: null, runs: 2, retries: 1, lastStatus: 'ok', lastError: 'x', first: '2026-01-01T01:00:00+01:00', last: '2026-01-01T01:05:00+01:00' },
    ]);
  });
});
