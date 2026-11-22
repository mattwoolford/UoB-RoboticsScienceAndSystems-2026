import { useState } from 'react';
import type {
  DashboardState,
  Procedure,
  PwmSweep,
  ResumableSweep,
} from '../types/dashboard';
import { Icon } from './Icon';
import { RobotSettings } from './RobotSettings';

const procedureDetails: Record<Procedure, string> = {
  open_loop:
    '30-second mechanical drift trial with equal motor PWM. See motor telemetry for the robot’s current PWM.',
  pwm_sweep:
    'Each run starts with 2 seconds at PWM 0 to let the wheels settle. Both wheels then step from 0 to 300 PWM in increments of 5. The robot records left and right angular velocity in rad/s for 2 seconds at each of the 61 steps. Allow about 2 min 4 s per run.',
  line_follow: 'Follow the line with the onboard controller, up to 30 seconds.',
  motor_test: 'A short test using the calibrated motor thresholds.',
};

interface Props {
  robot?: DashboardState['robot'];
  disabled: boolean;
  canStop: boolean;
  onStop: () => void;
  stopFeedback: string;
  stopFailed: boolean;
  act: (path: string, payload?: object, urgent?: boolean) => Promise<void>;
}

function SweepProgress({ sweep }: { sweep: PwmSweep }) {
  if (sweep.runs === 0 || sweep.total_steps === 0) return null;
  const stepsPerRun = sweep.total_steps / sweep.runs;
  const completedRuns = Math.floor(sweep.completed_steps / stepsPerRun);
  const label =
    sweep.status === 'running'
      ? `Run ${Math.min(completedRuns + 1, sweep.runs)} of ${sweep.runs}`
      : `${completedRuns} of ${sweep.runs} ${sweep.runs === 1 ? 'run' : 'runs'} complete`;
  return (
    <div className="run-progress sweep-progress">
      <div>
        <strong role="status">{label}</strong>
        <span>
          {sweep.completed_steps} / {sweep.total_steps} samples
        </span>
      </div>
      <progress
        value={sweep.completed_steps}
        max={sweep.total_steps}
        aria-label="PWM sweep samples recorded"
      />
      {sweep.saved_runs !== undefined &&
        (sweep.has_export || sweep.saved_runs === 0) && (
          <p className="field-help">
            {sweep.saved_runs} of {sweep.runs}{' '}
            {sweep.runs === 1 ? 'run' : 'runs'} saved to Excel
          </p>
        )}
    </div>
  );
}

function ResumeSweep({
  batches,
  disabled,
  robotReady,
  onResume,
}: {
  batches: ResumableSweep[];
  disabled: boolean;
  robotReady: boolean;
  onResume: (filename: string) => void;
}) {
  const [selected, setSelected] = useState('');
  const batch =
    batches.find((item) => item.filename === selected) ?? batches[0];
  const saveOnly = batch.saved_runs === batch.runs;
  return (
    <section className="sweep-results" aria-labelledby="resume-sweep-title">
      <h3 id="resume-sweep-title">Resume an interrupted sweep</h3>
      <label>
        Workbook
        <select
          value={batch.filename}
          disabled={disabled}
          onChange={(event) => setSelected(event.target.value)}
        >
          {batches.map((item) => (
            <option key={item.filename} value={item.filename}>
              {item.saved_at &&
                `${new Date(item.saved_at).toLocaleString()} · `}
              {item.filename}
            </option>
          ))}
        </select>
      </label>
      <p className="field-help">
        {batch.saved_runs} of {batch.runs} {batch.runs === 1 ? 'run' : 'runs'}{' '}
        recorded.{' '}
        {saveOnly
          ? 'All measurements are ready to save to Excel.'
          : 'Resuming restarts the first unfinished run at PWM 0.'}
        {!saveOnly &&
          !robotReady &&
          ' Connect a sweep-capable robot in the idle or ready state to resume.'}
      </p>
      <button
        type="button"
        className="button secondary full"
        disabled={disabled || (!saveOnly && !robotReady)}
        onClick={() => onResume(batch.filename)}
      >
        <Icon name={saveOnly ? 'check' : 'play'} size={16} />
        {saveOnly
          ? 'Finish saving workbook'
          : `Resume from run ${batch.saved_runs + 1}`}
      </button>
    </section>
  );
}

/** Network settings and physical motion require explicit actions; connecting never starts a test. */
export function RobotConnection({
  robot,
  disabled,
  act,
  canStop,
  onStop,
  stopFeedback,
  stopFailed,
}: Props) {
  const [host, setHost] = useState('192.168.4.1');
  const [port, setPort] = useState(80);
  const [selection, setSelection] = useState<Procedure>('open_loop');
  const [runs, setRuns] = useState('1');
  const connected = robot?.status === 'connected';
  const robotState = robot?.telemetry?.state;
  const sweep = robot?.pwm_sweep;
  const sweepBusy = sweep?.status === 'running' || sweep?.status === 'saving';
  const procedure = sweepBusy ? 'pwm_sweep' : selection;
  const isSweep = procedure === 'pwm_sweep';
  // Equal-PWM trials intentionally bypass calibration; the firmware still enforces idle state.
  const robotIdle = robotState === 'idle' || robotState === 'ready';
  const canStart =
    procedure === 'open_loop' ? robotIdle : robot?.telemetry?.ready === true;
  const canCalibrate = ['idle', 'ready', 'fault'].includes(robotState ?? '');
  const robotReadyForSweep = connected && robot.supports_pwm_sweep && robotIdle;
  const supportsCheckpoints = sweep?.saved_runs !== undefined;
  const canStartSweep =
    robotReadyForSweep && supportsCheckpoints && !disabled && !sweepBusy;
  const savedWorkbook = sweep?.saved_runs ? sweep.filename : null;
  return (
    <section
      className="panel configuration"
      id="experiments"
      aria-labelledby="connection-title"
    >
      <div className="panel-heading">
        <div>
          <span className="eyebrow">PHYSICAL ROBOT</span>
          <h2 id="connection-title">
            {sweepBusy ? 'PWM sweep progress' : 'Connect over WiFi.'}
          </h2>
        </div>
        <span className="icon-tile">
          <Icon name="wifi" />
        </span>
      </div>
      {sweepBusy && <SweepProgress sweep={sweep} />}
      <p className="connection-help">
        Join the selected robot’s WiFi network on the computer running this
        dashboard, then enter its IP address and port below. Robot and network
        names can vary.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void act('robot/connect', { host, port });
        }}
      >
        <fieldset disabled={disabled || connected}>
          <div className="host-fields">
            <label>
              Robot IP address
              <input
                required
                value={host}
                onChange={(event) => setHost(event.target.value)}
                placeholder="192.168.4.1"
              />
            </label>
            <label>
              Port
              <input
                required
                type="number"
                min="1"
                max="65535"
                value={port}
                onChange={(event) => setPort(Number(event.target.value))}
              />
            </label>
          </div>
          <button className="button primary full" type="submit">
            <Icon name="wifi" size={18} />
            {robot?.status === 'connecting'
              ? 'Connecting…'
              : connected
                ? 'Robot connected'
                : 'Connect robot'}
          </button>
        </fieldset>
      </form>
      <div className="connection-actions">
        <RobotSettings
          key={connected ? (robot.connection_id ?? 'legacy') : 'disconnected'}
          robot={robot}
          disabled={disabled}
          canStop={canStop}
          onStop={onStop}
          stopFeedback={stopFeedback}
          stopFailed={stopFailed}
        />
        {connected && (
          <button
            className="button secondary"
            disabled={disabled}
            onClick={() => void act('robot/disconnect')}
          >
            Disconnect robot
          </button>
        )}
      </div>
      <hr />
      <label>
        Robot procedure
        <select
          disabled={disabled || sweepBusy}
          value={procedure}
          onChange={(event) => setSelection(event.target.value as Procedure)}
        >
          <option value="open_loop">Straight-line · equal PWM</option>
          <option value="pwm_sweep">Wheel speed · PWM sweep</option>
          <option value="line_follow">Line following</option>
          <option value="motor_test">Motor start / stop</option>
        </select>
      </label>
      <p className="field-help">{procedureDetails[procedure]}</p>
      {isSweep ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (canStartSweep) {
              void act('robot/pwm-sweep/start', { runs: Number(runs) });
            }
          }}
        >
          <label>
            Number of runs
            <input
              type="number"
              min="1"
              max="100"
              step="1"
              required
              disabled={disabled || sweepBusy}
              value={sweepBusy ? sweep.runs : runs}
              onChange={(event) => setRuns(event.target.value)}
            />
          </label>
          {connected && !robot.supports_pwm_sweep && (
            <p className="field-help">
              Update the robot firmware to enable the PWM sweep.
            </p>
          )}
          {sweep && !supportsCheckpoints && !sweepBusy && (
            <p className="field-help" role="status">
              Restart pnpm dev in your console to enable per-run Excel saving
              before starting a new sweep.
            </p>
          )}
          <button
            className="button primary full"
            type="submit"
            disabled={!canStartSweep}
          >
            <Icon name="play" size={16} />
            Start PWM sweep
          </button>
        </form>
      ) : (
        <div className="form-pair actions">
          <button
            className="button secondary"
            disabled={disabled || !connected || !canCalibrate}
            onClick={() => void act('robot/command', { command: 'calibrate' })}
          >
            Calibrate motors
          </button>
          <button
            className="button primary"
            disabled={disabled || !connected || !canStart}
            onClick={() =>
              void act('robot/command', { command: 'start', procedure })
            }
          >
            <Icon name="play" size={16} />
            Start test
          </button>
        </div>
      )}
      {/* Stop stays available during calibration and pending commands. */}
      <button
        className="button stop-button full robot-stop"
        disabled={!canStop}
        onClick={onStop}
      >
        <Icon name="stop" size={16} />
        Stop robot
      </button>
      {stopFeedback && (
        <p
          className={`status-message ${stopFailed ? 'stop-error' : ''}`}
          role={stopFailed ? 'alert' : 'status'}
        >
          {stopFeedback}
        </p>
      )}
      <p className="status-message" role="status">
        {robot?.message || 'No robot connected.'}
      </p>
      {!sweepBusy && !!sweep?.resumable?.length && (
        <ResumeSweep
          batches={sweep.resumable}
          disabled={disabled}
          robotReady={robotReadyForSweep}
          onResume={(filename) =>
            void act('robot/pwm-sweep/resume', { filename })
          }
        />
      )}
      {sweep && (sweep.status !== 'idle' || sweep.has_export) && (
        <section
          className="sweep-results"
          id="pwm-sweep-results"
          aria-labelledby="sweep-results-title"
        >
          <h3 id="sweep-results-title">PWM sweep results</h3>
          {!sweepBusy && <SweepProgress sweep={sweep} />}
          {sweep.message && (
            <p
              className={`status-message ${sweep.status === 'failed' ? 'stop-error' : ''}`}
              role={sweep.status === 'failed' ? 'alert' : 'status'}
            >
              {sweep.message}
            </p>
          )}
          {sweep.has_export && (
            <a
              className="button secondary full"
              href={
                savedWorkbook
                  ? `/api/results/workbooks/${encodeURIComponent(savedWorkbook)}`
                  : '/api/robot/pwm-sweep.xlsx'
              }
              download
            >
              <Icon name="download" size={16} />
              {sweep.status === 'completed'
                ? 'Download Excel workbook'
                : savedWorkbook
                  ? 'Download saved runs'
                  : 'Download previous workbook'}
            </a>
          )}
        </section>
      )}
      <div className="protocol">
        <Icon name="info" size={17} />
        <p>
          Allow room for movement.
          <br />
          <span>
            Calibration moves the wheels. Keep this tab visible; losing the
            connection stops remote motion.
          </span>
        </p>
      </div>
    </section>
  );
}
