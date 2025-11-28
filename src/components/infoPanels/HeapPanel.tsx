import React, { useEffect, useState } from 'react';
import type { ExecutionStep } from '@/types';

interface HeapPanelProps {
  currentStep: ExecutionStep | undefined;
  changedHeapIds: Set<string>;
}

interface DisplayValue {
  type: 'primitive' | 'array' | 'object';
  value: unknown;
  className?: string;
}

const renderValue = (value: unknown, depth = 0): string => {
  if (depth > 3) return '...'; // Prevenir recursión infinita

  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  if (Array.isArray(value)) {
    const items = value.slice(0, 5).map(v => renderValue(v, depth + 1));
    const suffix = value.length > 5 ? ', ...' : '';
    return `[${items.join(', ')}${suffix}]`;
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value).slice(0, 3);
    const items = keys.map(k => `${k}: ${renderValue((value as Record<string, unknown>)[k], depth + 1)}`);
    const suffix = Object.keys(value).length > 3 ? ', ...' : '';
    return `{${items.join(', ')}${suffix}}`;
  }

  return String(value);
};

export const HeapPanel: React.FC<HeapPanelProps> = ({ currentStep, changedHeapIds }) => {
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (changedHeapIds.size > 0) {
      setHighlighted(new Set(changedHeapIds));
      const timer = setTimeout(() => setHighlighted(new Set()), 800);
      return () => clearTimeout(timer);
    }
  }, [changedHeapIds]);

  if (!currentStep || !currentStep.variables) {
    return <div className="text-gray-500">No data available</div>;
  }

  // Filtrar solo arrays y objetos (no primitivos)
  const heapItems = Object.entries(currentStep.variables)
    .filter(([_, value]) => {
      return Array.isArray(value) || (typeof value === 'object' && value !== null && typeof value === 'object');
    })
    .map(([name, value]) => ({
      name,
      value: value as DisplayValue | unknown[],
      type: Array.isArray(value) ? ('array' as const) : ('object' as const),
      isChanged: highlighted.has(name),
    }));

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
          Heap Memory
        </h3>
        <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-600 dark:text-gray-400">
          {heapItems.length} {heapItems.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-4">
        {heapItems.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
            No objects or arrays in heap
          </div>
        ) : (
          <div className="space-y-3">
            {heapItems.map(({ name, value, type, isChanged }) => (
              <div
                key={name}
                className={`p-3 rounded border-l-4 transition-colors ${
                  isChanged
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                }`}
              >
                <div className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                  {name}
                  <span className="text-xs ml-2 text-gray-500">{type}</span>
                </div>
                <div className="font-mono text-xs text-gray-600 dark:text-gray-300 mt-1 break-all">
                  {renderValue(value)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
