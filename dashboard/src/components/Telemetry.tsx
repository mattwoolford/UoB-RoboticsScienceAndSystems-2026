import type {
  Sample,
  Source,
  Telemetry as RobotTelemetry,
} from '../types/dashboard';

/** Missing readings stay as dashes instead of presenting invented zero measurements. */
export function number(value: number | undefined, digits = 1): string {
  return value === undefined || !Number.isFinite(value)
    ? '—'
    : value.toLocaleString(undefined, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
}
/** Wrap negative/multiple turns, including rounding across north, into 0–359.9°. */
export function heading(radians: number | undefined): string {
  if (radians === undefined || !Number.isFinite(radians)) return '—';
  const degrees = ((radians % (2 * Math.PI)) * 180) / Math.PI;
  const normalized = ((degrees % 360) + 360) % 360;
  // Round before the final wrap so 359.96° displays as 0.0°, never 360.0°.
  return number((Math.round(normalized * 10) % 3600) / 10);
}

export function Telemetry({
  source,
  sample,
  robot,
}: {
  source: Source;
  sample?: Sample;
  robot?: RobotTelemetry | null;
}) {
  const physical = source === 'robot';
  const x = physical ? robot?.x_mm : sample?.forward_mm;
  const y = physical ? robot?.y_mm : sample?.signed_drift_mm;
  const reading = physical ? robot : sample;
  return (
    <>
      <div className="metrics">
        <div className="metric">
          <span>{physical ? 'Estimated X' : 'Forward travel'}</span>
          <strong>
            {number(x)}
            <small>mm</small>
          </strong>
          <p>{physical ? 'Encoder odometry' : 'Simulated centrepoint'}</p>
        </div>
        <div className="metric">
          <span>{physical ? 'Estimated Y' : 'Lateral drift'}</span>
          <strong>
            {number(y)}
            <small>mm</small>
          </strong>
          <p>
            {physical
              ? 'Not measured ground truth'
              : 'Positive left · negative right'}
          </p>
        </div>
        <div className="metric">
          <span>Heading</span>
          <strong>
            {heading(reading?.heading_rad)}
            <small>deg</small>
          </strong>
          <p>{physical ? 'Encoder estimate' : 'Simulation world pose'}</p>
        </div>
        <div className="metric">
          <span>{physical ? 'Robot state' : 'Simulation time'}</span>
          <strong className={physical ? 'state-value' : ''}>
            {physical
              ? (robot?.state.replaceAll('_', ' ') ?? 'Offline')
              : number(sample?.elapsed_s)}
            {!physical && <small>s</small>}
          </strong>
          <p>
            {physical
              ? robot?.ready
                ? 'Ready to start'
                : 'Waiting for readiness'
              : '30-second trial duration'}
          </p>
        </div>
      </div>
      <section className="panel motor-panel" aria-labelledby="motor-title">
        <div className="compact-heading">
          <h2 id="motor-title">Motor & sensor telemetry</h2>
          <span className="subtle">
            {physical
              ? 'Robot-reported PWM commands'
              : 'Selected simulation trial'}
          </span>
        </div>
        <div className="motor-grid">
          <div>
            <span>Left PWM</span>
            <strong>{number(reading?.left_pwm, 0)}</strong>
          </div>
          <div>
            <span>Right PWM</span>
            <strong>{number(reading?.right_pwm, 0)}</strong>
          </div>
          <div>
            <span>Left encoder</span>
            <strong>{number(reading?.left_count, 0)}</strong>
          </div>
          <div>
            <span>Right encoder</span>
            <strong>{number(reading?.right_count, 0)}</strong>
          </div>
        </div>
        {physical && (
          <div className="sensors">
            <span>Reflectance</span>
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index}>
                <label>DN{index + 1}</label>
                <strong>{number(robot?.sensors[index], 0)}</strong>
                <meter
                  min="0"
                  max="4095"
                  value={robot?.sensors[index] ?? 0}
                  aria-label={`DN${index + 1} reflectance`}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
