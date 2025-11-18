import React, { useState, useRef, useEffect } from 'react';

type PanelVisibility = {
  variables: boolean;
  heap: boolean;
  callStack: boolean;
  console: boolean;
};

interface WindowVisibilityControlProps {
  visiblePanels: PanelVisibility;
  onTogglePanel: (panel: keyof PanelVisibility) => void;
}

const panelLabels: Record<keyof PanelVisibility, string> = {
  variables: 'Variables',
  heap: 'Heap Memory',
  callStack: 'Call Stack',
  console: 'Console',
};

const panelIcons: Record<keyof PanelVisibility, React.ReactNode> = {
  variables: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  heap: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  callStack: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  ),
  console: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
};

export const WindowVisibilityControl: React.FC<WindowVisibilityControlProps> = ({
  visiblePanels,
  onTogglePanel
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [wrapperRef]);

  const visibleCount = Object.values(visiblePanels).filter(Boolean).length;

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 bg-gray-700/80 hover:bg-gray-600/80 text-gray-200 border border-gray-600/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
          </svg>
          <span>Paneles</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded border border-cyan-500/30 font-mono">
            {visibleCount}/4
          </span>
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700/50 rounded-lg shadow-2xl overflow-hidden z-50 animate-fadeIn">
          <div className="p-2 space-y-1">
            {(Object.keys(panelLabels) as Array<keyof PanelVisibility>).map((key) => (
              <button
                key={key}
                onClick={() => onTogglePanel(key)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 hover:bg-gray-700/50 text-left group"
              >
                <div className={`
                  flex items-center justify-center w-5 h-5 rounded border-2 transition-all
                  ${visiblePanels[key]
                    ? 'bg-cyan-500 border-cyan-500'
                    : 'bg-transparent border-gray-600 group-hover:border-gray-500'
                  }
                `}>
                  {visiblePanels[key] && (
                    <svg className="w-3 h-3 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <span className={visiblePanels[key] ? 'text-cyan-400' : 'text-gray-500'}>
                    {panelIcons[key]}
                  </span>
                  <span className={`text-sm font-medium ${visiblePanels[key] ? 'text-gray-200' : 'text-gray-400'}`}>
                    {panelLabels[key]}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
