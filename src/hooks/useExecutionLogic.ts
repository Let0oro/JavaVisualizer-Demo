import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { validateJavaSyntax } from "../lib";
import type { ExecutionStep } from "../types";
import { useChangedVariables } from "./useChangedVariables";
import { useChangedHeapIds } from "./useChangedHeapIds";

export function useExecutionLogic(defaultCode: string) {
  const [code, setCode] = useState<string>(defaultCode);
  const [executionTrace, setExecutionTrace] = useState<ExecutionStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [syntaxError, setSyntaxError] = useState<{ line: number; message: string } | null>(null);
  const [executionSpeed, setExecutionSpeed] = useState(300);
  const [visiblePanels, setVisiblePanels] = useState({
    variables: false, heap: false, callStack: false, console: true
  });
  const [notification, setNotification] = useState<{ message: string; type: "info" | "success" | "error" } | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setSyntaxError(validateJavaSyntax(code));
    }, 500);
    return () => clearTimeout(handler);
  }, [code]);

  const clearExecutionState = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setExecutionTrace([]); setCurrentStepIndex(0); setError(null);
  }, []);

  const handleExecute = useCallback(async () => {
    if (syntaxError) return;
    clearExecutionState();
    setIsLoading(true);
    try {
      const response = await fetch("/api/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const { trace } = await response.json();
      if (trace.length === 0 && code.trim().length > 0) {
        setError("Execution produced no steps. The code might be empty, have nothing to visualize, or contain unsupported syntax.");
        setIsLoading(false); return;
      }
      setExecutionTrace(trace);
      setIsRunning(true);
    } catch (e) {
      setError(e instanceof Error ? `${e.message}` : 'Unknown error during execution.');
      setExecutionTrace([]);
    } finally {
      setIsLoading(false);
    }
  }, [code, syntaxError, clearExecutionState]);

  const isExecutionFinished = currentStepIndex === executionTrace.length - 1 && executionTrace.length > 0;

  const handleResume = () => { if (!isExecutionFinished) setIsRunning(true); };
  const handlePause = () => { setIsRunning(false); };
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
  const handleReset = () => { clearExecutionState(); };

  useEffect(() => {
    if (isRunning && executionTrace.length > 0) {
      intervalRef.current = window.setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev < executionTrace.length - 1) { return prev + 1; }
          setIsRunning(false);
          if (intervalRef.current) clearInterval(intervalRef.current);
          return prev;
        });
      }, executionSpeed);
    } else {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, executionTrace.length, executionSpeed]);

  const consoleOutput = useMemo(() => {
    if (!executionTrace || executionTrace.length === 0) return '';
    return executionTrace
      .slice(0, currentStepIndex + 1)
      .filter(step => step.consoleOutput)
      .map(step => step.consoleOutput as string)
      .join('');
  }, [executionTrace, currentStepIndex]);

  // ------------------------
  // changedVariables logic
  // ------------------------
  const currentStep = executionTrace[currentStepIndex] ?? undefined;
  const prevStep = currentStepIndex > 0 ? executionTrace[currentStepIndex - 1] : undefined;

  const changedVariables = useChangedVariables(currentStep, prevStep);

  // ------------------------
  // changedHeapIds logic
  // ------------------------
  const changedHeapIds = useChangedHeapIds(currentStep, prevStep);

  const handleTogglePanel = useCallback((panel: keyof typeof visiblePanels) => {
    setVisiblePanels(prev => ({ ...prev, [panel]: !prev[panel] }));
  }, []);

  return {
    code, setCode,
    executionTrace, currentStepIndex, setCurrentStepIndex,
    isRunning, setIsRunning,
    isLoading, error, syntaxError,
    executionSpeed, setExecutionSpeed,
    visiblePanels, setVisiblePanels,
    notification, setNotification,
    handleExecute, handlePause, handleResume, handleNextStep, handlePrevStep, handleReset,
    handleTogglePanel,  // ← AGREGAR ESTA LÍNEA
    isExecutionStarted: executionTrace.length > 0,
    isExecutionFinished,
    consoleOutput,
    currentStep,
    prevStep,
    changedVariables,
    changedHeapIds,
  };
}
