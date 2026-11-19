import { useState } from 'react';
import { Icon } from './components/Icon';
import { SimulationControls } from './components/SimulationControls';
import { RobotConnection } from './components/RobotConnection';
import { Telemetry } from './components/Telemetry';
import { Trajectory } from './components/Trajectory';
import { Results } from './components/Results';
import { useDashboard } from './hooks/useDashboard';
import { useStopActions } from './hooks/useStopActions';
import type { Source } from './types/dashboard';

/** Compose the workspace; run identity keeps independent trials out of the same trace. */
export default function App() {
  const { state, connectionError, actionError, pending, act, clearError } =
    useDashboard();
  const [source, setSource] = useState<Source>('virtual');
  const [selectedTrial, setSelectedTrial] = useState('latest');
  const samples = state?.simulation.samples ?? [];
  const trials = [
    ...new Map(
      samples.map((sample) => [`${sample.model_id}/${sample.run_id}`, sample]),
    ).entries(),
  ];
  const activeTrial =
    selectedTrial === 'latest' || !trials.some(([key]) => key === selectedTrial)
      ? trials.at(-1)?.[0]
      : selectedTrial;
  const currentSamples = samples.filter(
    (sample) => `${sample.model_id}/${sample.run_id}` === activeTrial,
  );
  const online = !!state && !connectionError;
  const stops = useStopActions(state, pending, online);
  const robotConnected = online && state?.robot.status === 'connected';
  const status = !online
    ? 'offline'
    : source === 'virtual'
      ? (state?.simulation.status ?? 'idle')
      : (state?.robot.status ?? 'disconnected');
  const candidates = state?.candidates ?? [];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a href="#workspace" className="brand">
          <span className="brand-icon">
            <Icon name="robot" size={25} />
          </span>
          <div>
            robot<span>lab.</span>
            <small>CTRL+ALT+ELITE</small>
          </div>
        </a>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          <a className="nav-link active" href="#workspace">
            <Icon name="grid" />
            Control room
          </a>
          <a
            className="nav-link"
            href="#experiments"
            onClick={() => setSource('virtual')}
          >
            <Icon name="layers" />
            Experiments
          </a>
          <a className="nav-link" href="#results">
            <Icon name="activity" />
            Run results
          </a>
        </nav>
        <div className="sidebar-bottom">
          <div className="project-chip">
            UoB <span>2026</span>
          </div>
          <strong>
            Robotics Science
            <br />& Systems
          </strong>
          <p>
            One workspace.
            <br />
            Simulation to real world.
          </p>
          <div className={`bridge-indicator ${online ? 'online' : ''}`}>
            <i />
            {online ? 'Local bridge online' : 'Bridge disconnected'}
          </div>
        </div>
      </aside>
      <main id="workspace">
        <header className="page-header">
          <div>
            <div className="breadcrumb">
              ROBOT LAB <span>/</span> CONTROL ROOM
            </div>
            <h1>A clearer view of every run.</h1>
            <p>
              Test your models. Watch your robot. Understand the difference.
            </p>
          </div>
        </header>
        {connectionError && (
          <div className="notice error" role="alert">
            <Icon name="info" />
            <span>{connectionError}</span>
          </div>
        )}
        {actionError && (
          <div className="notice error" role="alert">
            <Icon name="info" />
            <span>{actionError}</span>
            <button onClick={clearError} aria-label="Dismiss error">
              ×
            </button>
          </div>
        )}
        <div className="workspace-toolbar">
          <div className="segmented source-toggle" aria-label="Monitor source">
            <button
              aria-pressed={source === 'virtual'}
              onClick={() => setSource('virtual')}
            >
              <Icon name="layers" size={18} />
              Virtual robot
            </button>
            <button
              aria-pressed={source === 'robot'}
              onClick={() => setSource('robot')}
            >
              <Icon name="wifi" size={18} />
              Physical robot
            </button>
          </div>
          <div className="source-caption">
            <span
              className={`status-pill ${status === 'running' || status === 'connected' ? 'live' : ''}`}
            >
              {status.replaceAll('_', ' ')}
            </span>
            <span>
              {source === 'virtual'
                ? 'DigitalTwin / Processing'
                : 'Stamp C3 / WiFi'}
            </span>
          </div>
        </div>
        <div className="workspace-grid">
          <div className="setup-column">
            {source === 'virtual' ? (
              <SimulationControls
                candidates={candidates}
                simulation={state?.simulation}
                disabled={!online || !!pending}
                onRun={(config) => void act('simulation/start', config)}
                onCancel={() => void stops.stop('simulation')}
                canStop={stops.canStopSimulation}
                stopFeedback={
                  stops.feedbackTarget === 'simulation' ? stops.feedback : ''
                }
                stopFailed={stops.failed}
              />
            ) : (
              <RobotConnection
                robot={state?.robot}
                disabled={!online || !!pending}
                act={act}
                canStop={stops.canStopRobot}
                onStop={() => void stops.stop('robot')}
                stopFeedback={
                  stops.feedbackTarget === 'robot' ? stops.feedback : ''
                }
                stopFailed={stops.failed}
              />
            )}
            <div className="lab-note">
              <span className="note-line" />
              <p>
                <strong>
                  {source === 'virtual'
                    ? 'Reproducible by design.'
                    : 'Stay connected, stay in control.'}
                </strong>
                {source === 'virtual'
                  ? 'The same model, parameters and seed produce the same run. Change one thing at a time.'
                  : 'The firmware stops remote motion when its connection or heartbeat is lost. Reconnect deliberately to continue.'}
              </p>
            </div>
          </div>
          <div className="monitor-column">
            <div className="monitor-title">
              <h2>
                <Icon name="activity" size={19} />
                {source === 'virtual' ? 'Simulation monitor' : 'Robot monitor'}
              </h2>
              {source === 'virtual' && trials.length > 0 && (
                <label className="trial-select">
                  <span>Trial</span>
                  <select
                    value={selectedTrial}
                    onChange={(event) => setSelectedTrial(event.target.value)}
                  >
                    <option value="latest">Latest trial</option>
                    {trials.map(([key, sample]) => (
                      <option key={key} value={key}>
                        {sample.model_id} · {sample.run_id}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {source === 'robot' && (
                <span className="subtle">
                  {robotConnected
                    ? 'Receiving telemetry'
                    : state?.robot.telemetry
                      ? 'Last received readings · offline'
                      : 'Awaiting connection'}
                </span>
              )}
            </div>
            <Telemetry
              source={source}
              sample={currentSamples.at(-1)}
              robot={state?.robot.telemetry}
            />
            <Trajectory
              source={source}
              samples={currentSamples}
              history={state?.robot.history ?? []}
            />
          </div>
        </div>
        <Results simulation={state?.simulation} candidates={candidates} />
        <footer className="page-footer">
          <span>University of Bristol · Team Ctrl+Alt+Elite</span>
          <span>Fixed-step simulation. Real measurements.</span>
        </footer>
      </main>
    </div>
  );
}
