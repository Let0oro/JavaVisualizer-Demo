export interface Node { kind: string, line: number, start?: number, end?: number }

export interface Program extends Node { kind: "Program"; body: Stmt[] }
export interface ClassDeclaration extends Node { kind: "ClassDeclaration"; name: string; body: Stmt[] }

export interface MethodDeclaration extends Node { kind: "MethodDeclaration", returnType: string, name: string, params: Param[], body: Stmt[] };
export interface Param extends Node { kind: "Param", type: string, name: string };
export interface VariableDeclaration extends Node { kind: "VariableDeclaration", type: string, name: string, value?: Expr };
export interface ExpressionStatement extends Node { kind: "ExpressionStatement", expression: Expr };
export interface BlockStatement extends Node { kind: "BlockStatement", body: Stmt[] };
export interface ForStatement extends Node { kind: "ForStatement", init?: Stmt, test?: Expr, update?: Expr, body: Stmt };
export interface WhileStatement extends Node { kind: "WhileStatement", test: Expr, body: Stmt };
export interface DoWhileStatement extends Node { kind: "DoWhileStatement", test: Expr, body: Stmt };
export interface IfStatement extends Node { kind: "IfStatement", test: Expr, consequent: Stmt, alternate?: Stmt };
export interface ReturnStatement extends Node { kind: "ReturnStatement", argument?: Expr };
export interface BreakStatement extends Node { kind: "BreakStatement" };
export interface ContinueStatement extends Node { kind: "ContinueStatement" };

export interface BinaryExpr extends Node { kind: "BinaryExpr", left: Expr, right: Expr, operator: string };
export interface LogicalExpr extends Node { kind: "LogicalExpr", left: Expr, right: Expr, operator: string };
export interface UnaryExpr extends Node { kind: "UnaryExpr", operator: string, argument: Expr };
export interface Identifier extends Node { kind: "Identifier", symbol: string };
export interface NumericLiteral extends Node { kind: "NumericLiteral", value: number };
export interface DoubleLiteral extends Node { kind: "DoubleLiteral", value: number };
export interface BooleanLiteral extends Node { kind: "BooleanLiteral", value: boolean };
export interface StringLiteral extends Node { kind: "StringLiteral", value: string };
export interface AssignmentExpr extends Node { kind: "AssignmentExpr", assignee: Expr, value: Expr };
export interface MemberExpr extends Node { kind: "MemberExpr", object: Expr, property: Expr, computed: boolean };
export interface CallExpr extends Node { kind: "CallExpr", callee: Expr, args: Expr[] };
export interface NewExpr extends Node { kind: "NewExpr", callee: Identifier, args: Expr[] };
export interface ArrayCreationExpr extends Node { kind: "ArrayCreationExpr", type: string, size?: Expr, values?: Expr[] };
export interface PostfixExpr extends Node { kind: "PostfixExpr", operator: string, argument: Identifier };


export interface NullLiteral extends Node {
  kind: "NullLiteral";
}

export type Expr = BinaryExpr | LogicalExpr | UnaryExpr | Identifier | NumericLiteral | DoubleLiteral | BooleanLiteral | StringLiteral | AssignmentExpr | NullLiteral | MemberExpr | CallExpr | NewExpr | ArrayCreationExpr | PostfixExpr | CompoundAssignmentExpr;

export type Stmt = ClassDeclaration | MethodDeclaration | VariableDeclaration | ExpressionStatement | BlockStatement | ForStatement | WhileStatement | DoWhileStatement | IfStatement | ReturnStatement | BreakStatement | ContinueStatement;


// ast.ts
export interface PreIncrementExpr extends Node {
  kind: "PreIncrementExpr";
  operator: "++" | "--";
  argument: Identifier;
}

export interface ConditionalExpr extends Node {
  kind: "ConditionalExpr";
  test: Expr;
  consequent: Expr;
  alternate: Expr;
}

export interface InstanceofExpr extends Node {
  kind: "InstanceofExpr";
  expression: Expr;
  type: string;
}

export interface CompoundAssignmentExpr extends Node {
  kind: "CompoundAssignmentExpr";
  assignee: Expr;
  operator: "+=" | "-=" | "*=" | "/=";
  value: Expr;
}