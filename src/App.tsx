import React, { useEffect, useRef, useState } from 'react';
import {
  CodeEditor,
  CstmNotification,
  CallStackPanel,
  ConsolePanel,
  HeapPanel,
  VariablesPanel,
  Controls,
  WindowVisibilityControl,
  FileTabs
} from '@/components';
import "./index.css";
import type { ExecutionStep } from './types';
import { useExecutionLogic } from './hooks/useExecutionLogic';
import { useFileManager, type JavaFile } from './hooks/useFileManager';

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
        } else {
          salida += " ";
        }
      }
      System.out.println(salida);
    }
  }
}`;

const initialFile: JavaFile = {
  id: 'main-file',
  name: 'Main.java',
  content: defaultCode,
  isMain: true,
};

export const App: React.FC = () => {
  const fileManager = useFileManager(initialFile);
  const [execCode, setExecCode] = useState(fileManager.getCombinedCode());
  const exec = useExecutionLogic(execCode);

  // Guardar setCode en un ref para evitar problemas de dependencias
  const setCodeRef = useRef(exec.setCode);

  useEffect(() => {
    if (!exec.currentStep?.lineNumber || !exec.isRunning) return;

    const resolved = fileManager.resolveLineToFile(exec.currentStep.lineNumber);

    if (resolved.file.id !== fileManager.activeFileId) {
      // Pequeño delay para suavizar la transición
      const timeout = setTimeout(() => {
        console.log(`🔄 Switching to file: ${resolved.file.name} (line ${resolved.localLine})`);
        fileManager.setActiveFileId(resolved.file.id);
      }, 50); // 50ms delay

      return () => clearTimeout(timeout);
    }
  }, [exec.currentStep?.lineNumber, exec.isRunning, fileManager]);

  useEffect(() => {
    setCodeRef.current = exec.setCode;
  }, [exec.setCode]);

  useEffect(() => {
    const combinedCode = fileManager.getCombinedCode();
    setExecCode(combinedCode);
    setCodeRef.current(combinedCode);
  }, [fileManager.files]);

  // Handle adding new file with prompt
  const handleAddFile = () => {
    const fileName = prompt('Enter file name:', 'NewClass');
    // console.log('🔍 Code type:', typeof setCodeRef);
    // console.log('🔍 Code value:', setCodeRef);
    if (fileName) {
      fileManager.addFile(fileName);
    }
  };
  const handleCodeChange = (newCode: string) => {
    fileManager.updateFileContent(fileManager.activeFileId, newCode);
    // La sincronización ocurre automáticamente por el useEffect
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-900 via-slate-900 to-gray-900 text-gray-100 p-4">
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-linear-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              JavaVis
            </h1>
            <p className="text-sm text-gray-400 mt-1">Java Code Visualizer</p>
          </div>
          <WindowVisibilityControl
            visiblePanels={exec.visiblePanels}
            onTogglePanel={exec.handleTogglePanel}
          />
        </header>

        {/* Main Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-4 h-[calc(100vh-140px)]">
          {/* Left Column: Editor + Controls */}
          <div className="flex flex-col gap-4 min-h-0">
            {/* Code Editor with Tabs */}
            <div className="flex-1 flex flex-col overflow-hidden rounded-lg border border-gray-700/50 bg-gray-900 shadow-2xl">
              {/* File Tabs */}
              <FileTabs
                files={fileManager.files}
                activeFileId={fileManager.activeFileId}
                onSelectFile={fileManager.setActiveFileId}
                onCloseFile={fileManager.removeFile}
                onAddFile={handleAddFile}
                onRenameFile={fileManager.renameFile}
                onSetMainFile={fileManager.setMainFile}
              />

              {/* Editor */}
              <div className="flex-1">
                <CodeEditor
                  code={fileManager.activeFile?.content ?? ""}
                  onCodeChange={handleCodeChange}
                  currentStep={exec.currentStep}
                  disabled={exec.isRunning}
                  syntaxError={exec.syntaxError}
                  setNotification={exec.setNotification}
                  resolveLineToFile={fileManager.resolveLineToFile}
                  activeFile={fileManager.activeFile!}
                />
              </div>
            </div>

            {/* Controls */}
            <Controls
              isRunning={exec.isRunning}
              isExecutionStarted={exec.isExecutionStarted}
              isExecutionFinished={exec.isExecutionFinished}
              currentStepIndex={exec.currentStepIndex}
              speed={exec.executionSpeed}
              onExecute={() => exec.handleExecute(fileManager.getCombinedCode())}
              onPause={exec.handlePause}
              onResume={exec.handleResume}
              onNextStep={exec.handleNextStep}
              onPrevStep={exec.handlePrevStep}
              onReset={exec.handleReset}
              onSpeedChange={exec.setExecutionSpeed}
              isLoading={false}
              hasSyntaxError={exec.syntaxError !== null}
            />
          </div>

          {/* Right Column: Panels */}
          <div className="flex flex-col gap-4 min-h-0 overflow-y-auto">
            {exec.visiblePanels.console && (
              <ConsolePanel output={exec.consoleOutput ? exec.consoleOutput.split('\n').filter(line => line.trim()) : []} />
            )}

            {exec.visiblePanels.variables && exec.currentStep && (
              <VariablesPanel
                variables={exec.currentStep.variables}
                changedVariableIds={exec.changedVariables}
              />
            )}

            {exec.visiblePanels.heap && exec.currentStep && (
              <HeapPanel
                heap={exec.currentStep.heap}
                changedHeapIds={exec.changedHeapIds}
              />
            )}

            {exec.visiblePanels.callStack && exec.currentStep && (
              <CallStackPanel callStack={exec.currentStep.callStack} />
            )}
          </div>
        </div>

        {/* Notification */}
        {exec.notification && (
          <CstmNotification
            message={exec.notification.message}
            type={exec.notification.type}
            onClose={() => exec.setNotification(null)}
          />
        )}
      </div>
    </div>
  );
};