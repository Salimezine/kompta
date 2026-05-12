import { analyzeDocument } from '../utils/claude-ai.js';

export async function handleUpload(request, env) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const context = formData.get('context') || 'tunisie';

    if (!file) {
      return new Response("No file uploaded", { status: 400 });
    }

    const fileName = file.name;
    const docId = 'DOC-' + Date.now();
    const fileKey = docId + '-' + fileName;
    
    // Sauvegarde dans R2
    if (env.STORAGE) {
      await env.STORAGE.put(fileKey, file.stream(), {
        httpMetadata: { contentType: file.type }
      });
    }

    // Sauvegarde dans D1
    const query = `INSERT INTO documents (id, company_id, user_id, filename, file_url, contexte) VALUES (?, ?, ?, ?, ?, ?)`;
    await env.DB.prepare(query).bind(docId, 'COMP-1', 'USER-1', fileName, fileKey, context).run();

    return new Response(JSON.stringify({ success: true, docId }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch(err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function handleAnalyze(id, env) {
  // Récupérer les infos du document depuis D1
  const docInfo = await env.DB.prepare("SELECT * FROM documents WHERE id = ?").bind(id).first();
  if (!docInfo) {
    return new Response("Document non trouvé", { status: 404 });
  }

  // Appeler l'API Claude
  const extractionResult = await analyzeDocument(docInfo.file_url, docInfo.contexte, env);

  // Mettre à jour la DB
  const updateQuery = `UPDATE documents SET extracted_data = ?, statut = 'Extrait' WHERE id = ?`;
  await env.DB.prepare(updateQuery).bind(JSON.stringify(extractionResult), id).run();

  return new Response(JSON.stringify(extractionResult), {
    headers: { "Content-Type": "application/json" }
  });
}

export async function getDocuments(request, env) {
  const { results } = await env.DB.prepare("SELECT * FROM documents ORDER BY created_at DESC").all();
  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" }
  });
}
