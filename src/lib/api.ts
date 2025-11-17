// api.ts
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

// export const interpretJavaCode = async (code: string): Promise<ExecutionStep[]> => {
//   console.log('Connecting to secure execution sandbox...');
//   return new Promise((resolve, reject) => {
//     setTimeout(() => {
//       try {
//         const tokens = tokenize(code);
//         const ast = new Parser(tokens).parse();
//         const interpreter = new Interpreter();
//         const trace = interpreter.run(ast);

//         if (trace.length === 0 && code.trim().length > 0) {
//           reject(new Error("Interpretation failed. The code may contain unsupported syntax or logic errors."));
//           return;
//         }

//         console.log('Execution successful. Received trace from sandbox.');
//         resolve(trace);
//       } catch (error) {
//         console.error('Error during sandboxed execution simulation:', error);
//         reject(error instanceof Error ? error : new Error(String(error)));
//       }
//     }, 100);
//   });
// };