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
      // Routing
      if (url.pathname.startsWith("/api/auth")) {
        return await handleAuth(request, env);
      }
      
      if (url.pathname === "/api/upload" && method === "POST") {
        return await handleUpload(request, env);
      }

      if (url.pathname.startsWith("/api/analyze/") && method === "POST") {
        const id = url.pathname.split("/").pop();
        return await handleAnalyze(id, env);
      }

      if (url.pathname === "/api/documents" && method === "GET") {
        return await getDocuments(request, env);
      }

      return new Response("Not Found", { status: 404, headers: corsHeaders });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  }
};
