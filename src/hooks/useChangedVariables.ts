import { useMemo } from "react";
import type { ExecutionStep } from "../types";

export function useChangedVariables(currentStep?: ExecutionStep, prevStep?: ExecutionStep) {
  return useMemo(() => {
    const changed = new Set<string>();
    if (!currentStep) return changed;
    if (!prevStep) {
      Object.keys(currentStep.variables).forEach(key => changed.add(key));
      return changed;
    }
    const currentVars = currentStep.variables;
    const prevVars = prevStep.variables;
    const currentHeap = currentStep.heap;
    const prevHeap = prevStep.heap;

    for (const key in currentVars) {
      const currentValJson = JSON.stringify(currentVars[key]);
      const prevValJson = JSON.stringify(prevVars[key]);
      if (!Object.prototype.hasOwnProperty.call(prevVars, key) || currentValJson !== prevValJson) {
        changed.add(key);
      }
    }
    for (const key in currentVars) {
      const val = currentVars[key];
      if (val && val.__ref__) {
        const refId = val.__ref__;
        if (!prevHeap[refId] || JSON.stringify(currentHeap[refId]) !== JSON.stringify(prevHeap[refId])) {
          changed.add(key);
        }
      }
    }
    return changed;
  }, [currentStep, prevStep]);
}
