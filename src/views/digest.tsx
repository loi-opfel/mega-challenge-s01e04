import type { DigestNight, DigestRow } from '../digest/types.js';

const dash = '—';

export function isFlagged(r: DigestRow): boolean {
  return r.retries >= 3 || r.lastStatus === 'fail';
}

export function DigestPage({ digest }: { digest: DigestNight }) {
  return (
    <>
      <h1>digest · {digest.night}</h1>
      {digest.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th><th>owner</th><th>runs</th><th>retries</th><th>last status</th>
              <th>last error</th><th>first</th><th>last</th>
            </tr>
          </thead>
          <tbody>
            {digest.rows.map((r) => (
              <tr class={isFlagged(r) ? 'warn' : undefined}>
                <td>{r.job}</td>
                <td>{r.owner ?? dash}</td>
                <td>{r.runs}</td>
                <td>{r.retries}{r.retries >= 3 ? ' ⚠' : ''}</td>
                <td>{r.lastStatus}{r.lastStatus === 'fail' ? ' ⚠' : ''}</td>
                <td>{r.lastError ?? dash}</td>
                <td>{r.first}</td>
                <td>{r.last}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {digest.badLines > 0 ? (
        <p class="mute">{digest.badLines} line(s) in the log could not be read</p>
      ) : null}
    </>
  );
}
