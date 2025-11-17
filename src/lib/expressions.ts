import type { ExecutionStep } from "@/types";
import * as AST from "./ast";
import { interpretEscapes } from "./utils";

export function evalBinaryExpr(
  node: AST.BinaryExpr, env: any, ctx: any
) {
  const left = ctx.evaluate(node.left, env, ctx);
  const right = ctx.evaluate(node.right, env, ctx);
  switch (node.operator) {
    case "+": return left + right;
    case "-": return left - right;
    case "*": return left * right;
    case "/":
      if (Number.isInteger(left) && Number.isInteger(right)) return Math.trunc(left / right);
      return left / right;
    case "%": return left % right;
    case "<": return left < right;
    case ">": return left > right;
    case "<=": return left <= right;
    case ">=": return left >= right;
    case "==": return left === right;
    case "!=": return left !== right;
    default: throw new Error(`Unknown operator: ${node.operator}`);
  }
}

export function evalCallExpr(
  node: AST.CallExpr, env: any, ctx: any
) {
  // Si es System.out.println, print, printf, llama aquí a builtins/system.ts
  // Si no, busca el método y ejecuta con activación local
  // Ejemplo muy simplificado:
  if (
    node.callee.kind === "MemberExpr" &&
    node.callee.object.kind === "MemberExpr" &&
    node.callee.object.object.kind === "Identifier" &&
    node.callee.object.object.symbol === "System" &&
    node.callee.object.property.kind === "Identifier" &&
    node.callee.object.property.symbol === "out"
  ) {
    // println, print, printf
    const method = node.callee.property.kind === "Identifier" ? node.callee.property.symbol : "";
    return ctx.systemOut(method, node.args.map(arg => ctx.evaluate(arg, env, ctx)));
  }
  // Lógica para métodos definidos por el usuario...
}
