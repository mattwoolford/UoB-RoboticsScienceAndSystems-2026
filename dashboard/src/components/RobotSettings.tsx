import { useEffect, useRef, useState } from 'react';
import { post } from '../services/api';
import type { DashboardState, DriftSettings } from '../types/dashboard';
import { Icon } from './Icon';

interface Props {
  robot?: DashboardState['robot'];
  disabled: boolean;
  canStop: boolean;
  onStop: () => void;
  stopFeedback: string;
  stopFailed: boolean;
}

export function RobotSettings({
  robot,
  disabled,
  canStop,
  onStop,
  stopFeedback,
  stopFailed,
}: Props) {
  const connected = robot?.status === 'connected';
  const connectionId = connected ? robot.connection_id : null;
  const settings = connectionId ? robot?.settings : null;
  const dialog = useRef<HTMLDialogElement>(null);
  const [edits, setEdits] = useState<Partial<DriftSettings>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  // Use the acknowledged values immediately, including when the dialog is
  // reopened before the next state poll. Subsequent changes come from the robot.
  const [acknowledged, setAcknowledged] = useState<DriftSettings | null>(null);
  useEffect(() => {
    setAcknowledged(null);
  }, [settings]);
  const current = acknowledged ?? settings;
  const draft = current && { ...current, ...edits };
  const changed =
    draft &&
    current &&
    (draft.drift_correction !== current.drift_correction ||
      draft.drift_path_recovery !== current.drift_path_recovery);

  async function save() {
    if (!connectionId || !draft || !changed || disabled || saving) return;
    setSaving(true);
    setError('');
    try {
      const result = await post<{ settings: DriftSettings }>('robot/settings', {
        connection_id: connectionId,
        ...draft,
      });
      setAcknowledged(result.settings);
      setEdits({});
      setSaved(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not save robot settings.';
      setError(
        message === 'settings_write_failed'
          ? 'The robot could not save these settings. Try again.'
          : message,
      );
    } finally {
      setSaving(false);
    }
  }

  function edit(name: keyof DriftSettings, value: boolean) {
    setEdits((previous) => ({ ...previous, [name]: value }));
    setSaved(false);
    setError('');
  }

  return (
    <>
      <button
        className="button secondary"
        aria-haspopup="dialog"
        disabled={!connected || disabled || saving}
        title={connected ? undefined : 'Connect the robot to open Settings.'}
        onClick={() => {
          setEdits({});
          setSaved(false);
          setError('');
          dialog.current?.showModal();
        }}
      >
        Settings
      </button>
      <dialog
        ref={dialog}
        className="robot-settings"
        aria-labelledby="settings-title"
      >
        <h2 id="settings-title">Robot settings</h2>
        {draft ? (
          <>
            <p className="settings-intro">
              These settings are stored on the robot and apply from the next
              motor start / stop test.
            </p>
            <fieldset disabled={saving || disabled}>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={draft.drift_correction}
                  onChange={(event) =>
                    edit('drift_correction', event.target.checked)
                  }
                />
                <span>
                  Encoder drift correction
                  <small>
                    Adjust wheel speeds to hold the starting heading.
                  </small>
                </span>
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={draft.drift_path_recovery}
                  onChange={(event) =>
                    edit('drift_path_recovery', event.target.checked)
                  }
                />
                <span>
                  Path recovery
                  <small>
                    With drift correction enabled, respond earlier and steer
                    back toward the starting line.
                  </small>
                </span>
              </label>
            </fieldset>
          </>
        ) : (
          <p className="settings-intro">
            {!connectionId
              ? 'Restart the local dashboard bridge and reconnect the robot to load its settings.'
              : 'The robot did not report its drift settings. Check that its firmware supports persistent drift settings.'}
          </p>
        )}
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        {saved && (
          <p className="settings-saved" role="status">
            <Icon name="check" size={16} /> Saved on the robot.
          </p>
        )}
        <div className="settings-actions">
          <button
            className="button secondary"
            onClick={() => dialog.current?.close()}
          >
            {changed && !saving ? 'Cancel' : 'Close'}
          </button>
          {draft && (
            <button
              className="button primary"
              disabled={disabled || saving || !changed}
              onClick={() => void save()}
            >
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          )}
        </div>
        {canStop && (
          <button
            className="button stop-button full robot-stop"
            onClick={onStop}
          >
            <Icon name="stop" size={16} /> Stop robot
          </button>
        )}
        {stopFeedback && (
          <p
            className={`status-message ${stopFailed ? 'stop-error' : ''}`}
            role={stopFailed ? 'alert' : 'status'}
          >
            {stopFeedback}
          </p>
        )}
      </dialog>
    </>
  );
}
