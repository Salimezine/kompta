// ============================================
// ComptaFlow - Auth System (localStorage)
// ============================================
const Auth = {
  register(name, email, password, company = '') {
    const users = JSON.parse(localStorage.getItem('cf_users') || '[]');
    if (users.find(u => u.email === email)) {
      return { success: false, error: 'Cet email est déjà utilisé.' };
    }
    const user = {
      id: Date.now(),
      name,
      email,
      password,
      company,
      plan: 'Starter',
      createdAt: new Date().toISOString(),
      avatar: name.charAt(0).toUpperCase()
    };
    users.push(user);
    localStorage.setItem('cf_users', JSON.stringify(users));
    localStorage.setItem('cf_current_user', JSON.stringify(user));
    return { success: true, user };
  },

  login(email, password) {
    const users = JSON.parse(localStorage.getItem('cf_users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return { success: false, error: 'Email ou mot de passe incorrect.' };
    localStorage.setItem('cf_current_user', JSON.stringify(user));
    return { success: true, user };
  },

  logout() {
    localStorage.removeItem('cf_current_user');
    window.location.href = 'index.html';
  },

  getCurrentUser() {
    return JSON.parse(localStorage.getItem('cf_current_user') || 'null');
  },

  requireAuth() {
    const user = this.getCurrentUser();
    if (!user) {
      window.location.href = 'login.html';
      return null;
    }
    return user;
  }
};
