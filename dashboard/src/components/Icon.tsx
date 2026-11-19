import type { CSSProperties } from 'react';

type Name =
  | 'robot'
  | 'grid'
  | 'activity'
  | 'play'
  | 'stop'
  | 'wifi'
  | 'download'
  | 'layers'
  | 'check'
  | 'info';
const paths: Record<Name, string> = {
  robot: 'M8 4h8M12 2v2M5 7h14v12H5zM8 11h1m6 0h1M9 15h6M2 10v6m20-6v6',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  activity: 'M2 12h5l3-8 4 16 3-8h5',
  play: 'm8 4 12 8-12 8z',
  stop: 'M5 5h14v14H5z',
  wifi: 'M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8 16a6 6 0 0 1 8 0M12 20h.01',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
  layers: 'm12 2 10 5-10 5L2 7zm-10 10 10 5 10-5M2 17l10 5 10-5',
  check: 'm5 12 4 4L19 6',
  info: 'M12 11v6m0-10h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
};
/** Small local icon set avoids external assets and works on the robot's offline WiFi. */
export function Icon({
  name,
  size = 20,
  style,
}: {
  name: Name;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[name]} />
    </svg>
  );
}
