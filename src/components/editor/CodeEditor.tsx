import type { ExecutionStep } from '@/types';
import hljs from 'highlight.js/lib/core';
import java from 'highlight.js/lib/languages/java';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Tooltip } from '@/components';
import type { JavaFile } from '@/hooks/useFileManager';

hljs.registerLanguage('java', java);

interface CodeEditorProps {
  code: string;
  onCodeChange: (newCode: string) => void;
  currentStep?: ExecutionStep;
  disabled: boolean;
  syntaxError: { line: number, message: string } | null;
  setNotification: (notification: { message: string; type: 'info' | 'success' | 'error' } | null) => void;
  resolveLineToFile?: (globalLine: number) => { file: JavaFile; localLine: number };
  activeFile: JavaFile;
}

const LINE_HEIGHT = 22; // Optimized for readability
const PADDING_TOP = 12;
const PADDING_HORIZONTAL = 16;
const LINE_NUMBER_WIDTH = 48; // Fixed width for line numbers

const commonEditorStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: LINE_NUMBER_WIDTH,
  right: 0,
  bottom: 0,
  margin: 0,
  padding: `${PADDING_TOP}px ${PADDING_HORIZONTAL}px`,
  border: 'none',
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace",
  fontSize: '14px',
  lineHeight: `${LINE_HEIGHT}px`,
  letterSpacing: '0.02em',
  whiteSpace: 'pre',
  boxSizing: 'border-box',
  background: 'transparent',
  tabSize: 2, // Better for Java
};

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onCodeChange,
  currentStep,
  disabled,
  syntaxError,
  setNotification,
  resolveLineToFile,
  activeFile
}) => {
  const {
    lineNumber: currentLine,
    highlightedRegion,
    activeLoops,
    event
  } = currentStep || {};

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const hljsRef = useRef<typeof hljs | null>(null);
  const [isHljsReady, setIsHljsReady] = useState(false);
  const [highlightedCodeHtml, setHighlightedCodeHtml] = useState('');
  const [errorTooltip, setErrorTooltip] = useState<{
    visible: boolean;
    content: string;
    x: number;
    y: number;
  }>({ visible: false, content: '', x: 0, y: 0 });
  const [measurement, setMeasurement] = useState({ left: 0, width: 0 });
  const prefixRef = useRef<HTMLSpanElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const userInteractingRef = useRef(false);

  const errorForCurrentFile = useMemo(() => {
    if (!syntaxError || !resolveLineToFile) return null;

    const resolved = resolveLineToFile(syntaxError.line);

    // Solo mostrar error si pertenece al archivo activo
    if (resolved.file.id !== activeFile.id) return null;

    return {
      line: resolved.localLine,
      message: syntaxError.message,
      fileName: resolved.file.name,
    };
  }, [syntaxError, resolveLineToFile, activeFile]);


  // Load Highlight.js
  useEffect(() => {
    let isMounted = true;
    try {
      hljs.registerLanguage('java', java);
      if (isMounted) {
        hljsRef.current = hljs;
        setIsHljsReady(true);
      }
    } catch (error) {
      console.error("Syntax highlighting error:", error);
      if (isMounted) {
        setNotification({
          message: 'Error al cargar el resaltador de sintaxis',
          type: 'error'
        });
      }
    }
    return () => { isMounted = false; };
  }, [setNotification]);

  // Generate highlighted HTML
  useEffect(() => {
    let html;
    if (isHljsReady && hljsRef.current) {
      html = hljsRef.current.highlight(code, { language: 'java', ignoreIllegals: true }).value;
    } else {
      const escapedCode = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
      html = escapedCode;
    }
    setHighlightedCodeHtml(html + '\n');
  }, [code, isHljsReady]);

  const lineContent = (currentLine && code.split('\n')[currentLine - 1]) || '';
  const prefix = (currentLine && highlightedRegion)
    ? lineContent.substring(0, highlightedRegion.start)
    : '';
  const highlightText = (currentLine && highlightedRegion)
    ? lineContent.substring(highlightedRegion.start, highlightedRegion.end)
    : '';

  // Measure highlight position
  useEffect(() => {
    if (highlightedRegion && prefixRef.current && highlightRef.current) {
      setMeasurement({
        left: prefixRef.current.offsetWidth,
        width: highlightRef.current.offsetWidth,
      });
    }
  }, [prefix, highlightText, highlightedRegion, code, currentLine]);

  // Auto-scroll to current line
  useEffect(() => {
    if (currentLine && textareaRef.current && !userInteractingRef.current) {
      const editor = textareaRef.current;
      const lineTop = ((currentLine - 1) * LINE_HEIGHT) + PADDING_TOP;
      const lineBottom = lineTop + LINE_HEIGHT;
      const viewTop = editor.scrollTop;
      const viewBottom = viewTop + editor.clientHeight;

      if (lineBottom > viewBottom || lineTop < viewTop) {
        const targetScroll = lineTop - (editor.clientHeight / 2) + (LINE_HEIGHT / 2);
        editor.scrollTop = Math.max(0, targetScroll);
      }
    }
  }, [currentLine]);

  const handleScroll = useCallback(() => {
    if (disabled) {
      userInteractingRef.current = true;
      setTimeout(() => { userInteractingRef.current = false; }, 2000);
    }

    if (textareaRef.current && preRef.current && lineNumbersRef.current) {
      const { scrollTop, scrollLeft } = textareaRef.current;
      preRef.current.scrollTop = scrollTop;
      preRef.current.scrollLeft = scrollLeft;
      lineNumbersRef.current.scrollTop = scrollTop;
    }
  }, [disabled]);

  const handleEditorMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!errorForCurrentFile || !scrollContainerRef.current || !textareaRef.current) {
      if (errorTooltip.visible) setErrorTooltip(prev => ({ ...prev, visible: false }));
      return;
    }

    const container = scrollContainerRef.current;
    const rect = container.getBoundingClientRect();
    const relativeY = e.clientY - rect.top + textareaRef.current.scrollTop - PADDING_TOP;
    const hoverLine = Math.floor(relativeY / LINE_HEIGHT) + 1;

    if (hoverLine === errorForCurrentFile.line) {
      setErrorTooltip({
        visible: true,
        content: errorForCurrentFile.message,
        x: e.clientX,
        y: e.clientY
      });
    } else {
      if (errorTooltip.visible) {
        setErrorTooltip(prev => ({ ...prev, visible: false }));
      }
    }
  };

  const handleEditorMouseLeave = () => {
    setErrorTooltip(prev => ({ ...prev, visible: false }));
  };

  const lineCount = code.split('\n').length;

  const highlightColor = event === 'allocation'
    ? 'bg-purple-500/25'
    : event === 'return'
      ? 'bg-cyan-500/25'
      : 'bg-amber-400/30';

  // Handle Tab key for indentation + Auto-surround brackets
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const { selectionStart: start, selectionEnd: end } = textarea;
    const selectedText = code.substring(start, end);
    const hasSelection = start !== end;

    // ===== AUTO-SURROUND: When typing opening bracket with selection =====
    const surroundPairs: Record<string, string> = {
      '"': '"',
      "'": "'",
      '(': ')',
      '[': ']',
      '{': '}',
      '<': '>',
    };

    const closeChar = surroundPairs[e.key];

    if (hasSelection && closeChar) {
      e.preventDefault();
      const openChar = e.key;

      // Wrap selected text
      const newCode =
        code.substring(0, start) +
        openChar +
        selectedText +
        closeChar +
        code.substring(end);

      onCodeChange(newCode);

      // Position cursor after the inserted opening bracket
      setTimeout(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.selectionStart = start + 1;
          textarea.selectionEnd = start + 1 + selectedText.length;
          textarea.focus();
        }
      }, 0);

      return;
    }

    // ===== AUTO-PAIR: When typing opening bracket without selection =====
    if (!hasSelection && closeChar) {
      e.preventDefault();
      const openChar = e.key;

      // Insert pair and position cursor between them
      const newCode =
        code.substring(0, start) +
        openChar +
        closeChar +
        code.substring(end);

      onCodeChange(newCode);

      // Position cursor between the pair
      setTimeout(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.selectionStart = start + 1;
          textarea.selectionEnd = start + 1;
          textarea.focus();
        }
      }, 0);

      return;
    }

    // ===== AUTO-SKIP: Skip over closing bracket if it's already there =====
    const closingChars = [')', ']', '}', '>', '"', "'"];
    if (!hasSelection && closingChars.includes(e.key)) {
      const nextChar = code[start];

      // If next character is the same closing char, skip over it
      if (nextChar === e.key) {
        e.preventDefault();
        setTimeout(() => {
          const textarea = textareaRef.current;
          if (textarea) {
            textarea.selectionStart = start + 1;
            textarea.selectionEnd = start + 1;
            textarea.focus();
          }
        }, 0);
        return;
      }
    }

    // ===== AUTO-DELETE PAIR: When pressing Backspace on an empty pair =====
    if (e.key === 'Backspace' && !hasSelection && start > 0) {
      const charBefore = code[start - 1];
      const charAfter = code[start];

      // Check if we're deleting an empty bracket pair
      if (charBefore && charBefore in surroundPairs && surroundPairs[charBefore] === charAfter) {
        e.preventDefault();

        // Delete both characters
        const newCode =
          code.substring(0, start - 1) +
          code.substring(start + 1);

        onCodeChange(newCode);

        setTimeout(() => {
          const textarea = textareaRef.current;
          if (textarea) {
            textarea.selectionStart = start - 1;
            textarea.selectionEnd = start - 1;
            textarea.focus();
          }
        }, 0);

        return;
      }
    }

    // ===== TAB INDENTATION =====
    if (e.key === 'Tab') {
      e.preventDefault();

      if (hasSelection) {
        // Tab with selection: Indent/Outdent multiple lines
        const lines = code.split('\n');
        const startLine = code.substring(0, start).split('\n').length - 1;
        const endLine = code.substring(0, end).split('\n').length - 1;

        let newLines = [...lines];

        if (e.shiftKey) {
          // Shift+Tab: Remove indentation
          for (let i = startLine; i <= endLine; i++) {
            const line = newLines[i];
            if (line?.startsWith('  ')) {
              newLines[i] = line.substring(2);
            }
          }
        } else {
          // Tab: Add indentation
          for (let i = startLine; i <= endLine; i++) {
            newLines[i] = '  ' + newLines[i];
          }
        }

        const newCode = newLines.join('\n');
        onCodeChange(newCode);

        // Maintain selection
        setTimeout(() => {
          const textarea = textareaRef.current;
          if (textarea) {
            const newStart = newLines.slice(0, startLine).join('\n').length + (startLine > 0 ? 1 : 0);
            const newEnd = newLines.slice(0, endLine + 1).join('\n').length;
            textarea.selectionStart = newStart;
            textarea.selectionEnd = newEnd;
            textarea.focus();
          }
        }, 0);
      } else {
        // Tab without selection: Insert spaces
        const newCode = code.substring(0, start) + '  ' + code.substring(end);
        onCodeChange(newCode);

        setTimeout(() => {
          const textarea = textareaRef.current;
          if (textarea) {
            textarea.selectionStart = start + 2;
            textarea.selectionEnd = start + 2;
            textarea.focus();
          }
        }, 0);
      }

      return;
    }

    // ===== AUTO-INDENT: Smart indentation on Enter =====
    if (e.key === 'Enter' && !hasSelection) {
      e.preventDefault();

      // Get current line content
      const currentLineStart = code.lastIndexOf('\n', start - 1) + 1;
      const currentLine = code.substring(currentLineStart, start);

      // Calculate current indentation
      const indentMatch = currentLine.match(/^(\s*)/);
      const currentIndent = indentMatch && indentMatch[1] ? indentMatch[1] : '';

      // Determine if we need extra indentation
      const trimmedLine = currentLine.trim();
      let extraIndent = '';

      // Check if line opens a block (ends with {)
      if (trimmedLine.endsWith('{')) {
        extraIndent = '  '; // Add 2 spaces
      }
      // Check if line is a case/default statement (ends with :)
      else if (trimmedLine.endsWith(':') && (trimmedLine.startsWith('case ') || trimmedLine.startsWith('default'))) {
        extraIndent = '  '; // Add 2 spaces
      }

      // Check if we should auto-close the block (cursor after { with nothing following)
      const restOfLine = code.substring(start, currentLineStart + currentLine.length).trim();
      const shouldAutoClose = trimmedLine.endsWith('{') && restOfLine === '';

      let newCode: string;
      let newCursorPos: number;

      if (shouldAutoClose) {
        // Insert new line with indent, then closing brace on next line with original indent
        newCode =
          code.substring(0, start) +
          '\n' + currentIndent + extraIndent +
          '\n' + currentIndent + ( code.substring(start, start+1) == "}" ? '' : '}' ) +
          code.substring(end);

        newCursorPos = start + 1 + currentIndent.length + extraIndent.length;
      } else {
        // Normal case: just add new line with appropriate indentation
        newCode =
          code.substring(0, start) +
          '\n' + currentIndent + extraIndent +
          code.substring(end);

        newCursorPos = start + 1 + currentIndent.length + extraIndent.length;
      }

      onCodeChange(newCode);

      setTimeout(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        textarea.selectionStart = newCursorPos;
        textarea.selectionEnd = newCursorPos;
        textarea.focus();
      }, 0);

      return;
    }
  };



  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden border border-gray-700/50 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-800/80 border-b border-gray-700/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          <span className="ml-3 text-sm font-medium text-gray-300">Main.java</span>
        </div>
        {syntaxError && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>Línea {syntaxError.line}</span>
          </div>
        )}
        {errorForCurrentFile && (
          <div className="error-banner">
            ⚠️ Error en línea {errorForCurrentFile.line}: {errorForCurrentFile.message}
          </div>
        )}
      </div>

      {/* Editor Container */}
      <div
        ref={scrollContainerRef}
        className="relative flex-1 overflow-hidden"
        onMouseMove={handleEditorMouseMove}
        onMouseLeave={handleEditorMouseLeave}
      >
        {/* Line Numbers */}
        <div
          ref={lineNumbersRef}
          className="absolute left-0 top-0 bottom-0 overflow-hidden select-none bg-gray-800/40"
          style={{
            width: LINE_NUMBER_WIDTH,
            paddingTop: PADDING_TOP,
            paddingBottom: PADDING_TOP,
          }}
        >
          {Array.from({ length: lineCount }, (_, i) => {
            const lineNumber = i + 1;
            const isErrorLine = syntaxError && syntaxError.line === lineNumber;
            const isCurrentLine = currentLine === lineNumber;

            return (
              <div
                key={lineNumber}
                className={`
                  text-right pr-3 font-mono text-xs transition-colors
                  ${isErrorLine
                    ? 'text-red-400 font-semibold'
                    : isCurrentLine
                      ? 'text-amber-400 font-semibold'
                      : 'text-gray-500'
                  }
                `}
                style={{
                  height: LINE_HEIGHT,
                  lineHeight: `${LINE_HEIGHT}px`,
                }}
              >
                {lineNumber}
              </div>
            );
          })}
        </div>

        {/* Syntax Highlighted Background */}
        <pre
          ref={preRef}
          className="hljs absolute overflow-hidden pointer-events-none select-none"
          style={{
            ...commonEditorStyle,
            color: '#a9b1d6',
            letterSpacing: '0.05rem',
            zIndex: 1,
          }}
          aria-hidden="true"
        >
          <code dangerouslySetInnerHTML={{ __html: highlightedCodeHtml }} />
        </pre>

        {/* Editable Textarea */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck="false"
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          wrap="off"
          readOnly={disabled}
          placeholder="// Escribe tu código Java aquí..."
          aria-label="Editor de Código Java"
          onScroll={handleScroll}
          className={`
            absolute outline-none resize-none
            ${errorForCurrentFile ? 'has-error' : ''}
            ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-text'}
          `}
          style={{
            ...commonEditorStyle,
            color: 'transparent',
            caretColor: '#e0af68',
            zIndex: 10,
            overflow: 'auto',
          }}
        />

        {/* Current Line Highlight */}
        {currentLine && (
          <div
            className={`absolute pointer-events-none ${highlightColor} transition-all duration-200`}
            style={{
              left: 0,
              right: 0,
              top: `${(currentLine - 1) * LINE_HEIGHT + PADDING_TOP - (textareaRef.current?.scrollTop || 0)}px`,
              height: LINE_HEIGHT,
              zIndex: 2,
            }}
          />
        )}

        {/* Highlighted Region (expression/token) */}
        {currentLine && highlightedRegion && measurement.width > 0 && (
          <div
            className="absolute pointer-events-none bg-amber-300/40 rounded transition-all duration-150 ring-1 ring-amber-400/60"
            style={{
              top: `${(currentLine - 1) * LINE_HEIGHT + PADDING_TOP - (textareaRef.current?.scrollTop || 0)}px`,
              left: LINE_NUMBER_WIDTH + PADDING_HORIZONTAL + measurement.left,
              width: measurement.width,
              height: LINE_HEIGHT,
              zIndex: 3,
            }}
          />
        )}

        {/* Error Line Indicator */}
        {/* {syntaxError && (
          <div
            className="absolute left-0 w-1 bg-red-500 pointer-events-none"
            style={{
              top: `${(syntaxError.line - 1) * LINE_HEIGHT + PADDING_TOP - (textareaRef.current?.scrollTop || 0)}px`,
              height: LINE_HEIGHT,
              zIndex: 4,
            }}
          />
        )} */}
        {errorForCurrentFile && (
          <div
            className="absolute left-0 right-0 pointer-events-none"
            style={{
              top: `${(errorForCurrentFile.line - 1) * LINE_HEIGHT + PADDING_TOP - (textareaRef.current?.scrollTop || 0)}px`,
              height: `${LINE_HEIGHT}px`,
              background: 'rgba(239, 68, 68, 0.15)',
              borderLeft: '3px solid rgb(239, 68, 68)',
              zIndex: 5,
            }}
          />
        )}

        {/* Loop State Badges */}
        {activeLoops?.map((loop, idx) => (
          <div
            key={idx}
            className="absolute right-4 px-2 py-0.5 bg-blue-500/90 text-white text-xs font-mono rounded shadow-lg pointer-events-none z-20"
            style={{
              top: `${(loop.lineNumber - 1) * LINE_HEIGHT + PADDING_TOP - (textareaRef.current?.scrollTop || 0)}px`,
            }}
          >
            {loop.state}
          </div>
        ))}

        {/* Measurement Spans (hidden, used for calculating positions) */}
        <div className="absolute opacity-0 pointer-events-none" aria-hidden="true">
          <span ref={prefixRef} style={{ fontFamily: commonEditorStyle.fontFamily, fontSize: commonEditorStyle.fontSize }}>
            {prefix.replace(/ /g, '\u00a0')}
          </span>
          <span ref={highlightRef} style={{ fontFamily: commonEditorStyle.fontFamily, fontSize: commonEditorStyle.fontSize }}>
            {highlightText.replace(/ /g, '\u00a0')}
          </span>
        </div>
      </div>

      {/* Error Tooltip */}
      {errorTooltip.visible && (
        <Tooltip
          content={errorTooltip.content}
          x={errorTooltip.x}
          y={errorTooltip.y}
          visible={errorTooltip.visible}
        />
      )}
    </div>
  );
};