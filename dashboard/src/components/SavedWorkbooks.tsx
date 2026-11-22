import { useEffect, useState } from 'react';
import { deleteWorkbook, getWorkbooks } from '../services/api';
import type {
  DashboardState,
  PwmSweep,
  SavedWorkbook,
} from '../types/dashboard';
import { Icon } from './Icon';

const savedTime = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'medium',
});

export function SavedWorkbooks({
  online,
  simulationStatus,
  sweep,
}: {
  online: boolean;
  simulationStatus?: DashboardState['simulation']['status'];
  sweep?: PwmSweep;
}) {
  const [files, setFiles] = useState<SavedWorkbook[] | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [revision, setRevision] = useState(0);
  const sweepStatus = sweep?.status;
  const savedRuns = sweep?.saved_runs;
  const sweepFilename = sweep?.filename;

  async function remove(filename: string) {
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteWorkbook(filename);
      setFiles(
        (current) =>
          current?.filter((file) => file.filename !== filename) ?? null,
      );
      setSelected(null);
    } catch (cause) {
      setDeleteError(
        cause instanceof Error
          ? cause.message
          : 'Could not delete the workbook.',
      );
    } finally {
      setDeleting(false);
      // Invalidate earlier list requests, including when another session deleted the file.
      setRevision((value) => value + 1);
    }
  }

  // Refresh after a run changes state. A slower refresh also picks up files
  // from other sessions without tying disk access to the telemetry poll.
  useEffect(() => {
    if (!online) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const workbooks = await getWorkbooks();
        if (active) {
          setFiles(workbooks);
          setError('');
        }
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : 'Request failed.');
        }
      } finally {
        if (active) timer = setTimeout(refresh, 30000);
      }
    }
    void refresh();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [
    online,
    simulationStatus,
    sweepStatus,
    savedRuns,
    sweepFilename,
    revision,
  ]);

  const workbooks = new Map(files?.map((file) => [file.filename, file]));
  const recoveries = new Map(
    sweep?.resumable?.map((batch) => [batch.filename, batch]),
  );
  // A sweep interrupted during its first run may still have no Excel file.
  const filenames = new Set([...workbooks.keys(), ...recoveries.keys()]);
  if (!online || error || !files || !filenames.size) {
    let message = 'Loading saved Excel workbooks…';
    if (!online)
      message = 'Waiting for the local bridge to load saved workbooks.';
    else if (error) message = `Could not load saved workbooks. ${error}`;
    else if (files)
      message =
        'Excel workbooks appear after a simulation or the first run of a PWM sweep.';
    return (
      <p className="results-empty" role="status">
        {message}
      </p>
    );
  }

  return (
    <ul className="workbook-list" aria-label="Saved Excel workbooks">
      {Array.from(filenames, (filename) => {
        const file = workbooks.get(filename);
        const recovery = recoveries.get(filename);
        const savedAt = file?.saved_at ?? recovery?.saved_at;
        const current = sweep && filename === sweep.filename;
        const active =
          current && (sweep.status === 'running' || sweep.status === 'saving');
        return (
          <li key={filename}>
            <div className="workbook-info">
              <strong>
                {file?.kind === 'simulation'
                  ? 'Straight-line simulation'
                  : 'Wheel speed · PWM sweep'}
              </strong>
              {savedAt && (
                <time dateTime={savedAt}>
                  {savedTime.format(new Date(savedAt))}
                </time>
              )}
              <span>{filename}</span>
              {recovery ? (
                <p>
                  Interrupted · {recovery.saved_runs} of {recovery.runs} runs
                  recorded
                </p>
              ) : (
                current &&
                sweep.saved_runs !== undefined && (
                  <p>
                    {sweep.saved_runs} of {sweep.runs} runs saved to Excel
                  </p>
                )
              )}
              {selected === filename && (
                <>
                  <p role="status">
                    {recovery
                      ? 'Permanently delete this sweep and its saved progress?'
                      : 'Permanently delete this Excel workbook?'}
                  </p>
                  {deleteError && (
                    <p className="stop-error" role="alert">
                      {deleteError}
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="workbook-actions">
              {selected === filename ? (
                <>
                  <button
                    className="button stop-button"
                    disabled={deleting || active}
                    onClick={() => void remove(filename)}
                  >
                    {deleting
                      ? 'Deleting…'
                      : recovery
                        ? 'Delete sweep'
                        : 'Delete workbook'}
                  </button>
                  <button
                    className="button secondary"
                    disabled={deleting}
                    onClick={() => setSelected(null)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  {file && (
                    <a
                      className="button secondary"
                      href={`/api/results/workbooks/${encodeURIComponent(filename)}`}
                      aria-label={`Download ${filename}`}
                      download
                    >
                      <Icon name="download" size={16} />
                      Download
                    </a>
                  )}
                  <button
                    className="button secondary"
                    disabled={deleting || active}
                    title={
                      active
                        ? 'Available after the sweep stops saving runs.'
                        : undefined
                    }
                    aria-label={`Delete ${filename}`}
                    onClick={() => {
                      setSelected(filename);
                      setDeleteError('');
                    }}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
