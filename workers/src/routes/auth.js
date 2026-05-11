export async function handleAuth(request, env) {
  const url = new URL(request.url);
  const body = await request.json();

  if (url.pathname === "/api/auth/login") {
    // Vérification simplifiée pour la maquette
    const { email, password } = body;
    const user = await env.DB.prepare("SELECT * FROM users WHERE email = ? AND password_hash = ?").bind(email, password).first();
    
    if (user) {
      // En production, générer un vrai JWT
      return new Response(JSON.stringify({ success: true, token: "mock-jwt-token", user }), {
        headers: { "Content-Type": "application/json" }
      });
    } else {
      return new Response(JSON.stringify({ success: false, error: "Identifiants invalides" }), {
        status: 401, headers: { "Content-Type": "application/json" }
      });
    }
  }

  if (url.pathname === "/api/auth/register") {
    // Inscription simplifiée
    const { name, email, password } = body;
    const userId = 'USR-' + Date.now();
    const compId = 'COMP-1'; // Par défaut pour la maquette
    
    try {
      await env.DB.prepare("INSERT INTO users (id, company_id, nom, email, password_hash) VALUES (?, ?, ?, ?, ?)")
        .bind(userId, compId, name, email, password).run();
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (e) {
      return new Response(JSON.stringify({ success: false, error: e.message }), {
        status: 400, headers: { "Content-Type": "application/json" }
      });
    }
  }

  return new Response("Not Found", { status: 404 });
}
