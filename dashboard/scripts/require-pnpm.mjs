/** Keep installations and package scripts on the same pinned package manager. */
import { readFileSync } from 'node:fs';

const { packageManager } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);
// All package managers expose this compatibility variable, including pnpm.
const actual = (process.env.npm_config_user_agent || '').split(' ')[0];
const expected = packageManager.replace('@', '/');
if (actual !== expected) {
  console.error(
    `This dashboard requires ${packageManager}. Use pnpm install, pnpm dev, or pnpm build.`,
  );
  process.exit(1);
}
