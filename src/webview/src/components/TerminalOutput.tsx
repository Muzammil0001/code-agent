/**
 * TerminalOutput Component
 * Displays terminal command output with ANSI color support
 */

import { useEffect, useRef, useState } from 'react';
import { Terminal, Square, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { ansiToHtml, stripAnsi } from '../utils/ansiToHtml';
import type { TerminalCommand } from '../hooks/useTerminal';

interface TerminalOutputProps {
    command: TerminalCommand;
    onStop?: (commandId: string) => void;
}

export function TerminalOutput({ command, onStop }: TerminalOutputProps) {
    const outputRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    const isRunning = command.status === 'running';

    // Auto-scroll to bottom when new output arrives
    useEffect(() => {
        if (outputRef.current && !collapsed) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [command.output, collapsed]);

    const handleCopy = () => {
        const plainText = command.output
            .map(line => stripAnsi(line.content))
            .join('\n');

        navigator.clipboard.writeText(plainText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleStop = () => {
        if (onStop && isRunning) {
            onStop(command.id);
        }
    };

    const getStatusColor = () => {
        switch (command.status) {
            case 'running':
                return 'text-blue-400';
            case 'completed':
                return 'text-green-400';
            case 'failed':
                return 'text-red-400';
            case 'stopped':
                return 'text-yellow-400';
            default:
                return 'text-gray-400';
        }
    };

    const getStatusText = () => {
        switch (command.status) {
            case 'running':
                return 'Running...';
            case 'completed':
                return `Completed (Exit Code: ${command.exitCode ?? 0})`;
            case 'failed':
                return `Failed (Exit Code: ${command.exitCode ?? 1})`;
            case 'stopped':
                return 'Stopped by user';
            case 'pending':
                return 'Pending...';
            default:
                return 'Unknown';
        }
    };

    const getDuration = () => {
        if (command.endTime) {
            return ((command.endTime - command.startTime) / 1000).toFixed(2) + 's';
        } else if (isRunning) {
            return 'Running';
        }
        return '';
    };

    return (
        <div className="terminal-output my-3 rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-800/50 border-b border-zinc-700">
                <div className="flex items-center gap-2">
                    <Terminal size={16} className="text-zinc-400" />
                    <code className="text-sm text-zinc-300 font-mono">
                        {command.command || 'Terminal Command'}
                    </code>
                </div>

                <div className="flex items-center gap-2">
                    {/* Status */}
                    <span className={`text-xs font-medium ${getStatusColor()}`}>
                        {getStatusText()}
                    </span>

                    {/* Duration */}
                    {getDuration() && (
                        <span className="text-xs text-zinc-500">
                            {getDuration()}
                        </span>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1 ml-2">
                        {isRunning && onStop && (
                            <button
                                onClick={handleStop}
                                className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
                                title="Stop Command"
                            >
                                <Square size={14} className="text-red-400" />
                            </button>
                        )}

                        <button
                            onClick={handleCopy}
                            className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
                            title="Copy Output"
                        >
                            {copied ? (
                                <Check size={14} className="text-green-400" />
                            ) : (
                                <Copy size={14} className="text-zinc-400" />
                            )}
                        </button>

                        <button
                            onClick={() => setCollapsed(!collapsed)}
                            className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
                            title={collapsed ? 'Expand' : 'Collapse'}
                        >
                            {collapsed ? (
                                <ChevronDown size={14} className="text-zinc-400" />
                            ) : (
                                <ChevronUp size={14} className="text-zinc-400" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Output Content */}
            {!collapsed && (
                <div
                    ref={outputRef}
                    className="terminal-content p-4 font-mono text-sm overflow-auto"
                    style={{ maxHeight: '400px' }}
                >
                    {command.output.length === 0 ? (
                        <div className="text-zinc-500 italic">
                            {isRunning ? 'Waiting for output...' : 'No output'}
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {command.output.map((line, index) => (
                                <div
                                    key={`${command.id}-line-${index}`}
                                    className={`terminal-line ${line.type === 'stderr' ? 'text-red-300' : 'text-zinc-300'
                                        }`}
                                >
                                    {ansiToHtml(line.content)}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Running indicator */}
                    {isRunning && (
                        <div className="flex items-center gap-2 mt-2 text-blue-400">
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                            <span className="text-xs">Running...</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
