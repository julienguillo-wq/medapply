import { useState, useEffect, useCallback } from 'react';
import { parcoursData as defaultParcoursData } from '../data/mockData';
import { useAuth } from '../contexts/AuthContext';
import {
  loadParcoursFromSupabase,
  saveParcoursToSupabase,
  loadFromLocalStorage,
  saveToLocalStorage,
  migrateLocalStorageToSupabase,
} from '../services/parcoursService';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { Icon } from '../components/Icons';

const statusConfig = {
  completed: { label: 'Terminé', variant: 'success', icon: <Icon.Check size={12} /> },
  in_progress: { label: 'En cours', variant: 'primary', icon: <Icon.Clock size={12} /> },
  planned: { label: 'Planifié', variant: 'default', icon: <Icon.Calendar size={12} /> },
};

const statusOptions = [
  { value: 'completed', label: 'Terminé' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'planned', label: 'Planifié' },
];

const inputClass = 'px-3 py-2.5 border border-gray-200 rounded-lg text-base md:text-sm outline-none focus:border-primary transition-colors w-full bg-white';
const textareaClass = inputClass + ' resize-none';
const selectClass = inputClass + ' cursor-pointer';

function computeStats(data) {
  let completedMonths = 0;
  for (const s of data.stages) {
    const m = parseInt(s.duration) || 0;
    if (s.status === 'completed') completedMonths += m;
  }
  const totalMonths = data.stages.reduce((acc, s) => acc + (parseInt(s.duration) || 0), 0);
  return { completedMonths, totalMonths };
}

export default function ParcoursPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);

  // Chargement initial : Supabase → localStorage → défaut
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        if (user) {
          // Tenter la migration localStorage → Supabase
          await migrateLocalStorageToSupabase(user.id);

          // Charger depuis Supabase
          const supaData = await loadParcoursFromSupabase(user.id);
          if (!cancelled && supaData) {
            const stats = computeStats(supaData);
            const withStats = { ...supaData, completedMonths: stats.completedMonths, totalMonths: stats.totalMonths };
            setData(withStats);
            saveToLocalStorage(withStats);
            return;
          }
        }

        // Fallback : localStorage
        const local = loadFromLocalStorage();
        if (!cancelled) {
          setData(local || defaultParcoursData);
        }
      } catch (err) {
        console.error('[ParcoursPage] Erreur chargement:', err);
        if (!cancelled) {
          setData(loadFromLocalStorage() || defaultParcoursData);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user]);

  // Sauvegarde vers Supabase + localStorage
  const persistData = useCallback(async (newData) => {
    setData(newData);
    saveToLocalStorage(newData);

    if (user) {
      setSaving(true);
      try {
        await saveParcoursToSupabase(user.id, newData);
      } catch (err) {
        console.error('[ParcoursPage] Erreur sauvegarde:', err);
      } finally {
        setSaving(false);
      }
    }
  }, [user]);

  const startEdit = () => {
    setDraft(JSON.parse(JSON.stringify(data)));
    setEditing(true);
  };

  const cancelEdit = () => { setDraft(null); setEditing(false); };

  const saveEdit = async () => {
    const stats = computeStats(draft);
    const updated = { ...draft, completedMonths: stats.completedMonths, totalMonths: stats.totalMonths };
    setEditing(false);
    setDraft(null);
    await persistData(updated);
  };

  const d = editing ? draft : data;

  const setField = (field, value) => {
    setDraft(prev => ({ ...prev, [field]: value }));
  };

  const setStageField = (index, field, value) => {
    setDraft(prev => {
      const next = { ...prev, stages: prev.stages.map((s, i) => i === index ? { ...s, [field]: value } : s) };
      return next;
    });
  };

  const addStage = () => {
    setDraft(prev => ({
      ...prev,
      stages: [
        ...prev.stages,
        {
          id: Date.now(),
          rotation: '',
          hospital: '',
          service: '',
          location: '',
          duration: '6 mois',
          startDate: '',
          endDate: '',
          status: 'planned',
          description: '',
        },
      ],
    }));
  };

  const removeStage = (index) => {
    setDraft(prev => ({
      ...prev,
      stages: prev.stages.filter((_, i) => i !== index),
    }));
  };

  if (loading || !d) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-400">
          <Icon.Clock size={20} className="animate-spin" />
          <span>Chargement du parcours…</span>
        </div>
      </div>
    );
  }

  const { completedMonths, totalMonths } = computeStats(d);
  const progressPercent = totalMonths > 0 ? Math.round((completedMonths / totalMonths) * 100) : 0;
  const completedCount = d.stages.filter(s => s.status === 'completed').length;
  const inProgressCount = d.stages.filter(s => s.status === 'in_progress').length;

  return (
    <div className="animate-fade">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-[28px] font-bold tracking-tight mb-2">Parcours de spécialisation</h1>
          {editing ? (
            <div className="flex gap-3 items-center mt-2">
              <label className="text-xs text-gray-400">Spécialité :</label>
              <input className={inputClass + ' w-56'} value={d.specialty} onChange={e => setField('specialty', e.target.value)} />
            </div>
          ) : (
            <p className="text-gray-500 text-[15px]">Cursus de formation postgraduée en {d.specialty}</p>
          )}
        </div>
        <div className="flex gap-3 items-center">
          {saving && (
            <span className="text-xs text-gray-400 flex items-center gap-1.5">
              <Icon.Clock size={12} className="animate-spin" />
              Sauvegarde…
            </span>
          )}
          {editing ? (
            <>
              <Button variant="secondary" onClick={cancelEdit} icon={<Icon.X size={18} />}>Annuler</Button>
              <Button onClick={saveEdit} icon={<Icon.Save size={18} />}>Sauvegarder</Button>
            </>
          ) : (
            <Button variant="secondary" icon={<Icon.Edit size={18} />} onClick={startEdit}>Éditer</Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
        {[
          { label: 'Progression', value: `${progressPercent}%`, color: 'text-primary', bg: 'bg-primary-bg' },
          { label: 'Mois complétés', value: `${completedMonths}/${totalMonths}`, color: 'text-emerald-700', bg: 'bg-success-bg' },
          { label: 'Stages terminés', value: `${completedCount}/${d.stages.length}`, color: 'text-amber-700', bg: 'bg-warning-bg' },
          { label: 'En cours', value: inProgressCount, color: 'text-primary', bg: 'bg-primary-bg' },
        ].map((stat, i) => (
          <Card key={i} className={`animate-slide delay-${i + 1}`}>
            <div className={`w-11 h-11 ${stat.bg} rounded-xl mb-4`} />
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{stat.label}</div>
            <div className={`text-[32px] font-bold ${stat.color}`}>{stat.value}</div>
          </Card>
        ))}
      </div>

      {/* Global Progress Bar */}
      <Card className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-base font-semibold">Progression globale</h3>
            <p className="text-[13px] text-gray-500 mt-1">
              Durée totale : {d.totalDuration} — {completedMonths} mois complétés
            </p>
          </div>
          <span className="text-2xl font-bold text-primary">{progressPercent}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-700"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </Card>

      {/* Add Stage button */}
      {editing && (
        <div className="mb-6 flex justify-end">
          <Button variant="secondary" icon={<Icon.Plus size={18} />} onClick={addStage}>
            Ajouter une étape
          </Button>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {d.stages.map((stage, i) => {
          const config = statusConfig[stage.status];
          const isLast = i === d.stages.length - 1;

          return (
            <div key={stage.id} className={`flex gap-3 md:gap-6 animate-slide delay-${Math.min(i + 1, 5)}`}>
              {/* Timeline line + dot */}
              <div className="flex flex-col items-center">
                <div className={`w-4 h-4 rounded-full border-[3px] flex-shrink-0 ${
                  stage.status === 'completed'
                    ? 'border-success bg-success'
                    : stage.status === 'in_progress'
                    ? 'border-primary bg-primary'
                    : 'border-gray-300 bg-white'
                }`} />
                {!isLast && (
                  <div className={`w-0.5 flex-1 min-h-[24px] ${
                    stage.status === 'completed' ? 'bg-success' : 'bg-gray-200'
                  }`} />
                )}
              </div>

              {/* Card */}
              <Card
                className={`flex-1 mb-4 ${
                  stage.status === 'in_progress' && !editing ? 'border-primary/30 shadow-[0_4px_14px_rgba(0,102,255,0.08)]' : ''
                }`}
              >
                {editing ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 flex flex-col gap-2">
                        <input className={inputClass} value={stage.rotation} onChange={e => setStageField(i, 'rotation', e.target.value)} placeholder="Nom de la rotation" />
                        <div className="grid grid-cols-2 gap-2">
                          <input className={inputClass} value={stage.hospital} onChange={e => setStageField(i, 'hospital', e.target.value)} placeholder="Hôpital" />
                          <input className={inputClass} value={stage.service} onChange={e => setStageField(i, 'service', e.target.value)} placeholder="Service" />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <input className={inputClass} value={stage.location} onChange={e => setStageField(i, 'location', e.target.value)} placeholder="Lieu" />
                          <input className={inputClass} value={stage.duration} onChange={e => setStageField(i, 'duration', e.target.value)} placeholder="Durée (ex: 6 mois)" />
                          <input className={inputClass} value={stage.startDate} onChange={e => setStageField(i, 'startDate', e.target.value)} placeholder="Début" />
                          <input className={inputClass} value={stage.endDate} onChange={e => setStageField(i, 'endDate', e.target.value)} placeholder="Fin" />
                        </div>
                        <div className="flex gap-2 items-center">
                          <label className="text-xs text-gray-400 flex-shrink-0">Statut :</label>
                          <select
                            className={selectClass + ' w-40'}
                            value={stage.status}
                            onChange={e => setStageField(i, 'status', e.target.value)}
                          >
                            {statusOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </div>
                        <textarea className={textareaClass} rows={2} value={stage.description} onChange={e => setStageField(i, 'description', e.target.value)} placeholder="Description" />
                      </div>
                      <button
                        onClick={() => removeStage(i)}
                        className="ml-3 p-1.5 rounded-lg text-gray-300 hover:text-error hover:bg-error-bg transition-all cursor-pointer flex-shrink-0"
                      >
                        <Icon.Trash size={16} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-[15px] font-semibold mb-1">{stage.rotation}</h3>
                        <p className="text-[13px] text-gray-500">{stage.hospital} — {stage.service}</p>
                      </div>
                      <Badge variant={config.variant} icon={config.icon}>{config.label}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1.5 mb-3 text-[13px]">
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Icon.MapPin size={14} />
                        {stage.location}
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Icon.Clock size={14} />
                        {stage.duration}
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <Icon.Calendar size={14} />
                        {stage.startDate} — {stage.endDate}
                      </div>
                    </div>
                    <p className="text-[13px] text-gray-600 leading-relaxed">{stage.description}</p>
                  </>
                )}
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
