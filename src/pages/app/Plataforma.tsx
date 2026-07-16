// src/App.tsx
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { socketService } from '../../WebSocket/WsConfig';
import { WsListeners } from '../../WebSocket/WsListeners';
import { WsEmits } from '../../WebSocket/WsEmits';
import { ModalCompleteProfile } from '../../components/Auth/ModalCompleteUser'; // Importe o modal que criamos
import type { UserProfile } from '../../types/TypesApp/AppTypes';

function mapAuthUserToProfile(user: any): UserProfile {
  return {
    id: user?.id ?? '',
    nome: user?.name ?? user?.nome ?? 'Usuário',
    email: user?.email ?? '',
    avatar_url: user?.avatar || user?.avatar_url || 'https://via.placeholder.com/40',
    telefone: user?.telefone ?? '',
    profileComplete: Boolean(user?.name || user?.nome) && Boolean(user?.telefone),
  };
}

export function App() {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(user ? mapAuthUserToProfile(user) : null);
  const [hasError, setHasError] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  useEffect(() => {
    // 1. Escuta a carga inicial do perfil
    WsListeners.onUserProfileLoaded((profile) => {
      setUserProfile(profile);
    });

    WsListeners.onUpdateContactRequired(() => {
      setShowCompleteModal(true);
    });

    // 3. Escuta a confirmação de finalização
    WsListeners.onRegistrationFinalized((profile: UserProfile) => { // Perfil vem direto
      console.log("🎊 Cadastro finalizado com sucesso!");
      setUserProfile(profile); // Sem o ".user" se o back enviar o objeto direto
      setShowCompleteModal(false);
    });
    // Lógica de Erro
    const handleError = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.status === 'error' || msg.action === 'error') setHasError(true);
      } catch (err) {
        console.error("Erro ao processar mensagem do socket", err);
      }
    };

    socketService.connect();
    socketService.ws?.addEventListener('message', handleError);

    // Intervalo para garantir que o socket está aberto antes do emit inicial
    const interval = setInterval(() => {
      if (socketService.ws?.readyState === 1) {
        WsEmits.getUserProfile();
        clearInterval(interval);
      }
    }, 500);

    return () => {
      clearInterval(interval);
      socketService.ws?.removeEventListener('message', handleError);
      socketService.disconnect();
    };
  }, []);

  // Overlay de Erro Crítico
  if (hasError) {
    return (
      <div className="fixed inset-0 z-[999] flex items-center justify-center bg-white">
        <div className="p-10 bg-white border border-slate-100 rounded-[2rem] shadow-2xl text-center max-w-sm animate-in fade-in zoom-in duration-300">
          <div className="text-4xl mb-4">😊</div>
          <h2 className="text-xl font-bold text-slate-900">Estamos com problemas</h2>
          <p className="text-slate-500 mt-2 text-sm">Nossos sistemas de conexão estão em manutenção rápida. Voltamos em instantes!</p>
        </div>
      </div>
    );
  }

  // Loading Screen
  if (!userProfile) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin" />
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">Autenticando sessão...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white relative">
      {/* Sidebar Lateral */}
      <aside className="w-64 border-r border-slate-100 flex flex-col p-6">
        <div className="font-bold text-xl mb-10 tracking-tight">Web Appliance</div>
        <nav className="space-y-2">
          <div className="p-3 bg-slate-50 rounded-xl text-slate-900 font-medium cursor-default">
            Dashboard
          </div>
          <div className="p-3 text-slate-400 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors">
            Configurações
          </div>
        </nav>
        
        <div className="mt-auto flex items-center gap-3 p-2 bg-slate-50/50 rounded-2xl border border-slate-50">
          <img 
            src={userProfile.avatar_url || 'https://via.placeholder.com/40'} 
            alt={userProfile.nome} 
            className="w-10 h-10 rounded-full bg-slate-200 object-cover"
          />
          <div className="text-sm overflow-hidden">
            <p className="font-bold text-slate-900 leading-none truncate">{userProfile.nome}</p>
            <p className="text-xs text-green-500 font-medium mt-1">● Online</p>
          </div>
        </div>
      </aside>

      {/* Área de Conteúdo */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto p-10">
          <header className="mb-10">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Visão Geral</h2>
            <p className="text-slate-500">
              Olá, {userProfile.nome.split(' ')[0]}. Bem-vindo à sua plataforma.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 border border-slate-100 rounded-[2.5rem] bg-white shadow-sm hover:shadow-md transition-all duration-300">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Perfil Status</div>
              <div className="text-2xl font-bold mt-3 flex items-center gap-2">
                {userProfile.profileComplete ? (
                  <span className="text-slate-900">✅ Perfil Completo</span>
                ) : (
                  <span className="text-orange-500">⚠️ Pendente</span>
                )}
              </div>
            </div>

            <div className="p-8 border border-slate-100 rounded-[2.5rem] bg-white shadow-sm hover:shadow-md transition-all duration-300">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Notificações</div>
              <div className="text-3xl font-bold mt-2 text-slate-300 tracking-tighter">0</div>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL BLOQUEANTE: Só aparece se showCompleteModal for true */}
      {showCompleteModal && (
        <ModalCompleteProfile 
          currentName={userProfile.nome}
          onSubmit={(data) => {
             console.log("🚀 Enviando dados de conclusão...");
             WsEmits.updateProfile(data); // Envia o emit de atualização
          }}
        />
      )}
    </div>
  );
}