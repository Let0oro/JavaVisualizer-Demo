import { serve } from "bun";
import { executeJavaCode } from "./lib/javaRunner";
import { join } from "path";
import { existsSync, readFileSync, statSync } from "fs";

serve({
  port: 3000,
  async fetch(request) {
    const url = new URL(request.url);

    // ===== API: Interpretar código Java =====
    if (url.pathname === "/api/interpret" && request.method === "POST") {
      try {
        const body = await request.json();
        const { code } = body;

        if (!code) {
          return Response.json(
            { error: "No code provided" },
            { status: 400 }
          );
        }

        // Ejecutar código Java
        const trace = await executeJavaCode(code);

        return Response.json({ trace, error: null }, { status: 200 });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return Response.json(
          { trace: [], error: errorMessage },
          { status: 500 }
        );
      }
    }

    // ===== Health check =====
    if (url.pathname === "/health") {
      return Response.json({ status: "ok" });
    }

    // ===== Servir archivos estáticos del frontend =====
    let filePath = join(process.cwd(), "dist", url.pathname);
    
    // Si no existe en dist, buscar en public
    if (!existsSync(filePath)) {
      filePath = join(process.cwd(), "public", url.pathname);
    }

    // Si la ruta existe y es un archivo, servir
    if (existsSync(filePath)) {
      try {
        const stat = statSync(filePath);
        
        // Si es un directorio, servir index.html
        if (stat.isDirectory()) {
          const indexPath = join(filePath, "index.html");
          if (existsSync(indexPath)) {
            const html = readFileSync(indexPath, "utf-8");
            return new Response(html, {
              headers: { "Content-Type": "text/html" },
            });
          }
        } 
        // Si es un archivo, servir con el content-type correcto
        else {
          const file = readFileSync(filePath);
          const contentType = getContentType(filePath);
          return new Response(file, {
            headers: { "Content-Type": contentType },
          });
        }
      } catch (error) {
        console.error("Error reading file:", error);
      }
    }

    // ===== Si no existe, servir index.html (para SPA routing) =====
    const indexPath = join(process.cwd(), "dist", "index.html");
    if (existsSync(indexPath)) {
      const html = readFileSync(indexPath, "utf-8");
      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  },
});

function getContentType(filePath: string): string {
  if (filePath.endsWith(".html")) return "text/html";
  if (filePath.endsWith(".css")) return "text/css";
  if (filePath.endsWith(".js")) return "application/javascript";
  if (filePath.endsWith(".json")) return "application/json";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".jpg")) return "image/jpeg";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".woff")) return "font/woff";
  if (filePath.endsWith(".woff2")) return "font/woff2";
  return "application/octet-stream";
}

console.log("🚀 Server running at http://localhost:3000");
