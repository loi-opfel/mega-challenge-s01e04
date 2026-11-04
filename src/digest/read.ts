import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestNight, DigestRow, JobStatus, ReadNight } from './types.js';

type Entry = { at: string; job: string; status: JobStatus; owner: string | null; error: string | null };

const STATUSES: readonly string[] = ['ok', 'retry', 'fail'];

// Parse at the edge: anything that is not a valid entry is a bad line.
function parseLine(line: string): Entry | null {
  let v: unknown;
  try {
    v = JSON.parse(line);
  } catch {
    return null;
  }
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.at !== 'string' || Number.isNaN(Date.parse(o.at))) return null;
  if (typeof o.job !== 'string' || o.job === '') return null;
  if (typeof o.status !== 'string' || !STATUSES.includes(o.status)) return null;
  return {
    at: o.at,
    job: o.job,
    status: o.status as JobStatus,
    owner: typeof o.owner === 'string' && o.owner !== '' ? o.owner : null,
    error: typeof o.error === 'string' && o.error !== '' ? o.error : null,
  };
}

export const readNight: ReadNight = (runsDir, night) => {
  const file = join(runsDir, `${night}.jsonl`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night) || !existsSync(file)) return null;

  let badLines = 0;
  const entries: Entry[] = [];
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (line.trim() === '') continue;
    const e = parseLine(line);
    if (e) entries.push(e);
    else badLines++;
  }
  entries.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  const byJob = new Map<string, DigestRow>();
  for (const e of entries) {
    const row = byJob.get(e.job);
    if (!row) {
      byJob.set(e.job, {
        job: e.job,
        owner: e.owner,
        runs: 1,
        retries: e.status === 'retry' ? 1 : 0,
        lastStatus: e.status,
        lastError: e.error,
        first: e.at,
        last: e.at,
      });
      continue;
    }
    row.runs++;
    if (e.status === 'retry') row.retries++;
    row.lastStatus = e.status;
    if (e.error) row.lastError = e.error;
    row.owner = e.owner ?? row.owner;
    row.last = e.at;
  }
  const rows = [...byJob.values()].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
  return { night, rows, badLines } satisfies DigestNight;
};
