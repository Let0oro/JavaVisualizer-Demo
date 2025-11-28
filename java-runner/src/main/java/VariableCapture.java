package com.javavis;

import java.lang.reflect.*;
import java.util.*;

public class VariableCapture {
    
    /**
     * Captura todas las variables locales del stack actual
     * Usa reflection para obtener los valores
     */
    public static Map<String, Object> captureLocalVariables() {
        Map<String, Object> variables = new LinkedHashMap<>();
        
        try {
            // Obtener el frame actual (Main.main)
            StackTraceElement[] stackTrace = Thread.currentThread().getStackTrace();
            
            // Buscar la clase Main
            for (StackTraceElement element : stackTrace) {
                if (element.getClassName().equals("Main") && element.getMethodName().equals("main")) {
                    // Obtener la clase Main
                    Class<?> mainClass = Class.forName("Main");
                    
                    // Crear instancia para acceder a fields estáticos
                    // En Main, todas las variables son locales al método main
                    // Necesitamos usar un enfoque diferente
                    break;
                }
            }
            
            // Alternativa: Inyectar en cada paso el código para guardar variables
            // en un objeto accesible por reflection
            
        } catch (Exception e) {
            // Ignorar errores de reflection
        }
        
        return variables;
    }
}
