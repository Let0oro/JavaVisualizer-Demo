import React, { useState } from 'react';
import type { JavaFile } from '@/hooks/useFileManager';

interface FileTabsProps {
  files: JavaFile[];
  activeFileId: string;
  onSelectFile: (id: string) => void;
  onCloseFile: (id: string) => void;
  onAddFile: () => void;
  onRenameFile: (id: string, newName: string) => void;
  onSetMainFile: (id: string) => void;
}

export const FileTabs: React.FC<FileTabsProps> = ({
  files,
  activeFileId,
  onSelectFile,
  onCloseFile,
  onAddFile,
  onRenameFile,
  onSetMainFile,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleStartEdit = (file: JavaFile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(file.id);
    setEditName(file.name.replace('.java', ''));
  };

  const handleFinishEdit = (id: string) => {
    if (editName.trim()) {
      onRenameFile(id, editName.trim());
    }
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      handleFinishEdit(id);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-gray-800/60 border-b border-gray-700/50 overflow-x-auto">
      {files.map((file) => {
        const isActive = file.id === activeFileId;
        const isEditing = editingId === file.id;

        return (
          <div
            key={file.id}
            onClick={() => !isEditing && onSelectFile(file.id)}
            className={`
              group relative flex items-center gap-2 px-3 py-1.5 rounded-t-lg cursor-pointer transition-all duration-200 min-w-[120px] max-w-[200px]
              ${isActive
                ? 'bg-gray-900 text-gray-200 shadow-lg'
                : 'bg-gray-800/40 text-gray-400 hover:bg-gray-800/80 hover:text-gray-300'
              }
            `}
          >
            {/* Main indicator */}
            {file.isMain && (
              <svg className="w-3 h-3 text-green-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}

            {/* File name (editable) */}
            {isEditing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => handleFinishEdit(file.id)}
                onKeyDown={(e) => handleKeyDown(e, file.id)}
                className="flex-1 bg-gray-700 text-gray-200 text-xs px-1 py-0.5 rounded outline-none border border-blue-400 font-mono"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className="flex-1 text-xs font-mono truncate"
                onDoubleClick={(e) => handleStartEdit(file, e)}
              >
                {file.name}
              </span>
            )}

            {/* Actions (visible on hover) */}
            {!isEditing && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Set as main */}
                {!file.isMain && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetMainFile(file.id);
                    }}
                    className="p-0.5 hover:bg-green-500/20 rounded transition-colors"
                    title="Set as main file"
                  >
                    <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                )}

                {/* Close tab */}
                {files.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseFile(file.id);
                    }}
                    className="p-0.5 hover:bg-red-500/20 rounded transition-colors"
                    title="Close file"
                  >
                    <svg className="w-3 h-3 text-gray-400 hover:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Add new file button */}
      <button
        onClick={onAddFile}
        className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800/60 rounded transition-all duration-200 shrink-0"
        title="New file"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
};