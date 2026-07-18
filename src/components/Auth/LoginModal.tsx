//src/components/Auth/LoginModal.tsx
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { login, loginWithOAuth } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // 1. LOGIN DIRETO (E-mail/Senha)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    try {
      await login(email, password);
      onClose();
    } catch (error) {
      console.error("Erro no login:", error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // 2. LOGIN GOOGLE — redirect de página inteira.
  // Sem popup, sem postMessage: o backend seta o cookie e já manda
  // direto pra /app. Evita depender de window.opener, que o próprio
  // Google quebra durante o fluxo de autenticação.
  const handleGoogleLogin = () => {
    loginWithOAuth();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      {/* Card */}
      <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-300">
        <div className="p-10">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Bem-vindo</h2>
          <p className="text-slate-500 mt-2 font-medium">Acesse sua conta para continuar</p>

          <div className="mt-8 space-y-6">
            {/* Botão Google - FORA DO FORM para evitar conflito de submit */}
            <button
              onClick={handleGoogleLogin}
              type="button"
              className="w-full py-3.5 flex items-center justify-center gap-3 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all font-semibold text-slate-700 active:scale-95"
            >
              <img src="https://www.svgrepo.com/show/355037/google.svg" className="w-5 h-5" alt="Google" />
              Continuar com Google
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-4 text-slate-400 font-medium">Ou e-mail</span></div>
            </div>

            {/* Formulário de Login Direto */}
            <form className="space-y-4" onSubmit={handleLogin}>
              <div>
                <label className="block text-sm font-semibold text-slate-700 ml-1">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full mt-1 px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 ml-1">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full mt-1 px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isAuthenticating ? 'Autenticando...' : 'Entrar na plataforma'}
              </button>
            </form>
          </div>

          <p className="mt-8 text-center text-sm text-slate-500">
            Não tem uma conta? <a href="#" className="text-slate-900 font-bold hover:underline">Crie agora</a>
          </p>
        </div>
      </div>
    </div>
  );
}