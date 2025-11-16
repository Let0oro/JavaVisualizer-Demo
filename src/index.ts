import { serve } from "bun";
import index from "./index.html";
import { interpretJavaCode } from "./lib";

const server = serve({
  routes: {
    // Serve index.html for all unmatched routes.
    "/*": index,

    "/api/interpret": {
      async POST(req) {
        try {
          console.log("APi interpret called");
          const { code } = await req.json();
          console.log({code});
          const trace = await interpretJavaCode(code);
          return Response.json({ trace });
        } catch (err) {
          return Response.json({ error: String(err) }, { status: 400 });
        }
      },
    },

    "/api/hello/:name": async req => {
      const name = req.params.name;
      return Response.json({
        message: `Hello, ${name}!`,
      });
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    // Enable browser hot reloading in development
    hmr: true,

    // Echo console logs from the browser to the server
    console: true,
  },

});

console.log(`🚀 Server running at ${server.url}`);


// import { serve } from "bun";
// // import index from "./index.html";
// import { interpretJavaCode } from "./lib";

// const html = Bun.file("./src/index.html");


// const server = serve({
//   fetch: async req => {
//     const url = new URL(req.url);

//     if (url.pathname === "/interpret" && req.method === "POST") {
//       try {
//         const { code } = await req.json();
//         const trace = await interpretJavaCode(code);
//         return Response.json({ trace });
//       } catch (err) {
//         return Response.json({ error: String(err) }, { status: 400 });
//       }
//     }

//     // Para /
//     if (url.pathname === "/") {
//       return new Response(html, { headers: { "Content-Type": "text/html" } });
//     }

//     return new Response("Not found", { status: 404 });
//   },
//   port: 3000,
// });

// console.log(`🚀 Server running at ${server.url}`);
