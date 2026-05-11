export async function analyzeDocument(fileUrl, context, env) {
  // En production, cette fonction :
  // 1. Télécharge le fichier depuis R2 via fileUrl
  // 2. Le convertit si nécessaire (ex: PDF -> Base64 Image)
  // 3. Envoie le fichier à l'API Anthropic (Claude 3.5 Sonnet / Opus) avec le prompt métier.
  
  /* PROMPT CLAUDE:
  "Tu es un expert-comptable certifié en Tunisie et en comptabilité internationale. 
  Analyse ce document et extrais les données en JSON strict selon le schéma fourni."
  */

  const apiKey = env.ANTHROPIC_API_KEY;
  const isRealMode = Boolean(apiKey && apiKey !== "sk-ant-...");

  if (isRealMode) {
    // Vrai appel API (Pseudocode)
    /*
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-3-opus-20240229",
        max_tokens: 1024,
        messages: [
          { role: "user", content: "..." }
        ]
      })
    });
    return await response.json();
    */
  }

  // --- MODE MOCK (Simulation) ---
  console.log(`Simulation de l'analyse OCR pour le document ${fileUrl} en contexte ${context}`);
  
  // Attendre 2 secondes pour simuler le délai de l'IA
  await new Promise(resolve => setTimeout(resolve, 2000));

  if (context === 'tunisie') {
    return {
      contexte: 'tunisie',
      type_document: 'facture_fournisseur',
      numero_document: 'FAC-2024-SIMUL',
      date: new Date().toISOString().split('T')[0],
      langue: 'fr',
      devise: 'TND',
      emetteur: {
        nom: 'Fournisseur Simulé SARL',
        matricule_fiscal: '1234567/A/A/M000',
        adresse: 'Tunis, Tunisie'
      },
      montant_ht: 2000.000,
      taux_tva: 19,
      montant_tva: 380.000,
      droit_timbre: 1.000,
      retenue_source: 0,
      montant_ttc: 2381.000,
      ecritures: [
        { compte: '607000', libelle: 'Achats de marchandises', debit: 2000, credit: 0 },
        { compte: '436660', libelle: 'TVA déductible', debit: 380, credit: 0 },
        { compte: '665400', libelle: 'Droits de timbre', debit: 1, credit: 0 },
        { compte: '401100', libelle: 'Fournisseurs', debit: 0, credit: 2381 }
      ],
      confidence: 0.98
    };
  } else {
    return {
      contexte: 'international',
      type_document: 'commercial_invoice',
      numero_document: 'INV-INTL-999',
      date: new Date().toISOString().split('T')[0],
      langue: 'en',
      devise: 'EUR',
      emetteur: {
        nom: 'Global Supplier Ltd',
        vat_number: 'FR123456789',
        pays: 'France'
      },
      subtotal: 5000.00,
      vat_rate: 20,
      vat_amount: 1000.00,
      total: 6000.00,
      incoterms: 'DAP',
      confidence: 0.95
    };
  }
}
