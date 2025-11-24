import React, { useState } from 'react';
import { X, File } from 'lucide-react';

interface AttachedItem {
    id: string;
    name: string;
    type: 'file' | 'image';
    data?: string;
}

interface AttachedFilesProps {
    files: AttachedItem[];
    onRemove: (id: string) => void;
}

export const AttachedFiles: React.FC<AttachedFilesProps> = ({ files, onRemove }) => {
    const [expandedImage, setExpandedImage] = useState<string | null>(null);

    return (
        <div className="px-4 pt-4 pb-2 border-b border-zinc-800/50">
            <div className="space-y-3">
                {files.map((file) => (
                    <div key={file.id}>
                        {file.type === 'image' && file.data ? (
                            <div className="group flex items-start gap-3">
                                <div className="relative rounded-lg overflow-hidden border border-blue-500/30 bg-zinc-800 flex-shrink-0">
                                    <img
                                        src={file.data}
                                        alt={file.name}
                                        className="h-16 w-16 object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => setExpandedImage(expandedImage === file.id ? null : file.id)}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-zinc-300 truncate">{file.name}</p>
                                    <p className="text-xs text-zinc-500">Image attached</p>
                                </div>
                                <button
                                    onClick={() => onRemove(file.id)}
                                    className="flex-shrink-0 p-1.5 hover:bg-red-500/20 rounded-lg text-zinc-400 hover:text-red-400 transition-all duration-200 opacity-70 group-hover:opacity-100"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <div className="group flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-2 rounded-lg text-xs border border-blue-500/20 hover:border-blue-500/30 transition-all duration-200">
                                <File size={14} className="flex-shrink-0" />
                                <span className="font-medium max-w-[200px] truncate">{file.name}</span>
                                <button
                                    onClick={() => onRemove(file.id)}
                                    className="hover:text-red-400 transition-colors ml-1 opacity-70 group-hover:opacity-100 flex-shrink-0"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {expandedImage && (
                <div
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
                    onClick={() => setExpandedImage(null)}
                >
                    <div
                        className="relative max-w-4xl max-h-[80vh] rounded-2xl overflow-hidden border border-zinc-700 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {files.find(f => f.id === expandedImage)?.data && (
                            <img
                                src={files.find(f => f.id === expandedImage)!.data}
                                alt="Expanded view"
                                className="w-full h-full object-contain"
                            />
                        )}
                        <button
                            onClick={() => setExpandedImage(null)}
                            className="absolute top-4 right-4 p-2 bg-zinc-900/80 hover:bg-zinc-800 rounded-lg text-zinc-300 hover:text-white transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
