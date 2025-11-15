
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Tooltip } from './Tooltip';
import type { ExecutionStep } from '../types';

interface CodeEditorProps {
  code: string;
  onCodeChange: (newCode: string) => void;
  currentStep?: ExecutionStep;
  disabled: boolean;
  syntaxError: { line: number, message: string } | null;
  setNotification: (notification: { message: string; type: 'info' | 'success' | 'error' } | null) => void;
}

const LINE_HEIGHT = 24; // px
const PADDING = 8; // px, corresponds to p-2 in tailwind

const commonEditorStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    margin: 0,
    padding: `${PADDING}px`,
    border: 'none',
    fontFamily: 'monospace',
    fontSize: '0.875rem', // Tailwind's text-sm
    lineHeight: `${LINE_HEIGHT}px`,
    letterSpacing: 'normal', // Explicitly set to prevent browser default inconsistencies
    whiteSpace: 'pre',
    boxSizing: 'border-box',
    background: 'transparent',
};

export const CodeEditor: React.FC<CodeEditorProps> = ({ code, onCodeChange, currentStep, disabled, syntaxError, setNotification }) => {
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

  const hljsRef = useRef<any>(null); // To store the hljs instance
  const [isHljsReady, setIsHljsReady] = useState(false);
  const [highlightedCodeHtml, setHighlightedCodeHtml] = useState<string>('');

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
  
  // Effect to load Highlight.js dynamically and reliably.
  useEffect(() => {
    let isMounted = true;
    setNotification({ message: 'Cargando resaltador de sintaxis...', type: 'info' });

    const initializeHljs = async () => {
      try {
        const hljsModule = await import('https://esm.sh/highlight.js/lib/core');
        const javaModule = await import('https://esm.sh/highlight.js/lib/languages/java');
        const hljs = hljsModule.default;
        hljs.registerLanguage('java', javaModule.default);
        
        if (isMounted) {
          hljsRef.current = hljs;
          setIsHljsReady(true);
          setNotification({ message: 'Resaltador de sintaxis cargado.', type: 'success' });
        }
      } catch (error) {
        console.error("Syntax highlighting error:", error);
        if (isMounted) {
          setNotification({ message: 'Error al cargar el resaltador de sintaxis. El coloreado no funcionará.', type: 'error' });
        }
      }
    };

    initializeHljs();
      
    return () => { isMounted = false; };
  }, [setNotification]);


  // Generate the HTML to display based on hljs readiness and code changes
  useEffect(() => {
    let html;
    if (isHljsReady && hljsRef.current) {
      html = hljsRef.current.highlight(code, { language: 'java', ignoreIllegals: true }).value;
    } else {
      // Fallback to plain, escaped text if hljs is not ready to prevent invisible code
      const escapedCode = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
      html = escapedCode;
    }
    // Add a trailing newline for consistent final line rendering and scrolling
    setHighlightedCodeHtml(html + '\n');
  }, [code, isHljsReady]);

  const lineContent = (currentLine && code.split('\n')[currentLine - 1]) || '';
  const prefix = (currentLine && highlightedRegion) ? lineContent.substring(0, highlightedRegion.start) : '';
  const highlightText = (currentLine && highlightedRegion) ? lineContent.substring(highlightedRegion.start, highlightedRegion.end) : '';

  useEffect(() => {
    if (highlightedRegion && prefixRef.current && highlightRef.current) {
      setMeasurement({
        left: prefixRef.current.offsetWidth,
        width: highlightRef.current.offsetWidth,
      });
    }
  }, [prefix, highlightText, highlightedRegion, code, currentLine]);
  
  // Effect for auto-scrolling
  useEffect(() => {
    if (currentLine && textareaRef.current && !userInteractingRef.current) {
      const editor = textareaRef.current;
      const editorViewTop = editor.scrollTop;
      const editorViewBottom = editor.scrollTop + editor.clientHeight;
      
      const lineTop = ((currentLine - 1) * LINE_HEIGHT) + PADDING;
      const lineBottom = lineTop + LINE_HEIGHT;

      const isLineVisible = lineBottom > editorViewTop && lineTop < editorViewBottom;

      if (!isLineVisible) {
          const targetScrollTop = lineTop - (editor.clientHeight / 2) + (LINE_HEIGHT / 2);
          editor.scrollTop = targetScrollTop;
      }
    }
  }, [currentLine]);

  const handleScroll = useCallback(() => {
    // When execution is running, any manual scroll disables auto-scrolling.
    if (disabled) {
      userInteractingRef.current = true;
      // Re-enable auto-scrolling after a delay of user inactivity
      setTimeout(() => { userInteractingRef.current = false }, 2000);
    }

    if (textareaRef.current && preRef.current && lineNumbersRef.current) {
      const { scrollTop, scrollLeft } = textareaRef.current;
      preRef.current.scrollTop = scrollTop;
      preRef.current.scrollLeft = scrollLeft;
      lineNumbersRef.current.scrollTop = scrollTop;
    }
  }, [disabled]);
  
  const handleEditorMouseMove = (e: React.MouseEvent) => {
    if (!syntaxError || !scrollContainerRef.current || !textareaRef.current) {
      if (errorTooltip.visible) hideErrorTooltip();
      return;
    }

    const container = scrollContainerRef.current;
    const rect = container.getBoundingClientRect();
    // Adjust for container scroll position and top padding to get correct line
    const relativeY = e.clientY - rect.top + textareaRef.current.scrollTop - PADDING;
    const hoverLine = Math.floor(relativeY / LINE_HEIGHT) + 1;

    if (hoverLine === syntaxError.line) {
      setErrorTooltip({ visible: true, content: syntaxError.message, x: e.clientX, y: e.clientY });
    } else {
      if (errorTooltip.visible) {
        hideErrorTooltip();
      }
    }
  };

  const handleEditorMouseLeave = () => {
    hideErrorTooltip();
  };
  
  const hideErrorTooltip = () => {
    setErrorTooltip(prev => ({ ...prev, visible: false }));
  };
  
  const lineCount = code.split('\n').length;
  
  const highlightColor = event === 'allocation' 
    ? 'bg-magenta-500/40' 
    : event === 'return'
    ? 'bg-cyan-500/40'
    : 'bg-yellow-500/40';

  return (
    <div className="bg-gray-800 rounded-lg p-4 flex-grow flex flex-col h-[60vh] relative">
      <h2 className="text-lg font-semibold mb-2 text-magenta-500">Editor de Código</h2>
      <div 
        className="flex-grow flex relative min-h-0"
        ref={scrollContainerRef}
        onMouseMove={handleEditorMouseMove}
        onMouseLeave={handleEditorMouseLeave}
      >
        <div
          ref={lineNumbersRef}
          className="text-right pr-4 pt-2 text-gray-500 select-none overflow-hidden"
          style={{ lineHeight: `${LINE_HEIGHT}px` }}
          aria-hidden="true"
        >
          {Array.from({ length: lineCount }, (_, i) => {
            const lineNumber = i + 1;
            const isErrorLine = syntaxError && syntaxError.line === lineNumber;
            const isCurrentLine = currentLine === lineNumber;
            return (
              <div 
                key={i} 
                className={`relative transition-colors duration-100 flex items-center justify-end ${isErrorLine ? 'text-red-500 font-bold' : ''} ${isCurrentLine ? 'bg-gray-700/80 rounded px-1 text-gray-200' : ''}`}
                style={{ height: `${LINE_HEIGHT}px` }}
              >
                {lineNumber}
              </div>
            );
          })}
        </div>

        <div className="relative flex-grow">
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            spellCheck="false"
            wrap="off"
            readOnly={disabled}
            aria-label="Code Editor"
            onScroll={handleScroll}
            style={{
                ...commonEditorStyle,
                color: 'transparent',
                caretColor: '#e0af68', // yellow-500
                zIndex: 10,
                resize: 'none',
                overflow: 'auto',
            }}
          />
          <pre
            ref={preRef}
            aria-hidden="true"
            className="code-display"
            style={{
                ...commonEditorStyle,
                pointerEvents: 'none',
                overflow: 'hidden',
            }}
          >
            {/* Overlays are positioned relative to this <pre> element */}
            {currentLine && (
                <div
                  className="absolute top-0 left-0 w-full bg-gray-700/50 pointer-events-none transition-transform duration-100 ease-out z-0"
                  style={{
                    transform: `translateY(${(currentLine - 1) * LINE_HEIGHT}px)`,
                    height: `${LINE_HEIGHT}px`,
                  }}
                />
            )}
            {currentLine && highlightedRegion && measurement.width > 0 && (
              <div
                className={`absolute top-0 rounded pointer-events-none z-0 transition-all duration-100 ease-out ${highlightColor}`}
                style={{
                  transform: `translateY(${(currentLine - 1) * LINE_HEIGHT}px)`,
                  left: `${measurement.left}px`,
                  width: `${measurement.width}px`,
                  height: `${LINE_HEIGHT}px`,
                }}
              />
            )}
            {syntaxError && (
              <div
                className="absolute top-0 left-0 w-full pointer-events-none z-0"
                style={{
                  transform: `translateY(${(syntaxError.line - 1) * LINE_HEIGHT}px)`,
                  height: `${LINE_HEIGHT}px`,
                  borderBottom: `2px dotted ${'#f7768e'}`, // red-500
                }}
              />
            )}
            {activeLoops?.map(loop => (
               <div
                  key={loop.lineNumber}
                  className="absolute right-0 bg-cyan-500/30 text-cyan-200 text-xs px-2 py-0.5 rounded-full pointer-events-none z-20"
                  style={{
                      transform: `translateY(${(loop.lineNumber - 1) * LINE_HEIGHT + 4}px)`
                  }}
               >
                  {loop.state}
               </div>
            ))}
            <code 
                className="language-java block relative"
                dangerouslySetInnerHTML={{ __html: highlightedCodeHtml }}
            >
            </code>
          </pre>
        </div>
      </div>
       <Tooltip
        visible={errorTooltip.visible}
        content={errorTooltip.content}
        x={errorTooltip.x}
        y={errorTooltip.y}
      />
      {/* Measurement Spans */}
      <div className="absolute top-0 left-0 invisible p-2" style={{ fontFamily: 'monospace', fontSize: '0.875rem', lineHeight: `${LINE_HEIGHT}px`, left: '60px' }} aria-hidden="true">
        <span ref={prefixRef}>{prefix.replace(/ /g, '\u00a0')}</span>
        <span ref={highlightRef}>{highlightText.replace(/ /g, '\u00a0')}</span>
      </div>
    </div>
  );
};
