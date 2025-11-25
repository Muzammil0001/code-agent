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
    executeCommand: (command: string, location?: 'chat' | 'main', cwd?: string) => void;
    stopCommand: (commandId: string) => void;
    getRunningCommands: () => void;
    clearCompletedCommands: () => void;
}

export function useTerminal(): UseTerminalReturn {
    const { postMessage } = useVSCode();
    const [commands, setCommands] = useState<Map<string, TerminalCommand>>(new Map());

    /**
     * Handle messages from extension
     */
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;

            switch (message.type) {
                case 'terminalCommandStarted':
                    if (message.success && message.commandId) {
                        // Command started - initial state will be set by terminalStatus
                    } else if (!message.success) {
                        console.error('Failed to start terminal command:', message.error);
                    }
                    break;

                case 'terminalOutput':
                    setCommands(prev => {
                        const newCommands = new Map(prev);
                        const cmd = newCommands.get(message.commandId);

                        if (cmd) {
                            cmd.output = [...cmd.output, message.output];
                            newCommands.set(message.commandId, { ...cmd });
                        }

                        return newCommands;
                    });
                    break;

                case 'terminalStatus':
                    setCommands(prev => {
                        const newCommands = new Map(prev);
                        let cmd = newCommands.get(message.commandId);

                        if (!cmd) {
                            // Create new command entry
                            cmd = {
                                id: message.commandId,
                                command: '', // Will be updated
                                cwd: '',
                                status: message.status,
                                startTime: Date.now(),
                                output: [],
                                location: 'chat',
                                pid: message.pid
                            };
                        } else {
                            cmd.status = message.status;
                            cmd.pid = message.pid;
                        }

                        newCommands.set(message.commandId, { ...cmd });
                        return newCommands;
                    });
                    break;

                case 'terminalComplete':
                    setCommands(prev => {
                        const newCommands = new Map(prev);
                        const cmd = newCommands.get(message.commandId);

                        if (cmd) {
                            cmd.status = message.status;
                            cmd.exitCode = message.exitCode;
                            cmd.endTime = Date.now();
                            newCommands.set(message.commandId, { ...cmd });
                        }

                        return newCommands;
                    });
                    break;

                case 'terminalCommandStopped':
                    setCommands(prev => {
                        const newCommands = new Map(prev);
                        const cmd = newCommands.get(message.commandId);

                        if (cmd) {
                            cmd.status = 'stopped';
                            cmd.endTime = Date.now();
                            newCommands.set(message.commandId, { ...cmd });
                        }

                        return newCommands;
                    });
                    break;

                case 'runningCommands':
                    // Update with running commands from backend
                    if (message.commands && Array.isArray(message.commands)) {
                        setCommands(prev => {
                            const newCommands = new Map(prev);

                            message.commands.forEach((cmd: TerminalCommand) => {
                                newCommands.set(cmd.id, cmd);
                            });

                            return newCommands;
                        });
                    }
                    break;
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    /**
     * Execute a terminal command
     */
    const executeCommand = useCallback((
        command: string,
        location: 'chat' | 'main' = 'chat',
        cwd?: string
    ) => {
        // Create optimistic command entry
        const tempId = `temp_${Date.now()}`;
        const tempCommand: TerminalCommand = {
            id: tempId,
            command,
            cwd: cwd || '',
            status: 'pending',
            startTime: Date.now(),
            output: [],
            location
        };

        setCommands(prev => {
            const newCommands = new Map(prev);
            newCommands.set(tempId, tempCommand);
            return newCommands;
        });

        // Send to extension
        postMessage({
            type: 'executeTerminalCommand',
            command,
            cwd,
            location
        });
    }, [postMessage]);

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

    /**
     * Clear completed/failed/stopped commands
     */
    const clearCompletedCommands = useCallback(() => {
        setCommands(prev => {
            const newCommands = new Map(prev);

            for (const [id, cmd] of newCommands.entries()) {
                if (cmd.status === 'completed' || cmd.status === 'failed' || cmd.status === 'stopped') {
                    newCommands.delete(id);
                }
            }

            return newCommands;
        });
    }, []);

    return {
        commands,
        executeCommand,
        stopCommand,
        getRunningCommands,
        clearCompletedCommands
    };
}
