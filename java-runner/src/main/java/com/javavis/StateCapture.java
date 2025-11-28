package com.javavis;

import java.util.*;
import java.io.*;

public class StateCapture {
    private static final List<Map<String, Object>> trace = new ArrayList<>();
    private static int stepCount = 0;
    private static final int MAXSTEPS = 25000;
    private static final StringBuilder consoleBuffer = new StringBuilder();
    private static PrintStream originalOut;
    private static PrintStream captureStream;
    private static int lastCapturedLength = 0;
    
    // Mapa de variables actuales (ahora puede contener arrays/objetos directamente)
    private static final Map<String, Object> currentVariables = new LinkedHashMap<>();
    
    static {
        originalOut = System.out;
        captureStream = new PrintStream(new OutputStream() {
            @Override
            public void write(int b) throws IOException {
                consoleBuffer.append((char) b);
            }
        });
        System.setOut(captureStream);
    }
    
    /**
     * Establece una variable - determina automáticamente si es primitivo u objeto
     */
    public static void setVariable(String name, Object value) {
        currentVariables.put(name, serializeValue(value));
    }
    
    /**
     * Convierte un valor a su representación para el debugger
     * - Primitivos: valor directo
     * - Arrays: lista de elementos
     * - Objetos: mapa de propiedades
     */
    private static Object serializeValue(Object value) {
        if (value == null) {
            return null;
        }
        
        // Si es array, convertir a lista
        if (value.getClass().isArray()) {
            List<Object> arrayContent = new ArrayList<>();
            int length = java.lang.reflect.Array.getLength(value);
            for (int i = 0; i < length; i++) {
                Object element = java.lang.reflect.Array.get(value, i);
                arrayContent.add(serializeValue(element));
            }
            return arrayContent;
        }
        
        // Primitivos y Strings: devolver directamente
        if (value instanceof Integer || value instanceof Long ||
            value instanceof Double || value instanceof Float ||
            value instanceof Boolean || value instanceof String) {
            return value;
        }
        
        // Para otros objetos, crear un mapa con sus propiedades
        Map<String, Object> objMap = new LinkedHashMap<>();
        try {
            java.lang.reflect.Field[] fields = value.getClass().getDeclaredFields();
            for (java.lang.reflect.Field field : fields) {
                if (!java.lang.reflect.Modifier.isStatic(field.getModifiers())) {
                    field.setAccessible(true);
                    objMap.put(field.getName(), serializeValue(field.get(value)));
                }
            }
        } catch (Exception e) {
            objMap.put("_error", e.getMessage());
        }
        return objMap;
    }
    
    /**
     * Captura el estado actual en un paso
     */
    public static void captureState(int lineNumber) {
        if (stepCount >= MAXSTEPS) {
            throw new RuntimeException("Maximum steps exceeded");
        }
        
        String newOutput = consoleBuffer.substring(lastCapturedLength);
        lastCapturedLength = consoleBuffer.length();
        
        Map<String, Object> step = new HashMap<>();
        step.put("lineNumber", lineNumber);
        step.put("variables", new LinkedHashMap<>(currentVariables));
        step.put("callStack", captureCallStack());
        step.put("consoleOutput", newOutput);
        
        trace.add(step);
        stepCount++;
    }
    
    /**
     * Captura el call stack actual
     */
    private static List<Map<String, Object>> captureCallStack() {
        List<Map<String, Object>> stack = new ArrayList<>();
        StackTraceElement[] elements = Thread.currentThread().getStackTrace();
        
        for (int i = 3; i < Math.min(elements.length, 10); i++) {
            StackTraceElement elem = elements[i];
            if (elem.getClassName().startsWith("java.") ||
                elem.getClassName().startsWith("sun.") ||
                elem.getClassName().contains("StateCapture")) {
                continue;
            }
            
            Map<String, Object> frame = new HashMap<>();
            frame.put("methodName", elem.getMethodName());
            frame.put("line", elem.getLineNumber());
            frame.put("className", elem.getClassName());
            stack.add(frame);
        }
        return stack;
    }
    
    /**
     * Obtiene la traza completa como JSON
     */
    public static String getTraceJSON() {
        com.google.gson.Gson gson = new com.google.gson.Gson();
        String json = gson.toJson(trace);
        originalOut.println(json);
        originalOut.flush();
        return json;
    }
    
    /**
     * Resetea la captura para una nueva ejecución
     */
    public static void reset() {
        trace.clear();
        stepCount = 0;
        consoleBuffer.setLength(0);
        lastCapturedLength = 0;
        currentVariables.clear();
    }
}
