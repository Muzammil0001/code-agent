import EventEmitter from 'eventemitter3';
import { type TerminalOutputLine } from '../stores/terminalStore';

export const terminalEvents = new EventEmitter<{
    output: { commandId: string; line: TerminalOutputLine };
    status: { commandId: string; status: 'running' | 'completed' | 'failed' | 'stopped' };
}>();
