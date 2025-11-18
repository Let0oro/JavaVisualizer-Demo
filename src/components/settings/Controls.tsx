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

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' }> = ({
  children,
  variant = 'secondary',
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900';

  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-500/30 focus:ring-blue-500',
    secondary: 'bg-gray-700/80 hover:bg-gray-600/80 text-gray-200 border border-gray-600/50 focus:ring-gray-500',
    ghost: 'bg-transparent hover:bg-gray-700/50 text-gray-300 focus:ring-gray-500',
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

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
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
    </svg>
  );

  const PauseIcon = () => (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  );

  const PrevIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );

  const NextIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );

  const ResetIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );

  const SpinnerIcon = () => (
    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 shadow-xl backdrop-blur-sm">
      <div className="flex flex-col gap-4">
        {/* Main Controls */}
        <div className="flex items-center gap-3">
          {/* Play/Pause/Resume Button */}
          {isLoading ? (
            <Button variant="primary" disabled className="flex-1">
              <SpinnerIcon />
              <span>Ejecutando...</span>
            </Button>
          ) : !isExecutionStarted ? (
            <Button
              variant="primary"
              onClick={onExecute}
              disabled={hasSyntaxError}
              className="flex-1"
            >
              <PlayIcon />
              <span>Ejecutar</span>
            </Button>
          ) : isRunning ? (
            <Button variant="secondary" onClick={onPause} className="flex-1">
              <PauseIcon />
              <span>Pausar</span>
            </Button>
          ) : (
            <Button variant="primary" onClick={onResume} disabled={isExecutionFinished} className="flex-1">
              <PlayIcon />
              <span>Continuar</span>
            </Button>
          )}

          {/* Step Controls */}
          <Button
            variant="ghost"
            onClick={onPrevStep}
            disabled={!isExecutionStarted || currentStepIndex === 0 || isRunning}
            title="Paso anterior"
          >
            <PrevIcon />
          </Button>

          <Button
            variant="ghost"
            onClick={onNextStep}
            disabled={!isExecutionStarted || isExecutionFinished || isRunning}
            title="Paso siguiente"
          >
            <NextIcon />
          </Button>

          {/* Reset Button */}
          <Button
            variant="secondary"
            onClick={onReset}
            disabled={!isExecutionStarted}
            title="Reiniciar"
          >
            <ResetIcon />
            <span className="hidden sm:inline">Reiniciar</span>
          </Button>
        </div>

        {/* Speed Control */}
        <div className="flex items-center gap-4 pt-2 border-t border-gray-700/50">
          <div className="flex items-center gap-2 shrink-0">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-gray-300">Velocidad</span>
          </div>

          <div className="flex-1 relative">
            <input
              type="range"
              min="0"
              max="2000"
              step="100"
              value={speed}
              onChange={(e) => onSpeedChange(Number(e.target.value))}
              disabled={isLoading}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(to right, rgb(6 182 212) 0%, rgb(6 182 212) ${(speed / 2000) * 100}%, rgb(55 65 81) ${(speed / 2000) * 100}%, rgb(55 65 81) 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Rápido</span>
              <span>Lento</span>
            </div>
          </div>

          <div className="shrink-0 min-w-[60px] text-right">
            <span className="text-sm font-mono text-cyan-400">{speed}ms</span>
          </div>
        </div>

        {/* Error Warning */}
        {hasSyntaxError && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>Corrige los errores de sintaxis antes de ejecutar</span>
          </div>
        )}
      </div>
    </div>
  );
};
