/** Start the simulation/WiFi API and Vite as one supervised local session. */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dashboard = fileURLToPath(new URL('../', import.meta.url));
const root = path.resolve(dashboard, '..');
const windows = process.platform === 'win32';
const python =
  process.env.DASHBOARD_PYTHON ||
  path.join(
    root,
    'experiments',
    '.venv',
    windows ? 'Scripts/python.exe' : 'bin/python',
  );
const children = new Set();
let stopping = false;
let frontendStarted = false;
let startupTimer;

// The project interpreter contains the analysis/export dependencies; do not silently
// fall back to a system Python which could start but fail when a test is submitted.
if (!process.env.DASHBOARD_PYTHON && !existsSync(python)) {
  console.error(
    'Python environment missing. From the repository root, run:\n' +
      '  python3 -m venv experiments/.venv\n' +
      '  experiments/.venv/bin/python -m pip install -r experiments/requirements.txt\n' +
      'Or set DASHBOARD_PYTHON to an interpreter with these dependencies installed.',
  );
  process.exit(1);
}

/** Stop the sibling on failure or terminal exit, allowing Python to stop motors/jobs. */
function shutdown(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  clearTimeout(startupTimer);
  for (const child of children) child.kill('SIGINT');
  // A stuck child must not leave a dev server behind. Separate process groups on
  // POSIX prevent terminal Ctrl+C from interrupting Python's cleanup twice.
  const forceTimer = setTimeout(() => {
    for (const child of children) {
      try {
        if (!windows) process.kill(-child.pid, 'SIGKILL');
        else child.kill('SIGKILL');
      } catch {
        /* A child may exit between the timeout and signal delivery. */
      }
    }
  }, 12000);
  forceTimer.unref();
}

/** Track every process and propagate startup/runtime errors to pnpm's exit code. */
function launch(command, args, cwd, captureOutput = false) {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    detached: !windows,
    stdio: ['ignore', captureOutput ? 'pipe' : 'inherit', 'inherit'],
  });
  children.add(child);
  child.on('error', (error) => {
    console.error(`Unable to start ${command}: ${error.message}`);
    children.delete(child);
    shutdown(1);
  });
  child.on('exit', (code, signal) => {
    children.delete(child);
    if (!stopping) {
      console.error(
        `${path.basename(command)} exited (${signal || code}); stopping dev services.`,
      );
      shutdown(code || 1);
    }
  });
  return child;
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

const backend = launch(
  python,
  ['-u', '-m', 'dashboard.server.app'],
  root,
  true,
);
let output = '';
// Python prints readiness only after binding its port. Waiting for this owned
// process avoids accidentally using another API already listening on port 8765.
backend.stdout.on('data', (chunk) => {
  process.stdout.write(chunk);
  output = (output + chunk.toString()).slice(-4096);
  if (
    !stopping &&
    !frontendStarted &&
    output.includes('Dashboard API: http://127.0.0.1:8765')
  ) {
    frontendStarted = true;
    clearTimeout(startupTimer);
    launch(
      process.execPath,
      [
        path.join(dashboard, 'node_modules/vite/bin/vite.js'),
        '--host',
        '127.0.0.1',
        ...process.argv.slice(2),
      ],
      dashboard,
    );
  }
});
startupTimer = setTimeout(() => {
  console.error('Python API did not become ready within 15 seconds.');
  shutdown(1);
}, 15000);
