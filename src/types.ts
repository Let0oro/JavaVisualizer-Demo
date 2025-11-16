
export interface HighlightedRegion {
  start: number; // column start, inclusive
  end: number;   // column end, exclusive
}

// Represents a reference to a value on the heap
export interface HeapRef {
  __ref__: string;
}

export type HeapValue = {
  type: 'array';
  elementType: string;
  values: any[];
} | {
  type: 'object';
  className: string;
  fields: Record<string, any>;
};

export function isHeapRef(value: any): value is HeapRef {
    return value && typeof value === 'object' && value.hasOwnProperty('__ref__');
}


export interface StackFrameInfo {
  methodName: string;
  line: number;
}

export interface ActiveLoop {
    lineNumber: number;
    state: string;
}

export interface ExecutionStep {
  lineNumber: number;
  variables: Record<string, any>; // Current stack frame's scope
  callStack: StackFrameInfo[];
  heap: Record<string, HeapValue>;
  consoleOutput?: string | null;
  highlightedRegion?: HighlightedRegion;
  activeLoops?: ActiveLoop[];
  event?: 'allocation' | 'return';
}
