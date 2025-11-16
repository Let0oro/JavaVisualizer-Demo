
import React, { useState, useRef, useEffect } from 'react';

type PanelVisibility = {
  variables: boolean;
  heap: boolean;
  callStack: boolean;
  console: boolean;
};

interface WindowVisibilityControlProps {
  visiblePanels: PanelVisibility;
  onVisibilityChange: (newVisibility: PanelVisibility) => void;
}

const panelLabels: Record<keyof PanelVisibility, string> = {
  variables: 'Variables',
  heap: 'Heap Memory',
  callStack: 'Call Stack',
  console: 'Console',
};

export const WindowVisibilityControl: React.FC<WindowVisibilityControlProps> = ({ visiblePanels, onVisibilityChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);
  
  const handleToggle = (panel: keyof PanelVisibility) => {
    onVisibilityChange({
      ...visiblePanels,
      [panel]: !visiblePanels[panel],
    });
  };

  const visibleCount = Object.values(visiblePanels).filter(Boolean).length;

  return (
    <div className="bg-gray-800 rounded-lg p-4 flex items-center justify-between" ref={wrapperRef}>
       <h2 className="text-lg font-semibold text-magenta-500">Analysis Windows</h2>
       <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-md font-semibold transition-all duration-200 bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-magenta-500"
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          <span>{visibleCount} / {Object.keys(panelLabels).length} Visible</span>
          <svg className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-gray-700 rounded-md shadow-lg z-20" role="menu">
            <ul className="py-1">
              {(Object.keys(panelLabels) as Array<keyof PanelVisibility>).map((key) => (
                <li key={key}>
                  <label className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 bg-gray-800 border-gray-600 rounded"
                      checked={visiblePanels[key]}
                      onChange={() => handleToggle(key)}
                    />
                    <span className="ml-3">{panelLabels[key]}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
       </div>
    </div>
  );
};
