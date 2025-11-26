import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { EventEmitter } from 'vscode';

export interface BackgroundProcess {
  pid: number;
  command: string;
  process: ChildProcessWithoutNullStreams;
  onOutput: EventEmitter<string>;
  dispose: () => void;
}

export function runInBackground(command: string, cwd: string = process.cwd(), onOutput: (chunk: string) => void): BackgroundProcess {
  const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
  const shellFlag = process.platform === 'win32' ? ['/c', command] : ['-c', command];
  const proc = spawn(shell, shellFlag, { cwd });

  const emitter = new EventEmitter<string>();
  proc.stdout.on('data', (data) => {
    const text = data.toString();
    onOutput(text);
    emitter.fire(text);
  });
  proc.stderr.on('data', (data) => {
    const text = data.toString();
    onOutput(text);
    emitter.fire(text);
  });

  proc.on('close', (code) => {
    onOutput(`[process exited with code ${code}]`);
    emitter.fire(`[process exited with code ${code}]`);
  });

  return {
    pid: proc.pid,
    command,
    process: proc,
    onOutput: emitter,
    dispose: () => proc.kill(),
  };
}
