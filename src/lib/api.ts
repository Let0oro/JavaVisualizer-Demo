
import { Interpreter } from "./interpreter";
import type { ExecutionStep } from "@/types";
import { tokenize } from "./lexer";
import { Parser } from "./parser";

  export const interpretJavaCode = async (code: string): Promise<ExecutionStep[]> => {
    console.log('🔧 Starting Java code interpretation...');

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {

          const tokens = tokenize(code);
          const parser = new Parser(tokens);
          const ast = parser.parse();

          console.log('▶️  Running interpreter...');
          const interpreter = new Interpreter();
          const trace = interpreter.run(ast);

          if (trace.length === 0 && code.trim().length > 0) {
            reject(new Error("Execution produced no steps."));
            return;
          }

          console.log(`✅ Execution successful. Generated ${trace.length} steps.`);
          resolve(trace);
        } catch (error) {
          console.error('❌ Error during interpretation:', error);
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      }, 100);
    });
  };
