import React from 'react';
import { Send, Square } from 'lucide-react';

interface SendStopButtonProps {
    isLoading: boolean;
    disabled: boolean;
    onSend: () => void;
    onStop: () => void;
}

export const SendStopButton: React.FC<SendStopButtonProps> = ({
    isLoading,
    disabled,
    onSend,
    onStop
}) => {
    return (
        <button
            onClick={isLoading ? onStop : onSend}
            disabled={!isLoading && disabled}
            className={`group relative p-3 rounded-full font-medium text-sm transition-all duration-200 ${isLoading
                ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/40 hover:scale-105'
                : disabled
                    ? 'bg-zinc-800 cursor-not-allowed opacity-40 text-zinc-500'
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 hover:scale-105'
                }`}
        >
            <span className="flex items-center justify-center">
                {isLoading ? (
                    <>
                        <Square size={16} className="fill-current" />
                    </>
                ) : (
                    <>
                        <Send size={16} />
                    </>
                )}
            </span>
        </button>
    );
};
