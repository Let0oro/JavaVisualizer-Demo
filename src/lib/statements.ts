import { Environment, BREAK_SENTINEL, CONTINUE_SENTINEL, ReturnSentinel } from "./environment";
import type { ExecutionStep } from "@/types";
import * as AST from "./ast";

// Cada función recibe el nodo AST correspondiente, el entorno, y `ctx` general/intérprete.

export function evalBlockStatement(
  node: AST.BlockStatement,
  env: Environment,
  ctx: any
) {
  const localEnv = new Environment(env);
  let result: any = undefined;
  for (const stmt of node.body) {
    result = ctx.evaluate(stmt, localEnv, ctx);
    if (result === BREAK_SENTINEL || result === CONTINUE_SENTINEL || result instanceof ReturnSentinel) break;
  }
  return result;
}

export function evalIfStatement(
  node: AST.IfStatement,
  env: Environment,
  ctx: any
) {
  const test = ctx.evaluate(node.test, env, ctx);
  if (test) return ctx.evaluate(node.consequent, env, ctx);
  else if (node.alternate) return ctx.evaluate(node.alternate, env, ctx);
  return undefined;
}

export function evalForStatement(
  node: AST.ForStatement, env: Environment, ctx: any
) {
  const localEnv = new Environment(env);
  if (node.init) ctx.evaluate(node.init, localEnv, ctx);
  while (node.test ? ctx.evaluate(node.test, localEnv, ctx) : true) {
    const bodyResult = ctx.evaluate(node.body, localEnv, ctx);
    if (bodyResult === BREAK_SENTINEL || bodyResult instanceof ReturnSentinel) break;
    if (bodyResult === CONTINUE_SENTINEL) { if (node.update) ctx.evaluate(node.update, localEnv, ctx); continue; }
    if (node.update) ctx.evaluate(node.update, localEnv, ctx);
  }
  return undefined;
}

export function evalWhileStatement(
  node: AST.WhileStatement, env: Environment, ctx: any
) {
  while (ctx.evaluate(node.test, env, ctx)) {
    const bodyResult = ctx.evaluate(node.body, env, ctx);
    if (bodyResult === BREAK_SENTINEL || bodyResult instanceof ReturnSentinel) break;
    if (bodyResult === CONTINUE_SENTINEL) continue;
  }
  return undefined;
}

// Añade exportaciones similares para DoWhile, Break, Continue, Return, etc.
