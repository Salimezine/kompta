import { analyzeDocument } from '../utils/claude-ai.js';

export async function handleUpload(request, env) {
  // En production, cette route devrait extraire le FormData (le fichier),
  // l'enregistrer dans R2 (env.STORAGE), puis créer une entrée dans D1.
  
  // Simulation :
  const { fileName, context } = await request.json();
  const docId = 'DOC-' + Date.now();
  
  const query = `INSERT INTO documents (id, company_id, user_id, filename, file_url, contexte) VALUES (?, ?, ?, ?, ?, ?)`;
  await env.DB.prepare(query).bind(docId, 'COMP-1', 'USER-1', fileName, 'r2://' + fileName, context).run();

  return new Response(JSON.stringify({ success: true, docId }), {
    headers: { "Content-Type": "application/json" }
  });
}

export async function handleAnalyze(id, env) {
  // Récupérer les infos du document depuis D1
  const docInfo = await env.DB.prepare("SELECT * FROM documents WHERE id = ?").bind(id).first();
  if (!docInfo) {
    return new Response("Document non trouvé", { status: 404 });
  }

  // Appeler l'API Claude (simulée ou réelle)
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
