/**
 * TerminalOutput Component
 * Displays terminal command output with styling to match VS Code terminal
 */

import { useEffect, useRef, useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { ansiToHtml, stripAnsi } from '../utils/ansiToHtml';
import type { TerminalCommand } from '../hooks/useTerminal';

interface TerminalOutputProps {
    command: TerminalCommand;
    onStop?: (commandId: string) => void;
}

export function TerminalOutput({ command, onStop }: TerminalOutputProps) {
    const outputRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);
    const isRunning = command.status === 'running';

    // Auto-scroll to bottom when new output arrives
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [command.output]);

    const handleCopy = () => {
        const fullOutput = [
            `~/..${command.cwd || ''} $ ${command.command}`,
            '',
            ...command.output.map(line => stripAnsi(line.content))
        ].join('\n');

        navigator.clipboard.writeText(fullOutput);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCancel = () => {
        if (onStop && isRunning) {
            onStop(command.id);
        }
    };

    const getSimplifiedPath = () => {
        if (!command.cwd) return '/code-agent';
        const parts = command.cwd.split('/');
        return parts[parts.length - 1] || '/code-agent';
    };

    const getStatusText = () => {
        switch (command.status) {
            case 'running':
                return 'Running';
            case 'completed':
                return 'Completed';
            case 'failed':
                return 'Failed';
            case 'stopped':
                return 'Cancelled';
            default:
                return 'Pending';
        }
    };

    return (
        <div className="terminal-output my-3 rounded-lg border border-zinc-700/50 bg-[#1e1e1e] overflow-hidden shadow-lg">
            {/* Terminal Header - Command Line */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#2d2d2d] border-b border-zinc-700/50">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-zinc-400 text-sm font-mono flex-shrink-0">
                        ~/..{getSimplifiedPath()} $
                    </span>
                    <span className="text-zinc-200 text-sm font-mono truncate">
                        {command.command}
                    </span>
                </div>

                {/* Copy Button */}
                <button
                    onClick={handleCopy}
                    className="p-1.5 hover:bg-zinc-700/50 rounded transition-colors flex-shrink-0"
                    title="Copy Terminal Output"
                >
                    {copied ? (
                        <Check size={16} className="text-green-400" />
                    ) : (
                        <Copy size={16} className="text-zinc-400" />
                    )}
                </button>
            </div>

            {/* Terminal Output Content */}
            <div
                ref={outputRef}
                className="terminal-content p-4 font-mono text-sm overflow-auto bg-[#1e1e1e]"
                style={{
                    maxHeight: '350px',
                    minHeight: '120px'
                }}
            >
                {command.output.length === 0 ? (
                    <div className="text-zinc-500 text-sm">
                        {isRunning ? '' : 'No output'}
                    </div>
                ) : (
                    <div className="space-y-0">
                        {command.output.map((line, index) => (
                            <div
                                key={`${command.id}-line-${index}`}
                                className={`terminal-line leading-relaxed ${line.type === 'stderr'
                                        ? 'text-red-300'
                                        : 'text-zinc-300'
                                    }`}
                            >
                                {ansiToHtml(line.content)}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Terminal Footer - Status Bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-t border-zinc-700/50">
                <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${isRunning
                            ? 'text-blue-400'
                            : command.status === 'completed'
                                ? 'text-green-400'
                                : command.status === 'failed'
                                    ? 'text-red-400'
                                    : 'text-yellow-400'
                        }`}>
                        {getStatusText()}
                    </span>

                    {isRunning && (
                        <button
                            onClick={handleCancel}
                            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                            <ExternalLink size={12} />
                            <span>Relocate</span>
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {isRunning && (
                        <button
                            onClick={handleCancel}
                            className="px-3 py-1 text-xs text-zinc-300 hover:text-white hover:bg-zinc-700/50 rounded transition-colors"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
