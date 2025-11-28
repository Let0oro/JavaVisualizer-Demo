#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SRC_DIR="$SCRIPT_DIR/src/main/java"
LIB_DIR="$SCRIPT_DIR/lib"
OUT_DIR="$SCRIPT_DIR/build"

# Limpiar
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

# Compilar todas las clases
echo "Compiling Java runner..."
javac -d "$OUT_DIR" \
      -cp "$LIB_DIR/gson-2.10.1.jar" \
      "$SRC_DIR/com/javavis/"*.java

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi
