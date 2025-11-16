
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CallStackPanel } from './components/CallStackPanel';
import { CodeEditor } from './components/CodeEditor';
import { ConsolePanel } from './components/ConsolePanel';
import { Controls } from './components/Controls';
import { HeapPanel } from './components/HeapPanel';
import { VariablesPanel } from './components/VariablesPanel';
import { WindowVisibilityControl } from './components/WindowVisibilityControl';
import "./index.css";
import { validateJavaSyntax } from './lib/javaInterpreter';
import type { ExecutionStep } from './types';
import { CstmNotification } from './components/Notification';

const defaultCode = `class Main {
    public static void main() {

        System.out.println("Escribe las filas y las columnas");
        int alto = 5;
        int ancho = 5;

        int medio = alto/2;
        System.out.println("Cálculo de la mitad de medida: " + medio);
        for (int i = -1; i < alto; i++) {
            if (i == -1) {
                System.out.print("     ");
                for (int j = 0; j < ancho; j++) {
                    System.out.print(j + " ");
                }
                System.out.print("\n"); // Índice de cada columna
                continue; // saltamos a la siguiente para que no se confundan los índices
            }

            System.out.printf("%d -> ", i); // Índice de cada fila

            for (int j = 0; j < ancho; j++) {
                if (i == medio || j == medio) System.out.print("* "); // alto = medida
                else System.out.print(". ");
            }

            System.out.print("\n"); // Salto de linea al final de cada línea
        }
    }
}`;

export const App: React.FC = () => {
  const [code, setCode] = useState<string>(defaultCode);
  const [executionTrace, setExecutionTrace] = useState<ExecutionStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [syntaxError, setSyntaxError] = useState<{ line: number; message: string } | null>(null);
  const [executionSpeed, setExecutionSpeed] = useState(300); // Delay in ms
  const [visiblePanels, setVisiblePanels] = useState({
    variables: false,
    heap: false,
    callStack: false,
    console: true,
  });
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

  const intervalRef = useRef<number | null>(null);

  // Debounced syntax validation
  useEffect(() => {
    const handler = setTimeout(() => {
      const errorResult = validateJavaSyntax(code);
      setSyntaxError(errorResult);
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(handler);
    };
  }, [code]);

  const clearExecutionState = () => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setExecutionTrace([]);
    setCurrentStepIndex(0);
    setError(null);
  };

  const handleExecute = useCallback(async () => {
    if (syntaxError) return;
    clearExecutionState();
    setIsLoading(true);
    try {
      const response = await fetch("/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const { trace } = await response.json();
      if (trace.length === 0 && code.trim().length > 0) {
          setError("Execution produced no steps. The code might be empty, have nothing to visualize, or contain unsupported syntax.");
          setIsLoading(false);
          return;
      }
      setExecutionTrace(trace);
      setIsRunning(true);
    } catch (e) {
      console.error("JavaVis Execution Error:", e);
      if (e instanceof Error) {
        setError(`${e.message}`);
      } else {
        setError('An unknown error occurred during execution.');
      }
      setExecutionTrace([]);
    } finally {
        setIsLoading(false);
    }
  }, [code, syntaxError]);

  const isExecutionFinished = currentStepIndex === executionTrace.length - 1 && executionTrace.length > 0;

  const handleResume = () => {
    if (!isExecutionFinished) {
      setIsRunning(true);
    }
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleNextStep = useCallback(() => {
    setIsRunning(false);
    if (currentStepIndex < executionTrace.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    }
  }, [currentStepIndex, executionTrace.length]);

  const handlePrevStep = useCallback(() => {
    setIsRunning(false);
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  }, [currentStepIndex]);

  const handleReset = () => {
    clearExecutionState();
  };

  useEffect(() => {
    if (isRunning && executionTrace.length > 0) {
      intervalRef.current = window.setInterval(() => {
        if (currentStepIndex < executionTrace.length - 1) {
          setCurrentStepIndex(currentStepIndex + 1);
        } else {
          setIsRunning(false);
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      }, executionSpeed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, executionTrace.length, executionSpeed]);

  const consoleOutput = useMemo(() => {
    if (!executionTrace || executionTrace.length === 0) return '';
    // Slice to include the current step, then filter and map.
    return executionTrace
      .slice(0, currentStepIndex + 1)
      .filter(step => step.consoleOutput)
      .map(step => step.consoleOutput as string)
      .join('');
  }, [executionTrace, currentStepIndex]);

  const currentStep = executionTrace[currentStepIndex];
  const prevStep = currentStepIndex > 0 ? executionTrace[currentStepIndex - 1] : null;

  const changedVariables = useMemo(() => {
    const changed = new Set<string>();
    if (!currentStep) return changed;

    if (!prevStep) {
      Object.keys(currentStep.variables).forEach(key => changed.add(key));
      return changed;
    }

    const currentVars = currentStep.variables;
    const prevVars = prevStep.variables;
    const currentHeap = currentStep.heap;
    const prevHeap = prevStep.heap;

    for (const key in currentVars) {
      const currentValJson = JSON.stringify(currentVars[key]);
      const prevValJson = JSON.stringify(prevVars[key]);

      if (!Object.prototype.hasOwnProperty.call(prevVars, key) || currentValJson !== prevValJson) {
        changed.add(key);
      }
    }

    for (const key in currentVars) {
      const val = currentVars[key];
      if (val && val.__ref__) {
        const refId = val.__ref__;
        if (!prevHeap[refId] || JSON.stringify(currentHeap[refId]) !== JSON.stringify(prevHeap[refId])) {
          changed.add(key);
        }
      }
    }

    return changed;
  }, [currentStep, prevStep]);

  const changedHeapIds = useMemo(() => {
    const changed = new Set<string>();
    if (!currentStep) return changed;
    const currentHeap = currentStep.heap;

    if (!prevStep) {
      Object.keys(currentHeap).forEach(id => changed.add(id));
      return changed;
    }

    const prevHeap = prevStep.heap;

    for (const id in currentHeap) {
      if (!prevHeap[id] || JSON.stringify(currentHeap[id]) !== JSON.stringify(prevHeap[id])) {
        changed.add(id);
      }
    }
    return changed;
  }, [currentStep, prevStep]);


  return (
    <div className="min-h-screen bg-gray-900 text-gray-300 p-4 flex flex-col w-full">
      <header className="mb-4">
        <h1 className="text-3xl font-bold text-cyan-500">JavaVis</h1>
        <p className="text-gray-400">An Interactive Java Execution Visualizer</p>
      </header>
      <main className="grow grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col gap-4">
          <Controls
            onExecute={handleExecute}
            onPause={handlePause}
            onResume={handleResume}
            onPrevStep={handlePrevStep}
            onNextStep={handleNextStep}
            onReset={handleReset}
            isRunning={isRunning}
            isLoading={isLoading}
            isExecutionStarted={executionTrace.length > 0}
            isExecutionFinished={isExecutionFinished}
            currentStepIndex={currentStepIndex}
            hasSyntaxError={!!syntaxError}
            speed={executionSpeed}
            onSpeedChange={setExecutionSpeed}
          />
          <CodeEditor
            code={code}
            onCodeChange={setCode}
            currentStep={currentStep}
            disabled={executionTrace.length > 0 || isLoading}
            syntaxError={syntaxError}
            setNotification={setNotification}
          />
        </div>
        <div className="flex flex-col gap-4">
           <WindowVisibilityControl
            visiblePanels={visiblePanels}
            onVisibilityChange={setVisiblePanels}
          />
          <div className="flex flex-wrap gap-4 grow">
            {visiblePanels.variables && <VariablesPanel
              variables={currentStep?.variables || {}}
              heap={currentStep?.heap || {}}
              changedVariables={changedVariables}
            />}
            {visiblePanels.heap && <HeapPanel
              heap={currentStep?.heap || {}}
              changedHeapIds={changedHeapIds}
            />}
            {visiblePanels.callStack && <CallStackPanel callStack={currentStep?.callStack || []} />}
            {visiblePanels.console && <ConsolePanel output={consoleOutput} error={error} isLoading={isLoading}/>}
          </div>
        </div>
      </main>
      {notification && (
         <CstmNotification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
};
