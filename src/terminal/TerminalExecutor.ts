/**
 * Terminal Command Executor - Safe terminal command execution with approval
 * Enhanced with TerminalManager integration for background execution
 */

import * as vscode from 'vscode';
import { PermissionEngine } from '../safety/PermissionEngine';
import { actionClassifier } from '../safety/ActionClassifier';
import { logger } from '../utils/logger';
import { terminalManager } from './TerminalManager';
import { TerminalLocation, CommandRiskLevel } from '../types/terminalTypes';

export interface CommandResult {
    success: boolean;
    output: string;
    exitCode: number;
    duration: number;
    commandId?: string;
}

export class TerminalExecutor {
    private permissionEngine: PermissionEngine | null = null;
    private terminal: vscode.Terminal | null = null;

    setPermissionEngine(engine: PermissionEngine): void {
        this.permissionEngine = engine;
    }

    /**
     * Execute command with background support (recommended)
     */
    async executeCommandWithBackground(
        command: string,
        cwd?: string,
        location: TerminalLocation = TerminalLocation.CHAT
    ): Promise<CommandResult> {
        logger.info(`Executing command with background: ${command}`);

        // Classify the command
        const action = actionClassifier.classifyTerminalCommand(
            command,
            cwd || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || ''
        );

        // Request permission if needed
        if (this.permissionEngine) {
            const decision = await this.permissionEngine.requestPermission(action);

            if (decision.decision === 'deny') {
                logger.warn(`Command denied: ${command}`);
                throw new Error('Command denied by user');
            }
        }

        // Execute using TerminalManager
        const startTime = Date.now();
        const result = await terminalManager.executeCommand(command, {
            cwd: cwd || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
            location
        });

        if (result.success) {
            return {
                success: true,
                output: 'Command started successfully',
                exitCode: 0,
                duration: Date.now() - startTime,
                commandId: result.commandId
            };
        } else {
            return {
                success: false,
                output: result.error || 'Command failed',
                exitCode: 1,
                duration: Date.now() - startTime,
                commandId: result.commandId
            };
        }
    }

    /**
     * Legacy execute command (backward compatible)
     */
    async executeCommand(
        command: string,
        cwd?: string
    ): Promise<CommandResult> {
        logger.info(`Executing command: ${command}`);

        // Classify the command
        const action = actionClassifier.classifyTerminalCommand(
            command,
            cwd || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || ''
        );

        // Request permission if needed
        if (this.permissionEngine) {
            const decision = await this.permissionEngine.requestPermission(action);

            if (decision.decision === 'deny') {
                logger.warn(`Command denied: ${command}`);
                throw new Error('Command denied by user');
            }
        }

        // Execute the command
        const startTime = Date.now();

        try {
            const output = await this.runCommand(command, cwd);
            const duration = Date.now() - startTime;

            logger.info(`Command completed in ${duration}ms`);

            return {
                success: true,
                output,
                exitCode: 0,
                duration
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error(`Command failed: ${command}`, error as Error);

            return {
                success: false,
                output: (error as Error).message,
                exitCode: 1,
                duration
            };
        }
    }

    private async runCommand(command: string, cwd?: string): Promise<string> {
        return new Promise((resolve, reject) => {
            // Get or create terminal
            if (!this.terminal || this.terminal.exitStatus) {
                this.terminal = vscode.window.createTerminal({
                    name: 'CodeMind AI',
                    cwd
                });
            }

            // Show terminal
            this.terminal.show();

            // Send command
            this.terminal.sendText(command);

            // Note: We can't easily capture output from VS Code terminal
            // This is a limitation of the VS Code API
            // For now, we'll just resolve after sending the command
            setTimeout(() => {
                resolve('Command sent to terminal. Check terminal output.');
            }, 1000);
        });
    }

    async executeWithOutput(
        command: string,
        cwd?: string
    ): Promise<CommandResult> {
        // Use new background execution with output capture
        logger.info('Using TerminalManager for executeWithOutput');
        return this.executeCommandWithBackground(command, cwd, TerminalLocation.CHAT);
    }

    /**
     * Stop a running command
     */
    stopCommand(commandId: string): boolean {
        return terminalManager.stopCommand(commandId);
    }

    /**
     * Get command status
     */
    getCommandStatus(commandId: string) {
        return terminalManager.getCommand(commandId);
    }

    /**
     * Get all running commands
     */
    getRunningCommands() {
        return terminalManager.getRunningCommands();
    }

    disposeTerminal(): void {
        if (this.terminal) {
            this.terminal.dispose();
            this.terminal = null;
        }

        // Dispose terminal manager
        terminalManager.dispose();
    }

    getTerminal(): vscode.Terminal | null {
        return this.terminal;
    }
}

export const terminalExecutor = new TerminalExecutor();
