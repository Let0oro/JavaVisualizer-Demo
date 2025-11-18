import React, { useEffect, useRef } from 'react';

interface ConsolePanelProps {
  output: string[];
}

export const ConsolePanel: React.FC<ConsolePanelProps> = ({ output }) => {
  const endOfConsoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfConsoleRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output]);

  return (
    <div className="panel-card">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Console
          </h3>
          <span className="text-xs text-gray-400 font-mono">
            {output.length} {output.length === 1 ? 'line' : 'lines'}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="panel-body">
        {output.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>Esperando salida del programa...</p>
          </div>
        ) : (
          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50 font-mono text-sm">
            <div className="space-y-1">
              {output.map((line, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 py-1 hover:bg-gray-800/30 rounded px-2 -mx-2 transition-colors"
                >
                  <span className="text-gray-600 text-xs select-none min-w-6 text-right shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-green-400 flex-1 break-all whitespace-pre">
                    {line}
                  </span>
                </div>
              ))}
            </div>
            <div ref={endOfConsoleRef} />
          </div>
        )}
      </div>
    </div>
  );
};
