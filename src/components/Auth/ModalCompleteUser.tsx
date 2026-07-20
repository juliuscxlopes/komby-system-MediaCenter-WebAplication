//src/components/Auth/ModalCompleteUser.tsx
import React, { useState } from 'react';


interface Props {
  currentName?: string;
  onSubmit: (data: { nome: string; telefone: string; password?: string }) => void;
}

export function ModalCompleteProfile({ currentName, onSubmit }: Props) {
  const [nome, setNome] = useState(currentName || '');
  const [telefone, setTelefone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validação básica
    if (password !== confirmPassword) {
        alert("As senhas não coincidem!");
        return;
    }

    try {

        // Agora ele somente precisa passar esses dados ao container pai Pataforma.page que ela envia wi WS..

        
        onSubmit({ nome, telefone, password });

        alert("Perfil atualizado com sucesso!");
    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro ao salvar os dados. Tente novamente.");
    }
};


  return (
    /* Overlay: Fundo embaçado e escurecido levemente. Z-index alto para cobrir tudo */
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in duration-300">
      
      {/* Container do Modal: Branco, bordas arredondadas e sombra flutuante */}
      <div className="bg-white w-full max-w-[440px] rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-10 border border-slate-100 animate-in zoom-in-95 duration-300">
        
        {/* Header Minimalista */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-50 rounded-2xl mb-4 text-2xl">
            ✨
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Finalize seu Cadastro</h2>
          <p className="text-slate-500 mt-2 text-sm">
            Precisamos de mais algumas informações para liberar seu acesso.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Nome Input */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
            <input 
              type="text" 
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900/5 transition-all outline-none text-slate-900 placeholder:text-slate-300 text-sm"
              placeholder="Ex: Julius Lopes"
              required
            />
          </div>

          {/* Telefone Input */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">WhatsApp / Telefone</label>
            <input 
              type="tel" 
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="w-full px-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900/5 transition-all outline-none text-slate-900 placeholder:text-slate-300 text-sm"
              placeholder="(00) 00000-0000"
              required
            />
          </div>

          {/* Senhas Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Senha</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900/5 transition-all outline-none text-slate-900 text-sm"
                placeholder="••••••"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Confirmar</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-slate-900/5 transition-all outline-none text-slate-900 text-sm"
                placeholder="••••••"
                required
              />
            </div>
          </div>

          {/* Botão de Ação - Estilo "Solid Black" */}
          <button 
            type="submit"
            className="w-full py-5 mt-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-black transition-all active:scale-[0.98] shadow-lg shadow-slate-200"
          >
            Salvar e Continuar
          </button>
        </form>

        <div className="mt-8 flex items-center justify-center gap-2 text-slate-400">
           <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
           <p className="text-[10px] font-medium uppercase tracking-tight">Conexão Segura e Criptografada</p>
        </div>
      </div>
    </div>
  );
}