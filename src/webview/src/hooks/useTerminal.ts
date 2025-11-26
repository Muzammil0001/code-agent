/**
 * Terminal hook for managing terminal commands and output
 */

import { useState, useCallback } from 'react';
import { useVSCode } from './useVSCode';

export type TerminalStatus = 'pending' | 'running' | 'completed' | 'failed' | 'stopped';

export interface TerminalOutputLine {
    content: string;
    type: 'stdout' | 'stderr';
    timestamp: number;
}

export interface TerminalCommand {
    id: string;
    command: string;
    cwd?: string;
    status: TerminalStatus;
    output: TerminalOutputLine[];
    startTime: number;
    endTime?: number;
    exitCode?: number;
    requiresConfirmation?: boolean;
}

export interface UseTerminalReturn {
    commands: TerminalCommand[];
    commandsMap: Map<string, TerminalCommand>;
    executeCommand: (command: string, cwd?: string) => string;
    stopCommand: (commandId: string) => void;
    updateCommandStatus: (commandId: string, updates: Partial<TerminalCommand>) => void;
    appendOutput: (commandId: string, content: string, type?: 'stdout' | 'stderr') => void;
    clearCommand: (commandId: string) => void;
    clearAllCommands: () => void;
}

export function useTerminal(): UseTerminalReturn {
    const { postMessage } = useVSCode();
    const [commands, setCommands] = useState<Map<string, TerminalCommand>>(new Map());

    const executeCommand = useCallback((command: string, cwd?: string) => {
        const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const newCommand: TerminalCommand = {
            id: commandId,
            command,
            cwd,
            status: 'pending',
            output: [],
            startTime: Date.now()
        };

        setCommands(prev => new Map(prev.set(commandId, newCommand)));

        postMessage({
            type: 'runCommand',
            command,
            cwd,
            commandId
        });

        return commandId;
    }, [postMessage]);

    const stopCommand = useCallback((commandId: string) => {
        postMessage({
            type: 'stopCommand',
            commandId
        });
    }, [postMessage]);

    const updateCommandStatus = useCallback((
        commandId: string,
        updates: Partial<TerminalCommand>
    ) => {
        setCommands(prev => {
            const command = prev.get(commandId);
            if (!command) return prev;

            const updated = { ...command, ...updates };
            return new Map(prev.set(commandId, updated));
        });
    }, []);

    const appendOutput = useCallback((
        commandId: string,
        content: string,
        type: 'stdout' | 'stderr' = 'stdout'
    ) => {
        setCommands(prev => {
            const command = prev.get(commandId);
            if (!command) return prev;

            const newLine: TerminalOutputLine = {
                content,
                type,
                timestamp: Date.now()
            };

            const updated = {
                ...command,
                output: [...command.output, newLine]
            };

            return new Map(prev.set(commandId, updated));
        });
    }, []);

    const clearCommand = useCallback((commandId: string) => {
        setCommands(prev => {
            const newMap = new Map(prev);
            newMap.delete(commandId);
            return newMap;
        });
    }, []);

    const clearAllCommands = useCallback(() => {
        setCommands(new Map());
    }, []);

    return {
        commands: Array.from(commands.values()),
        commandsMap: commands,
        executeCommand,
        stopCommand,
        updateCommandStatus,
        appendOutput,
        clearCommand,
        clearAllCommands
    };
}
