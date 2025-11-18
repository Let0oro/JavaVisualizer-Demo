import React, { useEffect, useState } from 'react';
import { type HeapValue, isHeapRef } from '@/types';

interface VariablesPanelProps {
  variables: Record<string, any>;
  changedVariableIds: Set<string>;
}

const renderValue = (value: any): string => {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (isHeapRef(value)) {
    return `@${value.__ref__}`;
  }
  if (typeof value === 'string') {
    return `"${value}"`;
  }
  return String(value);
};

const getValueType = (value: any): string => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (isHeapRef(value)) return 'ref';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return Number.isInteger(value) ? 'int' : 'double';
  if (typeof value === 'boolean') return 'boolean';
  return 'unknown';
};

const getTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    int: 'text-orange-400',
    double: 'text-orange-400',
    string: 'text-green-400',
    boolean: 'text-purple-400',
    ref: 'text-cyan-400',
    null: 'text-gray-500',
    undefined: 'text-gray-500',
  };
  return colors[type] || 'text-gray-400';
};

export const VariablesPanel: React.FC<VariablesPanelProps> = ({
  variables,
  changedVariableIds
}) => {
  const variableEntries = Object.entries(variables);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (changedVariableIds.size > 0) {
      setHighlighted(new Set(changedVariableIds));
      const timer = setTimeout(() => setHighlighted(new Set()), 800);
      return () => clearTimeout(timer);
    }
  }, [changedVariableIds]);

  return (
    <div className="panel-card">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Variables
          </h3>
          <span className="text-xs text-gray-400 font-mono">
            {variableEntries.length} {variableEntries.length === 1 ? 'var' : 'vars'}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="panel-body">
        {variableEntries.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p>No hay variables en el scope actual</p>
          </div>
        ) : (
          <div className="space-y-2">
            {variableEntries.map(([name, value]) => {
              const isHighlighted = highlighted.has(name);
              const type = getValueType(value);
              const typeColor = getTypeColor(type);

              return (
                <div
                  key={name}
                  className={`
                    flex items-center justify-between p-3 rounded-lg
                    bg-gray-800/40 border border-gray-700/50
                    transition-all duration-300
                    ${isHighlighted ? 'variable-changed ring-2 ring-green-500/50' : ''}
                  `}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-sm font-mono text-gray-300 font-medium">
                      {name}
                    </span>
                    <span className={`text-xs font-mono ${typeColor} opacity-75`}>
                      {type}
                    </span>
                  </div>
                  <span className={`text-sm font-mono ${typeColor} font-medium truncate max-w-[150px]`} title={renderValue(value)}>
                    {renderValue(value)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};