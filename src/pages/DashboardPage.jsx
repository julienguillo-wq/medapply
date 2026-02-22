import { useState, useEffect, useRef } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { Icon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';
import { getCandidatures, updateCandidature } from '../services/candidaturesService';

// ============================================================
// Config
// ============================================================

const statusConfig = {
  draft:     { label: 'Brouillon',          variant: 'default', icon: <Icon.Edit size={12} /> },
  sent:      { label: 'Envoyee',            variant: 'warning', icon: <Icon.Send size={12} /> },
  replied:   { label: 'Reponse recue',      variant: 'info',    icon: <Icon.Mail size={12} /> },
  interview: { label: 'Entretien planifie', variant: 'primary', icon: <Icon.Calendar size={12} /> },
  accepted:  { label: 'Acceptee',           variant: 'success', icon: <Icon.Check size={12} /> },
  rejected:  { label: 'Refusee',            variant: 'error',   icon: <Icon.X size={12} /> },
};

const statusOrder = ['draft', 'sent', 'replied', 'interview', 'accepted', 'rejected'];

const filterOptions = [
  { value: 'all', label: 'Tous' },
  ...statusOrder.map(s => ({ value: s, label: statusConfig[s].label })),
];

function formatDate(dateStr) {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('fr-CH', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-CH', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
}

// ============================================================
// StatusDropdown — change status inline
// ============================================================

function StatusDropdown({ candidature, onUpdate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const status = statusConfig[candidature.status] || statusConfig.draft;

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  async function handleSelect(newStatus) {
    setOpen(false);
    if (newStatus === candidature.status) return;
    const { data } = await updateCandidature(candidature.id, { status: newStatus });
    if (data) onUpdate(data);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="cursor-pointer"
      >
        <Badge variant={status.variant} icon={status.icon}>{status.label}</Badge>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 min-w-[180px] animate-fade">
          {statusOrder.map(s => {
            const cfg = statusConfig[s];
            const active = s === candidature.status;
            return (
              <button
                key={s}
                onClick={(e) => { e.stopPropagation(); handleSelect(s); }}
                className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                  active ? 'bg-gray-50 font-semibold' : 'hover:bg-gray-50'
                }`}
              >
                <span className="shrink-0">{cfg.icon}</span>
                {cfg.label}
                {active && <Icon.Check size={14} className="ml-auto text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// DetailModal — panneau lateral avec tous les details
// ============================================================

function DetailModal({ candidature: initial, onClose, onUpdate }) {
  const [cand, setCand] = useState(initial);
  const [notes, setNotes] = useState(initial.notes || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const status = statusConfig[cand.status] || statusConfig.draft;

  async function handleStatusChange(newStatus) {
    if (newStatus === cand.status) return;
    const { data } = await updateCandidature(cand.id, { status: newStatus });
    if (data) { setCand(prev => ({ ...prev, ...data })); onUpdate(data); }
  }

  async function handleSaveNotes() {
    setSaving(true);
    const { data } = await updateCandidature(cand.id, { notes });
    if (data) {
      setCand(prev => ({ ...prev, ...data }));
      onUpdate(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  function generateRelance() {
    const director = cand.director_name || 'Madame, Monsieur';
    const name = cand.establishment_name || 'votre etablissement';
    return `Cher Docteur ${director},

Je me permets de revenir vers vous concernant ma candidature envoyee le ${formatDate(cand.sent_at || cand.created_at)} pour un poste de medecin assistante au sein de ${name}.

N'ayant pas encore eu de retour de votre part, je souhaitais renouveler mon interet pour cette opportunite et reste a votre entiere disposition pour tout entretien ou information complementaire.

Mes meilleures salutations`;
  }

  const [showRelance, setShowRelance] = useState(false);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-50 animate-fade" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-[560px] bg-white z-50 shadow-2xl flex flex-col animate-slide-left overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold truncate">Details de la candidature</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
            <Icon.X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Establishment info */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <h3 className="font-semibold text-base">{cand.establishment_name || '--'}</h3>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              {cand.establishment_city && (
                <span className="flex items-center gap-1">
                  <Icon.MapPin size={14} />
                  {cand.establishment_city}
                </span>
              )}
              {cand.establishment_canton && (
                <span className="flex items-center gap-1">
                  <Icon.Map size={14} />
                  {cand.establishment_canton}
                </span>
              )}
            </div>
            {cand.director_name && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <Icon.User size={14} />
                {cand.director_name}
                {cand.director_email && (
                  <span className="text-gray-400 ml-1">({cand.director_email})</span>
                )}
              </div>
            )}
            {cand.specialty && (
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <Icon.Briefcase size={14} />
                {cand.specialty}
              </div>
            )}
          </div>

          {/* Date + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1.5">Date d'envoi</div>
              <div className="text-sm font-medium">{formatDateTime(cand.sent_at || cand.created_at)}</div>
            </div>
            <div>
              <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1.5">Statut</div>
              <select
                value={cand.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {statusOrder.map(s => (
                  <option key={s} value={s}>{statusConfig[s].label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Motivation letter */}
          {cand.motivation_letter && (
            <div>
              <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1.5">Lettre de motivation</div>
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap max-h-[240px] overflow-y-auto">
                {cand.motivation_letter}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[11px] text-gray-400 uppercase tracking-wider">Notes</div>
              {saved && (
                <span className="text-xs text-emerald-600 flex items-center gap-1">
                  <Icon.Check size={12} /> Sauvegarde
                </span>
              )}
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: rappeler lundi, demande de CV supplementaire..."
              rows={3}
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-white resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <div className="flex justify-end mt-2">
              <Button
                variant="secondary"
                size="small"
                onClick={handleSaveNotes}
                disabled={saving || notes === (cand.notes || '')}
                icon={<Icon.Save size={14} />}
              >
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </div>
          </div>

          {/* Relance */}
          <div>
            <Button
              variant="secondary"
              size="small"
              fullWidth
              onClick={() => setShowRelance(!showRelance)}
              icon={<Icon.Send size={14} />}
            >
              {showRelance ? 'Masquer la relance' : 'Generer un mail de relance'}
            </Button>

            {showRelance && (
              <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
                <div className="text-[11px] text-blue-500 uppercase tracking-wider mb-2">Modele de relance</div>
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {generateRelance()}
                </div>
                <div className="flex justify-end mt-3">
                  <Button
                    size="small"
                    onClick={() => {
                      navigator.clipboard.writeText(generateRelance());
                    }}
                    icon={<Icon.File size={14} />}
                  >
                    Copier
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================
// Filters bar
// ============================================================

function FiltersBar({ statusFilter, setStatusFilter, cantonFilter, setCantonFilter, search, setSearch, cantons }) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-5">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Icon.Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un etablissement..."
          className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      {/* Status filter */}
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      >
        {filterOptions.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>

      {/* Canton filter */}
      {cantons.length > 0 && (
        <select
          value={cantonFilter}
          onChange={(e) => setCantonFilter(e.target.value)}
          className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        >
          <option value="all">Tous les cantons</option>
          {cantons.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      )}
    </div>
  );
}

// ============================================================
// Page principale
// ============================================================

export default function DashboardPage() {
  const { user } = useAuth();
  const [candidatures, setCandidatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCand, setSelectedCand] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [cantonFilter, setCantonFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    async function load() {
      const { data } = await getCandidatures(user.id);
      setCandidatures(data);
      setLoading(false);
    }
    load();
  }, [user?.id]);

  function handleCandUpdate(updated) {
    setCandidatures(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
    if (selectedCand?.id === updated.id) {
      setSelectedCand(prev => ({ ...prev, ...updated }));
    }
  }

  // Unique cantons
  const cantons = [...new Set(candidatures.map(c => c.establishment_canton).filter(Boolean))].sort();

  // Filtered list
  const filtered = candidatures.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (cantonFilter !== 'all' && c.establishment_canton !== cantonFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const match =
        (c.establishment_name || '').toLowerCase().includes(q) ||
        (c.director_name || '').toLowerCase().includes(q) ||
        (c.establishment_city || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const stats = {
    total: candidatures.length,
    sent: candidatures.filter(c => c.status === 'sent').length,
    replied: candidatures.filter(c => c.status === 'replied').length,
    interview: candidatures.filter(c => c.status === 'interview').length,
    accepted: candidatures.filter(c => c.status === 'accepted').length,
    rejected: candidatures.filter(c => c.status === 'rejected').length,
  };

  return (
    <div className="animate-fade">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold tracking-tight mb-2">Suivi des candidatures</h1>
        <p className="text-gray-500 text-[15px]">Suivez l'etat de vos candidatures</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-900', bg: 'bg-gray-100' },
          { label: 'Envoyees', value: stats.sent, color: 'text-amber-700', bg: 'bg-warning-bg' },
          { label: 'Reponses', value: stats.replied, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'Entretiens', value: stats.interview, color: 'text-primary', bg: 'bg-primary-bg' },
          { label: 'Acceptees', value: stats.accepted, color: 'text-emerald-700', bg: 'bg-success-bg' },
          { label: 'Refusees', value: stats.rejected, color: 'text-red-700', bg: 'bg-error-bg' },
        ].map((stat, i) => (
          <Card key={i} className={`!py-3 !px-4 animate-slide delay-${i + 1}`}>
            <div className={`w-8 h-8 ${stat.bg} rounded-lg mb-2 flex items-center justify-center`}>
              <span className={`text-sm font-bold ${stat.color}`}>{loading ? '--' : stat.value}</span>
            </div>
            <div className="text-[11px] text-gray-400 uppercase tracking-wide">{stat.label}</div>
          </Card>
        ))}
      </div>

      {loading ? (
        <Card className="text-center !py-16">
          <div className="w-[200px] h-1 bg-gray-100 rounded-full mx-auto overflow-hidden">
            <div className="w-[30%] h-full bg-gradient-to-r from-primary via-primary-light to-primary rounded-full animate-shimmer" />
          </div>
        </Card>
      ) : candidatures.length === 0 ? (
        <Card className="text-center !py-12">
          <Icon.Send size={40} className="mx-auto text-gray-300 mb-4" />
          <div className="text-gray-500 text-[15px] font-medium mb-1">Aucune candidature</div>
          <div className="text-gray-400 text-[13px]">Vos candidatures apparaitront ici</div>
        </Card>
      ) : (
        <>
          {/* Filters */}
          <FiltersBar
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            cantonFilter={cantonFilter}
            setCantonFilter={setCantonFilter}
            search={search}
            setSearch={setSearch}
            cantons={cantons}
          />

          {filtered.length === 0 ? (
            <Card className="text-center !py-10">
              <Icon.Search size={32} className="mx-auto text-gray-300 mb-3" />
              <div className="text-gray-500 text-sm">Aucun resultat pour ces filtres</div>
            </Card>
          ) : (
            <>
              {/* Table — Desktop */}
              <Card className="!p-0 hidden md:block">
                <div className="grid grid-cols-[2fr_1fr_1fr_160px_80px] px-6 py-[18px] border-b border-gray-100 text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
                  <div>Etablissement</div>
                  <div>Specialite</div>
                  <div>Date</div>
                  <div>Statut</div>
                  <div></div>
                </div>
                {filtered.map((cand, i) => (
                  <div
                    key={cand.id}
                    className={`grid grid-cols-[2fr_1fr_1fr_160px_80px] px-6 py-[18px] items-center text-sm transition-colors hover:bg-gray-50 ${
                      i < filtered.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{cand.establishment_name}</div>
                      <div className="text-[13px] text-gray-400">
                        {cand.establishment_city}{cand.establishment_canton ? ` (${cand.establishment_canton})` : ''}
                      </div>
                    </div>
                    <div className="text-gray-600">{cand.specialty || '--'}</div>
                    <div className="text-gray-400">{formatDate(cand.sent_at || cand.created_at)}</div>
                    <div>
                      <StatusDropdown candidature={cand} onUpdate={handleCandUpdate} />
                    </div>
                    <div className="text-right">
                      <Button
                        variant="ghost"
                        size="small"
                        onClick={(e) => { e.stopPropagation(); setSelectedCand(cand); }}
                      >
                        Details
                      </Button>
                    </div>
                  </div>
                ))}
              </Card>

              {/* Cards — Mobile */}
              <div className="flex flex-col gap-3 md:hidden">
                {filtered.map((cand) => {
                  const status = statusConfig[cand.status] || statusConfig.draft;
                  return (
                    <Card
                      key={cand.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedCand(cand)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-semibold">{cand.establishment_name}</div>
                          <div className="text-[13px] text-gray-400">
                            {cand.establishment_city}{cand.establishment_canton ? ` (${cand.establishment_canton})` : ''}
                          </div>
                        </div>
                        <StatusDropdown candidature={cand} onUpdate={handleCandUpdate} />
                      </div>
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-gray-600">{cand.specialty || '--'}</span>
                        <span className="text-gray-400">{formatDate(cand.sent_at || cand.created_at)}</span>
                      </div>
                      {cand.notes && (
                        <div className="mt-2 text-xs text-gray-400 truncate flex items-center gap-1">
                          <Icon.Edit size={11} />
                          {cand.notes}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* Detail modal */}
      {selectedCand && (
        <DetailModal
          candidature={selectedCand}
          onClose={() => setSelectedCand(null)}
          onUpdate={handleCandUpdate}
        />
      )}
    </div>
  );
}
