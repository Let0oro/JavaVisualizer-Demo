import React, { useEffect, useState } from 'react';
import { type HeapValue, isHeapRef } from '@/types';

interface HeapPanelProps {
  heap: Record<string, HeapValue>;
  changedHeapIds: Set<string>;
}

const renderHeapValue = (value: HeapValue): string => {
    if (value.type === 'array') {
      const content = value.values.map(v => isHeapRef(v) ? `@${v.__ref__}` : JSON.stringify(v)).join(', ');
      return `[${content}]`;
    }
    if (value.type === 'object') {
      // Could expand to show fields in the future
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
      const timer = setTimeout(() => setHighlighted(new Set()), 1000);
      return () => clearTimeout(timer);
    }
  }, [changedHeapIds]);

  return (
    <div className="bg-gray-800 rounded-lg p-4 min-h-[150px] flex-1 basis-[45%] min-w-[300px] flex flex-col">
      <h2 className="text-lg font-semibold mb-2 text-magenta-500">Heap Memory</h2>
      {heapEntries.length === 0 ? (
        <p className="text-gray-500 italic">Heap is empty.</p>
      ) : (
        <div className="font-mono text-sm space-y-1 overflow-auto">
          {heapEntries.map(([id, value]) => {
            const isHighlighted = highlighted.has(id);
            // FIX: Cast `value` to `HeapValue` as Object.entries can have vague type inference.
            const heapValue = value as HeapValue;
            const typeString = heapValue.type === 'object' ? heapValue.className : 'array';
            return (
              <div
                key={id}
                className={`p-1 rounded transition-colors duration-500 ${isHighlighted ? 'bg-yellow-500/30' : 'bg-transparent'}`}
              >
                <span className="text-red-500">{id}:</span>
                <span className="text-cyan-500 ml-2">({typeString})</span>
                <span className="text-green-500 ml-2 break-all">
                  {renderHeapValue(heapValue)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
