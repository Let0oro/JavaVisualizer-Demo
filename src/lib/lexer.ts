export enum TokenType {
  Class, Void, Int, Static, Public, For, If, Else, New, System, Boolean,
  Double, String, True, False, Return, While, Do, Break, Continue,
  Identifier, IntegerLiteral, DoubleLiteral, StringLiteral,
  Equals, Plus, Minus, Star, Slash, OpenParen, CloseParen, OpenBrace, CloseBrace,
  OpenBracket, CloseBracket, Semicolon, Comma, Dot, GreaterThan, LessThan, Bang,
  EqualsEquals, NotEquals, GreaterEquals, LessEquals,
  PlusPlus, MinusMinus, PlusEquals, MinusEquals, StarEquals, SlashEquals, AndAnd, OrOr,
  EOF
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
}

import { ParseError } from "./errors";

export function tokenize(source: string): Token[] {
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
    if (!char) continue;

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
        const type = twoCharOps[op]!;
        if (!type) throw new ParseError(`Unknown operator: ${op}`, line);
        tokens.push({ type, value: op, line });
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
      while (cursor < source.length && /[a-zA-Z0-9_]/.test(source[cursor]!)) {
        value += source[cursor++];
      }
      const type = KEYWORDS[value] ?? TokenType.Identifier;
      tokens.push({ type, value, line });
      continue;
    }

    if (/[0-9]/.test(char)) {
        let value = '';
        let isDouble = false;
        while (cursor < source.length && (/[0-9]/.test(source[cursor]!) || (source[cursor] === '.' && !isDouble))) {
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