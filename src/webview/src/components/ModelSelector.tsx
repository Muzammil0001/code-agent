import React from 'react';
import { ChevronDown } from 'lucide-react';
import { AVAILABLE_MODELS, getModelLabel } from '../config/models';

interface ModelSelectorProps {
    selectedModel: string;
    onModelSelect: (model: string) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onModelSelect }) => {
    const [showDropdown, setShowDropdown] = React.useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-3 py-2 bg-zinc-800/50 hover:bg-zinc-700/50 text-xs text-zinc-300 outline-none cursor-pointer rounded-lg border border-zinc-700/50 hover:border-zinc-600 transition-all duration-200 font-medium"
            >
                <span className="max-w-[120px] truncate">
                    {getModelLabel(selectedModel)}
                </span>
                <ChevronDown size={14} className={`transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showDropdown && (
                <div className="absolute bottom-full mb-2 left-0 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl z-50 min-w-[220px] backdrop-blur-xl">
                    {AVAILABLE_MODELS.map((model, index) => (
                        <button
                            key={model.value}
                            onClick={() => {
                                onModelSelect(model.value);
                                setShowDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-all duration-150 flex items-center justify-between ${selectedModel === model.value
                                    ? 'bg-blue-600 text-white'
                                    : 'text-zinc-300 hover:bg-zinc-800'
                                } ${index === 0 ? 'rounded-t-lg' : ''} ${index === AVAILABLE_MODELS.length - 1 ? 'rounded-b-lg' : ''}`}
                        >
                            <span>{model.label}</span>
                            {model.badge && (
                                <span className={`text-xs px-2 py-0.5 rounded ${selectedModel === model.value
                                        ? 'bg-white/20'
                                        : model.badge === 'Recommended'
                                            ? 'bg-blue-500/20 text-blue-400'
                                            : model.badge === 'Fast'
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'bg-purple-500/20 text-purple-400'
                                    }`}>
                                    {model.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};
