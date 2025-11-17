
import React, { useEffect, useRef } from 'react';

interface ConsolePanelProps {
  output: string;
  error: string | null;
  isLoading: boolean;
}

export const ConsolePanel: React.FC<ConsolePanelProps> = ({ output, error, isLoading }) => {
  const endOfConsoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfConsoleRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output, error, isLoading]);

  return (
    <div className="bg-gray-800 rounded-lg p-4 flex-1 basis-[45%] min-w-[300px] flex flex-col min-h-[150px]">
      <h2 className="text-lg font-semibold mb-2 text-magenta-500">Console</h2>
      <div className="bg-gray-900 p-2 rounded-md grow font-mono text-sm overflow-y-auto">
        {isLoading && !output && !error && (
          <div className="text-yellow-500">
            <p>&gt; Connecting to secure execution sandbox...</p>
            <p>&gt; This may take a moment as the environment is prepared.</p>
          </div>
        )}
        {output && <div className="whitespace-pre-wrap">{output}</div>}
        {error && <div className="text-red-500 whitespace-pre-wrap">{`! Error: ${error}`}</div>}
        <div ref={endOfConsoleRef} />
      </div>
    </div>
  );
};
