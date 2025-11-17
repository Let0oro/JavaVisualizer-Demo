
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CodeEditor, CstmNotification, CallStackPanel, ConsolePanel,
  HeapPanel, VariablesPanel, Controls, WindowVisibilityControl } from '@/components';
import "./index.css";
// import { validateJavaSyntax } from './lib';
import type { ExecutionStep } from './types';
import { useExecutionLogic } from './hooks/useExecutionLogic';

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
