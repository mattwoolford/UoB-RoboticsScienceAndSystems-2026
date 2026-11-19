import { useState } from 'react';
import type { DashboardState, Procedure } from '../types/dashboard';
import { Icon } from './Icon';
import { RobotSettings } from './RobotSettings';
interface Props {
  robot?: DashboardState['robot'];
  disabled: boolean;
  canStop: boolean;
  onStop: () => void;
  stopFeedback: string;
  stopFailed: boolean;
  act: (path: string, payload?: object, urgent?: boolean) => Promise<void>;
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
  const [procedure, setProcedure] = useState<Procedure>('open_loop');
  const connected = robot?.status === 'connected';
  const robotState = robot?.telemetry?.state;
  // Equal-PWM trials intentionally bypass calibration; the firmware still enforces idle state.
  const canStart =
    procedure === 'open_loop'
      ? robotState === 'idle' || robotState === 'ready'
      : robot?.telemetry?.ready === true;
  const canCalibrate = ['idle', 'ready', 'fault'].includes(robotState ?? '');
  return (
    <section className="panel configuration" aria-labelledby="connection-title">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">PHYSICAL ROBOT</span>
          <h2 id="connection-title">Connect over WiFi.</h2>
        </div>
        <span className="icon-tile">
          <Icon name="wifi" />
        </span>
      </div>
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
          disabled={disabled || !connected}
          value={procedure}
          onChange={(event) => setProcedure(event.target.value as Procedure)}
        >
          <option value="open_loop">Straight-line · equal PWM</option>
          <option value="line_follow">Line following</option>
          <option value="motor_test">Motor start / stop</option>
        </select>
      </label>
      <p className="field-help">
        {procedure === 'open_loop'
          ? '30-second mechanical drift trial with equal motor PWM. See motor telemetry for the robot’s current PWM.'
          : procedure === 'line_follow'
            ? 'Follow the line with the onboard controller, up to 30 seconds.'
            : 'A short test using the calibrated motor thresholds.'}
      </p>
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
