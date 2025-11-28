import { useMemo } from 'react';
import type { ExecutionStep } from '../types';

/**
 * Hook que rastrea qué objetos/arrays en el heap han cambiado entre pasos
 * Ahora que los datos están incrustados en variables, este hook debe adaptarse
 */
export function useChangedHeapIds(
  currentStep: ExecutionStep | undefined,
  prevStep: ExecutionStep | undefined
) {
  return useMemo(() => {
    if (!currentStep || !prevStep) {
      return new Set<string>();
    }

    const changedIds = new Set<string>();

    // Comparar cada variable entre steps
    const currentVars = currentStep.variables || {};
    const prevVars = prevStep.variables || {};

    for (const [varName, currentValue] of Object.entries(currentVars)) {
      const prevValue = prevVars[varName];

      // Si es un array (es una lista en JSON)
      if (Array.isArray(currentValue)) {
        // Marcar como cambiado si no existía antes o si cambió
        if (!Array.isArray(prevValue) || JSON.stringify(currentValue) !== JSON.stringify(prevValue)) {
          changedIds.add(varName);
        }
      }

      // Si es un objeto (no primitivo)
      else if (typeof currentValue === 'object' && currentValue !== null && !Array.isArray(currentValue)) {
        if (
          typeof prevValue !== 'object' ||
          prevValue === null ||
          JSON.stringify(currentValue) !== JSON.stringify(prevValue)
        ) {
          changedIds.add(varName);
        }
      }

      // Primitivos: comparar valores directos
      else if (currentValue !== prevValue) {
        changedIds.add(varName);
      }
    }

    return changedIds;
  }, [currentStep, prevStep]);
}
