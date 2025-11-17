import { serve } from "bun";
import index from "./index.html";
import { interpretJavaCode } from "./lib";

const server = serve({
  routes: {
    "/": index, // -> Serve index.html for all unmatched routes.

    "/api/interpret": {
      async POST(req) {
        try {
          const { code } = await req.json();
          const trace = await interpretJavaCode(code);
          return Response.json({ trace });
        } catch (err) {
          return Response.json({ trace: [], error: String(err) }, { status: 400 });
        }
      },
    },

    "/*": index,
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true, // -> Enable browser hot reloading in development
    console: true, // -> Echo console logs from the browser to the server
  },

});

console.log(`🚀 Server running at ${server.url}`);
