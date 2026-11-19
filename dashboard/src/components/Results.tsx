import type { Candidate, DashboardState } from '../types/dashboard';
import { Icon } from './Icon';
import { number } from './Telemetry';

/** Summaries use one final sample per trial; downloads come from the completed bridge run. */
export function Results({
  simulation,
  candidates,
}: {
  simulation?: DashboardState['simulation'];
  candidates: Candidate[];
}) {
  const rows = simulation?.summary ?? [];
  const downloadable =
    simulation?.has_exports ?? simulation?.status === 'completed';
  return (
    <section
      className="panel results-panel"
      id="results"
      aria-labelledby="results-title"
    >
      <div className="compact-heading">
        <div>
          <span className="eyebrow">COMPARE & EXPORT</span>
          <h2 id="results-title">Run results</h2>
        </div>
        <div className="export-actions">
          {downloadable ? (
            <>
              {simulation?.status !== 'completed' && (
                <span className="subtle">Latest successful run</span>
              )}
              <a className="button secondary" href="/api/results.csv" download>
                <Icon name="download" size={16} />
                CSV
              </a>
              <a className="button secondary" href="/api/results.xlsx" download>
                <Icon name="download" size={16} />
                Excel
              </a>
            </>
          ) : (
            <span className="subtle">
              Downloads appear after a completed run
            </span>
          )}
        </div>
      </div>
      {rows.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Model</th>
                <th scope="col">Trials</th>
                <th scope="col">
                  Mean drift <span>mm</span>
                </th>
                <th scope="col">
                  RMS drift <span>mm</span>
                </th>
                <th scope="col">
                  Mean forward <span>mm</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.model_id}>
                  <th scope="row">
                    <span className="model-mark" />
                    {candidates.find(
                      (candidate) => candidate.model_id === row.model_id,
                    )?.label ?? row.model_id}
                  </th>
                  <td>{row.runs}</td>
                  <td>{number(row.mean_drift_mm, 2)}</td>
                  <td>{number(row.rms_drift_mm, 2)}</td>
                  <td>{number(row.mean_forward_mm, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="results-empty">
          <Icon name="layers" size={25} />
          <div>
            <strong>No completed results yet</strong>
            <p>
              Run one model or compare all five. Each trial contributes its
              final 30-second sample.
            </p>
          </div>
        </div>
      )}
      <p className="results-note">
        Noise models are illustrative, not calibrated replicas of the physical
        robot. Lower drift means straighter travel, not necessarily a better
        model.
      </p>
    </section>
  );
}
