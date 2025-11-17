
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CodeEditor, CstmNotification, CallStackPanel, ConsolePanel,
  HeapPanel, VariablesPanel, Controls, WindowVisibilityControl } from '@/components';
import "./index.css";
// import { validateJavaSyntax } from './lib';
import type { ExecutionStep } from './types';
import { useExecutionLogic } from './hooks/useExecutionLogic';

const defaultCode = `class Main {
  static void main() {
    // Test 1: String concatenation
    String salida = "";
    salida += "*";
    salida += " ";
    System.out.println(salida);  // Debería imprimir "* "

    // Test 2: Numeric operations
    int x = 5;
    x += 3;   // x = 8
    x -= 2;   // x = 6
    x *= 2;   // x = 12
    x /= 3;   // x = 4
    System.out.println(x);  // Debería imprimir 4
  }
}
`;

export const App: React.FC = () => {

  const exec = useExecutionLogic(defaultCode);


  return (
    <div className="min-h-screen bg-gray-900 text-gray-300 p-4 flex flex-col w-full">
      <header className="mb-4">
        <h1 className="text-3xl font-bold text-cyan-500">JavaVis</h1>
        <p className="text-gray-400">An Interactive Java Execution Visualizer</p>
      </header>
      <main className="grow grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col gap-4">
          <Controls
            onExecute={exec.handleExecute}
            onPause={exec.handlePause}
            onResume={exec.handleResume}
            onPrevStep={exec.handlePrevStep}
            onNextStep={exec.handleNextStep}
            onReset={exec.handleReset}
            isRunning={exec.isRunning}
            isLoading={exec.isLoading}
            isExecutionStarted={exec.executionTrace.length > 0}
            isExecutionFinished={exec.isExecutionFinished}
            currentStepIndex={exec.currentStepIndex}
            hasSyntaxError={!!exec.syntaxError}
            speed={exec.executionSpeed}
            onSpeedChange={exec.setExecutionSpeed}
          />
          <CodeEditor
            code={exec.code}
            onCodeChange={exec.setCode}
            currentStep={exec.currentStep}
            disabled={exec.executionTrace.length > 0 || exec.isLoading}
            syntaxError={exec.syntaxError}
            setNotification={exec.setNotification}
          />
        </div>
        <div className="flex flex-col gap-4">
           <WindowVisibilityControl
            visiblePanels={exec.visiblePanels}
            onVisibilityChange={exec.setVisiblePanels}
          />
          <div className="flex flex-wrap gap-4 grow">
            {exec.visiblePanels.variables && <VariablesPanel
              variables={exec.currentStep?.variables || {}}
              heap={exec.currentStep?.heap || {}}
              changedVariables={exec.changedVariables}
            />}
            {exec.visiblePanels.heap && <HeapPanel
              heap={exec.currentStep?.heap || {}}
              changedHeapIds={exec.changedHeapIds}
            />}
            {exec.visiblePanels.callStack && <CallStackPanel callStack={exec.currentStep?.callStack || []} />}
            {exec.visiblePanels.console && <ConsolePanel output={exec.consoleOutput} error={exec.error} isLoading={exec.isLoading}/>}
          </div>
        </div>
      </main>
      {exec.notification && (
         <CstmNotification
          message={exec.notification.message}
          type={exec.notification.type}
          onClose={() => exec.setNotification(null)}
        />
      )}
    </div>
  );
};
