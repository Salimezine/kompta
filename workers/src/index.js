import { handleUpload, handleAnalyze, getDocuments } from './routes/documents.js';
import { handleAuth } from './routes/auth.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;

    // CORS Headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS,PUT,DELETE",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      let response;
      // Routing
      if (url.pathname.startsWith("/api/auth")) {
        response = await handleAuth(request, env);
      } else if (url.pathname === "/api/upload" && method === "POST") {
        response = await handleUpload(request, env);
      } else if (url.pathname.startsWith("/api/analyze/") && method === "POST") {
        const id = url.pathname.split("/").pop();
        response = await handleAnalyze(id, env);
      } else if (url.pathname === "/api/documents" && method === "GET") {
        response = await getDocuments(request, env);
      } else {
        response = new Response("Not Found", { status: 404 });
      }

      // Append CORS headers to the response
      const newHeaders = new Headers(response.headers);
      newHeaders.set("Access-Control-Allow-Origin", "*");
      newHeaders.set("Access-Control-Allow-Methods", "GET,HEAD,POST,OPTIONS,PUT,DELETE");
      newHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};
