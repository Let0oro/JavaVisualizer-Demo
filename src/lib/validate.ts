import { ParseError } from "./errors";
import { tokenize } from "./lexer";
import { Parser } from "./parser";

// --- Syntax Validation ---
export const validateJavaSyntax = (code: string): { line: number, message: string } | null => {
  if (!code.trim()) return null;
  try {
    const tokens = tokenize(code);
    new Parser(tokens).parse();
    return null;
  } catch (e) {
    if (e instanceof ParseError) return { line: e.line, message: e.message };
    if (e instanceof Error) return { line: 1, message: e.message };
    return { line: 1, message: 'An unknown parsing error occurred.' };
  }
};