function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

export async function analyzeDocument(fileKey, context, env) {
  let fileData, mimeType;
  
  // 1. Récupérer le fichier depuis R2
  if (env.STORAGE) {
    const fileObj = await env.STORAGE.get(fileKey);
    if (!fileObj) throw new Error("Fichier non trouvé dans R2");
    fileData = await fileObj.arrayBuffer();
    mimeType = fileObj.httpMetadata?.contentType || 'application/pdf'; // Par défaut PDF si non spécifié
  } else {
    throw new Error("Le stockage R2 n'est pas configuré.");
  }

  const apiKey = env.ANTHROPIC_API_KEY;
  const isRealMode = Boolean(apiKey && apiKey !== "sk-ant-...");

  if (!isRealMode) {
    console.log("Clé API manquante, renvoi de données de test.");
    return {
      emetteur: { nom: 'Mode Test (Pas de clé API)', numero_document: 'TEST-000' },
      date: new Date().toISOString().split('T')[0],
      montant_ht: 100, montant_tva: 19, montant_ttc: 119, devise: 'TND',
      confidence: 1.0, statut: 'Erreur: Clé manquante'
    };
  }

  // 2. Préparer l'appel API
  const base64Data = arrayBufferToBase64(fileData);
  const systemPrompt = "Tu es un expert-comptable très précis. Analyse cette facture et extrais toutes les données utiles en format JSON. Ne renvoie QUE du JSON valide. N'ajoute pas de texte avant ou après le JSON. Format attendu: { \"emetteur\": { \"nom\": \"...\" }, \"numero_document\": \"...\", \"date\": \"YYYY-MM-DD\", \"montant_ht\": nombre, \"montant_tva\": nombre, \"montant_ttc\": nombre, \"devise\": \"...\" }";
  
  let mediaType = mimeType;
  // Fallback if mimeType is invalid for Claude
  if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'].includes(mediaType)) {
      mediaType = 'application/pdf'; // Default guess
  }

  let contentBlock = [
    {
      type: mediaType === 'application/pdf' ? "document" : "image",
      source: {
        type: "base64",
        media_type: mediaType,
        data: base64Data
      }
    },
    {
      type: "text",
      text: "Extrais les données comptables en JSON strict selon tes instructions système."
    }
  ];

  // 3. Appeler Claude 3.5 Sonnet
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 2000,
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
      // Claude renvoie parfois le JSON dans un bloc markdown
      const match = jsonStr.match(/```json\n([\s\S]*)\n```/) || jsonStr.match(/```([\s\S]*?)```/);
      const cleanJson = match ? match[1] : jsonStr;
      
      const parsedData = JSON.parse(cleanJson);
      parsedData.confidence = 0.99; // Assumed high confidence from Claude
      return parsedData;
    }
    throw new Error("Format inattendu de l'API Claude");
  } catch(e) {
    console.error("Erreur parsing JSON:", responseText);
    throw new Error("Erreur de parsing des données extraites");
  }
}
