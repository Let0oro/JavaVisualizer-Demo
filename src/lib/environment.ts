export class Environment {
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

export interface StackFrame { methodName: string, line: number, env: Environment }
export class ReturnSentinel { constructor(public value: any) {} }
export const BREAK_SENTINEL = { break: true };
export const CONTINUE_SENTINEL = { continue: true };
