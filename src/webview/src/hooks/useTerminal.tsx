/**
 * useTerminal Hook
 * Manages terminal command state and execution
 */

import { useState, useEffect, useCallback } from 'react';
import { useVSCode } from './useVSCode';

export interface TerminalOutputLine {
    content: string;
    type: 'stdout' | 'stderr';
    timestamp: number;
}

export interface TerminalCommand {
    id: string;
    command: string;
    cwd: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped';
    startTime: number;
    endTime?: number;
    exitCode?: number;
    output: TerminalOutputLine[];
    location: 'chat' | 'main';
    pid?: number;
}

export interface UseTerminalReturn {
    commands: Map<string, TerminalCommand>;
    executeCommand: (command: string, location?: 'chat' | 'main', cwd?: string) => string;
    stopCommand: (commandId: string) => void;
    getRunningCommands: () => void;
    clearCompletedCommands: () => void;
}

export function useTerminal(): UseTerminalReturn {
    const { postMessage } = useVSCode();
    const commands = useTerminalStore(state => state.commands);
    const addCommand = useTerminalStore(state => state.addCommand);
    const updateCommand = useTerminalStore(state => state.updateCommand);
    const addOutput = useTerminalStore(state => state.addOutput);
    const clearCompleted = useTerminalStore(state => state.clearCompleted);

    /**
     * Handle messages from extension
     */
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;

            switch (message.type) {
                case 'terminalCommandStarted':
                    if (message.success && message.commandId) {
                        // Command started
                    } else if (!message.success) {
                        console.error('Failed to start terminal command:', message.error);
                        updateCommand(message.commandId, { status: 'failed' });
                    }
                    break;

                case 'terminalOutput':
                    addOutput(message.commandId, message.output);
                    break;

                case 'terminalStatus':
                    // Check if command exists
                    if (!commands.has(message.commandId)) {
                        addCommand({
                            id: message.commandId,
                            command: '', // Will be updated
                            cwd: '',
                            status: message.status,
                            startTime: Date.now(),
                            output: [],
                            location: 'chat',
                            pid: message.pid
                        });
                    } else {
                        updateCommand(message.commandId, {
                            status: message.status,
                            pid: message.pid
                        });
                    }
                    break;

                case 'terminalComplete':
                    updateCommand(message.commandId, {
                        status: message.status,
                        exitCode: message.exitCode,
                        endTime: Date.now()
                    });
                    break;

                case 'terminalCommandStopped':
                    updateCommand(message.commandId, {
                        status: 'stopped',
                        endTime: Date.now()
                    });
                    break;

                case 'runningCommands':
                    if (message.commands && Array.isArray(message.commands)) {
                        message.commands.forEach((cmd: TerminalCommand) => {
                            addCommand(cmd);
                        });
                    }
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [addCommand, updateCommand, addOutput, commands]);

    /**
     * Execute a terminal command
     */
    const executeCommand = useCallback((
        command: string,
        location: 'chat' | 'main' = 'chat',
        cwd?: string
    ) => {
        // Create optimistic command entry
        const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const tempCommand: TerminalCommand = {
            id: commandId,
            command,
            cwd: cwd || '',
            status: 'pending',
            startTime: Date.now(),
            output: [],
            location
        };

        addCommand(tempCommand);

        // Send to extension
        postMessage({
            type: 'executeTerminalCommand',
            command,
            cwd,
            location,
            commandId
        });

        return commandId;
    }, [postMessage, addCommand]);

    /**
     * Stop a running command
     */
    const stopCommand = useCallback((commandId: string) => {
        postMessage({
            type: 'stopTerminalCommand',
            commandId
        });
    }, [postMessage]);

    /**
     * Get running commands from backend
     */
    const getRunningCommands = useCallback(() => {
        postMessage({
            type: 'getRunningCommands'
        });
    }, [postMessage]);

    return {
        commands,
        executeCommand,
        stopCommand,
        getRunningCommands,
        clearCompletedCommands: clearCompleted
    };
}
