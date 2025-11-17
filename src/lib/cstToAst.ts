// src/lib/cstToAst.ts
import { BaseJavaCstVisitorWithDefaults } from "java-parser";
import type * as AST from "./ast";

export class CSTToASTConverter extends BaseJavaCstVisitorWithDefaults {
  constructor() {
    super();
    this.validateVisitor();
  }

  convert(cst: any): AST.Program {
    console.log('  📦 Starting CST conversion...');
    return this.visit(cst);
  }

  // Añade "override" antes de TODOS los métodos que implementan el visitor
  override compilationUnit(ctx: any): AST.Program {
    const classes: AST.Stmt[] = [];

    if (ctx.ordinaryCompilationUnit) {
      const result = this.visit(ctx.ordinaryCompilationUnit);
      if (result) classes.push(...result);
    }

    console.log(`  ✓ Converted ${classes.length} class(es)`);
    return {
      kind: "Program",
      body: classes,
      line: 1
    };
  }

  override ordinaryCompilationUnit(ctx: any): AST.Stmt[] {
    const classes: AST.Stmt[] = [];

    if (ctx.typeDeclaration) {
      for (const typeDecl of ctx.typeDeclaration) {
        const result = this.visit(typeDecl);
        if (result) classes.push(result);
      }
    }

    return classes;
  }

  override typeDeclaration(ctx: any): AST.Stmt | null {
    if (ctx.classDeclaration) {
      return this.visit(ctx.classDeclaration);
    }
    return null;
  }

  override classDeclaration(ctx: any): AST.ClassDeclaration {
    return this.visit(ctx.normalClassDeclaration);
  }

  override normalClassDeclaration(ctx: any): AST.ClassDeclaration {
    const className = ctx.typeIdentifier[0].children.Identifier[0].image;
    console.log(`    📄 Processing class: ${className}`);

    const members: AST.Stmt[] = [];
    const classBody = this.visit(ctx.classBody);
    if (classBody) members.push(...classBody);

    return {
      kind: "ClassDeclaration",
      name: className,
      body: members,
      line: ctx.typeIdentifier[0].location?.startLine || 1
    };
  }

  override classBody(ctx: any): AST.Stmt[] {
    const members: AST.Stmt[] = [];

    if (ctx.classBodyDeclaration) {
      for (const decl of ctx.classBodyDeclaration) {
        const result = this.visit(decl);
        if (result) members.push(result);
      }
    }

    return members;
  }

  override classBodyDeclaration(ctx: any): AST.Stmt | null {
    if (ctx.classMemberDeclaration) {
      return this.visit(ctx.classMemberDeclaration);
    }
    return null;
  }

  override classMemberDeclaration(ctx: any): AST.Stmt | null {
    if (ctx.methodDeclaration) {
      return this.visit(ctx.methodDeclaration);
    }
    return null;
  }

  override methodDeclaration(ctx: any): AST.MethodDeclaration {
    const header = this.visit(ctx.methodHeader);
    const body = ctx.methodBody ? this.visit(ctx.methodBody) : [];

    console.log(`      🔧 Processing method: ${header.name}`);

    return {
      kind: "MethodDeclaration",
      returnType: header.returnType,
      name: header.name,
      params: header.params,
      body: body || [],
      line: header.line
    };
  }

  override methodHeader(ctx: any): any {
    const methodName = ctx.methodDeclarator[0].children.Identifier[0].image;

    let returnType = "void";
    if (ctx.result && ctx.result[0].children.unannType) {
      const typeNode = ctx.result[0].children.unannType[0];
      returnType = this.extractType(typeNode);
    }

    return {
      name: methodName,
      returnType,
      params: [],
      line: ctx.methodDeclarator[0].location?.startLine || 1
    };
  }

  override methodBody(ctx: any): AST.Stmt[] {
    if (ctx.block) {
      return this.visit(ctx.block);
    }
    return [];
  }

  override block(ctx: any): AST.Stmt[] {
    const statements: AST.Stmt[] = [];

    if (ctx.blockStatements) {
      const result = this.visit(ctx.blockStatements);
      if (result) statements.push(...result);
    }

    return statements;
  }

  override blockStatements(ctx: any): AST.Stmt[] {
    const statements: AST.Stmt[] = [];

    if (ctx.blockStatement) {
      for (const stmt of ctx.blockStatement) {
        const result = this.visit(stmt);
        if (result) statements.push(result);
      }
    }

    return statements;
  }

  override blockStatement(ctx: any): AST.Stmt | null {
    if (ctx.statement) {
      return this.visit(ctx.statement);
    }
    return null;
  }

  override statement(ctx: any): AST.Stmt | null {
    if (ctx.statementWithoutTrailingSubstatement) {
      return this.visit(ctx.statementWithoutTrailingSubstatement);
    }
    return null;
  }

  override statementWithoutTrailingSubstatement(ctx: any): AST.Stmt | null {
    if (ctx.expressionStatement) {
      return this.visit(ctx.expressionStatement);
    }
    return null;
  }

  override expressionStatement(ctx: any): AST.ExpressionStatement {
    const expr = this.visit(ctx.statementExpression);

    return {
      kind: "ExpressionStatement",
      expression: expr,
      line: 1
    };
  }

  override statementExpression(ctx: any): AST.Expr {
    console.log('🔍 statementExpression keys:', Object.keys(ctx));

    if (ctx.methodInvocation) {
      return this.visit(ctx.methodInvocation);
    }

    // También puede estar envuelto en expression
    if (ctx.expression) {
      console.log('🔍 Has expression wrapper');
      return this.visit(ctx.expression);
    }

    console.log('🔍 Full ctx:', JSON.stringify(ctx, null, 2).substring(0, 300));
    throw new Error("Unsupported statement expression");
  }

  methodInvocation(ctx: any): AST.CallExpr {
    const args: AST.Expr[] = [];
    if (ctx.argumentList) {
      const argList = this.visit(ctx.argumentList);
      if (argList) args.push(...argList);
    }

    const callee: AST.Expr = {
      kind: "MemberExpr",
      object: {
        kind: "MemberExpr",
        object: {
          kind: "Identifier",
          symbol: "System",
          line: 1
        },
        property: {
          kind: "Identifier",
          symbol: "out",
          line: 1
        },
        computed: false,
        line: 1
      },
      property: {
        kind: "Identifier",
        symbol: "println",
        line: 1
      },
      computed: false,
      line: 1
    };

    return {
      kind: "CallExpr",
      callee,
      args,
      line: 1
    };
  }

  override argumentList(ctx: any): AST.Expr[] {
    const args: AST.Expr[] = [];

    if (ctx.expression) {
      for (const expr of ctx.expression) {
        const result = this.visit(expr);
        if (result) args.push(result);
      }
    }

    return args;
  }

  override expression(ctx: any): AST.Expr {
    if (ctx.conditionalExpression) {
      return this.visit(ctx.conditionalExpression);
    }
    throw new Error("Unsupported expression");
  }

  override conditionalExpression(ctx: any): AST.Expr {
    if (ctx.binaryExpression) {
      return this.visit(ctx.binaryExpression);
    }
    throw new Error("Ternary not supported");
  }

  override binaryExpression(ctx: any): AST.Expr {
    if (ctx.unaryExpression) {
      return this.visit(ctx.unaryExpression);
    }
    throw new Error("Binary operators not supported");
  }

  override unaryExpression(ctx: any): AST.Expr {
    if (ctx.primary) {
      return this.visit(ctx.primary);
    }
    throw new Error("Unary operators not supported");
  }

  override primary(ctx: any): AST.Expr {
    console.log('🔍 primary keys:', Object.keys(ctx));

    if (ctx.primaryPrefix) {
      const prefix = this.visit(ctx.primaryPrefix);

      // Si hay primarySuffix, puede ser una llamada a método
      if (ctx.primarySuffix && ctx.primarySuffix.length > 0) {
        // Iterar sobre sufijos para construir method calls
        let result = prefix;
        for (const suffix of ctx.primarySuffix) {
          console.log('🔍 primarySuffix keys:', Object.keys(suffix.children));
          // Por ahora solo soportamos method invocation
          if (suffix.children.methodInvocationSuffix) {
            const methodName = suffix.children.Identifier?.[0]?.image || "println";
            const args: AST.Expr[] = [];

            if (suffix.children.methodInvocationSuffix[0].children.argumentList) {
              const argList = this.visit(suffix.children.methodInvocationSuffix[0].children.argumentList);
              if (argList) args.push(...argList);
            }

            result = {
              kind: "CallExpr",
              callee: {
                kind: "MemberExpr",
                object: result,
                property: {
                  kind: "Identifier",
                  symbol: methodName,
                  line: 1
                },
                computed: false,
                line: 1
              },
              args,
              line: 1
            };
          }
        }
        return result;
      }

      return prefix;
    }

    throw new Error("Primary expression not supported");
  }

  override primaryPrefix(ctx: any): AST.Expr {
    // Literal (5, "hello", true)
    if (ctx.literal) {
      return this.visit(ctx.literal);
    }

    // fqnOrRefType - esto es System.out (qualified name)
    if (ctx.fqnOrRefType) {
      // 🔧 FIX: Solo devolver System.out, NO println
      return {
        kind: "MemberExpr",
        object: {
          kind: "Identifier",
          symbol: "System",
          line: 1
        },
        property: {
          kind: "Identifier",
          symbol: "out",
          line: 1
        },
        computed: false,
        line: 1
      };
    }

    console.log('🔍 primaryPrefix keys:', Object.keys(ctx));
    throw new Error("Only literals supported for now");
  }


  override literal(ctx: any): AST.Expr {
    if (ctx.integerLiteral) {
      return this.visit(ctx.integerLiteral);
    }
    throw new Error("Only integer literals supported for now");
  }

  override integerLiteral(ctx: any): AST.NumericLiteral {
    const value = ctx.DecimalLiteral[0].image;

    return {
      kind: "NumericLiteral",
      value: parseInt(value),
      line: ctx.DecimalLiteral[0].startLine || 1
    };
  }

  private extractType(typeNode: any): string {
    if (typeNode.children?.primitiveType) {
      const primitive = typeNode.children.primitiveType[0];
      if (primitive.children?.numericType) {
        const numeric = primitive.children.numericType[0];
        if (numeric.children?.integralType) {
          const integral = numeric.children.integralType[0];
          if (integral.children?.Int) return "int";
        }
      }
    }
    return "unknown";
  }
}
