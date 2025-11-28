// --- Lite Syntax Validation ---
// Solo chequeos muy básicos - sin intentar parse completo
export const validateJavaSyntax = (code: string): { line: number; message: string } | null => {
  if (!code.trim()) return null;

  // Chequeos BÁSICOS (sin parser completo)
  const lines = code.split('\n');
  let braceCount = 0;
  let parenCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) break; 
    // Contar brackets
    for (const char of line) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
    }

    // Error si braces desbalanceados
    if (braceCount < 0) {
      return { line: i + 1, message: 'Unmatched closing brace }' };
    }
    if (parenCount < 0) {
      return { line: i + 1, message: 'Unmatched closing parenthesis )' };
    }
  }

  // Chequeo final
  if (braceCount !== 0) {
    return { line: lines.length, message: 'Unmatched braces' };
  }
  if (parenCount !== 0) {
    return { line: lines.length, message: 'Unmatched parentheses' };
  }

  return null;
};
