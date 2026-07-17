import { useState, type ReactNode } from 'react';
import { Home, ChevronDown, ChevronRight, UserCircle, LogOut, } from 'lucide-react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function AppLayout() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate(); // ✅ Corrigido: Movido para dentro do componente

  return (
    <div className="flex h-screen bg-white overflow-hidden text-slate-900">
      
      {/* --- SIDEBAR LATERAL --- */}
      <aside className={`${isSidebarExpanded ? 'w-64' : 'w-20'} border-r border-slate-100 transition-all duration-300 flex flex-col p-4`}>
        <div className="flex items-center gap-3 px-2 mb-10 h-10">
          <div className="w-8 h-8 bg-slate-900 rounded-lg shrink-0 shadow-lg shadow-slate-200" />
          {isSidebarExpanded && <span className="font-bold tracking-tight text-lg uppercase">Web Appliance</span>}
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem 
            icon={<Home size={20}/>} 
            label="Home" 
            expanded={isSidebarExpanded} 
            onClick={() => navigate('/app')}
          >
            <SubItem label="Dashboards" onClick={() => navigate('/app')} />
          </NavItem>

        </nav>
      </aside>

      {/* --- LADO DIREITO --- */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/30">
        
        {/* TOPBAR */}
        <header className="h-16 border-b border-slate-100 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md z-10">
          <button 
            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)} 
            className="p-2 hover:bg-slate-50 rounded-xl text-slate-500 transition-colors"
          >
            {isSidebarExpanded ? <ChevronDown size={18} className="rotate-90" /> : <ChevronRight size={18} />}
          </button>
          
          <div className="flex items-center gap-4 group">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900 leading-none">{user?.nome}</p>
              <p className="text-[10px] text-slate-400 font-medium mt-1">{user?.email}</p>
            </div>

            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm transition-transform group-hover:scale-105">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserCircle size={24} className="text-slate-400" />
                )}
              </div>
              
              <button 
                onClick={logout}
                className="absolute top-12 right-0 bg-white border border-slate-100 p-3 rounded-2xl shadow-xl opacity-0 group-hover:opacity-100 transition-all flex items-center gap-2 text-red-500 hover:bg-red-50"
              >
                <LogOut size={14} />
                <span className="text-xs font-bold whitespace-nowrap">Sair da conta</span>
              </button>
            </div>
          </div>
        </header>

        {/* ÁREA DE CONTEÚDO */}
        <main className="flex-1 overflow-y-auto p-8">
           <div className="max-w-[1600px] mx-auto">
              <Outlet /> 
           </div>
        </main>
      </div>
    </div>
  );
}

// --- COMPONENTES AUXILIARES ---

interface NavItemProps {
  icon: ReactNode;
  label: string;
  expanded: boolean;
  children?: ReactNode;
  onClick?: () => void;
}

function NavItem({ icon, label, expanded, children, onClick }: NavItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleToggle = () => {
    if (children) {
      setIsOpen(!isOpen);
    }
    if (onClick) onClick();
  };

  return (
    <div className="w-full">
      <div 
        onClick={handleToggle}
        className="flex items-center justify-between p-3 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-2xl cursor-pointer transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="group-hover:text-slate-900 transition-colors leading-none">
            {icon}
          </div>
          {expanded && <span className="text-sm font-semibold">{label}</span>}
        </div>
        
        {expanded && children && (
          <div className="text-slate-300">
            {isOpen ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
          </div>
        )}
      </div>
      
      {expanded && isOpen && children && (
        <div className="ml-9 mt-1 flex flex-col gap-1 border-l border-slate-100 pl-2 animate-in fade-in slide-in-from-left-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

function SubItem({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button 
      onClick={(e) => {
        e.stopPropagation(); // ✅ Evita abrir/fechar o menu pai ao clicar no subitem
        if (onClick) onClick();
      }}
      className="w-full text-left p-2 text-[13px] text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl transition-all font-medium"
    >
      {label}
    </button>
  );
}