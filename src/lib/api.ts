/*
import { tokenize } from "./lexer";
import { Parser } from "./parser";
import { Interpreter } from "./interpreter";
import type { ExecutionStep } from "@/types";

   export async function interpretJavaCode(code: string): Promise<ExecutionStep[]> {
  const tokens = tokenize(code);
  const ast = new Parser(tokens).parse();
  const interpreter = new Interpreter();
  return interpreter.run(ast);
} */



  // src/lib/api.ts
  // import { parse } from "java-parser";
  // import { CSTToASTConverter } from "./cstToAst";
  import { Interpreter } from "./interpreter";
  import type { ExecutionStep } from "@/types";
import { tokenize } from "./lexer";
import { Parser } from "./parser";

  export const interpretJavaCode = async (code: string): Promise<ExecutionStep[]> => {
    console.log('🔧 Starting Java code interpretation...');

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          // console.log('📝 Parsing code with java-parser...');
          // const cst = parse(code);

          // console.log('🔄 Converting CST to AST...');
          // const converter = new CSTToASTConverter();
          // const ast = converter.convert(cst);

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
