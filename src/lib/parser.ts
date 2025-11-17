// parser.ts
import { type Token, TokenType } from "./lexer";
import * as AST from "./ast"; // importa tipos del AST
import { ParseError } from "./errors";

export class Parser {
  private tokens: Token[];
  private cursor = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private at() { return this.tokens[this.cursor]; }
  private peek(offset = 1) { return this.tokens[this.cursor + offset]; }
  private eat() { return this.tokens[this.cursor++]; }
  private expect(type: TokenType, err: string) {
    const currentToken = this.at();
    const prev = this.eat()!;
    if (!prev || prev.type !== type) {
      throw new ParseError(err, currentToken!.line);
    }
    return prev;
  }
  private isTypeToken(token: Token): boolean {
    return [TokenType.Int, TokenType.Void, TokenType.Boolean, TokenType.Double, TokenType.String, TokenType.Identifier].includes(token.type);
  }

  public parse(): AST.Program {
    const body: AST.Stmt[] = [];
    while (this.at()?.type !== TokenType.EOF) {
      body.push(this.parseStmt());
    }
    return { kind: "Program", body, line: 1 };
  }

  private parseStmt(): AST.Stmt {
    const current = this.at();
    switch (current?.type) {
      case TokenType.Class: return this.parseClassDeclaration();
      case TokenType.Return: return this.parseReturnStatement();
      case TokenType.For: return this.parseForStatement();
      case TokenType.While: return this.parseWhileStatement();
      case TokenType.Do: return this.parseDoWhileStatement();
      case TokenType.If: return this.parseIfStatement();
      case TokenType.OpenBrace: return this.parseBlockStatement();
      case TokenType.Break: {
        const startToken = this.eat()!;
        this.expect(TokenType.Semicolon, "Expected ';' after break statement.");
        return { kind: "BreakStatement", line: startToken.line };
      }
      case TokenType.Continue: {
        const startToken = this.eat()!;
        this.expect(TokenType.Semicolon, "Expected ';' after continue statement.");
        return { kind: "ContinueStatement", line: startToken.line };
      }
      default: {
        // Lookahead to differentiate declarations from expressions
        if (this.isTypeToken(this.at()!)) {
          const peek1 = this.peek(1);
          const isVarDecl = peek1?.type === TokenType.Identifier;
          const isArrayDecl = peek1?.type === TokenType.OpenBracket
            && this.peek(2)?.type === TokenType.CloseBracket
            && this.peek(3)?.type === TokenType.Identifier;

          if (isVarDecl || isArrayDecl) {
            // It's a declaration, but is it a method or variable?
            // Check for '(' after the identifier part.
            const lookaheadIndex = isArrayDecl ? 4 : 2;
            if (this.peek(lookaheadIndex)?.type === TokenType.OpenParen) {
              return this.parseMethodDeclaration();
            }
            return this.parseVariableDeclaration();
          }
        }
        return this.parseExpressionStatement();
      }
    }
  }

  private parseClassDeclaration(): AST.ClassDeclaration {
    const startToken = this.eat()!; // class
    const name = this.expect(TokenType.Identifier, "Expected class name.").value;
    this.expect(TokenType.OpenBrace, "Expected '{' after class name.");
    const body: AST.Stmt[] = [];
    while (this.at()!.type !== TokenType.CloseBrace && this.at()!.type !== TokenType.EOF) {
      while (this.at()!.type === TokenType.Public || this.at()!.type === TokenType.Static) this.eat();
      body.push(this.parseStmt());
    }
    this.expect(TokenType.CloseBrace, "Expected '}' to close class body.");
    return { kind: "ClassDeclaration", name, body, line: startToken.line };
  }

  private parseMethodDeclaration(): AST.MethodDeclaration {
    const returnTypeToken = this.eat()!;
    let returnType = returnTypeToken!.value;
    if (this.at()!.type === TokenType.OpenBracket) {
      this.eat(); this.expect(TokenType.CloseBracket, "Expected ']' for array return type");
      returnType += '[]';
    }
    const name = this.expect(TokenType.Identifier, "Expected method name.").value;
    this.expect(TokenType.OpenParen, "Expected '(' after method name.");

    const params: AST.Param[] = [];
    if (this.at()?.type !== TokenType.CloseParen) {
      do {
        if (this.at()?.type === TokenType.Comma) this.eat();
        let type = this.eat()!.value;
        if (this.at()?.type === TokenType.OpenBracket) {
          this.eat(); this.expect(TokenType.CloseBracket, "Expected ']'");
          type += '[]';
        }
        const paramName = this.expect(TokenType.Identifier, "Expected param name").value;
        params.push({ kind: "Param", type, name: paramName, line: this.at()!.line });
      } while (this.at()?.type === TokenType.Comma);
    }
    this.expect(TokenType.CloseParen, "Expected ')' to close parameter list.");
    const body = this.parseBlockStatement() as AST.BlockStatement;
    return { kind: "MethodDeclaration", returnType, name, params, body: body.body, line: returnTypeToken!.line };
  }

  private parseBlockStatement(): AST.BlockStatement {
    const startToken = this.expect(TokenType.OpenBrace, "Expected '{' to start a block.");
    const body: AST.Stmt[] = [];
    while (this.at()!.type !== TokenType.CloseBrace && this.at()!.type !== TokenType.EOF) {
      body.push(this.parseStmt());
    }
    this.expect(TokenType.CloseBrace, "Expected '}' to close a block.");
    return { kind: "BlockStatement", body, line: startToken.line };
  }

  private parseVariableDeclaration(): AST.VariableDeclaration {
    const startToken = this.at()!;
    let type = this.eat()!.value;
    if (this.at()?.type === TokenType.OpenBracket) {
      this.eat();
      this.expect(TokenType.CloseBracket, "Expected ']' in array type.");
      type += '[]';
    }
    const name = this.expect(TokenType.Identifier, "Expected variable name.").value;
    let value: AST.Expr | undefined;
    if (this.at()?.type === TokenType.Equals) {
      this.eat();
      value = this.parseExpr();
    }
    this.expect(TokenType.Semicolon, "Expected ';' after variable declaration.");
    return { kind: "VariableDeclaration", type, name, value, line: startToken.line };
  }

  private parseForStatement(): AST.ForStatement {
    const startToken = this.eat()!; // for
    this.expect(TokenType.OpenParen, "Expected '(' after 'for'.");
    const init = this.parseVariableDeclaration();
    const test = this.parseExpr();
    this.expect(TokenType.Semicolon, "Expected ';' after for loop condition.");
    const update = this.parseExpr();
    this.expect(TokenType.CloseParen, "Expected ')' after for loop clauses.");
    const body = this.parseStmt();
    return { kind: "ForStatement", init, test, update, body, line: startToken.line };
  }

  private parseWhileStatement(): AST.WhileStatement {
    const startToken = this.eat()!; // while
    this.expect(TokenType.OpenParen, "Expected '(' after 'while'.");
    const test = this.parseExpr();
    this.expect(TokenType.CloseParen, "Expected ')' after while condition.");
    const body = this.parseStmt();
    return { kind: "WhileStatement", test, body, line: startToken.line };
  }

  private parseDoWhileStatement(): AST.DoWhileStatement {
    const startToken = this.eat()!; // do
    const body = this.parseStmt();
    this.expect(TokenType.While, "Expected 'while' after 'do' block.");
    this.expect(TokenType.OpenParen, "Expected '(' after 'while'.");
    const test = this.parseExpr();
    this.expect(TokenType.CloseParen, "Expected ')' after while condition.");
    this.expect(TokenType.Semicolon, "Expected ';' after do-while statement.");
    return { kind: "DoWhileStatement", test, body, line: startToken.line };
  }

  private parseIfStatement(): AST.IfStatement {
    const startToken = this.eat()!; // if
    this.expect(TokenType.OpenParen, "Expected '(' after 'if'.");
    const test = this.parseExpr();
    this.expect(TokenType.CloseParen, "Expected ')' after if condition.");
    const consequent = this.parseStmt();
    let alternate: AST.Stmt | undefined;
    if (this.at()?.type === TokenType.Else) {
      this.eat();
      alternate = this.parseStmt();
    }
    return { kind: "IfStatement", test, consequent, alternate, line: startToken.line };
  }

  private parseReturnStatement(): AST.ReturnStatement {
    const startToken = this.eat()!; // return
    let argument: AST.Expr | undefined;
    if (this.at()!.type !== TokenType.Semicolon) {
      argument = this.parseExpr();
    }
    this.expect(TokenType.Semicolon, "Expected ';' after return statement.");
    return { kind: "ReturnStatement", argument, line: startToken.line };
  }

  private parseExpressionStatement(): AST.ExpressionStatement {
    const expression = this.parseExpr();
    const line = this.at()!.line;
    this.expect(TokenType.Semicolon, "Expected ';' after expression.");
    return { kind: "ExpressionStatement", expression, line };
  }

  // --- Expression Parsing (with operator precedence) ---
  private parseExpr(): AST.Expr { return this.parseAssignmentExpr(); }

  private parseAssignmentExpr(): AST.Expr {
    const left = this.parseLogicalOrExpr();
    if (this.at()?.type === TokenType.Equals) {
      this.eat();
      const value = this.parseAssignmentExpr();
      return { kind: "AssignmentExpr", assignee: left, value, line: left.line };
    }
    return left;
  }

  private parseLogicalOrExpr(): AST.Expr {
    let left = this.parseLogicalAndExpr();
    while (this.at()?.type === TokenType.OrOr) {
      const operator = this.eat()!.value;
      const right = this.parseLogicalAndExpr();
      left = { kind: "LogicalExpr", left, right, operator, line: left.line };
    }
    return left;
  }

  private parseLogicalAndExpr(): AST.Expr {
    let left = this.parseComparisonExpr();
    while (this.at()?.type === TokenType.AndAnd) {
      const operator = this.eat()!.value;
      const right = this.parseComparisonExpr();
      left = { kind: "LogicalExpr", left, right, operator, line: left.line };
    }
    return left;
  }

  private parseComparisonExpr(): AST.Expr {
    let left = this.parseAdditiveExpr();
    while ([TokenType.GreaterThan, TokenType.LessThan, TokenType.GreaterEquals, TokenType.LessEquals, TokenType.EqualsEquals, TokenType.NotEquals].includes(this.at()!.type)) {
      const operator = this.eat()!.value;
      const right = this.parseAdditiveExpr();
      left = { kind: "BinaryExpr", left, right, operator, line: left.line };
    }
    return left;
  }

  private parseAdditiveExpr(): AST.Expr {
    let left = this.parseMultiplicativeExpr();
    while (this.at()?.type === TokenType.Plus || this.at()?.type === TokenType.Minus) {
      const operator = this.eat()!.value;
      const right = this.parseMultiplicativeExpr();
      left = { kind: "BinaryExpr", left, right, operator, line: left.line };
    }
    return left;
  }

  private parseMultiplicativeExpr(): AST.Expr {
    let left = this.parseUnaryExpr();
    while (
      this.at()?.type === TokenType.Star ||
      this.at()?.type === TokenType.Slash ||
      this.at()?.type === TokenType.Percent
    ) {
      const operator = this.eat()!.value;
      const right = this.parseUnaryExpr();
      left = { kind: "BinaryExpr", left, right, operator, line: left.line };
    }
    return left;
  }

  private parseUnaryExpr(): AST.Expr {
    if (this.at()?.type === TokenType.Bang || this.at()?.type === TokenType.Minus) {
      const token = this.eat()!;
      const argument = this.parseUnaryExpr();
      return { kind: "UnaryExpr", operator: token.value, argument, line: token.line };
    }
    return this.parseCallMemberExpr();
  }

  private parseCallMemberExpr(): AST.Expr {
    let member = this.parsePrimaryExpr();
    while ([TokenType.Dot, TokenType.OpenParen, TokenType.OpenBracket].includes(this.at()!.type)) {
      if (this.at()?.type === TokenType.OpenParen) member = this.parseCallExpr(member);
      else if (this.at()?.type === TokenType.Dot) member = this.parseMemberExpr(member);
      else if (this.at()?.type === TokenType.OpenBracket) member = this.parseMemberExpr(member, true);
    }
    return member;
  }

  private parseCallExpr(callee: AST.Expr): AST.CallExpr {
    this.eat(); // (
    const args: AST.Expr[] = [];
    if (this.at()!.type !== TokenType.CloseParen) {
      do {
        if (this.at()?.type === TokenType.Comma) this.eat();
        args.push(this.parseExpr());
      } while (this.at()?.type === TokenType.Comma);
    }
    this.expect(TokenType.CloseParen, "Expected ')' to close arguments.");
    return { kind: "CallExpr", callee, args, line: callee.line };
  }

  private parseMemberExpr(object: AST.Expr, computed = false): AST.MemberExpr {
    this.eat(); // . or [
    const property = computed ? this.parseExpr() : this.parsePrimaryExpr();
    if (computed) this.expect(TokenType.CloseBracket, "Expected ']' for computed property.");
    return { kind: 'MemberExpr', object, property, computed, line: object.line };
  }

  private parsePrimaryExpr(): AST.Expr {
    const token = this.at()!;
    switch (token.type) {
      case TokenType.System:
      case TokenType.Identifier:
        if ([TokenType.PlusPlus, TokenType.MinusMinus].includes(this.peek()!.type)) {
          const ident = this.eat()!;
          const op = this.eat()!;
          return { kind: "PostfixExpr", operator: op.value, argument: { kind: "Identifier", symbol: ident.value, line: token.line }, line: token.line };
        }
        return { kind: "Identifier", symbol: this.eat()!.value, line: token.line };
      case TokenType.IntegerLiteral: return { kind: "NumericLiteral", value: parseInt(this.eat()!.value), line: token.line };
      case TokenType.DoubleLiteral: return { kind: "DoubleLiteral", value: parseFloat(this.eat()!.value), line: token.line };
      case TokenType.StringLiteral: return { kind: "StringLiteral", value: this.eat()!.value, line: token.line };
      case TokenType.True: this.eat(); return { kind: "BooleanLiteral", value: true, line: token.line };
      case TokenType.False: this.eat(); return { kind: "BooleanLiteral", value: false, line: token.line };
      case TokenType.New: return this.parseNewExpr();
      case TokenType.OpenBrace: return this.parseArrayLiteral();
      case TokenType.OpenParen: {
        this.eat();
        const value = this.parseExpr();
        this.expect(TokenType.CloseParen, "Expected ')' to close grouped expression.");
        return value;
      }
      default:
        throw new ParseError(`Unexpected token: ${JSON.stringify(this.at()!.value)}`, this.at()!.line);
    }
  }

  private parseNewExpr(): AST.NewExpr | AST.ArrayCreationExpr {
    const startToken = this.eat()!; // new
    const callee = this.expect(TokenType.Identifier, "Expected class or type name after 'new'.");

    if (this.at()?.type === TokenType.OpenParen) { // new Sorter()
      this.eat();
      this.expect(TokenType.CloseParen, "Expected ')' after new expression.");
      return { kind: "NewExpr", callee: { kind: "Identifier", symbol: callee.value, line: callee.line }, args: [], line: startToken.line };
    } else if (this.at()?.type === TokenType.OpenBracket) { // new int[5]
      this.eat();
      const size = this.parseExpr();
      this.expect(TokenType.CloseBracket, "Expected ']' after array size.");
      return { kind: "ArrayCreationExpr", type: callee.value, size, line: startToken.line };
    }
    throw new ParseError("Invalid 'new' expression.", startToken.line);
  }

  private parseArrayLiteral(): AST.ArrayCreationExpr {
    const startToken = this.eat()!; // {
    const values: AST.Expr[] = [];
    if (this.at()!.type !== TokenType.CloseBrace) {
      do {
        if (this.at()?.type === TokenType.Comma) this.eat();
        values.push(this.parseExpr());
      } while (this.at()?.type === TokenType.Comma)
    }
    this.expect(TokenType.CloseBrace, "Expected '}' to close array literal.");
    return { kind: "ArrayCreationExpr", type: 'int', values, line: startToken.line };
  }
}

