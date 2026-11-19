import { useState } from 'react';
import type {
  Candidate,
  DashboardState,
  SimulationConfig,
} from '../types/dashboard';
import { Icon } from './Icon';
interface Props {
  candidates: Candidate[];
  simulation?: DashboardState['simulation'];
  disabled: boolean;
  onRun: (config: SimulationConfig) => void;
  onCancel: () => void;
  canStop: boolean;
  stopFeedback: string;
  stopFailed: boolean;
}

/** Keep run inputs local until a deliberate submit; backend validates the same limits. */
export function SimulationControls({
  candidates,
  simulation,
  disabled,
  onRun,
  onCancel,
  canStop,
  stopFeedback,
  stopFailed,
}: Props) {
  const [config, setConfig] = useState<SimulationConfig>({
    mode: 'single',
    selected: 'sterile',
    runs: 1,
    seed: 2026,
    live: false,
  });
  const running = simulation?.status === 'running';
  const selected = candidates.find(
    (candidate) => candidate.model_id === config.selected,
  );
  const progress = Math.max(
    0,
    Math.min(100, (simulation?.progress ?? 0) * 100),
  );
  return (
    <section
      className="panel configuration"
      id="experiments"
      aria-labelledby="experiment-title"
    >
      <div className="panel-heading">
        <div>
          <span className="eyebrow">EXPERIMENT SETUP</span>
          <h2 id="experiment-title">Make the next run count.</h2>
        </div>
        <span className="icon-tile">
          <Icon name="layers" />
        </span>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!running && !disabled) onRun(config);
        }}
      >
        <fieldset disabled={disabled || running}>
          <label>
            Run selection
            <select
              value={config.mode}
              onChange={(event) =>
                setConfig({
                  ...config,
                  mode: event.target.value as SimulationConfig['mode'],
                })
              }
            >
              <option value="single">One model</option>
              <option value="all_sequential">All models · sequential</option>
              <option value="all_parallel">All models · parallel</option>
            </select>
          </label>
          {config.mode === 'single' && (
            <label>
              Simulation model
              <select
                value={config.selected}
                onChange={(event) =>
                  setConfig({ ...config, selected: event.target.value })
                }
              >
                {candidates.length ? (
                  candidates.map((candidate) => (
                    <option key={candidate.model_id} value={candidate.model_id}>
                      {candidate.label}
                    </option>
                  ))
                ) : (
                  <option value="sterile">Sterile baseline</option>
                )}
              </select>
            </label>
          )}
          <p className="field-help">
            {config.mode === 'single'
              ? (selected?.description ??
                'Ideal matched motors with no added noise.')
              : 'The sterile baseline and four noisy motor models.'}
          </p>
          <div className="form-pair">
            <label>
              Trials per model
              <input
                type="number"
                min="1"
                max="100"
                step="1"
                required
                value={config.runs}
                onChange={(event) =>
                  setConfig({ ...config, runs: Number(event.target.value) })
                }
              />
            </label>
            <label>
              Random seed
              <input
                type="number"
                min="0"
                max="2147483647"
                step="1"
                required
                value={config.seed}
                onChange={(event) =>
                  setConfig({ ...config, seed: Number(event.target.value) })
                }
              />
            </label>
          </div>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={config.live}
              onChange={(event) =>
                setConfig({ ...config, live: event.target.checked })
              }
            />
            <span>
              Open live Processing windows
              <small>Real-time playback; headless runs are faster.</small>
            </span>
          </label>
          <div className="protocol">
            <Icon name="info" size={17} />
            <p>
              30 seconds · equal motor PWM
              <br />
              <span>
                One sterile trial. All other models use your trial count.
              </span>
            </p>
          </div>
        </fieldset>
        {/* Active stops bypass disabled settings; inactive/offline targets cannot be stopped. */}
        <button
          className={`button ${running ? 'stop-button' : 'primary'} full`}
          type={running ? 'button' : 'submit'}
          disabled={running ? !canStop : disabled}
          onClick={running ? onCancel : undefined}
        >
          <Icon name={running ? 'stop' : 'play'} size={17} />
          {running ? 'Stop simulation' : 'Run simulation'}
        </button>
      </form>
      {running && (
        <div className="run-progress">
          <div>
            <span>Simulation in progress</span>
            <strong>{Math.round(progress)}%</strong>
          </div>
          <progress
            value={progress}
            max="100"
            aria-label="Simulation progress"
          />
        </div>
      )}
      {stopFeedback && (
        <p
          className={`status-message ${stopFailed ? 'stop-error' : ''}`}
          role={stopFailed ? 'alert' : 'status'}
        >
          {stopFeedback}
        </p>
      )}
      <p className="status-message" role="status">
        {simulation?.message ||
          'Ready when you are. Results appear as the simulation runs.'}
      </p>
    </section>
  );
}
