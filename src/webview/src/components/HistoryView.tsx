import React from 'react';
import { X, MessageSquare, Trash2, Clock } from 'lucide-react';

export interface ChatSession {
    id: string;
    title: string;
    timestamp: number;
    preview: string;
}

interface HistoryViewProps {
    sessions: ChatSession[];
    onSelectSession: (id: string) => void;
    onDeleteSession: (id: string) => void;
    onClose: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
    sessions,
    onSelectSession,
    onDeleteSession,
    onClose
}) => {
    return (
        <div className="absolute inset-0 z-50 bg-zinc-950/95 backdrop-blur-sm flex flex-col animate-fade-in">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                <div className="flex items-center gap-2 text-zinc-100">
                    <Clock size={20} className="text-blue-500" />
                    <h2 className="text-lg font-semibold">Chat History</h2>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {sessions.length === 0 ? (
                    <div className="text-center text-zinc-500 mt-10">
                        <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No chat history found</p>
                    </div>
                ) : (
                    sessions.map(session => (
                        <div
                            key={session.id}
                            className="group relative bg-zinc-900/50 border border-zinc-800/50 hover:border-blue-500/30 hover:bg-zinc-900 rounded-xl p-4 transition-all cursor-pointer"
                            onClick={() => onSelectSession(session.id)}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-medium text-zinc-200 line-clamp-1 pr-8">
                                    {session.title || 'Untitled Chat'}
                                </h3>
                                <span className="text-xs text-zinc-500 whitespace-nowrap">
                                    {new Date(session.timestamp).toLocaleDateString()}
                                </span>
                            </div>
                            <p className="text-sm text-zinc-400 line-clamp-2 mb-2">
                                {session.preview}
                            </p>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteSession(session.id);
                                }}
                                className="absolute bottom-3 right-3 p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                title="Delete chat"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
