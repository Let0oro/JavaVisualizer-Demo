import React, { useState } from 'react';
import {
  CodeEditor,
  CstmNotification,
  CallStackPanel,
  ConsolePanel,
  HeapPanel,
  VariablesPanel,
  Controls,
  WindowVisibilityControl
} from '@/components';
import "./index.css";
import type { ExecutionStep } from './types';
import { useExecutionLogic } from './hooks/useExecutionLogic';

const defaultCode = `class Main {
  static void main() {
    int alto = 5;
    int ancho = 5;

    String salida = "";

    for (int i = 0; i < alto; i++) {
      salida = "";
      for (int j = 0; j < ancho; j++) {
        if (j == i || j == (ancho-1-i)) {
          salida += "*";
        }
        else {
          salida += " ";
        }
      }
      System.out.println(salida);
    }
  }
}`;

export const App: React.FC = () => {
  const exec = useExecutionLogic(defaultCode);

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-700/50 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-linear-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    JavaVis
                  </h1>
                  <p className="text-xs text-gray-400">Visualizador de código Java</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-400">
                Paso <span className="font-mono text-cyan-400">{exec.currentStepIndex + 1}</span> / <span className="font-mono">{exec.executionTrace.length || 1}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
          {/* Left Panel - Code Editor */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="flex-1 min-h-0">
              <CodeEditor
                code={exec.code}
                onCodeChange={exec.setCode}
                currentStep={exec.currentStep}
                disabled={exec.isExecutionStarted}
                syntaxError={exec.syntaxError}
                setNotification={exec.setNotification}
              />
            </div>

            {/* Controls */}
            <div className="shrink-0">
              <Controls
                onExecute={exec.handleExecute}
                onPause={exec.handlePause}
                onResume={exec.handleResume}
                onNextStep={exec.handleNextStep}
                onPrevStep={exec.handlePrevStep}
                onReset={exec.handleReset}
                isRunning={exec.isRunning}
                isLoading={exec.isLoading}
                isExecutionStarted={exec.isExecutionStarted}
                isExecutionFinished={exec.isExecutionFinished}
                currentStepIndex={exec.currentStepIndex}
                hasSyntaxError={!!exec.syntaxError}
                speed={exec.executionSpeed}
                onSpeedChange={exec.setExecutionSpeed}
              />
            </div>
          </div>

          {/* Right Panel - Visualization */}
          <div className="lg:col-span-1 flex flex-col gap-4 min-h-0">
            {/* Panel Visibility Controls */}
            <div className="shrink-0">
              <WindowVisibilityControl
                visiblePanels={exec.visiblePanels}
                onTogglePanel={exec.handleTogglePanel}
              />
            </div>

            {/* Scrollable Panels Container */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 min-h-0 custom-scrollbar">
              {exec.visiblePanels.variables && (
                <div className="animate-fadeIn">
                  <VariablesPanel
                    variables={exec.currentStep?.variables || {}}
                    changedVariableIds={exec.changedVariables}
                  />
                </div>
              )}

              {exec.visiblePanels.heap && (
                <div className="animate-fadeIn">
                  <HeapPanel
                    heap={exec.currentStep?.heap || {}}
                    changedHeapIds={exec.changedHeapIds}
                  />
                </div>
              )}

              {exec.visiblePanels.callStack && (
                <div className="animate-fadeIn">
                  <CallStackPanel callStack={exec.currentStep?.callStack || []} />
                </div>
              )}

              {exec.visiblePanels.console && (
                <div className="animate-fadeIn">
                 <ConsolePanel output={exec.consoleOutput ? exec.consoleOutput.split('\n').filter(line => line.trim()) : []} />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Notification */}
      {exec.notification && (
        <CstmNotification
          message={exec.notification.message}
          type={exec.notification.type}
          onClose={() => exec.setNotification(null)}
        />
      )}

      {/* Footer */}
      {/* <footer className="border-t border-gray-700/50 bg-gray-900/80 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <p>© 2025 JavaVis - Visualizador educativo de Java</p>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-cyan-400 transition-colors">Documentación</a>
              <a href="#" className="hover:text-cyan-400 transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer> */}
    </div>
  );
};