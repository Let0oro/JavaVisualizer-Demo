
import React from 'react';
import type { StackFrameInfo } from '../types';

interface CallStackPanelProps {
  callStack: StackFrameInfo[];
}

export const CallStackPanel: React.FC<CallStackPanelProps> = ({ callStack }) => {
  return (
    <div className="bg-gray-800 rounded-lg p-4 flex-1 basis-[45%] min-w-[300px] flex flex-col min-h-[150px]">
      <h2 className="text-lg font-semibold mb-2 text-magenta-500">Call Stack</h2>
      <div className="bg-gray-900 p-2 rounded-md flex-grow font-mono text-sm overflow-y-auto">
        {callStack.length === 0 ? (
          <p className="text-gray-500 italic">Stack is empty.</p>
        ) : (
          <div className="space-y-1">
            {callStack.slice().reverse().map((frame, index) => (
              <div key={index} className="flex justify-between items-center p-1 bg-gray-800/50 rounded">
                <span className="text-cyan-500">{frame.methodName}</span>
                <span className="text-yellow-500">line {frame.line}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
