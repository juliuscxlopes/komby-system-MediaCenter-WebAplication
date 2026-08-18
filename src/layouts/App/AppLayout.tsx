import { useState, type ReactNode } from 'react';
import { Home, LayoutDashboard, Map, Music, Users, ChevronDown, ChevronRight, UserCircle, LogOut, Settings } from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { SettingsModal } from '../../components/Settings/SettingsModal';

export function AppLayout() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate(); // ✅ Corrigido: Movido para dentro do componente
  const location = useLocation();

  return (
    <div className="flex h-screen bg-white overflow-hidden text-slate-900">

      {/* --- SIDEBAR LATERAL --- */}
      <aside className={`${isSidebarExpanded ? 'w-64' : 'w-20'} border-r border-slate-100 transition-all duration-300 flex flex-col p-4`}>
        <div className="flex items-center gap-3 px-2 mb-10 h-10">
          <div className="w-8 h-8 bg-slate-900 rounded-lg shrink-0 shadow-lg shadow-slate-200" />
          {isSidebarExpanded && <span className="font-bold tracking-tight text-lg uppercase">Web Appliance</span>}
        </div>

        {/* Home (landing pós-login) e Dashboards (telemetria) são seções
            irmãs, não pai/filho -- cada uma com sua própria rota. */}
        <nav className="flex-1 space-y-2">
          <NavItem
            icon={<Home size={20}/>}
            label="Home"
            expanded={isSidebarExpanded}
            active={location.pathname === '/app'}
            onClick={() => navigate('/app')}
          />

          <NavItem
            icon={<LayoutDashboard size={20}/>}
            label="Dashboards"
            expanded={isSidebarExpanded}
            active={location.pathname.startsWith('/app/dashboards')}
            onClick={() => navigate('/app/dashboards')}
          />

          <NavItem
            icon={<Map size={20}/>}
            label="Mapa"
            expanded={isSidebarExpanded}
            active={location.pathname.startsWith('/app/maps')}
            onClick={() => navigate('/app/maps')}
          />

          <NavItem
            icon={<Music size={20}/>}
            label="Music"
            expanded={isSidebarExpanded}
            active={location.pathname.startsWith('/app/music')}
            onClick={() => navigate('/app/music')}
          />

          <NavItem
            icon={<Users size={20}/>}
            label="Pessoas"
            expanded={isSidebarExpanded}
            active={location.pathname.startsWith('/app/people')}
            onClick={() => navigate('/app/people')}
          />
        </nav>

        {/* Fixo no rodapé, sempre visível -- configuração é algo que a
            pessoa quer achar rápido, não descobrir passando o mouse. */}
        <NavItem
          icon={<Settings size={20}/>}
          label="Configurações"
          expanded={isSidebarExpanded}
          onClick={() => setIsSettingsOpen(true)}
        />
      </aside>

      <SettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

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
  active?: boolean;
  onClick?: () => void;
}

function NavItem({ icon, label, expanded, active = false, onClick }: NavItemProps) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all group ${
        active
          ? 'bg-slate-50 text-slate-900'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <div className={`transition-colors leading-none ${active ? 'text-slate-900' : 'group-hover:text-slate-900'}`}>
        {icon}
      </div>
      {expanded && <span className="text-sm font-semibold">{label}</span>}
    </div>
  );
}