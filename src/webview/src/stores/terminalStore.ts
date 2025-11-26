import { create } from 'zustand';

export interface TerminalLine {
    id: string;
    content: string;
    type: 'stdout' | 'stderr' | 'info' | 'error';
    timestamp: number;
}

interface TerminalState {
    lines: TerminalLine[];
    isExecuting: boolean;
    currentCommand: string | null;

    // Actions
    addLine: (content: string, type?: TerminalLine['type']) => void;
    startCommand: (command: string) => void;
    endCommand: () => void;
    clear: () => void;
}

export const useTerminalStore = create<TerminalState>((set) => ({
    lines: [],
    isExecuting: false,
    currentCommand: null,

    addLine: (content, type = 'stdout') => set((state) => ({
        lines: [...state.lines, {
            id: Date.now().toString() + Math.random(),
            content,
            type,
            timestamp: Date.now()
        }]
    })),

    startCommand: (command) => set({
        isExecuting: true,
        currentCommand: command
    }),

    endCommand: () => set({
        isExecuting: false,
        currentCommand: null
    }),

    clear: () => set({ lines: [] })
}));
