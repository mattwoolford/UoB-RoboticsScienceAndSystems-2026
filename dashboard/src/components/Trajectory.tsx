import { useState } from 'react';
import type { Sample, Source, Telemetry } from '../types/dashboard';
import { Icon } from './Icon';
import { number } from './Telemetry';
interface Props {
  source: Source;
  samples: Sample[];
  history: Telemetry[];
}

/** Plot one trial at a time, with explicit independent axis scales so drift remains visible. */
export function Trajectory({ source, samples, history }: Props) {
  const [view, setView] = useState<'path' | 'drift'>('path');
  const robot = source === 'robot';
  const points = robot
    ? history.map((item) => ({
        x:
          view === 'path'
            ? item.x_mm
            : (item.timestamp_ms - (history[0]?.timestamp_ms ?? 0)) / 1000,
        y: item.y_mm,
      }))
    : samples.map((item) => ({
        x: view === 'path' ? item.forward_mm : item.elapsed_s,
        y: item.signed_drift_mm,
      }));
  const valid = points.filter(
    (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
  );
  const minX = Math.min(0, ...valid.map((point) => point.x));
  const maxX = Math.max(
    view === 'path' ? 100 : 30,
    ...valid.map((point) => point.x),
  );
  const extentY =
    Math.max(10, ...valid.map((point) => Math.abs(point.y))) * 1.15;
  const left = 68,
    right = 720,
    top = 34,
    bottom = 268;
  const scaleX = (value: number) =>
    left + ((value - minX) / (maxX - minX)) * (right - left);
  const scaleY = (value: number) =>
    bottom - ((value + extentY) / (2 * extentY)) * (bottom - top);
  const path = valid
    .map(
      (point, index) =>
        `${index ? 'L' : 'M'}${scaleX(point.x)},${scaleY(point.y)}`,
    )
    .join(' ');
  const last = valid.at(-1);
  return (
    <section className="panel chart-panel" aria-labelledby="trajectory-title">
      <div className="compact-heading">
        <div>
          <h2 id="trajectory-title">
            {view === 'path'
              ? 'Robot trajectory'
              : robot
                ? 'Estimated lateral position'
                : 'Drift over time'}
          </h2>
          <p className="subtle">
            {robot
              ? 'Wheel-encoder odometry · not physical drift ground truth'
              : 'Actual simulation samples · axle centrepoint'}
          </p>
        </div>
        <div className="segmented small" aria-label="Plot type">
          <button
            aria-pressed={view === 'path'}
            onClick={() => setView('path')}
          >
            Path
          </button>
          <button
            aria-pressed={view === 'drift'}
            onClick={() => setView('drift')}
          >
            Over time
          </button>
        </div>
      </div>
      <div className="plot-wrap">
        <svg
          className="plot"
          viewBox="0 0 756 320"
          role="img"
          aria-label={`${robot ? 'Odometry' : 'Simulation'} ${view} plot with ${valid.length} measured samples. Axes are scaled independently.`}
        >
          <defs>
            <pattern
              id="plot-grid"
              width="32"
              height="26"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 32 0 L 0 0 0 26"
                fill="none"
                stroke="#e9eef2"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect
            x={left}
            y={top}
            width={right - left}
            height={bottom - top}
            fill="url(#plot-grid)"
          />
          {[-1, -0.5, 0, 0.5, 1].map((tick) => (
            <g key={tick}>
              <line
                x1={left}
                x2={right}
                y1={scaleY(tick * extentY)}
                y2={scaleY(tick * extentY)}
                stroke={tick === 0 ? '#94a8b9' : '#e5ebef'}
                strokeDasharray={tick === 0 ? '5 5' : undefined}
              />
              <text
                x={left - 12}
                y={scaleY(tick * extentY) + 4}
                textAnchor="end"
              >
                {number(tick * extentY, 0)}
              </text>
            </g>
          ))}
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
            <g key={tick}>
              <text
                x={left + tick * (right - left)}
                y={bottom + 22}
                textAnchor="middle"
              >
                {number(minX + tick * (maxX - minX), 0)}
              </text>
            </g>
          ))}
          <text x={left} y={18}>
            {robot ? 'Estimated Y' : 'Lateral drift'} (mm)
          </text>
          <text x={(left + right) / 2} y={312} textAnchor="middle">
            {view === 'path'
              ? robot
                ? 'Estimated X (mm)'
                : 'Forward travel (mm)'
              : 'Elapsed time (s)'}
          </text>
          <path
            d={path}
            fill="none"
            stroke="#167d75"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {last && (
            <>
              <circle
                cx={scaleX(last.x)}
                cy={scaleY(last.y)}
                r="9"
                fill="#167d75"
                opacity=".13"
              />
              <circle
                cx={scaleX(last.x)}
                cy={scaleY(last.y)}
                r="4.5"
                fill="#167d75"
                stroke="white"
                strokeWidth="2"
              />
            </>
          )}
        </svg>
        {valid.length === 0 && (
          <div className="chart-empty">
            <span className="empty-icon">
              <Icon name="activity" size={28} />
            </span>
            <strong>Your next run starts here</strong>
            <span>
              {robot
                ? 'Connect a robot to see its estimated path.'
                : 'Run a simulation to see motion and drift.'}
            </span>
          </div>
        )}
      </div>
      <div className="chart-footer">
        <span>
          <i className="legend-line" />
          {robot ? 'Estimated path' : 'Simulated path'}
        </span>
        <span>Independent axis scales · {valid.length} samples</span>
      </div>
    </section>
  );
}
