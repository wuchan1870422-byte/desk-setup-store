import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

// The managed preview supervisor supplies Vite-style host/strictPort flags.
// Translate only those flags; keep normal Next.js development options intact.
const input = process.argv.slice(2);
const args = [];
for (let i = 0; i < input.length; i++) {
  if (input[i] === '--strictPort') continue;
  if (input[i] === '--host') {
    const host = input[i + 1] && !input[i + 1].startsWith('-') ? input[++i] : '0.0.0.0';
    args.push('--hostname', host);
  } else if (input[i].startsWith('--host=')) {
    args.push('--hostname', input[i].slice('--host='.length));
  } else args.push(input[i]);
}
if (!args.some(arg => arg === '--hostname' || arg.startsWith('--hostname='))) args.push('--hostname', '0.0.0.0');
const require = createRequire(import.meta.url);
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', ...args], { stdio: 'inherit' });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
