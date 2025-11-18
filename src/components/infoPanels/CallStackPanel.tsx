import type { StackFrameInfo } from '@/types';
import React from 'react';

interface CallStackPanelProps {
  callStack: StackFrameInfo[];
}

export const CallStackPanel: React.FC<CallStackPanelProps> = ({ callStack }) => {
  return (
    <div className="panel-card">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Call Stack
          </h3>
          <span className="text-xs text-gray-400 font-mono">
            {callStack.length} {callStack.length === 1 ? 'frame' : 'frames'}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="panel-body">
        {callStack.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            <p>El stack está vacío</p>
          </div>
        ) : (
          <div className="space-y-2">
            {callStack.slice().reverse().map((frame, index) => {
              const isTop = index === 0;

              return (
                <div
                  key={index}
                  className={`
                    p-3 rounded-lg
                    ${isTop
                      ? 'bg-blue-500/10 border-2 border-blue-500/50'
                      : 'bg-gray-800/40 border border-gray-700/50'
                    }
                    transition-all duration-200
                  `}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className={`
                        text-xs font-mono px-2 py-0.5 rounded
                        ${isTop
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-gray-700/50 text-gray-400 border border-gray-600/50'
                        }
                      `}>
                        #{callStack.length - index}
                      </span>
                      <span className="text-sm font-mono text-gray-200 font-medium truncate">
                        {frame.methodName}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-gray-500 flex items-center gap-1 shrink-0">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                      </svg>
                      {frame.line}
                    </span>
                  </div>
                  {isTop && (
                    <div className="mt-2 pt-2 border-t border-blue-500/20">
                      <span className="text-xs text-blue-400 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                        </svg>
                        Ejecutando ahora
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
