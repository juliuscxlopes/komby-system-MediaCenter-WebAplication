// src/pages/app/People.tsx
//
// Cadastro de pessoas + embarque manual (versão 1 -- detecção automática
// por WiFi fica pra uma fase futura, quando o roteador/AP da Kombi
// estiver decidido). Peso total estimado = peso vazio do veículo + soma
// dos embarcados, comparado com a capacidade de carga (Configurações >
// Veículo).
import { useEffect, useState } from 'react';
import { UserPlus, Trash2, Pencil, Car, AlertTriangle } from 'lucide-react';
import { peopleService, type Person, type OnboardSummary } from '../../services/peopleService';

export function People() {
  const [people, setPeople] = useState<Person[]>([]);
  const [summary, setSummary] = useState<OnboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);
  const [name, setName] = useState('');
  const [weight, setWeight] = useState('70');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const [list, sum] = await Promise.all([peopleService.list(), peopleService.getOnboardSummary()]);
    setPeople(list);
    setSummary(sum);
  }

  useEffect(() => {
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, []);

  function openNew() {
    setEditing(null);
    setName('');
    setWeight('70');
    setPhone('');
    setError(null);
    setModalOpen(true);
  }

  function openEdit(person: Person) {
    setEditing(person);
    setName(person.name);
    setWeight(String(person.avg_weight_kg));
    setPhone(person.phone || '');
    setError(null);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const data = { name: name.trim(), avg_weight_kg: Number(weight) || 70, phone: phone.trim() || undefined };
      if (editing) await peopleService.update(editing.id, data);
      else await peopleService.create(data);
      setModalOpen(false);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(id: string) {
    await peopleService.remove(id);
    await refresh();
  }

  async function handleToggleOnboard(person: Person) {
    if (person.currently_onboard) await peopleService.unboard(person.id);
    else await peopleService.board(person.id);
    await refresh();
  }

  const capacityPct = summary?.capacityKg ? Math.min(100, (summary.peopleWeightKg / summary.capacityKg) * 100) : 0;

  return (
    <div>
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Pessoas</h2>
        <p className="text-slate-500">Quem está a bordo e o peso total estimado da Kombi.</p>
      </header>

      {summary && (
        <div className="p-8 border border-slate-100 rounded-[2.5rem] bg-white shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
              <Car size={12} /> Peso Total Estimado
            </div>
            {summary.overCapacity && (
              <span className="flex items-center gap-1.5 text-xs font-bold text-red-600">
                <AlertTriangle size={14} /> Acima da capacidade
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-slate-900 tabular-nums">{summary.totalEstimatedKg.toFixed(0)}</span>
            <span className="text-sm font-semibold text-slate-400">
              kg ({summary.emptyWeightKg.toFixed(0)} vazio + {summary.peopleWeightKg.toFixed(0)} pessoas)
            </span>
          </div>

          {summary.capacityKg != null && (
            <div className="mt-4">
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${summary.overCapacity ? 'bg-red-500' : 'bg-slate-900'}`}
                  style={{ width: `${capacityPct}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                {summary.peopleWeightKg.toFixed(0)} / {summary.capacityKg.toFixed(0)} kg de capacidade de carga
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cadastradas</p>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
        >
          <UserPlus size={14} /> Nova pessoa
        </button>
      </div>

      {loading && <p className="text-sm text-slate-400">Carregando...</p>}
      {!loading && people.length === 0 && <p className="text-sm text-slate-400">Nenhuma pessoa cadastrada ainda.</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {people.map((person) => (
          <div key={person.id} className="p-5 border border-slate-100 rounded-2xl bg-white shadow-sm flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">{person.name}</p>
                <p className="text-xs text-slate-400">{person.avg_weight_kg} kg</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(person)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleRemove(person.id)}
                  className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <button
              onClick={() => handleToggleOnboard(person)}
              className={`w-full py-2 rounded-xl text-xs font-bold transition-colors ${
                person.currently_onboard ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {person.currently_onboard ? 'A bordo' : 'Embarcar'}
            </button>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-5 w-80">
            <h3 className="text-sm font-bold text-slate-900 mb-3">{editing ? 'Editar pessoa' : 'Nova pessoa'}</h3>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 mb-2"
            />
            <input
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              type="number"
              placeholder="Peso médio (kg)"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 mb-2"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Telefone (opcional, pra depois)"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 mb-3"
            />
            {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={busy || !name.trim()}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
