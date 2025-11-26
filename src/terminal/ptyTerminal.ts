import * as vscode from 'vscode';
import { spawn } from 'child_process';

export class PTYTerminal implements vscode.Pseudoterminal {
  private writeEmitter = new vscode.EventEmitter<string>();
  onDidWrite: vscode.Event<string> = this.writeEmitter.event;
  private process: ReturnType<typeof spawn> | null = null;
  private isRunning: boolean = false;

  constructor(private command: string, private cwd: string = process.cwd()) {}

  open() {
    this.isRunning = true;
    const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
    const shellFlag = process.platform === 'win32' ? ['/c', this.command] : ['-c', this.command];
    this.process = spawn(shell, shellFlag, { cwd: this.cwd });

    this.process.stdout.on('data', (data) => this.writeEmitter.fire(data.toString()));
    this.process.stderr.on('data', (data) => this.writeEmitter.fire(data.toString()));
    this.process.on('close', (code) => {
      this.writeEmitter.fire(`\r\n[process exited with code ${code}]\r\n`);
      this.isRunning = false;
    });
  }
  close() {
    if (this.process && this.isRunning) {
      this.process.kill();
    }
  }
}
