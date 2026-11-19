import { useCallback, useEffect, useRef, useState } from 'react';
import { post } from '../services/api';
import type { DashboardState } from '../types/dashboard';

type StopTarget = 'simulation' | 'robot';

/** Stops bypass the normal action queue; only telemetry confirms physical motion ended. */
export function useStopActions(
  state: DashboardState | null,
  pending: string | null,
  online: boolean,
) {
  const [feedback, setFeedback] = useState('');
  const [feedbackTarget, setFeedbackTarget] = useState<StopTarget | null>(null);
  const [failed, setFailed] = useState(false);
  const sequence = useRef(0);
  const telemetry = state?.robot.telemetry;
  // A connection alone is not active work. Keep Stop available until a failed
  // motor stop is confirmed, including nonzero PWM even if the state is faulted.
  const canStopRobot =
    online &&
    state?.robot.status === 'connected' &&
    !!telemetry &&
    ([
      'calibrating',
      'open_loop',
      'line_follow',
      'motor_test',
      'stopping',
    ].includes(telemetry.state) ||
      telemetry.left_pwm !== 0 ||
      telemetry.right_pwm !== 0);
  const canStopSimulation = online && state?.simulation.status === 'running';

  useEffect(() => {
    // A deliberate new action supersedes feedback about a previous run's stop.
    if (pending) {
      sequence.current += 1;
      setFeedback('');
      setFailed(false);
    }
  }, [pending]);

  const stop = useCallback(
    async (target: StopTarget) => {
      // Match the button state even if an obsolete handler is invoked elsewhere.
      if (target === 'robot' ? !canStopRobot : !canStopSimulation) return;
      const request = ++sequence.current;
      setFeedbackTarget(target);
      setFailed(false);
      setFeedback('Sending stop request…');
      try {
        // No action lock or disabled run form can delay an explicit stop request.
        if (target === 'robot')
          await post('robot/command', { command: 'stop' });
        else await post('simulation/cancel');
        if (request !== sequence.current) return;
        setFeedback(
          target === 'robot'
            ? 'Stop requested. Check Robot state and PWM for confirmation.'
            : 'Stop requested. Waiting for the simulation to finish cancelling.',
        );
      } catch (error) {
        if (request !== sequence.current) return;
        setFailed(true);
        setFeedback(
          `Stop could not be delivered: ${error instanceof Error ? error.message : 'Request failed.'}`,
        );
      }
    },
    [canStopRobot, canStopSimulation],
  );

  // Derive completion from current worker state, even if cancellation finishes
  // before the HTTP stop request returns.
  const message =
    feedback &&
    feedbackTarget === 'simulation' &&
    !failed &&
    state?.simulation.status === 'cancelled'
      ? 'Simulation stopped. Previous completed exports are preserved.'
      : feedback;

  return {
    stop,
    feedback: message,
    feedbackTarget,
    failed,
    canStopRobot,
    canStopSimulation,
  };
}
