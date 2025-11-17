import type { ExecutionStep, HeapRef, HeapValue } from "@/types";
import * as AST from "./ast";
import { Environment, BREAK_SENTINEL, CONTINUE_SENTINEL, ReturnSentinel, type StackFrame } from "./environment";
import { interpretEscapes } from "./utils";

export const MAX_STEPS = 25000;

export class Interpreter {
  private trace: ExecutionStep[] = [];
  private heap: Record<string, HeapValue> = {};
  private nextHeapId = 0;
  private globalEnv = new Environment();
  private currentEnv = this.globalEnv;
  private callStack: StackFrame[] = [];

  public run(ast: AST.Program): ExecutionStep[] {
    for (const node of ast.body) {
      if (node.kind === "ClassDeclaration") {
        const methods: Record<string, AST.MethodDeclaration> = {};
        for(const member of node.body) {
            if(member.kind === "MethodDeclaration") methods[member.name] = member;
        }
        this.globalEnv.declare(node.name, { type: 'class', name: node.name, methods });
      }
    }

    const mainClass = this.globalEnv.lookup("Main");
    if (!mainClass?.methods?.main) throw new Error("Main.main method not found.");

    this.callStack.push({ methodName: 'main', line: mainClass.methods.main.line, env: this.currentEnv });
    this.evaluate({ kind: "BlockStatement", body: mainClass.methods.main.body, line: mainClass.methods.main.line });
    this.callStack.pop();

    return this.trace;
  }

  private addTrace(line: number, event?: ExecutionStep['event']) {
      if(this.trace.length > MAX_STEPS) throw new Error(`Execution step limit reached (${MAX_STEPS}).`);
      this.trace.push({
          lineNumber: line,
          variables: this.currentEnv.getSnapshot(),
          heap: JSON.parse(JSON.stringify(this.heap)),
          callStack: this.callStack.map(f => ({ methodName: f.methodName, line: f.line })),
          event,
      });
  }

  private evaluate(node: AST.Stmt | AST.Expr): any {
    switch (node.kind) {
      // --- Statements ---
      case "BlockStatement": {
        this.currentEnv = new Environment(this.currentEnv);
        let result: any;
        for (const stmt of (node as AST.BlockStatement).body) {
          result = this.evaluate(stmt);
          if (result === BREAK_SENTINEL || result === CONTINUE_SENTINEL || result instanceof ReturnSentinel) {
             break;
          }
        }
        this.currentEnv = this.currentEnv.parent!;
        return result;
      }
      case "VariableDeclaration": {
        const decl = node as AST.VariableDeclaration;
        let value;
        if (decl.value) value = this.evaluate(decl.value);
        else if (decl.type === 'int' || decl.type === 'double') value = 0;
        else if (decl.type === 'boolean') value = false;
        else value = null;
        this.addTrace(decl.line);
        return this.currentEnv.declare(decl.name, value);
      }
      case "ExpressionStatement": return this.evaluate((node as AST.ExpressionStatement).expression);
      case "ReturnStatement": {
          const stmt = node as AST.ReturnStatement;
          const value = stmt.argument ? this.evaluate(stmt.argument) : undefined;
          this.addTrace(stmt.line, 'return');
          return new ReturnSentinel(value);
      }
      case "BreakStatement": this.addTrace(node.line); return BREAK_SENTINEL;
      case "ContinueStatement": this.addTrace(node.line); return CONTINUE_SENTINEL;
      case "ForStatement": {
        const stmt = node as AST.ForStatement;
        this.currentEnv = new Environment(this.currentEnv);
        if (stmt.init) this.evaluate(stmt.init);
        while (stmt.test ? this.evaluate(stmt.test) : true) {
          const bodyResult = this.evaluate(stmt.body);
          if (bodyResult === BREAK_SENTINEL || bodyResult instanceof ReturnSentinel) break;
          if (bodyResult === CONTINUE_SENTINEL) {
              if (stmt.update) this.evaluate(stmt.update);
              continue;
          }
          if (stmt.update) this.evaluate(stmt.update);
        }
        this.currentEnv = this.currentEnv.parent!;
        return;
      }
      case "WhileStatement": {
        const stmt = node as AST.WhileStatement;
        while(this.evaluate(stmt.test)) {
            const bodyResult = this.evaluate(stmt.body);
            if (bodyResult === BREAK_SENTINEL || bodyResult instanceof ReturnSentinel) break;
            if (bodyResult === CONTINUE_SENTINEL) continue;
        }
        return;
      }
      case "DoWhileStatement": {
        const stmt = node as AST.DoWhileStatement;
        do {
            const bodyResult = this.evaluate(stmt.body);
            if (bodyResult === BREAK_SENTINEL || bodyResult instanceof ReturnSentinel) break;
            if (bodyResult === CONTINUE_SENTINEL) continue;
        } while (this.evaluate(stmt.test));
        return;
      }
      case "IfStatement": {
          const stmt = node as AST.IfStatement;
          if (this.evaluate(stmt.test)) return this.evaluate(stmt.consequent);
          else if (stmt.alternate) return this.evaluate(stmt.alternate);
          return;
      }
      // --- Expressions ---
      case "BinaryExpr": {
        const expr = node as AST.BinaryExpr;
        const left = this.evaluate(expr.left);
        const right = this.evaluate(expr.right);
        this.addTrace(expr.line);
        switch (expr.operator) {
          case '+': return left + right;
          case '-': return left - right;
          case '*': return left * right;
          case '/':
            // Emulate Java's integer division if both operands are integers
            if (Number.isInteger(left) && Number.isInteger(right)) {
              return Math.trunc(left / right);
            }
            return left / right;
          case '>': return left > right;
          case '<': return left < right;
          case '>=': return left >= right;
          case '<=': return left <= right;
          case '==': return left === right;
          case '!=': return left !== right;
        }
        return;
      }
      case "LogicalExpr": {
          const expr = node as AST.LogicalExpr;
          const left = this.evaluate(expr.left);
          this.addTrace(expr.line);
          if (expr.operator === '&&' && !left) return false;
          if (expr.operator === '||' && left) return true;
          return this.evaluate(expr.right);
      }
      case "UnaryExpr": {
          const expr = node as AST.UnaryExpr;
          const arg = this.evaluate(expr.argument);
          this.addTrace(expr.line);
          if (expr.operator === '!') return !arg;
          if (expr.operator === '-') return -arg;
          return;
      }
      case "Identifier": return this.currentEnv.lookup((node as AST.Identifier).symbol);
      case "NumericLiteral": return (node as AST.NumericLiteral).value;
      case "DoubleLiteral": return (node as AST.DoubleLiteral).value;
      case "BooleanLiteral": return (node as AST.BooleanLiteral).value;
      case "StringLiteral": return (node as AST.StringLiteral).value;
      case "AssignmentExpr": {
        const expr = node as AST.AssignmentExpr;
        const value = this.evaluate(expr.value);
        this.addTrace(expr.line);
        if (expr.assignee.kind === "Identifier") {
          return this.currentEnv.assign((expr.assignee as AST.Identifier).symbol, value);
        } else if (expr.assignee.kind === "MemberExpr" && (expr.assignee as AST.MemberExpr).computed) {
            const memExpr = expr.assignee as AST.MemberExpr;
            const ref = this.evaluate(memExpr.object) as HeapRef;
            const index = this.evaluate(memExpr.property);
            const heapObj = this.heap[ref.__ref__];
            if(heapObj?.type === 'array') heapObj.values[index] = value;
            return value;
        }
        return;
      }
      case "NewExpr": {
          const expr = node as AST.NewExpr;
          const refId = `heap_${this.nextHeapId++}`;
          this.heap[refId] = { type: 'object', className: expr.callee.symbol, fields: {} };
          this.addTrace(expr.line, 'allocation');
          return { __ref__: refId };
      }
      case "ArrayCreationExpr": {
          const expr = node as AST.ArrayCreationExpr;
          const refId = `heap_${this.nextHeapId++}`;
          const type = expr.type;
          let defaultValue: any = 0;
          if (type === 'boolean') defaultValue = false;
          else if (type !== 'int' && type !== 'double') defaultValue = null;

          const values = expr.values
            ? expr.values.map(v => this.evaluate(v))
            : Array(this.evaluate(expr.size!)).fill(defaultValue);
          this.heap[refId] = { type: 'array', elementType: type, values };
          this.addTrace(expr.line, 'allocation');
          return { __ref__: refId };
      }
      case "MemberExpr": {
          const expr = node as AST.MemberExpr;
          const obj = this.evaluate(expr.object);
          if (expr.computed) { // arr[i]
              const index = this.evaluate(expr.property);
              const heapObj = this.heap[obj.__ref__];
              if (heapObj?.type === 'array') return heapObj.values[index];
          } else { // obj.length
              if ((expr.property as AST.Identifier).symbol === 'length') {
                const heapObj = this.heap[obj.__ref__];
                if (heapObj?.type === 'array') return heapObj.values.length;
              }
          }
          return;
      }
      case "CallExpr": {
        const expr = node as AST.CallExpr;
        const args = expr.args.map(arg => this.evaluate(arg));

        if (
          expr.callee.kind === "MemberExpr" &&
          (expr.callee as AST.MemberExpr).object.kind === 'MemberExpr' &&
          (((expr.callee as AST.MemberExpr).object as AST.MemberExpr).object.kind === 'Identifier') &&
          (((expr.callee as AST.MemberExpr).object as AST.MemberExpr).object as AST.Identifier).symbol === 'System'
        ) {
            const callee = expr.callee as AST.MemberExpr;
            const systemOut = callee.object as AST.MemberExpr;
            if (systemOut.property && systemOut.property.kind === 'Identifier' && (systemOut.property as AST.Identifier).symbol === 'out' && callee.property.kind === 'Identifier') {
                const methodName = (callee.property as AST.Identifier).symbol;

                let output: string | null = null;
                if (methodName === 'println') {
                  output = args.length > 0 ? `${interpretEscapes(String(args[0]))}\n` : '\n';
                } else if (methodName === 'print') {
                  if (args.length > 0) output = interpretEscapes(String(args[0]));
                } else if (methodName === 'printf') {
                  if (args.length > 0) {
                      let format = interpretEscapes(String(args[0]));
                      let argIndex = 1;
                      output = format.replace(/%[dfs]/g, () => {
                        return argIndex < args.length ? String(args[argIndex++]) : '';
                      });
                  }
                }

                if (output !== null) {
                  this.trace.push({
                      lineNumber: expr.line,
                      variables: this.currentEnv.getSnapshot(),
                      heap: JSON.parse(JSON.stringify(this.heap)),
                      callStack: this.callStack.map(f => ({ methodName: f.methodName, line: f.line })),
                      consoleOutput: output,
                  });
                  return;
                }
            }
        }

        const calleeInfo = expr.callee as AST.MemberExpr;
        const instanceRef = this.evaluate(calleeInfo.object) as HeapRef;
        const instance = this.heap[instanceRef.__ref__];
        if (instance?.type !== 'object') throw new Error("Cannot call method on non-object.");

        const classDef = this.globalEnv.lookup(instance?.className);
        const method = classDef.methods[(calleeInfo.property as AST.Identifier).symbol];

        const activationRecord = new Environment(this.globalEnv);
        for(let i = 0; i < method.params.length; i++) {
            activationRecord.declare(method.params[i].name, args[i]);
        }

        const callerEnv = this.currentEnv;
        this.callStack.push({ methodName: method.name, line: method.line, env: callerEnv });
        this.currentEnv = activationRecord;

        const result = this.evaluate({ kind: "BlockStatement", body: method.body, line: method.line });

        this.callStack.pop();
        this.currentEnv = callerEnv;

        if (result instanceof ReturnSentinel) return result.value;
        return result;
      }
      case "PostfixExpr": {
          const expr = node as AST.PostfixExpr;
          const varName = expr.argument.symbol;
          const currentValue = this.currentEnv.lookup(varName);
          const newValue = expr.operator === '++' ? currentValue + 1 : currentValue - 1;
          this.currentEnv.assign(varName, newValue);
          this.addTrace(expr.line);
          return currentValue;
      }
      default:
        console.error("Unhandled AST node:", node);
        throw new Error(`Unsupported language feature: ${(node as AST.Node).kind}`);
    }
  }
}
