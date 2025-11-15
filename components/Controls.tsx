
import React from 'react';

interface ControlsProps {
  onExecute: () => void;
  onPause: () => void;
  onResume: () => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onReset: () => void;
  isRunning: boolean;
  isLoading: boolean;
  isExecutionStarted: boolean;
  isExecutionFinished: boolean;
  currentStepIndex: number;
  hasSyntaxError: boolean;
  speed: number;
  onSpeedChange: (speed: number) => void;
}

const Button: React.FC<React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement>>> = ({ children, ...props }) => (
  <button
    {...props}
    className="flex items-center justify-center gap-2 px-4 py-2 rounded-md font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {children}
  </button>
);

export const Controls: React.FC<ControlsProps> = ({
  onExecute,
  onPause,
  onResume,
  onNextStep,
  onPrevStep,
  onReset,
  isRunning,
  isLoading,
  isExecutionStarted,
  isExecutionFinished,
  currentStepIndex,
  hasSyntaxError,
  speed,
  onSpeedChange
}) => {
  const PlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
    </svg>
  );

  const PauseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
    </svg>
  );

  const PrevIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M8.447 4.818A1 1 0 007 5.5v9a1 1 0 001.555.832l6-4.5a1 1 0 000-1.664l-6-4.5z" transform="matrix(-1 0 0 1 21 0)" />
      <path d="M4 5h1v10H4a1 1 0 01-1-1V6a1 1 0 011-1z" />
    </svg>
  );
  
  const NextIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path d="M11.553 4.818A1 1 0 0113 5.5v9a1 1 0 01-1.555.832l-6-4.5a1 1 0 010-1.664l6-4.5z" />
      <path d="M16 5h-1v10h1a1 1 0 001-1V6a1 1 0 00-1-1z" />
    </svg>
  );

  const ResetIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
    </svg>
  );

  const SpinnerIcon = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
  
  return (
    <div className="bg-gray-800 rounded-lg p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-magenta-500">Controls</h2>
        <div className="flex gap-2">
          {isLoading ? (
              <Button disabled className="bg-yellow-500 text-gray-900 w-36">
                  <SpinnerIcon /> Executing...
              </Button>
          ) : !isExecutionStarted ? (
            <Button 
              onClick={onExecute} 
              className="bg-green-500 text-gray-900 hover:bg-green-400 focus:ring-green-500 w-36"
              disabled={hasSyntaxError}
              title={hasSyntaxError ? 'Cannot run code with syntax errors' : 'Run code'}
            >
              <PlayIcon /> Run
            </Button>
          ) : isRunning ? (
            <Button onClick={onPause} className="bg-yellow-500 text-gray-900 hover:bg-yellow-400 focus:ring-yellow-500 w-36">
              <PauseIcon /> Pause
            </Button>
          ) : (
            <Button onClick={onResume} disabled={isExecutionFinished} className="bg-green-500 text-gray-900 hover:bg-green-400 focus:ring-green-500 w-36">
              <PlayIcon /> Resume
            </Button>
          )}
          <Button onClick={onPrevStep} disabled={!isExecutionStarted || isRunning || currentStepIndex === 0 || isLoading} className="bg-blue-500 text-gray-900 hover:bg-blue-400 focus:ring-blue-500">
            <PrevIcon /> Prev
          </Button>
          <Button onClick={onNextStep} disabled={!isExecutionStarted || isRunning || isExecutionFinished || isLoading} className="bg-blue-500 text-gray-900 hover:bg-blue-400 focus:ring-blue-500">
            <NextIcon /> Next
          </Button>
          <Button onClick={onReset} disabled={!isExecutionStarted || isLoading} className="bg-red-500 text-gray-900 hover:bg-red-400 focus:ring-red-500">
            <ResetIcon /> Reset
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <label htmlFor="speed-slider" className="font-semibold text-sm text-gray-400 whitespace-nowrap">Execution Delay</label>
        <input 
            id="speed-slider"
            type="range"
            min="50"
            max="1500"
            step="50"
            value={speed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            disabled={isLoading}
        />
        <span className="text-sm font-mono text-cyan-500 w-20 text-center">{speed} ms</span>
      </div>
    </div>
  );
};
