import React, { useEffect, useState } from 'react';
import { type HeapValue, isHeapRef } from '@/types';

interface VariablesPanelProps {
  variables: Record<string, any>;
  changedVariableIds: Set<string>;
}

const renderValue = (value: any): string => {
  // Verificar si es una variable "not-declared"
  if (value && typeof value === 'object' && value._status === 'not-declared') {
    return 'not-declared';
  }

  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (isHeapRef(value)) {
    return `@${value.ref}`;
  }
  if (typeof value === 'string') {
    return `"${value}"`;
  }
  return String(value);
};

const getValueType = (value: any): string => {
  // Verificar si es una variable "not-declared"
  if (value && typeof value === 'object' && value._status === 'not-declared') {
    return 'not-declared';
  }

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
    'not-declared': 'text-red-400',  // ← Color para not-declared
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
            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <p>No hay variables declaradas</p>
          </div>
        ) : (
          <div className="space-y-1">
            {variableEntries.map(([name, value]) => {
              const isHighlighted = highlighted.has(name);
              const type = getValueType(value);
              const typeColor = getTypeColor(type);
              const isNotDeclared = type === 'not-declared';

              return (
                <div
                  key={name}
                  className={`
                    flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-300
                    ${isHighlighted
                      ? 'bg-amber-500/20 ring-2 ring-amber-400/40 scale-[1.02]'
                      : isNotDeclared
                      ? 'bg-red-900/10 opacity-60'
                      : 'bg-gray-800/40 hover:bg-gray-800/60'
                    }
                  `}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Variable Icon */}
                    <div className={`
                      w-6 h-6 rounded flex items-center justify-center shrink-0
                      ${isNotDeclared ? 'bg-red-500/20' : 'bg-blue-500/20'}
                    `}>
                      {isNotDeclared ? (
                        <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>

                    {/* Variable Name */}
                    <span className="font-mono text-sm font-medium text-gray-200 truncate">
                      {name}
                    </span>

                    {/* Type Badge */}
                    <span className={`
                      px-2 py-0.5 rounded text-xs font-mono font-semibold shrink-0
                      ${typeColor}
                      ${isNotDeclared ? 'bg-red-500/10' : 'bg-gray-700/50'}
                    `}>
                      {type}
                    </span>
                  </div>

                  {/* Value */}
                  <span className={`
                    font-mono text-sm ml-2 truncate max-w-[120px]
                    ${isNotDeclared
                      ? 'text-red-400/80 italic'
                      : type === 'string'
                      ? 'text-green-400'
                      : 'text-gray-300'
                    }
                  `}>
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
