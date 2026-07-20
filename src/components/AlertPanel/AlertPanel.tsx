type AlertType = 'critical' | 'warning' | 'info';

export interface AlertItem {
  id: number;
  type: AlertType;
  title: string;
  description: string;
}

const badgeColors: Record<AlertType, string> = {
  critical: 'bg-red-500/20 text-red-500 border border-red-500/50',
  warning: 'bg-amber-500/20 text-amber-500 border border-amber-500/50',
  info: 'bg-blue-500/20 text-blue-500 border border-blue-500/50',
};

export function AlertPanel({ alerts }: { alerts: AlertItem[] }) {
  return (
    <aside className="w-[320px] bg-slate-950 text-white p-6 space-y-5 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-sm uppercase tracking-[0.3em] text-slate-400">Alertas</h2>
      </div>

      {alerts.length === 0 ? (
        <div className="text-slate-400 text-sm">Nenhum alerta no momento.</div>
      ) : (
        alerts.map((alert) => (
          <div key={alert.id} className="rounded-3xl border border-slate-800 bg-slate-900/90 p-4">
            <div className="flex items-center justify-between gap-4 mb-2">
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${badgeColors[alert.type]}`}>
                {alert.type}
              </span>
              <span className="text-slate-500 text-[11px]">#{alert.id}</span>
            </div>
            <div>
              <p className="text-slate-100 font-bold">{alert.title}</p>
              <p className="mt-2 text-slate-400 text-sm">{alert.description}</p>
            </div>
          </div>
        ))
      )}
    </aside>
  );
}
