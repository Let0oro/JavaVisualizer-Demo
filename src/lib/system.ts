import { interpretEscapes } from "./utils";

// Implementa System.out.println, print, printf
export function systemOut(method: string, args: any[]): string | null {
  let output: string | null = null;
  if (method === "println") {
    output = args.length === 0 ? "\n"
      : interpretEscapes(String(args[0])) + "\n";
  } else if (method === "print") {
    output = args.length === 0 ? "" : interpretEscapes(String(args[0]));
  } else if (method === "printf") {
    if (args.length === 0) return null;
    let format = interpretEscapes(String(args[0]));
    let argIndex = 1;
    output = format.replace(/%[sd]/g, () =>
      argIndex < args.length ? String(args[argIndex++]) : ""
    );
  }
  return output;
}
