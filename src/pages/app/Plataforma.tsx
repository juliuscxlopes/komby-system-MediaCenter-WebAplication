// src/pages/app/Plataforma.tsx
//
// "Home da aplicação" -- landing pós-login, renderizada dentro do <Outlet/>
// do AppLayout (que já cuida de sidebar/header/shell). Por isso esse
// componente só devolve conteúdo -- nada de <aside>/layout próprio aqui.
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { socketService } from '../../WebSocket/WsConfig';
import { WsListeners } from '../../WebSocket/Listeners/WsAuthListeners';
import { WsEmits } from '../../WebSocket/WsEmits';
import { ModalCompleteProfile } from '../../components/Auth/ModalCompleteUser';
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

export function Plataforma() {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(user ? mapAuthUserToProfile(user) : null);
  const [hasError, setHasError] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  useEffect(() => {
    WsListeners.onUserProfileLoaded((profile) => {
      setUserProfile(profile);
    });

    WsListeners.onUpdateContactRequired(() => {
      setShowCompleteModal(true);
    });

    WsListeners.onRegistrationFinalized((profile: UserProfile) => {
      setUserProfile(profile);
      setShowCompleteModal(false);
    });

    const handleError = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.status === 'error' || msg.action === 'error') setHasError(true);
      } catch (err) {
        console.error('Erro ao processar mensagem do socket', err);
      }
    };

    socketService.connect();
    socketService.ws?.addEventListener('message', handleError);

    const interval = setInterval(() => {
      if (socketService.ws?.readyState === 1) {
        WsEmits.getUserProfile();
        clearInterval(interval);
      }
    }, 500);

    return () => {
      clearInterval(interval);
      socketService.ws?.removeEventListener('message', handleError);
      // [AJUSTE] socketService é uma conexão única compartilhada por todo o
      // app (Dashboards, Maps também chamam connect() nela) -- derrubar aqui
      // no unmount da Home matava o socket pra todo mundo só por sair dessa
      // página, causando um loop de conecta/desconecta ao navegar e perdendo
      // qualquer mensagem de pub/sub publicada bem na janela desconectada.
    };
  }, []);

  if (hasError) {
    return (
      <div className="p-10 bg-white border border-slate-100 rounded-[2rem] shadow-2xl text-center max-w-sm mx-auto mt-20 animate-in fade-in zoom-in duration-300">
        <div className="text-4xl mb-4">😊</div>
        <h2 className="text-xl font-bold text-slate-900">Estamos com problemas</h2>
        <p className="text-slate-500 mt-2 text-sm">Nossos sistemas de conexão estão em manutenção rápida. Voltamos em instantes!</p>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="flex flex-col items-center gap-4 mt-20">
        <div className="w-8 h-8 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin" />
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">Autenticando sessão...</p>
      </div>
    );
  }

  return (
    <>
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

      {showCompleteModal && (
        <ModalCompleteProfile
          currentName={userProfile.nome}
          onSubmit={(data) => {
            WsEmits.updateProfile(data);
          }}
        />
      )}
    </>
  );
}
