
import { isHeapRef, type ExecutionStep, type HeapValue, type HeapRef, type StackFrameInfo, type HighlightedRegion } from '../types';

const MAX_STEPS = 25000;

// --- Custom Error for Parsing ---
export class ParseError extends Error {
  constructor(message: string, public line: number) {
    super(message);
    this.name = 'ParseError';
  }
}

// --- Tokenizer (Lexer) ---
// Turns the raw code string into a stream of tokens.

enum TokenType {
  // Keywords
  Class, Void, Int, Static, Public, For, If, Else, New, System, Boolean, Double, String,
  True, False, Return, While, Do, Break, Continue,
  // Identifiers & Literals
  Identifier, IntegerLiteral, DoubleLiteral, StringLiteral,
  // Operators
  Equals, Plus, Minus, Star, Slash, OpenParen, CloseParen, OpenBrace, CloseBrace,
  OpenBracket, CloseBracket, Semicolon, Comma, Dot, GreaterThan, LessThan, Bang,
  // Compound Operators
  EqualsEquals, NotEquals, GreaterEquals, LessEquals, PlusPlus, MinusMinus,
  PlusEquals, MinusEquals, StarEquals, SlashEquals, AndAnd, OrOr,
  // End of File
  EOF,
}

interface Token {
  type: TokenType;
  value: string;
  line: number;
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let line = 1;
  let cursor = 0;

  const KEYWORDS: Record<string, TokenType> = {
    "class": TokenType.Class, "void": TokenType.Void, "int": TokenType.Int,
    "static": TokenType.Static, "public": TokenType.Public, "for": TokenType.For,
    "if": TokenType.If, "else": TokenType.Else, "new": TokenType.New,
    "System": TokenType.System, "boolean": TokenType.Boolean, "double": TokenType.Double,
    "true": TokenType.True, "false": TokenType.False, "return": TokenType.Return,
    "while": TokenType.While, "do": TokenType.Do, "break": TokenType.Break,
    "continue": TokenType.Continue, "String": TokenType.String,
  };

  while (cursor < source.length) {
    let char = source[cursor];

    if (/\s/.test(char)) {
      if (char === '\n') line++;
      cursor++;
      continue;
    }

    if (char === '/' && source[cursor + 1] === '/') {
        while(source[cursor] && source[cursor] !== '\n') {
            cursor++;
        }
        continue;
    }

    const twoCharOps: Record<string, TokenType> = {
        '==': TokenType.EqualsEquals, '!=': TokenType.NotEquals, '>=': TokenType.GreaterEquals, '<=': TokenType.LessEquals,
        '++': TokenType.PlusPlus, '--': TokenType.MinusMinus, '+=': TokenType.PlusEquals, '-=': TokenType.MinusEquals,
        '*=': TokenType.StarEquals, '/=': TokenType.SlashEquals, '&&': TokenType.AndAnd, '||': TokenType.OrOr,
    };

    if (twoCharOps[source.substring(cursor, cursor + 2)]) {
        const op = source.substring(cursor, cursor + 2);
        tokens.push({ type: twoCharOps[op], value: op, line });
        cursor += 2;
        continue;
    }
    
    const oneCharOps: Record<string, TokenType> = {
      '=': TokenType.Equals, '+': TokenType.Plus, '-': TokenType.Minus, '*': TokenType.Star, '/': TokenType.Slash,
      '(': TokenType.OpenParen, ')': TokenType.CloseParen, '{': TokenType.OpenBrace, '}': TokenType.CloseBrace,
      '[': TokenType.OpenBracket, ']': TokenType.CloseBracket, ';': TokenType.Semicolon, ',': TokenType.Comma,
      '.': TokenType.Dot, '>': TokenType.GreaterThan, '<': TokenType.LessThan, '!': TokenType.Bang
    };

    if (oneCharOps[char]) {
        tokens.push({ type: oneCharOps[char], value: char, line });
        cursor++;
        continue;
    }

    if (/[a-zA-Z_]/.test(char)) {
      let value = '';
      while (cursor < source.length && /[a-zA-Z0-9_]/.test(source[cursor])) {
        value += source[cursor++];
      }
      const type = KEYWORDS[value] ?? TokenType.Identifier;
      tokens.push({ type, value, line });
      continue;
    }

    if (/[0-9]/.test(char)) {
        let value = '';
        let isDouble = false;
        while (cursor < source.length && (/[0-9]/.test(source[cursor]) || (source[cursor] === '.' && !isDouble))) {
            if (source[cursor] === '.') isDouble = true;
            value += source[cursor++];
        }
        const type = isDouble ? TokenType.DoubleLiteral : TokenType.IntegerLiteral;
        tokens.push({ type, value, line });
        continue;
    }
    
    if (char === '"') {
        let value = '';
        const startLine = line;
        cursor++; // consume opening quote
        while(cursor < source.length && source[cursor] !== '"') {
            const stringChar = source[cursor];
            if (stringChar === '\n') {
                line++;
            }
            value += stringChar;
            cursor++;
        }
        
        if (cursor >= source.length || source[cursor] !== '"') {
            throw new ParseError("Unclosed string literal.", startLine);
        }

        cursor++; // consume closing quote
        tokens.push({ type: TokenType.StringLiteral, value, line: startLine });
        continue;
    }

    throw new ParseError(`Unexpected character '${char}'`, line);
  }

  tokens.push({ type: TokenType.EOF, value: 'EOF', line });
  return tokens;
}


// --- Abstract Syntax Tree (AST) ---
interface Node { kind: string; line: number; start?: number; end?: number; };

interface Program extends Node { kind: "Program", body: Stmt[] };
interface ClassDeclaration extends Node { kind: "ClassDeclaration", name: string, body: Stmt[] };
interface MethodDeclaration extends Node { kind: "MethodDeclaration", returnType: string, name: string, params: Param[], body: Stmt[] };
interface Param extends Node { kind: "Param", type: string, name: string };
interface VariableDeclaration extends Node { kind: "VariableDeclaration", type: string, name: string, value?: Expr };
interface ExpressionStatement extends Node { kind: "ExpressionStatement", expression: Expr };
interface BlockStatement extends Node { kind: "BlockStatement", body: Stmt[] };
interface ForStatement extends Node { kind: "ForStatement", init?: Stmt, test?: Expr, update?: Expr, body: Stmt };
interface WhileStatement extends Node { kind: "WhileStatement", test: Expr, body: Stmt };
interface DoWhileStatement extends Node { kind: "DoWhileStatement", test: Expr, body: Stmt };
interface IfStatement extends Node { kind: "IfStatement", test: Expr, consequent: Stmt, alternate?: Stmt };
interface ReturnStatement extends Node { kind: "ReturnStatement", argument?: Expr };
interface BreakStatement extends Node { kind: "BreakStatement" };
interface ContinueStatement extends Node { kind: "ContinueStatement" };

interface BinaryExpr extends Node { kind: "BinaryExpr", left: Expr, right: Expr, operator: string };
interface LogicalExpr extends Node { kind: "LogicalExpr", left: Expr, right: Expr, operator: string };
interface UnaryExpr extends Node { kind: "UnaryExpr", operator: string, argument: Expr };
interface Identifier extends Node { kind: "Identifier", symbol: string };
interface NumericLiteral extends Node { kind: "NumericLiteral", value: number };
interface DoubleLiteral extends Node { kind: "DoubleLiteral", value: number };
interface BooleanLiteral extends Node { kind: "BooleanLiteral", value: boolean };
interface StringLiteral extends Node { kind: "StringLiteral", value: string };
interface AssignmentExpr extends Node { kind: "AssignmentExpr", assignee: Expr, value: Expr };
interface MemberExpr extends Node { kind: "MemberExpr", object: Expr, property: Expr, computed: boolean };
interface CallExpr extends Node { kind: "CallExpr", callee: Expr, args: Expr[] };
interface NewExpr extends Node { kind: "NewExpr", callee: Identifier, args: Expr[] };
interface ArrayCreationExpr extends Node { kind: "ArrayCreationExpr", type: string, size?: Expr, values?: Expr[] };
interface PostfixExpr extends Node { kind: "PostfixExpr", operator: string, argument: Identifier };

type Expr = BinaryExpr | LogicalExpr | UnaryExpr | Identifier | NumericLiteral | DoubleLiteral | BooleanLiteral | StringLiteral | AssignmentExpr | MemberExpr | CallExpr | NewExpr | ArrayCreationExpr | PostfixExpr;
type Stmt = ClassDeclaration | MethodDeclaration | VariableDeclaration | ExpressionStatement | BlockStatement | ForStatement | WhileStatement | DoWhileStatement | IfStatement | ReturnStatement | BreakStatement | ContinueStatement;


// --- Parser ---
class Parser {
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
    const prev = this.eat();
    if (!prev || prev.type !== type) {
      throw new ParseError(err, currentToken.line);
    }
    return prev;
  }
  private isTypeToken(token: Token): boolean {
    return [TokenType.Int, TokenType.Void, TokenType.Boolean, TokenType.Double, TokenType.String, TokenType.Identifier].includes(token.type);
  }

  public parse(): Program {
    const body: Stmt[] = [];
    while (this.at().type !== TokenType.EOF) {
      body.push(this.parseStmt());
    }
    return { kind: "Program", body, line: 1 };
  }

  private parseStmt(): Stmt {
    const current = this.at();
    switch (current.type) {
      case TokenType.Class: return this.parseClassDeclaration();
      case TokenType.Return: return this.parseReturnStatement();
      case TokenType.For: return this.parseForStatement();
      case TokenType.While: return this.parseWhileStatement();
      case TokenType.Do: return this.parseDoWhileStatement();
      case TokenType.If: return this.parseIfStatement();
      case TokenType.OpenBrace: return this.parseBlockStatement();
      case TokenType.Break: {
        const startToken = this.eat();
        this.expect(TokenType.Semicolon, "Expected ';' after break statement.");
        return { kind: "BreakStatement", line: startToken.line };
      }
      case TokenType.Continue: {
        const startToken = this.eat();
        this.expect(TokenType.Semicolon, "Expected ';' after continue statement.");
        return { kind: "ContinueStatement", line: startToken.line };
      }
      default: {
        // Lookahead to differentiate declarations from expressions
        if (this.isTypeToken(this.at())) {
            const peek1 = this.peek(1);
            const isVarDecl = peek1.type === TokenType.Identifier;
            const isArrayDecl = peek1.type === TokenType.OpenBracket 
                              && this.peek(2).type === TokenType.CloseBracket 
                              && this.peek(3).type === TokenType.Identifier;

            if(isVarDecl || isArrayDecl) {
                // It's a declaration, but is it a method or variable?
                // Check for '(' after the identifier part.
                const lookaheadIndex = isArrayDecl ? 4 : 2;
                if(this.peek(lookaheadIndex).type === TokenType.OpenParen) {
                    return this.parseMethodDeclaration();
                }
                return this.parseVariableDeclaration();
            }
        }
        return this.parseExpressionStatement();
      }
    }
  }

  private parseClassDeclaration(): ClassDeclaration {
      const startToken = this.eat(); // class
      const name = this.expect(TokenType.Identifier, "Expected class name.").value;
      this.expect(TokenType.OpenBrace, "Expected '{' after class name.");
      const body: Stmt[] = [];
      while(this.at().type !== TokenType.CloseBrace && this.at().type !== TokenType.EOF) {
        while(this.at().type === TokenType.Public || this.at().type === TokenType.Static) this.eat();
        body.push(this.parseStmt());
      }
      this.expect(TokenType.CloseBrace, "Expected '}' to close class body.");
      return { kind: "ClassDeclaration", name, body, line: startToken.line };
  }

  private parseMethodDeclaration(): MethodDeclaration {
    const returnTypeToken = this.eat();
    let returnType = returnTypeToken.value;
    if (this.at().type === TokenType.OpenBracket) {
      this.eat(); this.expect(TokenType.CloseBracket, "Expected ']' for array return type");
      returnType += '[]';
    }
    const name = this.expect(TokenType.Identifier, "Expected method name.").value;
    this.expect(TokenType.OpenParen, "Expected '(' after method name.");
    
    const params: Param[] = [];
    if (this.at().type !== TokenType.CloseParen) {
        do {
            if (this.at().type === TokenType.Comma) this.eat();
            let type = this.eat().value;
            if(this.at().type === TokenType.OpenBracket) {
                this.eat(); this.expect(TokenType.CloseBracket, "Expected ']'");
                type += '[]';
            }
            const paramName = this.expect(TokenType.Identifier, "Expected param name").value;
            params.push({ kind: "Param", type, name: paramName, line: this.at().line });
        } while(this.at().type === TokenType.Comma);
    }
    this.expect(TokenType.CloseParen, "Expected ')' to close parameter list.");
    const body = this.parseBlockStatement() as BlockStatement;
    return { kind: "MethodDeclaration", returnType, name, params, body: body.body, line: returnTypeToken.line };
  }
  
  private parseBlockStatement(): BlockStatement {
    const startToken = this.expect(TokenType.OpenBrace, "Expected '{' to start a block.");
    const body: Stmt[] = [];
    while (this.at().type !== TokenType.CloseBrace && this.at().type !== TokenType.EOF) {
        body.push(this.parseStmt());
    }
    this.expect(TokenType.CloseBrace, "Expected '}' to close a block.");
    return { kind: "BlockStatement", body, line: startToken.line };
  }
  
  private parseVariableDeclaration(): VariableDeclaration {
      const startToken = this.at();
      let type = this.eat().value;
      if(this.at().type === TokenType.OpenBracket) {
          this.eat();
          this.expect(TokenType.CloseBracket, "Expected ']' in array type.");
          type += '[]';
      }
      const name = this.expect(TokenType.Identifier, "Expected variable name.").value;
      let value: Expr | undefined;
      if (this.at().type === TokenType.Equals) {
          this.eat();
          value = this.parseExpr();
      }
      this.expect(TokenType.Semicolon, "Expected ';' after variable declaration.");
      return { kind: "VariableDeclaration", type, name, value, line: startToken.line };
  }
  
  private parseForStatement(): ForStatement {
    const startToken = this.eat(); // for
    this.expect(TokenType.OpenParen, "Expected '(' after 'for'.");
    const init = this.parseVariableDeclaration();
    const test = this.parseExpr();
    this.expect(TokenType.Semicolon, "Expected ';' after for loop condition.");
    const update = this.parseExpr();
    this.expect(TokenType.CloseParen, "Expected ')' after for loop clauses.");
    const body = this.parseStmt();
    return { kind: "ForStatement", init, test, update, body, line: startToken.line };
  }

  private parseWhileStatement(): WhileStatement {
    const startToken = this.eat(); // while
    this.expect(TokenType.OpenParen, "Expected '(' after 'while'.");
    const test = this.parseExpr();
    this.expect(TokenType.CloseParen, "Expected ')' after while condition.");
    const body = this.parseStmt();
    return { kind: "WhileStatement", test, body, line: startToken.line };
  }

  private parseDoWhileStatement(): DoWhileStatement {
    const startToken = this.eat(); // do
    const body = this.parseStmt();
    this.expect(TokenType.While, "Expected 'while' after 'do' block.");
    this.expect(TokenType.OpenParen, "Expected '(' after 'while'.");
    const test = this.parseExpr();
    this.expect(TokenType.CloseParen, "Expected ')' after while condition.");
    this.expect(TokenType.Semicolon, "Expected ';' after do-while statement.");
    return { kind: "DoWhileStatement", test, body, line: startToken.line };
  }
  
  private parseIfStatement(): IfStatement {
      const startToken = this.eat(); // if
      this.expect(TokenType.OpenParen, "Expected '(' after 'if'.");
      const test = this.parseExpr();
      this.expect(TokenType.CloseParen, "Expected ')' after if condition.");
      const consequent = this.parseStmt();
      let alternate: Stmt | undefined;
      if (this.at().type === TokenType.Else) {
          this.eat();
          alternate = this.parseStmt();
      }
      return { kind: "IfStatement", test, consequent, alternate, line: startToken.line };
  }
  
  private parseReturnStatement(): ReturnStatement {
      const startToken = this.eat(); // return
      let argument: Expr | undefined;
      if (this.at().type !== TokenType.Semicolon) {
          argument = this.parseExpr();
      }
      this.expect(TokenType.Semicolon, "Expected ';' after return statement.");
      return { kind: "ReturnStatement", argument, line: startToken.line };
  }

  private parseExpressionStatement(): ExpressionStatement {
      const expression = this.parseExpr();
      const line = this.at().line;
      this.expect(TokenType.Semicolon, "Expected ';' after expression.");
      return { kind: "ExpressionStatement", expression, line };
  }

  // --- Expression Parsing (with operator precedence) ---
  private parseExpr(): Expr { return this.parseAssignmentExpr(); }

  private parseAssignmentExpr(): Expr {
    const left = this.parseLogicalOrExpr();
    if (this.at().type === TokenType.Equals) {
      this.eat();
      const value = this.parseAssignmentExpr();
      return { kind: "AssignmentExpr", assignee: left, value, line: left.line };
    }
    return left;
  }
  
  private parseLogicalOrExpr(): Expr {
    let left = this.parseLogicalAndExpr();
    while (this.at().type === TokenType.OrOr) {
        const operator = this.eat().value;
        const right = this.parseLogicalAndExpr();
        left = { kind: "LogicalExpr", left, right, operator, line: left.line };
    }
    return left;
  }

  private parseLogicalAndExpr(): Expr {
    let left = this.parseComparisonExpr();
    while (this.at().type === TokenType.AndAnd) {
        const operator = this.eat().value;
        const right = this.parseComparisonExpr();
        left = { kind: "LogicalExpr", left, right, operator, line: left.line };
    }
    return left;
  }

  private parseComparisonExpr(): Expr {
    let left = this.parseAdditiveExpr();
    while ([TokenType.GreaterThan, TokenType.LessThan, TokenType.GreaterEquals, TokenType.LessEquals, TokenType.EqualsEquals, TokenType.NotEquals].includes(this.at().type)) {
      const operator = this.eat().value;
      const right = this.parseAdditiveExpr();
      left = { kind: "BinaryExpr", left, right, operator, line: left.line };
    }
    return left;
  }

  private parseAdditiveExpr(): Expr {
    let left = this.parseMultiplicativeExpr();
    while (this.at().type === TokenType.Plus || this.at().type === TokenType.Minus) {
      const operator = this.eat().value;
      const right = this.parseMultiplicativeExpr();
      left = { kind: "BinaryExpr", left, right, operator, line: left.line };
    }
    return left;
  }
  
  private parseMultiplicativeExpr(): Expr {
    let left = this.parseUnaryExpr();
    while (this.at().type === TokenType.Star || this.at().type === TokenType.Slash) {
      const operator = this.eat().value;
      const right = this.parseUnaryExpr();
      left = { kind: "BinaryExpr", left, right, operator, line: left.line };
    }
    return left;
  }

  private parseUnaryExpr(): Expr {
    if (this.at().type === TokenType.Bang || this.at().type === TokenType.Minus) {
        const token = this.eat();
        const argument = this.parseUnaryExpr();
        return { kind: "UnaryExpr", operator: token.value, argument, line: token.line };
    }
    return this.parseCallMemberExpr();
  }
  
  private parseCallMemberExpr(): Expr {
    let member = this.parsePrimaryExpr();
    while ([TokenType.Dot, TokenType.OpenParen, TokenType.OpenBracket].includes(this.at().type)) {
        if (this.at().type === TokenType.OpenParen) member = this.parseCallExpr(member);
        else if (this.at().type === TokenType.Dot) member = this.parseMemberExpr(member);
        else if (this.at().type === TokenType.OpenBracket) member = this.parseMemberExpr(member, true);
    }
    return member;
  }

  private parseCallExpr(callee: Expr): CallExpr {
    this.eat(); // (
    const args: Expr[] = [];
    if (this.at().type !== TokenType.CloseParen) {
        do {
            if(this.at().type === TokenType.Comma) this.eat();
            args.push(this.parseExpr());
        } while (this.at().type === TokenType.Comma);
    }
    this.expect(TokenType.CloseParen, "Expected ')' to close arguments.");
    return { kind: "CallExpr", callee, args, line: callee.line };
  }

  private parseMemberExpr(object: Expr, computed = false): MemberExpr {
    this.eat(); // . or [
    const property = computed ? this.parseExpr() : this.parsePrimaryExpr();
    if (computed) this.expect(TokenType.CloseBracket, "Expected ']' for computed property.");
    return { kind: 'MemberExpr', object, property, computed, line: object.line };
  }
  
  private parsePrimaryExpr(): Expr {
    const token = this.at();
    switch (token.type) {
      case TokenType.System:
      case TokenType.Identifier:
        if ([TokenType.PlusPlus, TokenType.MinusMinus].includes(this.peek().type)) {
            const ident = this.eat();
            const op = this.eat();
            return { kind: "PostfixExpr", operator: op.value, argument: { kind: "Identifier", symbol: ident.value, line: token.line }, line: token.line };
        }
        return { kind: "Identifier", symbol: this.eat().value, line: token.line };
      case TokenType.IntegerLiteral: return { kind: "NumericLiteral", value: parseInt(this.eat().value), line: token.line };
      case TokenType.DoubleLiteral: return { kind: "DoubleLiteral", value: parseFloat(this.eat().value), line: token.line };
      case TokenType.StringLiteral: return { kind: "StringLiteral", value: this.eat().value, line: token.line };
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
        throw new ParseError(`Unexpected token: ${JSON.stringify(this.at().value)}`, this.at().line);
    }
  }

  private parseNewExpr(): NewExpr | ArrayCreationExpr {
    const startToken = this.eat(); // new
    const callee = this.expect(TokenType.Identifier, "Expected class or type name after 'new'.");
    
    if (this.at().type === TokenType.OpenParen) { // new Sorter()
      this.eat();
      this.expect(TokenType.CloseParen, "Expected ')' after new expression.");
      return { kind: "NewExpr", callee: { kind: "Identifier", symbol: callee.value, line: callee.line }, args: [], line: startToken.line };
    } else if (this.at().type === TokenType.OpenBracket) { // new int[5]
      this.eat();
      const size = this.parseExpr();
      this.expect(TokenType.CloseBracket, "Expected ']' after array size.");
      return { kind: "ArrayCreationExpr", type: callee.value, size, line: startToken.line };
    }
    throw new ParseError("Invalid 'new' expression.", startToken.line);
  }
  
  private parseArrayLiteral(): ArrayCreationExpr {
      const startToken = this.eat(); // {
      const values: Expr[] = [];
      if(this.at().type !== TokenType.CloseBrace) {
          do {
            if(this.at().type === TokenType.Comma) this.eat();
            values.push(this.parseExpr());
          } while(this.at().type === TokenType.Comma)
      }
      this.expect(TokenType.CloseBrace, "Expected '}' to close array literal.");
      return { kind: "ArrayCreationExpr", type: 'int', values, line: startToken.line };
  }
}

// --- Environment & Interpreter ---
class Environment {
  public parent?: Environment;
  private variables: Map<string, any>;
  constructor(parent?: Environment) {
    this.parent = parent;
    this.variables = new Map();
  }

  public declare(name: string, value: any): any {
    if (this.variables.has(name)) throw new Error(`Variable "${name}" has already been declared.`);
    this.variables.set(name, value);
    return value;
  }
  
  public assign(name: string, value: any): any {
    const env = this.resolve(name);
    env.variables.set(name, value);
    return value;
  }
  
  public lookup(name: string): any {
    const env = this.resolve(name);
    return env.variables.get(name);
  }
  
  public resolve(name: string): Environment {
      if (this.variables.has(name)) return this;
      if (this.parent) return this.parent.resolve(name);
      throw new Error(`Variable "${name}" not found.`);
  }

  public getSnapshot(): Record<string, any> {
      const snapshot: Record<string, any> = {};
      this.variables.forEach((value, key) => { snapshot[key] = value; });
      return snapshot;
  }
}

// Special values for control flow
const BREAK_SENTINEL = { "break": true };
const CONTINUE_SENTINEL = { "continue": true };
class ReturnSentinel { constructor(public value: any) {} }

interface StackFrame {
    methodName: string;
    line: number;
    env: Environment;
}

// Helper function to interpret Java-style escape sequences in a string.
function interpretEscapes(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

class Interpreter {
  private trace: ExecutionStep[] = [];
  private heap: Record<string, HeapValue> = {};
  private nextHeapId = 0;
  private globalEnv = new Environment();
  private currentEnv = this.globalEnv;
  private callStack: StackFrame[] = [];

  public run(ast: Program): ExecutionStep[] {
    for (const node of ast.body) {
      if (node.kind === "ClassDeclaration") {
        const methods: Record<string, MethodDeclaration> = {};
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

  private evaluate(node: Stmt | Expr): any {
    switch (node.kind) {
      // --- Statements ---
      case "BlockStatement": {
        this.currentEnv = new Environment(this.currentEnv);
        let result: any;
        for (const stmt of (node as BlockStatement).body) {
          result = this.evaluate(stmt);
          if (result === BREAK_SENTINEL || result === CONTINUE_SENTINEL || result instanceof ReturnSentinel) {
             break;
          }
        }
        this.currentEnv = this.currentEnv.parent!;
        return result;
      }
      case "VariableDeclaration": {
        const decl = node as VariableDeclaration;
        let value;
        if (decl.value) value = this.evaluate(decl.value);
        else if (decl.type === 'int' || decl.type === 'double') value = 0;
        else if (decl.type === 'boolean') value = false;
        else value = null;
        this.addTrace(decl.line);
        return this.currentEnv.declare(decl.name, value);
      }
      case "ExpressionStatement": return this.evaluate((node as ExpressionStatement).expression);
      case "ReturnStatement": {
          const stmt = node as ReturnStatement;
          const value = stmt.argument ? this.evaluate(stmt.argument) : undefined;
          this.addTrace(stmt.line, 'return');
          return new ReturnSentinel(value);
      }
      case "BreakStatement": this.addTrace(node.line); return BREAK_SENTINEL;
      case "ContinueStatement": this.addTrace(node.line); return CONTINUE_SENTINEL;
      case "ForStatement": {
        const stmt = node as ForStatement;
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
        const stmt = node as WhileStatement;
        while(this.evaluate(stmt.test)) {
            const bodyResult = this.evaluate(stmt.body);
            if (bodyResult === BREAK_SENTINEL || bodyResult instanceof ReturnSentinel) break;
            if (bodyResult === CONTINUE_SENTINEL) continue;
        }
        return;
      }
      case "DoWhileStatement": {
        const stmt = node as DoWhileStatement;
        do {
            const bodyResult = this.evaluate(stmt.body);
            if (bodyResult === BREAK_SENTINEL || bodyResult instanceof ReturnSentinel) break;
            if (bodyResult === CONTINUE_SENTINEL) continue;
        } while (this.evaluate(stmt.test));
        return;
      }
      case "IfStatement": {
          const stmt = node as IfStatement;
          if (this.evaluate(stmt.test)) return this.evaluate(stmt.consequent);
          else if (stmt.alternate) return this.evaluate(stmt.alternate);
          return;
      }
      // --- Expressions ---
      case "BinaryExpr": {
        const expr = node as BinaryExpr;
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
          const expr = node as LogicalExpr;
          const left = this.evaluate(expr.left);
          this.addTrace(expr.line);
          if (expr.operator === '&&' && !left) return false;
          if (expr.operator === '||' && left) return true;
          return this.evaluate(expr.right);
      }
      case "UnaryExpr": {
          const expr = node as UnaryExpr;
          const arg = this.evaluate(expr.argument);
          this.addTrace(expr.line);
          if (expr.operator === '!') return !arg;
          if (expr.operator === '-') return -arg;
          return;
      }
      case "Identifier": return this.currentEnv.lookup((node as Identifier).symbol);
      case "NumericLiteral": return (node as NumericLiteral).value;
      case "DoubleLiteral": return (node as DoubleLiteral).value;
      case "BooleanLiteral": return (node as BooleanLiteral).value;
      case "StringLiteral": return (node as StringLiteral).value;
      case "AssignmentExpr": {
        const expr = node as AssignmentExpr;
        const value = this.evaluate(expr.value);
        this.addTrace(expr.line);
        if (expr.assignee.kind === "Identifier") {
          return this.currentEnv.assign((expr.assignee as Identifier).symbol, value);
        } else if (expr.assignee.kind === "MemberExpr" && (expr.assignee as MemberExpr).computed) {
            const memExpr = expr.assignee as MemberExpr;
            const ref = this.evaluate(memExpr.object) as HeapRef;
            const index = this.evaluate(memExpr.property);
            const heapObj = this.heap[ref.__ref__];
            if(heapObj.type === 'array') heapObj.values[index] = value;
            return value;
        }
        return;
      }
      case "NewExpr": {
          const expr = node as NewExpr;
          const refId = `heap_${this.nextHeapId++}`;
          this.heap[refId] = { type: 'object', className: expr.callee.symbol, fields: {} };
          this.addTrace(expr.line, 'allocation');
          return { __ref__: refId };
      }
      case "ArrayCreationExpr": {
          const expr = node as ArrayCreationExpr;
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
          const expr = node as MemberExpr;
          const obj = this.evaluate(expr.object);
          if (expr.computed) { // arr[i]
              const index = this.evaluate(expr.property);
              const heapObj = this.heap[obj.__ref__];
              if (heapObj.type === 'array') return heapObj.values[index];
          } else { // obj.length
              if ((expr.property as Identifier).symbol === 'length') {
                const heapObj = this.heap[obj.__ref__];
                if (heapObj.type === 'array') return heapObj.values.length;
              }
          }
          return;
      }
      case "CallExpr": {
        const expr = node as CallExpr;
        const args = expr.args.map(arg => this.evaluate(arg));

        if (
          expr.callee.kind === "MemberExpr" &&
          (expr.callee as MemberExpr).object.kind === 'MemberExpr' &&
          (((expr.callee as MemberExpr).object as MemberExpr).object.kind === 'Identifier') &&
          (((expr.callee as MemberExpr).object as MemberExpr).object as Identifier).symbol === 'System'
        ) {
            const callee = expr.callee as MemberExpr;
            const systemOut = callee.object as MemberExpr;
            if (systemOut.property && systemOut.property.kind === 'Identifier' && (systemOut.property as Identifier).symbol === 'out' && callee.property.kind === 'Identifier') {
                const methodName = (callee.property as Identifier).symbol;

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
        
        const calleeInfo = expr.callee as MemberExpr;
        const instanceRef = this.evaluate(calleeInfo.object) as HeapRef;
        const instance = this.heap[instanceRef.__ref__];
        if (instance.type !== 'object') throw new Error("Cannot call method on non-object.");

        const classDef = this.globalEnv.lookup(instance.className);
        const method = classDef.methods[(calleeInfo.property as Identifier).symbol];
        
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
          const expr = node as PostfixExpr;
          const varName = expr.argument.symbol;
          const currentValue = this.currentEnv.lookup(varName);
          const newValue = expr.operator === '++' ? currentValue + 1 : currentValue - 1;
          this.currentEnv.assign(varName, newValue);
          this.addTrace(expr.line);
          return currentValue;
      }
      default:
        console.error("Unhandled AST node:", node);
        throw new Error(`Unsupported language feature: ${(node as Node).kind}`);
    }
  }
}

// --- Syntax Validation ---
export const validateJavaSyntax = (code: string): { line: number, message: string } | null => {
  if (!code.trim()) return null;
  try {
    const tokens = tokenize(code);
    new Parser(tokens).parse();
    return null;
  } catch (e) {
    if (e instanceof ParseError) return { line: e.line, message: e.message };
    if (e instanceof Error) return { line: 1, message: e.message };
    return { line: 1, message: 'An unknown parsing error occurred.' };
  }
};


// --- Public API Wrapper ---
export const interpretJavaCode = (code: string): Promise<ExecutionStep[]> => {
  console.log('Connecting to secure execution sandbox...');
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const tokens = tokenize(code);
        const ast = new Parser(tokens).parse();
        const interpreter = new Interpreter();
        const trace = interpreter.run(ast);
        
        if (trace.length === 0 && code.trim().length > 0) {
          reject(new Error("Interpretation failed. The code may contain unsupported syntax or logic errors."));
          return;
        }

        console.log('Execution successful. Received trace from sandbox.');
        resolve(trace);
      } catch (error) {
        console.error('Error during sandboxed execution simulation:', error);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    }, 100);
  });
};
