package com.javavis;

import java.io.*;
import java.nio.file.*;
import javax.tools.*;
import java.util.regex.*;

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

            // 5. Ejecutar con classpath
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
                if (c == '{') braceDepth++;
                if (c == '}') braceDepth--;
            }
            
            if (inMainMethod && braceDepth == 0 && trimmed.equals("}")) {
                mainClosingLineIndex = i;
                break;
            }
        }
        
        System.err.println("[DEBUG] Main closing line index: " + mainClosingLineIndex);
        
        // Segunda pasada: inyectar código
        inMainMethod = false;
        braceDepth = 0;
        lineNum = 0;
        
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i];
            String trimmed = line.trim();
            lineNum++;
            
            if (trimmed.contains("static void main()") || trimmed.contains("public static void main")) {
                inMainMethod = true;
                System.err.println("[DEBUG] Found main at line " + lineNum);
            }
            
            for (char c : trimmed.toCharArray()) {
                if (c == '{') braceDepth++;
                if (c == '}') braceDepth--;
            }
            
            // Si es la línea de cierre del main
            if (i == mainClosingLineIndex - 1) {
                String indent = getIndentation(line);
                result.append(indent).append("StateCapture.getTraceJSON();\n");
                System.err.println("[DEBUG] Injected getTraceJSON before main closing");
            }
            
            // Escribir la línea original
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
                
                // Si es una línea de FOR, inyectar setVariable para la variable de loop
                if (trimmed.startsWith("for ")) {
                    String[] forVars = extractForVariables(trimmed);
                    for (String var : forVars) {
                        result.append(indent)
                              .append("StateCapture.setVariable(\"")
                              .append(var)
                              .append("\", ")
                              .append(var)
                              .append(");\n");
                        System.err.println("[DEBUG] Added setVariable for FOR var: " + var);
                    }
                }
                
                // Si es una asignación normal, inyectar setVariable
                String varName = extractVariableName(trimmed);
                if (varName != null && trimmed.endsWith(";")) {
                    result.append(indent)
                          .append("StateCapture.setVariable(\"")
                          .append(varName)
                          .append("\", ")
                          .append(varName)
                          .append(");\n");
                    
                    System.err.println("[DEBUG] Added setVariable for: " + varName);
                }
                
                // Inyectar captureState
                result.append(indent)
                      .append("StateCapture.captureState(")
                      .append(lineNum)
                      .append(");\n");
                
                System.err.println("[DEBUG] Instrumented line " + lineNum + ": " + trimmed);
            }
        }
        
        return result.toString();
    }

    /**
     * Extrae variables de una declaración FOR
     * Ejemplos:
     *   for (int i = 0; i < 5; i++)       → ["i"]
     *   for (int i = 0, j = 0; i < 5; i++) → ["i", "j"]
     */
    private static String[] extractForVariables(String line) {
        // Buscar el contenido entre paréntesis
        int openParen = line.indexOf('(');
        int closeParen = line.lastIndexOf(')');
        
        if (openParen == -1 || closeParen == -1) {
            return new String[0];
        }
        
        String forContent = line.substring(openParen + 1, closeParen);
        
        // Buscar declaraciones como "int i" o "int i, j"
        Pattern pattern = Pattern.compile("\\b(int|long|double|float|boolean|String|char)\\s+([a-zA-Z_][a-zA-Z0-9_]*)");
        Matcher matcher = pattern.matcher(forContent);
        
        java.util.List<String> vars = new java.util.ArrayList<>();
        while (matcher.find()) {
            vars.add(matcher.group(2));  // Capturar solo el nombre de la variable
        }
        
        return vars.toArray(new String[0]);
    }

    /**
     * Extrae el nombre de variable de una línea de asignación
     * Ejemplos:
     *   int x = 5;        → "x"
     *   String s = "hi";  → "s"
     *   x = 10;           → "x"
     *   x += 5;           → "x"
     */
    private static String extractVariableName(String line) {
        // Buscar el operador de asignación
        int eqIndex = line.indexOf('=');
        if (eqIndex == -1) return null;
        
        // Ignorar ==, !=, <=, >=
        if (eqIndex > 0 && "!<>=".indexOf(line.charAt(eqIndex - 1)) != -1) {
            return null;
        }
        if (eqIndex < line.length() - 1 && line.charAt(eqIndex + 1) == '=') {
            return null;
        }
        
        // Parte antes del =
        String before = line.substring(0, eqIndex).trim();
        
        // Eliminar operadores como += -= *=
        before = before.replaceAll("[+\\-*/%]$", "").trim();
        
        // Si tiene tipo (int x, String s, etc)
        String[] parts = before.split("\\s+");
        String varName = parts[parts.length - 1];
        
        // Validar que sea un nombre válido (sin caracteres especiales)
        if (varName.matches("[a-zA-Z_][a-zA-Z0-9_]*")) {
            return varName;
        }
        
        return null;
    }

    private static String getIndentation(String line) {
        int count = 0;
        for (char c : line.toCharArray()) {
            if (c == ' ') count++;
            else if (c == '\t') count += 4;
            else break;
        }
        return " ".repeat(count);
    }

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
