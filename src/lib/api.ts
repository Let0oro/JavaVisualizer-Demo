import { tokenize } from "./lexer";
import { Parser } from "./parser";
import { Interpreter } from "./interpreter";
import type { ExecutionStep } from "@/types";

export async function interpretJavaCode(code: string): Promise<ExecutionStep[]> {
  const tokens = tokenize(code);
  const ast = new Parser(tokens).parse();
  const interpreter = new Interpreter();
  return interpreter.run(ast);
}