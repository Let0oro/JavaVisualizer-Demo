export interface ExecutionTrace {
  lineNumber: number;
  variables: Record<string, unknown>;
  heap: Record<string, unknown>;
  callStack: Array<{ methodName: string; line: number; className: string }>;
  consoleOutput: string;
}

export async function executeJavaCode(userCode: string): Promise<ExecutionTrace[]> {
  try {
    const process = Bun.spawn([
      "java",
      "-cp",
      "java-runner/build:java-runner/lib/gson-2.10.1.jar",
      "com.javavis.CodeRunner",
      userCode,
    ]);

    const stdout = await new Response(process.stdout).text();
    const stderr = await new Response(process.stderr).text();
    const exitCode = await process.exited;

    if (exitCode !== 0) {
      console.error("[DEBUG] Java stderr:", stderr);
      throw new Error(`Java execution failed: ${stderr || "Unknown error"}`);
    }

    if (!stdout.trim()) {
      console.error("[DEBUG] Empty stdout. Stderr:", stderr);
      throw new Error("Java returned empty output");
    }

    try {
      const trace: ExecutionTrace[] = JSON.parse(stdout);
      return trace;
    } catch (parseError) {
      console.error("[DEBUG] JSON Parse Error:", parseError);
      console.error("[DEBUG] Stdout (first 500 chars):", stdout.substring(0, 500));
      console.error("[DEBUG] Stderr:", stderr);
      throw new Error(`JSON parsing failed: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
  } catch (error) {
    console.error("Error executing Java code:", error);
    throw error;
  }
}
