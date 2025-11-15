import React from 'react';

interface TooltipProps {
  content: string;
  x: number;
  y: number;
  visible: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, x, y, visible }) => {
  if (!visible) return null;

  return (
    <div
      className="fixed z-50 p-2 text-xs text-white bg-gray-700 rounded-md shadow-lg pointer-events-none max-w-xs"
      style={{
        left: `${x + 15}px`, // Offset from cursor
        top: `${y + 15}px`,
      }}
    >
      {content}
    </div>
  );
};
