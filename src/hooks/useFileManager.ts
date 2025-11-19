import { useState, useCallback } from 'react';

export interface JavaFile {
  id: string;
  name: string;
  content: string;
  isMain: boolean;
}

export function useFileManager(initialFile: JavaFile) {
  const [files, setFiles] = useState<JavaFile[]>([initialFile]);
  const [activeFileId, setActiveFileId] = useState<string>(initialFile.id);

  const activeFile = files.find(f => f.id === activeFileId) || files[0];

  const getCombinedCodeWithMap = useCallback(() => {
    const mainFile = files.find(f => f.isMain);
    const orderedFiles = mainFile
      ? [mainFile, ...files.filter(f => !f.isMain)]
      : files;

    let globalLine = 0;
    const lineMap: Array<{ file: JavaFile; startLine: number; endLine: number }> = [];
    const codeSegments: string[] = [];

    orderedFiles.forEach(file => {
      const content = file.content.trim();
      if (content === '') return;

      const lines = content.split('\n');
      const startLine = globalLine;
      const endLine = globalLine + lines.length - 1;

      lineMap.push({ file, startLine, endLine });
      codeSegments.push(content);

      globalLine = endLine + 1;
      globalLine += 2; // Espacio entre archivos (\n\n)
    });

    return {
      code: codeSegments.join('\n\n'),
      lineMap,
    };
  }, [files]);

  const addFile = useCallback((name: string = 'NewFile') => {
    const newFile: JavaFile = {
      id: `file-${Date.now()}`,
      name: name.trim().endsWith('.java') ? name : `${name}.java`,
      content: `class ${name} {\n  \n}`,
      isMain: false,
    };
    setFiles(prev => [...prev, newFile]);
    setActiveFileId(newFile.id);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const filtered = prev.filter(f => f.id !== id);
      if (filtered.length === 0) {
        // Always keep at least one file
        return prev;
      }

      // If removing active file, switch to first file
      if (id === activeFileId) {
        if (filtered[0]) setActiveFileId(filtered[0].id);
      }

      return filtered;
    });
  }, [activeFileId]);

  const updateFileContent = useCallback((id: string, content: string) => {
    setFiles(prev => prev.map(f =>
      f.id === id ? { ...f, content } : f
    ));
  }, []);

  const renameFile = useCallback((id: string, newName: string) => {
    setFiles(prev => prev.map(f =>
      f.id === id ? { ...f, name: newName.endsWith('.java') ? newName : `${newName}.java` } : f
    ));
  }, []);

  const setMainFile = useCallback((id: string) => {
    setFiles(prev => prev.map(f => ({
      ...f,
      isMain: f.id === id,
    })));
  }, []);

  // Combinar todos los archivos para ejecución
  const getCombinedCode = useCallback(() => {
    return getCombinedCodeWithMap().code;
  }, [getCombinedCodeWithMap]);

  const resolveLineToFile = useCallback((globalLine: number) => {
    const { lineMap } = getCombinedCodeWithMap();

    for (const entry of lineMap) {
      if (globalLine >= entry.startLine && globalLine <= entry.endLine) {
        return {
          file: entry.file,
          localLine: globalLine - entry.startLine + 1, // +1 porque los editores empiezan en 1
        };
      }
    }

    // Si no se encuentra, devolver el primer archivo (fallback)
    return {
      file: files[0]!,
      localLine: globalLine + 1,
    };
  }, [getCombinedCodeWithMap, files]);


  return {
    files,
    activeFile,
    activeFileId,
    setActiveFileId,
    addFile,
    removeFile,
    updateFileContent,
    renameFile,
    setMainFile,
    getCombinedCode,
    getCombinedCodeWithMap,
    resolveLineToFile
  };
}
