import React from 'react';
import { Loader2, Brain, FileText, Zap, Cog } from 'lucide-react';

interface StatusIndicatorProps {
    status: 'idle' | 'thinking' | 'planning' | 'running' | 'executing';
}

const statusConfig = {
    idle: { text: '', icon: null },
    thinking: { text: 'Thinking', icon: Brain },
    planning: { text: 'Planning', icon: FileText },
    running: { text: 'Running', icon: Zap },
    executing: { text: 'Executing', icon: Cog }
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
    if (status === 'idle') return null;

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
        <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900/60 border border-zinc-800/50 rounded-xl backdrop-blur-sm animate-pulse">
            <div className="relative">
                <div className="absolute inset-0 bg-blue-500 blur-lg opacity-30 animate-pulse" />
                <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    {Icon && <Icon size={16} className="text-white" />}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-300">{config.text}...</span>
                <Loader2 size={14} className="text-blue-400 animate-spin" />
            </div>
        </div>
    );
};
