import React from 'react';
import { Paperclip, Image as ImageIcon } from 'lucide-react';

interface FileAttachmentButtonsProps {
    onFileClick: () => void;
    onImageClick: () => void;
}

export const FileAttachmentButtons: React.FC<FileAttachmentButtonsProps> = ({
    onFileClick,
    onImageClick
}) => {
    return (
        <div className="flex items-center gap-1">
            <button
                onClick={onFileClick}
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-all duration-200"
                title="Attach files"
            >
                <Paperclip size={18} />
            </button>

            <button
                onClick={onImageClick}
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-all duration-200"
                title="Attach images"
            >
                <ImageIcon size={18} />
            </button>
        </div>
    );
};
