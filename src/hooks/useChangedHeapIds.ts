import { useMemo } from "react";
import type { ExecutionStep } from "../types";

export function useChangedHeapIds(currentStep?: ExecutionStep, prevStep?: ExecutionStep) {
  return useMemo(() => {
    const changed = new Set<string>();
    if (!currentStep) return changed;
    const currentHeap = currentStep.heap;
    if (!prevStep) {
      Object.keys(currentHeap).forEach(id => changed.add(id));
      return changed;
    }
    const prevHeap = prevStep.heap;
    for (const id in currentHeap) {
      if (!prevHeap[id] || JSON.stringify(currentHeap[id]) !== JSON.stringify(prevHeap[id])) {
        changed.add(id);
      }
    }
    return changed;
  }, [currentStep, prevStep]);
}
