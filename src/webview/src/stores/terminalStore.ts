import { create } from 'zustand';

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

interface TerminalState {
    commands: Record<string, TerminalCommand>;
    addCommand: (command: TerminalCommand) => void;
    updateCommand: (id: string, updates: Partial<TerminalCommand>) => void;
    addOutput: (id: string, output: TerminalOutputLine) => void;
    clearCompleted: () => void;
}

export const useTerminalStore = create<TerminalState>((set) => ({
    commands: {},

    addCommand: (command) =>
        set((state) => {
            console.log('📝 Adding command to store:', command.id);
            return {
                commands: {
                    ...state.commands,
                    [command.id]: { ...command },
                },
            };
        }),

    updateCommand: (id, updates) =>
        set((state) => {
            const existing = state.commands[id];
            if (!existing) {
                console.warn(`⚠️ Cannot update non-existent command: ${id}`);
                return state;
            }

            console.log('🔄 Updating command:', id, updates);
            return {
                commands: {
                    ...state.commands,
                    [id]: {
                        ...existing,
                        ...updates,
                    },
                },
            };
        }),

    addOutput: (id, output) =>
        set((state) => {
            let existing = state.commands[id];
            let currentCommands = state.commands;

            // If command doesn't exist yet, create a placeholder
            // This handles race condition where output arrives before command registration
            if (!existing) {
                console.warn(`⚠️ Output arrived before command registration for: ${id}`);
                console.log('📝 Creating placeholder command for:', id);

                existing = {
                    id,
                    command: 'Loading...',
                    cwd: '',
                    status: 'running',
                    output: [],
                    startTime: Date.now(),
                    location: 'chat'
                };

                // Add the placeholder to the commands object for this specific set call
                currentCommands = {
                    ...state.commands,
                    [id]: existing
                };
            }

            console.log('📥 Adding output to command:', id, output.content.substring(0, 50));
            console.log('📊 Before update - output length:', existing.output.length);

            // Create new command with updated output
            const updatedCommand = {
                ...existing,
                output: [...existing.output, output],
            };

            console.log('📊 After update - output length:', updatedCommand.output.length);
            console.log('🔍 Old command reference:', existing);
            console.log('🔍 New command reference:', updatedCommand);
            console.log('🔍 References equal?', existing === updatedCommand);

            const newState = {
                commands: {
                    ...currentCommands,
                    [id]: updatedCommand,
                },
            };

            console.log('🔍 Old commands ref:', state.commands);
            console.log('🔍 New commands ref:', newState.commands);
            console.log('🔍 Commands refs equal?', state.commands === newState.commands);

            return newState;
        }),

    clearCompleted: () =>
        set((state) => {
            const newCommands: Record<string, TerminalCommand> = {};

            Object.entries(state.commands).forEach(([id, cmd]) => {
                if (
                    cmd.status !== 'completed' &&
                    cmd.status !== 'failed' &&
                    cmd.status !== 'stopped'
                ) {
                    newCommands[id] = cmd;
                }
            });

            console.log('🧹 Cleared completed commands');
            return { commands: newCommands };
        }),
}));