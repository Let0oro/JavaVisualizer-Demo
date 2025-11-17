export class ParseError extends Error {
  constructor(message: string, public line: number) {
    super(message);
    this.name = "ParseError";
  }
}