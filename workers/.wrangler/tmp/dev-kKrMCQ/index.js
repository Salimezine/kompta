var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-Cyjoaw/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// src/utils/claude-ai.js
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}
__name(arrayBufferToBase64, "arrayBufferToBase64");
async function analyzeDocument(fileKey, context, env) {
  let fileData, mimeType;
  if (env.STORAGE) {
    const fileObj = await env.STORAGE.get(fileKey);
    if (!fileObj) throw new Error("Fichier non trouv\xE9 dans R2");
    fileData = await fileObj.arrayBuffer();
    mimeType = fileObj.httpMetadata?.contentType || "application/pdf";
  } else {
    throw new Error("Le stockage R2 n'est pas configur\xE9.");
  }
  const apiKey = env.ANTHROPIC_API_KEY;
  const isRealMode = Boolean(apiKey && apiKey !== "sk-ant-...");
  if (!isRealMode) {
    console.log("Cl\xE9 API manquante, renvoi de donn\xE9es de test.");
    return {
      emetteur: { nom: "Mode Test (Pas de cl\xE9 API)", numero_document: "TEST-000" },
      date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      montant_ht: 100,
      montant_tva: 19,
      montant_ttc: 119,
      devise: "TND",
      confidence: 1,
      statut: "Erreur: Cl\xE9 manquante"
    };
  }
  const base64Data = arrayBufferToBase64(fileData);
  const systemPrompt = `Tu es un expert-comptable tr\xE8s pr\xE9cis. Analyse cette facture et extrais toutes les donn\xE9es utiles en format JSON. Ne renvoie QUE du JSON valide. N'ajoute pas de texte avant ou apr\xE8s le JSON. Format attendu: { "emetteur": { "nom": "..." }, "numero_document": "...", "date": "YYYY-MM-DD", "montant_ht": nombre, "montant_tva": nombre, "montant_ttc": nombre, "devise": "..." }`;
  let mediaType = mimeType;
  if (!["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"].includes(mediaType)) {
    mediaType = "application/pdf";
  }
  let contentBlock = [
    {
      type: mediaType === "application/pdf" ? "document" : "image",
      source: {
        type: "base64",
        media_type: mediaType,
        data: base64Data
      }
    },
    {
      type: "text",
      text: "Extrais les donn\xE9es comptables en JSON strict selon tes instructions syst\xE8me."
    }
  ];
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 2e3,
      system: systemPrompt,
      messages: [
        { role: "user", content: contentBlock }
      ]
    })
  });
  const responseText = await response.text();
  if (!response.ok) {
    console.error("Erreur API Anthropic:", responseText);
    throw new Error("Erreur de l'API Claude: " + response.statusText);
  }
  try {
    const result = JSON.parse(responseText);
    if (result.content && result.content[0] && result.content[0].text) {
      const jsonStr = result.content[0].text;
      const match = jsonStr.match(/```json\n([\s\S]*)\n```/) || jsonStr.match(/```([\s\S]*?)```/);
      const cleanJson = match ? match[1] : jsonStr;
      const parsedData = JSON.parse(cleanJson);
      parsedData.confidence = 0.99;
      return parsedData;
    }
    throw new Error("Format inattendu de l'API Claude");
  } catch (e) {
    console.error("Erreur parsing JSON:", responseText);
    throw new Error("Erreur de parsing des donn\xE9es extraites");
  }
}
__name(analyzeDocument, "analyzeDocument");

// src/routes/documents.js
async function handleUpload(request, env) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const context = formData.get("context") || "tunisie";
    if (!file) {
      return new Response("No file uploaded", { status: 400 });
    }
    const fileName = file.name;
    const docId = "DOC-" + Date.now();
    const fileKey = docId + "-" + fileName;
    if (env.STORAGE) {
      await env.STORAGE.put(fileKey, file.stream(), {
        httpMetadata: { contentType: file.type }
      });
    }
    const query = `INSERT INTO documents (id, company_id, user_id, filename, file_url, contexte) VALUES (?, ?, ?, ?, ?, ?)`;
    await env.DB.prepare(query).bind(docId, "COMP-1", "USER-1", fileName, fileKey, context).run();
    return new Response(JSON.stringify({ success: true, docId }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
__name(handleUpload, "handleUpload");
async function handleAnalyze(id, env) {
  const docInfo = await env.DB.prepare("SELECT * FROM documents WHERE id = ?").bind(id).first();
  if (!docInfo) {
    return new Response("Document non trouv\xE9", { status: 404 });
  }
  const extractionResult = await analyzeDocument(docInfo.file_url, docInfo.contexte, env);
  const updateQuery = `UPDATE documents SET extracted_data = ?, statut = 'Extrait' WHERE id = ?`;
  await env.DB.prepare(updateQuery).bind(JSON.stringify(extractionResult), id).run();
  return new Response(JSON.stringify(extractionResult), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(handleAnalyze, "handleAnalyze");
async function getDocuments(request, env) {
  const { results } = await env.DB.prepare("SELECT * FROM documents ORDER BY created_at DESC").all();
  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" }
  });
}
__name(getDocuments, "getDocuments");

// src/routes/auth.js
async function handleAuth(request, env) {
  const url = new URL(request.url);
  const body = await request.json();
  if (url.pathname === "/api/auth/login") {
    const { email, password } = body;
    const user = await env.DB.prepare("SELECT * FROM users WHERE email = ? AND password_hash = ?").bind(email, password).first();
    if (user) {
      return new Response(JSON.stringify({ success: true, token: "mock-jwt-token", user }), {
        headers: { "Content-Type": "application/json" }
      });
    } else {
      return new Response(JSON.stringify({ success: false, error: "Identifiants invalides" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  if (url.pathname === "/api/auth/register") {
    const { name, email, password } = body;
    const userId = "USR-" + Date.now();
    const compId = "COMP-1";
    try {
      await env.DB.prepare("INSERT INTO users (id, company_id, nom, email, password_hash) VALUES (?, ?, ?, ?, ?)").bind(userId, compId, name, email, password).run();
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ success: false, error: e.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
  return new Response("Not Found", { status: 404 });
}
__name(handleAuth, "handleAuth");

// src/index.js
var src_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method;
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS,PUT,DELETE",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };
    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    try {
      let response;
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

// ../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-Cyjoaw/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// ../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-Cyjoaw/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
