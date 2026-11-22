import { useCallback, useEffect, useRef, useState } from 'react';
import { getState, post } from '../services/api';
import type { DashboardState } from '../types/dashboard';

/** Poll only after each response, and keep the robot lease separate from UI refreshes. */
export function useDashboard() {
  const [state, setState] = useState<DashboardState | null>(null);
  const [connectionError, setConnectionError] = useState('');
  const [actionError, setActionError] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const actionLock = useRef(false);
  const robotConnected = useRef(false);

  useEffect(() => {
    let alive = true;
    let pollTimer: ReturnType<typeof setTimeout>;
    let leaseTimer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const next = await getState();
        if (!alive) return;
        robotConnected.current = ['connected', 'connecting'].includes(
          next.robot.status,
        );
        setState(next);
        setConnectionError('');
      } catch {
        if (!alive) return;
        robotConnected.current = false;
        setConnectionError(
          'Local bridge unavailable. Run pnpm dev from the repository root to start the dashboard and Python backend together.',
        );
      } finally {
        if (alive) pollTimer = setTimeout(poll, 500);
      }
    };
    const lease = async () => {
      // A hidden or closed dashboard must not keep physical motion authorised.
      if (robotConnected.current && document.visibilityState === 'visible') {
        try {
          await post('heartbeat');
        } catch {
          /* The firmware watchdog stops on lease expiry. */
        }
      }
      if (alive) leaseTimer = setTimeout(lease, 400);
    };
    void poll();
    void lease();
    return () => {
      alive = false;
      clearTimeout(pollTimer);
      clearTimeout(leaseTimer);
    };
  }, []);

  const act = useCallback(
    async (path: string, payload: object = {}, urgent = false) => {
      // STOP bypasses the normal action lock, so a pending connection never hides it.
      if (actionLock.current && !urgent) return;
      if (!urgent) {
        actionLock.current = true;
        setPending(path);
      }
      setActionError('');
      try {
        await post(path, payload);
      } catch (error) {
        setActionError(
          error instanceof Error ? error.message : 'The action failed.',
        );
      } finally {
        if (!urgent) {
          actionLock.current = false;
          setPending(null);
        }
      }
    },
    [],
  );

  return {
    state,
    connectionError,
    actionError,
    pending,
    act,
    clearError: () => setActionError(''),
  };
}
