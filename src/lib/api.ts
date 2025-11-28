export interface ExecutionTrace {
  lineNumber: number;
  variables: Record<string, any>;
  heap: Record<string, any>;
  callStack: Array<{ methodName: string; line: number }>;
  consoleOutput: string;
}

export async function interpretCode(code: string): Promise<ExecutionTrace[]> {
  try {
    const response = await fetch("/api/interpret", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Interpretation failed");
    }

    return data.trace;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}
