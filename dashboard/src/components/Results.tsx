import type { Candidate, DashboardState, PwmSweep } from '../types/dashboard';
import { Icon } from './Icon';
import { SavedWorkbooks } from './SavedWorkbooks';
import { number } from './Telemetry';

/** Saved files span sessions. The simulation summary belongs to the current session. */
export function Results({
  simulation,
  candidates,
  online,
  sweep,
}: {
  simulation?: DashboardState['simulation'];
  candidates: Candidate[];
  online: boolean;
  sweep?: PwmSweep;
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
      </div>
      <SavedWorkbooks
        online={online}
        simulationStatus={simulation?.status}
        sweep={sweep}
      />
      {downloadable && (
        <div className="compact-heading">
          <h3>Latest completed simulation</h3>
          <div className="export-actions">
            <a className="button secondary" href="/api/results.csv" download>
              <Icon name="download" size={16} />
              CSV
            </a>
            {(simulation?.has_workbook ?? downloadable) && (
              <a className="button secondary" href="/api/results.xlsx" download>
                <Icon name="download" size={16} />
                Excel
              </a>
            )}
          </div>
        </div>
      )}
      {rows.length > 0 && (
        <>
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
          <p className="results-note">
            Noise models are illustrative, not calibrated replicas of the
            physical robot. Lower drift means straighter travel, not necessarily
            a better model.
          </p>
        </>
      )}
    </section>
  );
}
