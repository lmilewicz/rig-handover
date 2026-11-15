import type { DigestRow, NightDigest } from '../digest/types.js';

const dash = (v: string | null): string => (v === null || v === '' ? '—' : v);

const isWarn = (r: DigestRow): boolean => r.retries >= 3 || r.lastStatus === 'fail';

export function DigestPage({ digest }: { digest: NightDigest }) {
  const { night, rows, badLines } = digest;
  return (
    <>
      <h1>digest {night}</h1>
      {rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr class={isWarn(r) ? 'warn' : undefined}>
                <td>{isWarn(r) ? '! ' : ''}{r.job}</td>
                <td>{dash(r.owner)}</td>
                <td>{r.runs}</td>
                <td>{r.retries}</td>
                <td>{r.lastStatus}</td>
                <td>{dash(r.lastError)}</td>
                <td>{r.firstAt}</td>
                <td>{r.lastAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {badLines > 0 ? (
        <p class="warn">{badLines} {badLines === 1 ? 'line' : 'lines'} could not be read</p>
      ) : null}
    </>
  );
}

export function DigestMissing({ night }: { night: string }) {
  return (
    <>
      <h1>digest</h1>
      <p class="mute">no run log for {night}</p>
    </>
  );
}
