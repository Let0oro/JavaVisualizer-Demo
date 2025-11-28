package com.javavis;

import java.io.*;
import java.nio.file.*;
import javax.tools.*;

public class CodeRunner {
    private static final String TEMPDIR = System.getProperty("java.io.tmpdir") + "/javavis-temp";

    public static void main(String[] args) throws Exception {
        if (args.length == 0) {
            System.err.println("[ERROR] No code provided");
            System.exit(1);
        }

        String userCode = args[0];
        System.err.println("[DEBUG] Received code length: " + userCode.length());

        try {
            // 1. Preparar directorio temporal
            File tempDir = new File(TEMPDIR);
            if (tempDir.exists())
                deleteDirectory(tempDir);
            tempDir.mkdirs();
            System.err.println("[DEBUG] Created temp dir: " + tempDir);

            // 2. Instrumentar código
            String instrumentedCode = instrumentCode(userCode);
            System.err.println("[DEBUG] Main closing line index calculated");

            // 3. Escribir código instrumentado
            File sourceFile = new File(tempDir, "Main.java");
            Files.write(sourceFile.toPath(), instrumentedCode.getBytes());
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
                    "-cp",
                    tempDir.getAbsolutePath() + ":" + System.getProperty("java.class.path"),
                    "Main");

            Process process = pb.start();

            StringBuilder stdout = new StringBuilder();
            StringBuilder stderr = new StringBuilder();

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    stdout.append(line).append("\n");
                }
            }

            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getErrorStream()))) {
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

            if (stderr.length() > 0) {
                System.err.println("[DEBUG] Java stderr: " + stderr);
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
        if (trimmed.contains("static void main") || trimmed.contains("public static void main")) {
            inMainMethod = true;
        }
        for (char c : trimmed.toCharArray()) {
            if (c == '{') braceDepth++;
            if (c == '}') braceDepth--;
        }
        if (inMainMethod && braceDepth == 0 && trimmed.equals("}")) {
            mainClosingLineIndex = i;
            System.err.println("[DEBUG] Main closing line index: " + mainClosingLineIndex);
            break;
        }
    }

    // Segunda pasada: inyectar código
    inMainMethod = false;
    braceDepth = 0;
    lineNum = 0;

    for (int i = 0; i < lines.length; i++) {
        String line = lines[i];
        String trimmed = line.trim();
        lineNum++;

        if (trimmed.contains("static void main") || trimmed.contains("public static void main")) {
            inMainMethod = true;
        }

        for (char c : trimmed.toCharArray()) {
            if (c == '{') braceDepth++;
            if (c == '}') braceDepth--;
        }

        // Si es la línea ANTES de cerrar main, inyectar getTraceJSON ANTES
        if (i == mainClosingLineIndex - 1 && inMainMethod && braceDepth > 0) {
            String indent = getIndentation(line);
            result.append(indent).append("StateCapture.getTraceJSON();\n");
            System.err.println("[DEBUG] Injected getTraceJSON before main closing");
        }

        // Escribir la línea original
        result.append(line).append("\n");

        // Inyectar captureState después de TODAS las líneas ejecutables dentro del main
        if (inMainMethod && braceDepth > 0 && !trimmed.isEmpty() && 
            !trimmed.equals("{") && !trimmed.equals("}") &&
            !trimmed.startsWith("//") && !trimmed.startsWith("*")) {
            
            String indent = getIndentation(line);

            // ⭐ Para asignaciones a array elements (arr[i] = valor)
            if (trimmed.contains("[") && trimmed.contains("]") && trimmed.contains("=") && !trimmed.contains("==")) {
                String arrayName = extractArrayName(trimmed);
                if (arrayName != null && !arrayName.equals("int") && !arrayName.equals("long") && 
                    !arrayName.equals("double") && !arrayName.equals("float") && !arrayName.equals("boolean")) {
                    result.append(indent)
                        .append("StateCapture.setVariable(\"")
                        .append(arrayName)
                        .append("\", ")
                        .append(arrayName)
                        .append(");\n");
                    System.err.println("[DEBUG] Added setVariable for array: " + arrayName);
                }
            }
            // Para asignaciones normales
            else if (trimmed.contains("=") && !trimmed.contains("==") && !trimmed.contains("!=")) {
                String varName = extractVariableName(trimmed);
                if (varName != null) {
                    result.append(indent)
                        .append("StateCapture.setVariable(\"")
                        .append(varName)
                        .append("\", ")
                        .append(varName)
                        .append(");\n");
                }
            }

            // Para loops FOR
            if (trimmed.startsWith("for")) {
                String[] forVars = extractForVariables(trimmed);
                for (String var : forVars) {
                    result.append(indent)
                        .append("StateCapture.setVariable(\"")
                        .append(var)
                        .append("\", ")
                        .append(var)
                        .append(");\n");
                }
            }

            // Finalmente: inyectar captureState
            result.append(indent)
                .append("StateCapture.captureState(")
                .append(lineNum)
                .append(");\n");
            
            System.err.println("[DEBUG] Instrumented line " + lineNum + ": " + trimmed);
        }
    }

    System.err.println("[DEBUG] Instrumented code:\n" + result.toString());
    return result.toString();
}

/**
 * Extrae el nombre del array de una asignación a elemento
 * "numeros[0] = 10" -> "numeros"
 * "suma += numeros[i]" -> "numeros"
 */
private static String extractArrayName(String line) {
    // Buscar el primer [
    int bracketIndex = line.indexOf("[");
    if (bracketIndex <= 0) return null;

    // Obtener todo antes del [
    String before = line.substring(0, bracketIndex).trim();
    
    // Si contiene =, tomar solo la parte izquierda
    if (before.contains("=")) {
        before = before.substring(0, before.indexOf("=")).trim();
    }

    // Remover operadores += -= etc
    before = before.replaceAll("[+\\-*/%]=$", "").trim();

    // Remover tipos (int[], String[], etc)
    before = before.replaceAll("int\\[.*?\\]", "").trim();
    before = before.replaceAll("long\\[.*?\\]", "").trim();
    before = before.replaceAll("double\\[.*?\\]", "").trim();
    before = before.replaceAll("float\\[.*?\\]", "").trim();
    before = before.replaceAll("boolean\\[.*?\\]", "").trim();
    before = before.replaceAll("String\\[.*?\\]", "").trim();
    
    // Remover palabras clave como "int", "long", etc
    before = before.replaceAll("\\b(int|long|double|float|boolean|String|char)\\b", "").trim();

    // Validar que sea un nombre válido
    if (before.matches("[a-zA-Z_][a-zA-Z0-9_]*")) {
        return before;
    }

    return null;
}

/**
 * Extrae el nombre de variable de una asignación
 * Ejemplos: "int x = 5" -> "x", "x = 10" -> "x"
 */
private static String extractVariableName(String line) {
    int eqIndex = line.indexOf("=");
    if (eqIndex == -1) return null;

    // Ignorar ==, !=, <=, >=
    if (eqIndex > 0 && (line.charAt(eqIndex - 1) == '!' || 
                         line.charAt(eqIndex - 1) == '=' ||
                         line.charAt(eqIndex - 1) == '<' ||
                         line.charAt(eqIndex - 1) == '>')) {
        return null;
    }

    String before = line.substring(0, eqIndex).trim();
    
    // Eliminar operadores +=, -=, etc
    if (before.endsWith("+") || before.endsWith("-") || 
        before.endsWith("*") || before.endsWith("/")) {
        before = before.substring(0, before.length() - 1).trim();
    }

    // Si tiene tipo (int x, String s, etc), extraer solo el nombre
    String[] parts = before.split("\\s+");
    if (parts.length > 0) {
        String varName = parts[parts.length - 1];
        
        // Validar que sea un nombre válido
        if (varName.matches("[a-zA-Z_][a-zA-Z0-9_]*")) {
            return varName;
        }
    }

    return null;
}

/**
 * Extrae variables de una declaración FOR
 * Ejemplos: "for (int i = 0; i < 5; i++)" -> ["i"]
 */
private static String[] extractForVariables(String line) {
    int openParen = line.indexOf("(");
    int closeParen = line.lastIndexOf(")");
    
    if (openParen == -1 || closeParen == -1) {
        return new String[0];
    }

    String forContent = line.substring(openParen + 1, closeParen);
    
    java.util.List<String> vars = new java.util.ArrayList<>();
    
    java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(
        "\\b(?:int|long|double|float|boolean|String|char)\\s+([a-zA-Z_][a-zA-Z0-9_]*)"
    );
    java.util.regex.Matcher matcher = pattern.matcher(forContent);
    
    while (matcher.find()) {
        vars.add(matcher.group(1));
    }

    return vars.toArray(new String[0]);
}

private static String getIndentation(String line) {
    int count = 0;
    for (char c : line.toCharArray()) {
        if (c == ' ') {
            count++;
        } else if (c == '\t') {
            count += 4;
        } else {
            break;
        }
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
