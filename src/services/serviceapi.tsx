//src/services/serviceapi.tsx
// O Vite disponibiliza as variáveis através do objeto import.meta.env
const API_URL = import.meta.env.VITE_API_URL || '';

export const authService = {
  // LOGIN POR E-MAIL E SENHA
  async login(email: string, password: string) {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Falha na autenticação');
    }

    return response.json(); 
  },

  // BUSCA URL DO GOOGLE
  async getGoogleAuthUrl() {
    if (!API_URL) {
      throw new Error('VITE_API_URL não configurado. Verifique seu arquivo .env.');
    }

    const response = await fetch(`${API_URL}/auth/google`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar URL do Google');
    }

    const data = await response.json();
    return data.url;
  }
};