import React, { useEffect, useState } from 'react';
import { type HeapValue, isHeapRef } from '@/types';

interface HeapPanelProps {
  heap: Record<string, HeapValue>;
  changedHeapIds: Set<string>;
}

const renderHeapValue = (value: HeapValue): string => {
  if (value.type === 'array') {
    const content = value.values
      .map(v => isHeapRef(v) ? `@${v.__ref__}` : JSON.stringify(v))
      .join(', ');
    return `[${content}]`;
  }

  if (value.type === 'object') {
    return `{...}`;
  }

  return 'unknown';
};

export const HeapPanel: React.FC<HeapPanelProps> = ({ heap, changedHeapIds }) => {
  const heapEntries = Object.entries(heap);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (changedHeapIds.size > 0) {
      setHighlighted(new Set(changedHeapIds));
      const timer = setTimeout(() => setHighlighted(new Set()), 800);
      return () => clearTimeout(timer);
    }
  }, [changedHeapIds]);

  return (
    <div className="panel-card">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Heap Memory
          </h3>
          <span className="text-xs text-gray-400 font-mono">
            {heapEntries.length} {heapEntries.length === 1 ? 'obj' : 'objs'}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="panel-body">
        {heapEntries.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <p>El heap está vacío</p>
          </div>
        ) : (
          <div className="space-y-3">
            {heapEntries.map(([id, value]) => {
              const isHighlighted = highlighted.has(id);
              const heapValue = value as HeapValue;
              const typeString = heapValue.type === 'object' ? heapValue.className : 'array';

              return (
                <div
                  key={id}
                  className={`
                    p-3 rounded-lg
                    bg-gray-800/40 border border-gray-700/50
                    transition-all duration-300
                    ${isHighlighted ? 'variable-changed ring-2 ring-purple-500/50' : ''}
                  `}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-cyan-400 font-semibold">
                        @{id}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-mono bg-purple-500/20 text-purple-300 rounded border border-purple-500/30">
                        {typeString}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm font-mono text-gray-300 break-all pl-2 border-l-2 border-gray-700">
                    {renderHeapValue(heapValue)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};