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
  private allDeclaredVariables = new Set<string>();

  public run(ast: AST.Program): ExecutionStep[] {
    // 🔧 FIX: Inicializar System como built-in en el entorno global
    this.globalEnv.declare("System", { __builtinSystem: true });

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
    const currentVars = this.currentEnv.getSnapshot();
    const allVariables: Record<string, any> = {};

    this.allDeclaredVariables.forEach(varName => {
      try {
        // Intenta obtener el valor del scope actual
        allVariables[varName] = this.currentEnv.lookup(varName);
      } catch {
        // Si no existe en el scope actual, marca como "not-declared"
        allVariables[varName] = { _status: 'not-declared' };
      }
    });
    this.trace.push({
      lineNumber: line,
      variables: allVariables,
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
        let value: any;
        if (decl.value) value = this.evaluate(decl.value);
        else if (decl.type === 'int' || decl.type === 'double') value = 0;
        else if (decl.type === 'boolean') value = false;
        else value = null;
        this.allDeclaredVariables.add(decl.name);
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
          case '%': return left % right;
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
        const expr = node as any; // MemberExpr
        const obj = this.evaluate(expr.object);

        // Built-in: System.out
        if (obj && typeof obj === "object" && "__builtinSystem" in obj) {
          const propertyNode = expr.property as any;
          const propertyName = propertyNode.symbol;
          if (propertyName === "out") {
            return { __builtinSystemOut: true };
          }
        }

        // Built-in: System.out.println (o cualquier método de out)
        if (obj && typeof obj === "object" && "__builtinSystemOut" in obj) {
          const propertyNode = expr.property as any;
          const methodName = propertyNode.symbol;
          return { __builtinSystemOutMethod: methodName };
        }

        // Array o object normal
        if (expr.computed) { // arr[i]
          const index = this.evaluate(expr.property);
          const heapObj = this.heap[obj.__ref__];
          if (heapObj?.type === 'array') return heapObj.values[index];
        } else { // obj.length
          const propertyNode = expr.property as any;
          if (propertyNode.symbol === 'length') {
            const heapObj = this.heap[obj.__ref__];
            if (heapObj?.type === 'array') return heapObj.values.length;
          }
        }
        return;
      }
      case "CallExpr": {
        const expr = node as any;

        // 🔍 DEBUG: Ver estructura del CallExpr
        console.log("🔍 CallExpr detected");
        console.log("  callee.kind:", expr.callee?.kind);

        if (expr.callee?.kind === "MemberExpr") {
          const memberExpr = expr.callee;
          console.log("  memberExpr.object.kind:", memberExpr.object?.kind);
          console.log("  memberExpr.property.kind:", memberExpr.property?.kind);

          if (memberExpr.object?.kind === "MemberExpr") {
            const outerMember = memberExpr.object;
            console.log("  outerMember.object.kind:", outerMember.object?.kind);
            console.log("  outerMember.object.symbol:", outerMember.object?.symbol);
            console.log("  outerMember.property.kind:", outerMember.property?.kind);
            console.log("  outerMember.property.symbol:", outerMember.property?.symbol);
            console.log("  memberExpr.property.symbol:", memberExpr.property?.symbol);

            // Detectar System.out.println/print/printf
            if (
              outerMember.object?.kind === "Identifier" &&
              outerMember.object?.symbol === "System" &&
              outerMember.property?.kind === "Identifier" &&
              outerMember.property?.symbol === "out" &&
              memberExpr.property?.kind === "Identifier"
            ) {
              const methodName = memberExpr.property.symbol;
              console.log("✅ System.out." + methodName + " detected!");

              const args = expr.args.map((arg: any) => this.evaluate(arg));

              if (methodName === "println") {
                const output = args.length > 0 ? `${interpretEscapes(String(args[0]))}\n` : '\n';
                this.trace.push({
                  lineNumber: expr.line,
                  variables: this.currentEnv.getSnapshot(),
                  heap: JSON.parse(JSON.stringify(this.heap)),
                  callStack: this.callStack.map(f => ({ methodName: f.methodName, line: f.line })),
                  consoleOutput: output,
                });
                return;
              } else if (methodName === "print") {
                const output = args.length > 0 ? interpretEscapes(String(args[0])) : '';
                this.trace.push({
                  lineNumber: expr.line,
                  variables: this.currentEnv.getSnapshot(),
                  heap: JSON.parse(JSON.stringify(this.heap)),
                  callStack: this.callStack.map(f => ({ methodName: f.methodName, line: f.line })),
                  consoleOutput: output,
                });
                return;
              } else if (methodName === "printf") {
                let output = '';
                if (args.length > 0) {
                  let format = interpretEscapes(String(args[0]));
                  let argIndex = 1;
                  output = format.replace(/%[dfs]/g, () => {
                    return argIndex < args.length ? String(args[argIndex++]) : '';
                  });
                }
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

          // ===== Llamadas a métodos de instancia (method calls) =====
          console.log("⚠️  Treating as instance method call");
          const args = expr.args.map((arg: any) => this.evaluate(arg));
          const instanceRef = this.evaluate(memberExpr.object) as HeapRef;

          if (!instanceRef || typeof instanceRef !== 'object' || !('__ref__' in instanceRef)) {
            throw new Error("Cannot call method on non-object (no __ref__ found).");
          }

          const instance = this.heap[instanceRef.__ref__];
          if (instance?.type !== 'object') throw new Error("Cannot call method on non-object.");
          const classDef = this.globalEnv.lookup(instance.className);
          const method = classDef.methods[memberExpr.property.symbol];
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

        throw new Error("Unsupported call expression (callee is not MemberExpr)");
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
      case "CompoundAssignmentExpr": {
        const expr = node as AST.CompoundAssignmentExpr;

        // Obtener el valor actual de la variable
        const currentValue = this.evaluate(expr.assignee);

        // Evaluar el lado derecho
        const rightValue = this.evaluate(expr.value);

        // Aplicar la operación compuesta
        let newValue: any;
        switch (expr.operator) {
          case "+=":
            // Soporte especial para strings (concatenación)
            if (typeof currentValue === "string" || typeof rightValue === "string") {
              newValue = String(currentValue) + String(rightValue);
            } else {
              newValue = currentValue + rightValue;
            }
            break;
          case "-=":
            newValue = currentValue - rightValue;
            break;
          case "*=":
            newValue = currentValue * rightValue;
            break;
          case "/=":
            if (rightValue === 0) throw new Error("Division by zero");
            newValue = currentValue / rightValue;
            break;
        }

        this.addTrace(expr.line);

        // Asignar el nuevo valor (usando la MISMA lógica que AssignmentExpr)
        if (expr.assignee.kind === "Identifier") {
          return this.currentEnv.assign((expr.assignee as AST.Identifier).symbol, newValue);
        } else if (expr.assignee.kind === "MemberExpr" && (expr.assignee as AST.MemberExpr).computed) {
          // Array assignment: arr[i] += value
          const memExpr = expr.assignee as AST.MemberExpr;
          const ref = this.evaluate(memExpr.object) as HeapRef;
          const index = this.evaluate(memExpr.property);
          const heapObj = this.heap[ref.__ref__];
          if (heapObj?.type === 'array') {
            heapObj.values[index] = newValue;
          }
          return newValue;
        }

        return newValue;
      }
      default:
        console.error("Unhandled AST node:", node);
        throw new Error(`Unsupported language feature: ${(node as AST.Node).kind}`);
    }
  }
}
