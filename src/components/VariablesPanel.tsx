
import React, { useEffect, useState } from 'react';
import { type HeapValue, isHeapRef } from '@/types';

interface VariablesPanelProps {
  variables: Record<string, any>;
  heap: Record<string, HeapValue>;
  changedVariables: Set<string>;
}

const renderValue = (value: any, heap: Record<string, HeapValue>): string => {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';

  if (isHeapRef(value)) {
    const heapObj = heap[value.__ref__];
    if (!heapObj) return `&lt;dangling ref: ${value.__ref__}&gt;`;

    if (heapObj.type === 'array') {
      // Preview first few elements for brevity
      const preview = heapObj.values.slice(0, 5).map(v => renderValue(v, heap)).join(', ');
      return `[${preview}${heapObj.values.length > 5 ? ', ...' : ''}]`;
    }
    if (heapObj.type === 'object') {
      return `${heapObj.className} @${value.__ref__}`;
    }
  }

  return JSON.stringify(value);
};


export const VariablesPanel: React.FC<VariablesPanelProps> = ({ variables, heap, changedVariables }) => {
  const variableEntries = Object.entries(variables);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (changedVariables.size > 0) {
      setHighlighted(new Set(changedVariables));
      const timer = setTimeout(() => setHighlighted(new Set()), 1000); // Highlight for 1 second
      return () => clearTimeout(timer);
    }
  }, [changedVariables]);


  return (
    <div className="bg-gray-800 rounded-lg p-4 min-h-[150px] flex-1 basis-[45%] min-w-[300px] flex flex-col">
      <h2 className="text-lg font-semibold mb-2 text-magenta-500">Variables</h2>
      {variableEntries.length === 0 ? (
        <p className="text-gray-500 italic">No variables in scope.</p>
      ) : (
        <div className="font-mono text-sm space-y-1 overflow-y-auto">
          {variableEntries.map(([name, value]) => {
            const isHighlighted = highlighted.has(name);
            return (
              <div
                key={name}
                className="flex justify-between items-center p-1"
              >
                <span className="text-blue-500">{name}</span>
                <span className={`text-green-500 px-2 py-0.5 rounded-md transition-colors duration-500 ${isHighlighted ? 'bg-yellow-500/30' : 'bg-transparent'}`}>
                  {renderValue(value, heap)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
