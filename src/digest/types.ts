export type JobStatus = 'ok' | 'retry' | 'fail';

// One row per job in a night's run log.
export type DigestRow = {
  job: string;
  owner: string | null; // null renders as —
  runs: number;
  retries: number;
  lastStatus: JobStatus;
  lastError: string | null;
  first: string; // time as written in the log, offset kept
  last: string;
};

export type DigestNight = {
  night: string;
  rows: DigestRow[]; // sorted by job
  counts: { ok: number; retry: number; fail: number }; // log lines per status
  badLines: number; // lines that did not parse, counted not thrown
};

// Returns null when runs/<night>.jsonl does not exist.
export type ReadNight = (runsDir: string, night: string) => DigestNight | null;
