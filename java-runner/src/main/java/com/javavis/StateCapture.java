package com.javavis;

import java.util.*;
import java.io.*;

public class StateCapture {
    private static final List<Map<String, Object>> trace = new ArrayList<>();
    private static int stepCount = 0;
    private static final int MAX_STEPS = 25000;
    private static final StringBuilder consoleBuffer = new StringBuilder();
    private static PrintStream originalOut;
    private static PrintStream captureStream;
    private static int lastCapturedLength = 0;  // ← NUEVO: track qué ya capturamos
    
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
    
    public static void captureState(int lineNumber) {
        if (stepCount++ > MAX_STEPS) {
            throw new RuntimeException("Maximum steps exceeded");
        }
        
        // Capturar SOLO lo nuevo desde el último paso
        String newOutput = consoleBuffer.substring(lastCapturedLength);
        lastCapturedLength = consoleBuffer.length();
        
        Map<String, Object> step = new HashMap<>();
        step.put("lineNumber", lineNumber);
        step.put("variables", new HashMap<>());
        step.put("heap", new HashMap<>());
        step.put("callStack", captureCallStack());
        step.put("consoleOutput", newOutput);  // ← Solo lo nuevo
        
        trace.add(step);
    }
    
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
    
    public static String getTraceJSON() {
        com.google.gson.Gson gson = new com.google.gson.Gson();
        String json = gson.toJson(trace);
        
        originalOut.println(json);
        originalOut.flush();
        
        return json;
    }
    
    public static void reset() {
        trace.clear();
        stepCount = 0;
        consoleBuffer.setLength(0);
        lastCapturedLength = 0;
    }
}
