package com.javavis;

import java.io.*;
import java.nio.file.*;
import javax.tools.*;

public class CodeRunner {
    private static final String TEMP_DIR = System.getProperty("java.io.tmpdir") + "/javavis-temp/";

    public static void main(String[] args) throws Exception {
        if (args.length == 0) {
            System.err.println("ERROR: No code provided");
            System.exit(1);
        }

        String userCode = args[0];
        System.err.println("[DEBUG] Received code length: " + userCode.length());

        try {
            // 1. Preparar directorio temporal
            File tempDir = new File(TEMP_DIR);
            if (tempDir.exists()) {
                deleteDirectory(tempDir);
            }
            tempDir.mkdirs();
            System.err.println("[DEBUG] Created temp dir: " + tempDir);

            // 2. Instrumentar código
            String instrumentedCode = instrumentCode(userCode);
            System.err.println("[DEBUG] Instrumented code:\n" + instrumentedCode);

            // 3. Escribir código instrumentado
            File sourceFile = new File(tempDir, "Main.java");
            Files.writeString(sourceFile.toPath(), instrumentedCode);
            System.err.println("[DEBUG] Wrote instrumented code to: " + sourceFile);

            // 4. Compilar
            JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
            int compileResult = compiler.run(null, null, null, sourceFile.getAbsolutePath());

            if (compileResult != 0) {
                System.err.println("[ERROR] Compilation failed with code " + compileResult);
                System.exit(1);
            }
            System.err.println("[DEBUG] Compilation successful");

            // 5. Ejecutar con classpath que incluya StateCapture, Gson, etc
            ProcessBuilder pb = new ProcessBuilder(
                    "java",
                    "-cp", tempDir.getAbsolutePath() + ":java-runner/build:java-runner/lib/gson-2.10.1.jar",
                    "Main");

            Process process = pb.start();

            // Capturar salida
            StringBuilder stdout = new StringBuilder();
            StringBuilder stderr = new StringBuilder();

            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    stdout.append(line).append("\n");
                }
            }

            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getErrorStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    stderr.append(line).append("\n");
                }
            }

            boolean finished = process.waitFor(5, java.util.concurrent.TimeUnit.SECONDS);
            if (!finished) {
                process.destroy();
                System.err.println("[ERROR] Execution timeout");
                System.exit(1);
            }

            int exitCode = process.exitValue();
            System.err.println("[DEBUG] Execution exit code: " + exitCode);
            System.err.println("[DEBUG] Stdout: " + stdout.toString());
            if (stderr.length() > 0) {
                System.err.println("[DEBUG] Stderr: " + stderr.toString());
            }

            // 6. Output
            System.out.println(stdout.toString());

        } catch (Exception e) {
            System.err.println("[ERROR] " + e.getClass().getName() + ": " + e.getMessage());
            e.printStackTrace(System.err);
            System.exit(1);
        }
    }

    private static String instrumentCode(String userCode) {
        StringBuilder result = new StringBuilder();
        result.append("import com.javavis.StateCapture;\n\n");

        String[] lines = userCode.split("\n", -1);
        boolean inMainMethod = false;
        int braceDepth = 0;
        int lineNum = 0;
        int mainClosingLineIndex = -1;

        // Primera pasada: encontrar cierre del main
        for (int i = 0; i < lines.length; i++) {
            String trimmed = lines[i].trim();

            if (trimmed.contains("static void main()") || trimmed.contains("public static void main")) {
                inMainMethod = true;
            }

            for (char c : trimmed.toCharArray()) {
                if (c == '{')
                    braceDepth++;
                if (c == '}')
                    braceDepth--;
            }

            if (inMainMethod && braceDepth == 0 && trimmed.equals("}")) {
                mainClosingLineIndex = i;
                break;
            }
        }

        // Segunda pasada: inyectar
        inMainMethod = false;
        braceDepth = 0;
        lineNum = 0;

        for (int i = 0; i < lines.length; i++) {
            String line = lines[i];
            String trimmed = line.trim();
            lineNum++;

            if (trimmed.contains("static void main()") || trimmed.contains("public static void main")) {
                inMainMethod = true;
            }

            for (char c : trimmed.toCharArray()) {
                if (c == '{')
                    braceDepth++;
                if (c == '}')
                    braceDepth--;
            }

            // Si es la línea de cierre del main
            if (i == mainClosingLineIndex - 1) {
                String indent = getIndentation(line);
                result.append(indent).append("StateCapture.getTraceJSON();\n");
            }

            result.append(line).append("\n");

            // Inyectar después de TODAS las líneas ejecutables en main
            if (inMainMethod &&
                    braceDepth > 0 &&
                    !trimmed.isEmpty() &&
                    !trimmed.equals("{") &&
                    !trimmed.equals("}") &&
                    !trimmed.startsWith("//") &&
                    !trimmed.startsWith("/*")) {

                String indent = getIndentation(line);
                result.append(indent)
                        .append("StateCapture.captureState(")
                        .append(lineNum)
                        .append(");\n");

                System.err.println("[DEBUG] Instrumented line " + lineNum + ": " + trimmed);
            }
        }

        return result.toString();
    }

    private static String getIndentation(String line) {
        int count = 0;
        for (char c : line.toCharArray()) {
            if (c == ' ')
                count++;
            else if (c == '\t')
                count += 4;
            else
                break;
        }
        return " ".repeat(count);
    }

    // private static boolean isExecutableLine(String line) {
    // if (line.isEmpty() ||
    // line.startsWith("//") ||
    // line.startsWith("/*") ||
    // line.startsWith("*") ||
    // line.equals("{") ||
    // line.equals("}") ||
    // line.startsWith("for ") ||
    // line.startsWith("while ") ||
    // line.startsWith("if ") ||
    // line.startsWith("else") ||
    // line.startsWith("class ") ||
    // line.startsWith("static void")) {
    // return false;
    // }

    // return line.endsWith(";") || line.endsWith("{");
    // }

    private static void deleteDirectory(File dir) {
        File[] files = dir.listFiles();
        if (files != null) {
            for (File file : files) {
                if (file.isDirectory()) {
                    deleteDirectory(file);
                } else {
                    file.delete();
                }
            }
        }
        dir.delete();
    }
}
