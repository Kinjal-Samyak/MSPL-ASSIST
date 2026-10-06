import { spawn } from 'node:child_process';

export function run(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv, standardInput?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env: { ...process.env, ...env }, shell: process.platform === 'win32' });
    child.stdout.on('data', (chunk) => process.stdout.write(chunk));
    child.stderr.on('data', (chunk) => process.stderr.write(chunk));
    if (standardInput !== undefined) child.stdin.end(standardInput);
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} exited with ${code}.`)));
  });
}
