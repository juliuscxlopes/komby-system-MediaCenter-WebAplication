import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: number;
  nome: string;
  email: string;
  avatar_url?: string;
  telefone?: string;
  profileComplete: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithOAuth: () => void;
  logout: () => Promise<void>;
  refetch: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL;
const RETRY_INTERVAL_MS = 5000;
const MAX_RETRIES = 5;

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRetry = () => {
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
  };

  const fetchSession = async ({ isInitial = false } = {}) => {
    if (isInitial) setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/session`, {
        credentials: 'include',
      });

      // 401 explícito = backend confirmou "não autenticado". Obrigatório: desloga.
      if (res.status === 401) {
        clearRetry();
        retryCount.current = 0;
        setUser(null);
        setLoading(false);
        navigate('/');
        return;
      }

      if (!res.ok) {
        throw new Error(`Status inesperado: ${res.status}`);
      }

      const data = await res.json();
      clearRetry();
      retryCount.current = 0;
      setUser(data.user ?? null);
      setLoading(false);
    } catch (err) {
      // Falha de REDE (não é 401) — não desloga, mantém estado e tenta de novo.
      console.error('[AuthContext] Falha ao verificar sessão:', err);

      if (isInitial) {
        if (retryCount.current < MAX_RETRIES) {
          retryCount.current += 1;
          retryTimer.current = setTimeout(
            () => fetchSession({ isInitial: true }),
            RETRY_INTERVAL_MS,
          );
        } else {
          setLoading(false);
          setUser(null);
          navigate('/');
        }
        return;
      }

      if (retryCount.current < MAX_RETRIES) {
        retryCount.current += 1;
        retryTimer.current = setTimeout(() => fetchSession(), RETRY_INTERVAL_MS);
      }
    }
  };

  useEffect(() => {
    fetchSession({ isInitial: true });
    return () => clearRetry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email: string, password: string) {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || 'Credenciais inválidas.');
      }

      const data = await res.json();
      setUser(data.user ?? null);
      navigate('/app');
    } finally {
      setLoading(false);
    }
  }

  function loginWithOAuth() {
    // Redirect completo — backend cuida do handshake com o Google.
    // Exige internet real (fora da rede local do veículo).
    window.location.href = `${API_URL}/auth/google`;
  }

  async function logout() {
    clearRetry();
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('[AuthContext] Erro ao chamar logout no backend:', err);
    } finally {
      setUser(null);
      navigate('/');
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        loginWithOAuth,
        logout,
        refetch: fetchSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}