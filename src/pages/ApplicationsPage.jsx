import { useState, useEffect, useRef } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { Icon } from '../components/Icons';
import ApplicationModal from '../components/ApplicationModal';
import { useAuth } from '../contexts/AuthContext';
import { getCandidatures, updateCandidature, deleteCandidature } from '../services/candidaturesService';
import { sendApplication, getEmailConfig } from '../services/emailConfigService';

// ============================================================
// Config
// ============================================================

const RELANCE_DAYS = 14;
const URGENT_DAYS = 21;

const allStatuses = {
  draft:     { label: 'Brouillon',          variant: 'default', icon: <Icon.Edit size={12} /> },
  sent:      { label: 'Envoyée',             variant: 'warning', icon: <Icon.Send size={12} /> },
  replied:   { label: 'Réponse positive',   variant: 'success', icon: <Icon.Check size={12} /> },
  interview: { label: 'Entretien proposé',  variant: 'primary', icon: <Icon.Calendar size={12} /> },
  accepted:  { label: 'Acceptée',           variant: 'success', icon: <Icon.Check size={12} /> },
  rejected:  { label: 'Refusée',            variant: 'error',   icon: <Icon.X size={12} /> },
};

function daysSince(dateStr) {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const days = daysSince(dateStr);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `Il y a ${weeks} sem.`;
  }
  const months = Math.floor(days / 30);
  return `Il y a ${months} mois`;
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-CH', { day: '2-digit', month: 'short' })
    + ' ' + d.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
}

// ============================================================
// Column assignment
// ============================================================

function getColumn(cand) {
  if (cand.status === 'accepted' || cand.status === 'rejected') return 'done';
  if (cand.status === 'replied' || cand.status === 'interview') return 'replied';
  if (cand.status === 'sent') {
    const days = daysSince(cand.sent_at || cand.created_at);
    return days >= RELANCE_DAYS ? 'relance' : 'sent';
  }
  return 'sent'; // draft goes to sent column
}

const columns = [
  { id: 'sent',    title: 'Envoyées',       iconName: 'Send',          borderColor: 'border-blue-300',   bgColor: 'bg-blue-50',   textColor: 'text-blue-700',   headerBg: 'bg-blue-100',    barColor: 'bg-blue-400',    emptyMsg: 'Lancez vos candidatures depuis la page Recherche' },
  { id: 'relance', title: 'À relancer',     iconName: 'AlertTriangle', borderColor: 'border-orange-300', bgColor: 'bg-orange-50', textColor: 'text-orange-700', headerBg: 'bg-orange-100',  barColor: 'bg-orange-400',  emptyMsg: 'Tout va bien, aucune relance nécessaire' },
  { id: 'replied', title: 'Réponse reçue',  iconName: 'Mail',          borderColor: 'border-emerald-300',bgColor: 'bg-emerald-50',textColor: 'text-emerald-700',headerBg: 'bg-emerald-100', barColor: 'bg-emerald-400', emptyMsg: 'Les réponses arrivent bientôt...' },
  { id: 'done',    title: 'Terminée',       iconName: 'Check',         borderColor: 'border-gray-300',   bgColor: 'bg-gray-50',   textColor: 'text-gray-600',   headerBg: 'bg-gray-100',    barColor: 'bg-gray-400',    emptyMsg: 'Vos futures réussites apparaîtront ici' },
];

// ============================================================
// Relance badge
// ============================================================

function RelanceBadge({ cand }) {
  const days = daysSince(cand.sent_at || cand.created_at);
  if (days < RELANCE_DAYS) return null;
  const urgent = days >= URGENT_DAYS;
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
      urgent ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
    }`}>
      {days}j sans réponse{urgent ? ' !' : ''}
    </span>
  );
}

// ============================================================
// Response popup (3 choices)
// ============================================================

function ResponsePopup({ onSelect, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const options = [
    { status: 'replied',   label: 'Positive',          icon: <Icon.Check size={14} className="text-emerald-600" /> },
    { status: 'rejected',  label: 'Négative',          icon: <Icon.X size={14} className="text-red-500" /> },
    { status: 'interview', label: 'Entretien proposé',  icon: <Icon.Calendar size={14} className="text-blue-600" /> },
  ];

  return (
    <div ref={ref} className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 min-w-[180px] animate-fade">
      <div className="px-3 py-1.5 text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Type de réponse</div>
      {options.map(opt => (
        <button
          key={opt.status}
          onClick={(e) => { e.stopPropagation(); onSelect(opt.status); }}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 cursor-pointer transition-colors"
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================
// Note popup
// ============================================================

function NotePopup({ cand, onSave, onClose }) {
  const [notes, setNotes] = useState(cand.notes || '');
  const ref = useRef(null);
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-3 animate-fade">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Ajouter une note..."
        rows={2}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        autoFocus
      />
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer px-2 py-1">Annuler</button>
        <button
          onClick={() => onSave(notes)}
          className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg cursor-pointer hover:bg-primary-light transition-colors"
        >
          Sauvegarder
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Kanban card
// ============================================================

function KanbanCard({ cand, onUpdate, onSelect, onRelance, columnId }) {
  const [showResponse, setShowResponse] = useState(false);
  const [showNote, setShowNote] = useState(false);

  async function handleResponseSelect(status) {
    setShowResponse(false);
    const { data } = await updateCandidature(cand.id, { status });
    if (data) onUpdate(data);
  }

  async function handleSaveNote(notes) {
    setShowNote(false);
    const { data } = await updateCandidature(cand.id, { notes });
    if (data) onUpdate(data);
  }

  const days = daysSince(cand.sent_at || cand.created_at);
  const statusCfg = allStatuses[cand.status] || allStatuses.draft;

  // Left bar color based on age
  const barColor = days >= RELANCE_DAYS ? 'bg-red-400' : days >= 7 ? 'bg-orange-400' : 'bg-blue-400';

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', cand.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={() => onSelect(cand)}
      className="bg-white rounded-xl border border-gray-200 cursor-pointer hover:shadow-lg hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-200 group overflow-hidden flex"
    >
      {/* Left color bar */}
      <div className={`w-[3px] shrink-0 ${barColor}`} />

      <div className="flex-1 p-3.5 min-w-0">
        {/* Header: name + canton badge */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm truncate">{cand.establishment_name}</div>
            <div className="text-[12px] text-gray-400">
              {cand.establishment_city || '--'}
            </div>
            {cand.specialty && (
              <div className="text-[11px] text-gray-400 truncate">{cand.specialty}</div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {cand.establishment_canton && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {cand.establishment_canton}
              </span>
            )}
            {columnId === 'done' && (
              <Badge variant={statusCfg.variant} icon={statusCfg.icon}>
                {cand.status === 'accepted' ? 'Acceptée' : 'Refusée'}
              </Badge>
            )}
          </div>
        </div>

        {/* Director */}
        {cand.director_name && (
          <div className="text-[12px] text-gray-500 flex items-center gap-1 mb-1">
            <Icon.User size={11} className="shrink-0" />
            <span className="truncate">{cand.director_name}</span>
          </div>
        )}

        {/* Time ago */}
        <div className="text-[11px] text-gray-400 flex items-center gap-1 mb-2">
          <Icon.Clock size={10} className="shrink-0" />
          {timeAgo(cand.sent_at || cand.created_at)}
        </div>

        {/* Relance badge */}
        {columnId === 'relance' && <div className="mb-2"><RelanceBadge cand={cand} /></div>}

        {/* Notes preview */}
        {cand.notes && (
          <div className="text-[11px] text-gray-400 bg-gray-50 rounded-lg px-2 py-1 mb-2 truncate flex items-center gap-1">
            <Icon.Edit size={10} className="shrink-0" />
            {cand.notes}
          </div>
        )}

        {/* Actions */}
        <div className="relative flex items-center gap-1 pt-2 border-t border-gray-100">
          {(columnId === 'sent' || columnId === 'relance') && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowResponse(!showResponse); }}
              className="text-[11px] text-gray-400 hover:text-emerald-600 px-2 py-1 rounded-lg hover:bg-emerald-50 cursor-pointer transition-colors"
              title="Réponse reçue"
            >
              <Icon.Mail size={13} />
            </button>
          )}

          {columnId === 'relance' && (
            <button
              onClick={(e) => { e.stopPropagation(); onRelance(cand); }}
              className="text-[11px] text-gray-400 hover:text-orange-600 px-2 py-1 rounded-lg hover:bg-orange-50 cursor-pointer transition-colors"
              title="Relancer"
            >
              <Icon.Send size={13} />
            </button>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); setShowNote(!showNote); }}
            className="text-[11px] text-gray-400 hover:text-primary px-2 py-1 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
            title="Note"
          >
            <Icon.Edit size={13} />
          </button>

          {showResponse && (
            <ResponsePopup
              onSelect={handleResponseSelect}
              onClose={() => setShowResponse(false)}
            />
          )}

          {showNote && (
            <NotePopup
              cand={cand}
              onSave={handleSaveNote}
              onClose={() => setShowNote(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Kanban column
// ============================================================

function KanbanColumn({ col, cards, onUpdate, onSelect, onRelance, onDrop }) {
  const [dragOver, setDragOver] = useState(false);
  const ColIcon = Icon[col.iconName];

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(true);
  }

  function handleDragLeave() { setDragOver(false); }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const candId = e.dataTransfer.getData('text/plain');
    if (candId) onDrop(candId, col.id);
  }

  return (
    <div
      className={`flex flex-col flex-1 min-w-0 rounded-2xl border transition-colors duration-200 ${
        dragOver ? `${col.borderColor} ${col.bgColor}` : 'border-gray-200 bg-gray-50/50'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-t-2xl ${col.headerBg}`}>
        <div className="flex items-center gap-2">
          {ColIcon && <ColIcon size={15} className={col.textColor} />}
          <h3 className={`text-sm font-bold ${col.textColor}`}>{col.title}</h3>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.bgColor} ${col.textColor}`}>
          {cards.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[120px]">
        {cards.length === 0 && (
          <div className="text-center py-10 px-4">
            <div className={`w-10 h-10 rounded-full ${col.bgColor} flex items-center justify-center mx-auto mb-3`}>
              {ColIcon && <ColIcon size={18} className={`${col.textColor} opacity-60`} />}
            </div>
            <div className="text-gray-400 text-xs leading-relaxed">{col.emptyMsg}</div>
          </div>
        )}
        {cards.map(cand => (
          <KanbanCard
            key={cand.id}
            cand={cand}
            columnId={col.id}
            onUpdate={onUpdate}
            onSelect={onSelect}
            onRelance={onRelance}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Distribution bar
// ============================================================

function DistributionBar({ columnData, total }) {
  if (total === 0) return null;

  return (
    <div className="mt-4 mb-2">
      <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1.5">
        <span>Répartition</span>
        <span>{total} candidature{total > 1 ? 's' : ''}</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
        {columns.map(col => {
          const count = columnData[col.id]?.length || 0;
          if (count === 0) return null;
          const pct = (count / total) * 100;
          return (
            <div
              key={col.id}
              className={`${col.barColor} transition-all duration-500`}
              style={{ width: `${pct}%` }}
              title={`${col.title}: ${count}`}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-2">
        {columns.map(col => {
          const count = columnData[col.id]?.length || 0;
          if (count === 0) return null;
          return (
            <div key={col.id} className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <div className={`w-2 h-2 rounded-full ${col.barColor}`} />
              <span>{col.title}</span>
              <span className="font-semibold">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Detail panel (slide from right)
// ============================================================

function DetailPanel({ cand: initial, onClose, onUpdate, user, profile }) {
  const [cand, setCand] = useState(initial);
  const [notes, setNotes] = useState(initial.notes || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showRelance, setShowRelance] = useState(false);
  const [sendingRelance, setSendingRelance] = useState(false);
  const [relanceResult, setRelanceResult] = useState(null);

  useEffect(() => { setCand(initial); setNotes(initial.notes || ''); }, [initial.id]);

  const statusCfg = allStatuses[cand.status] || allStatuses.draft;

  async function handleStatusChange(newStatus) {
    if (newStatus === cand.status) return;
    const { data } = await updateCandidature(cand.id, { status: newStatus });
    if (data) { setCand(prev => ({ ...prev, ...data })); onUpdate(data); }
  }

  async function handleSaveNotes() {
    setSaving(true);
    const { data } = await updateCandidature(cand.id, { notes });
    if (data) { setCand(prev => ({ ...prev, ...data })); onUpdate(data); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    setSaving(false);
  }

  const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || '';

  function generateRelanceText() {
    const director = cand.director_name || 'Madame, Monsieur';
    return `Cher Docteur ${director},

Je me permets de revenir vers vous concernant ma candidature envoyée le ${formatDate(cand.sent_at || cand.created_at)} pour un poste de médecin assistante au sein de ${cand.establishment_name}.

N'ayant pas encore eu de retour de votre part, je souhaitais renouveler mon intérêt pour cette opportunité et reste à votre entière disposition pour tout entretien ou information complémentaire.

Mes meilleures salutations,
${userName}`;
  }

  async function handleSendRelance() {
    setSendingRelance(true);
    setRelanceResult(null);
    const subject = `Relance - Candidature ${cand.specialty || 'Médecine'} - ${userName}`;
    const body = generateRelanceText();
    try {
      const result = await sendApplication({
        to: cand.director_email,
        subject,
        body,
        userName,
        userId: user.id,
        establishmentId: cand.establishment_id,
      });
      if (result.success) {
        setRelanceResult({ type: 'success', text: 'Relance envoyée !' });
      } else {
        setRelanceResult({ type: 'error', text: result.error || 'Erreur' });
      }
    } catch (err) {
      setRelanceResult({ type: 'error', text: err.message });
    }
    setSendingRelance(false);
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 animate-fade" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-[560px] bg-white z-50 shadow-2xl flex flex-col animate-slide-left overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold truncate">Détails</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
            <Icon.X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Establishment */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <h3 className="font-semibold text-base">{cand.establishment_name}</h3>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              {cand.establishment_city && (
                <span className="flex items-center gap-1"><Icon.MapPin size={14} />{cand.establishment_city}</span>
              )}
              {cand.establishment_canton && (
                <span className="flex items-center gap-1"><Icon.Map size={14} />{cand.establishment_canton}</span>
              )}
            </div>
            {cand.director_name && (
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <Icon.User size={14} />{cand.director_name}
                {cand.director_email && <span className="text-gray-400 ml-1">({cand.director_email})</span>}
              </div>
            )}
            {cand.specialty && (
              <div className="flex items-center gap-1.5 text-sm text-gray-500">
                <Icon.Briefcase size={14} />{cand.specialty}
              </div>
            )}
          </div>

          {/* Date + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1.5">Date d'envoi</div>
              <div className="text-sm font-medium">{formatDateTime(cand.sent_at || cand.created_at)}</div>
              {cand.status === 'sent' && daysSince(cand.sent_at || cand.created_at) >= RELANCE_DAYS && (
                <RelanceBadge cand={cand} />
              )}
            </div>
            <div>
              <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1.5">Statut</div>
              <select
                value={cand.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {Object.entries(allStatuses).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Motivation letter */}
          {cand.motivation_letter && (
            <div>
              <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1.5">Lettre envoyée</div>
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                {cand.motivation_letter}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[11px] text-gray-400 uppercase tracking-wider">Notes</div>
              {saved && <span className="text-xs text-emerald-600 flex items-center gap-1"><Icon.Check size={12} /> OK</span>}
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: rappeler lundi, demande de CV supplémentaire..."
              rows={3}
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl bg-white resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <div className="flex justify-end mt-2">
              <Button variant="secondary" size="small" onClick={handleSaveNotes} disabled={saving || notes === (cand.notes || '')} icon={<Icon.Save size={14} />}>
                {saving ? '...' : 'Sauvegarder'}
              </Button>
            </div>
          </div>

          {/* Relance */}
          {cand.director_email && (cand.status === 'sent') && (
            <div>
              <Button variant="secondary" size="small" fullWidth onClick={() => setShowRelance(!showRelance)} icon={<Icon.Send size={14} />}>
                {showRelance ? 'Masquer la relance' : 'Générer un mail de relance'}
              </Button>

              {showRelance && (
                <div className="mt-3 bg-orange-50 border border-orange-100 rounded-xl p-4">
                  <div className="text-[11px] text-orange-500 uppercase tracking-wider mb-2">Modèle de relance</div>
                  <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-3">{generateRelanceText()}</div>
                  <div className="flex gap-2">
                    <Button size="small" onClick={handleSendRelance} disabled={sendingRelance} icon={<Icon.Send size={14} />}>
                      {sendingRelance ? 'Envoi...' : 'Envoyer la relance'}
                    </Button>
                    <Button variant="secondary" size="small" onClick={() => navigator.clipboard.writeText(generateRelanceText())} icon={<Icon.File size={14} />}>
                      Copier
                    </Button>
                  </div>
                  {relanceResult && (
                    <div className={`mt-2 p-2 rounded-lg text-xs flex items-center gap-1 ${
                      relanceResult.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {relanceResult.type === 'success' ? <Icon.Check size={12} /> : <Icon.X size={12} />}
                      {relanceResult.text}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ============================================================
// Table view (with filters)
// ============================================================

function TableView({ candidatures, onUpdate, onSelect, onDelete }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [cantonFilter, setCantonFilter] = useState('all');
  const [search, setSearch] = useState('');

  const cantons = [...new Set(candidatures.map(c => c.establishment_canton).filter(Boolean))].sort();

  const filtered = candidatures.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (cantonFilter !== 'all' && c.establishment_canton !== cantonFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(c.establishment_name || '').toLowerCase().includes(q) &&
          !(c.director_name || '').toLowerCase().includes(q) &&
          !(c.establishment_city || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Icon.Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
          <option value="all">Tous les statuts</option>
          {Object.entries(allStatuses).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        {cantons.length > 0 && (
          <select value={cantonFilter} onChange={(e) => setCantonFilter(e.target.value)}
            className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
            <option value="all">Tous les cantons</option>
            {cantons.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card className="text-center !py-10">
          <Icon.Search size={32} className="mx-auto text-gray-300 mb-3" />
          <div className="text-gray-500 text-sm">Aucun résultat</div>
        </Card>
      ) : (
        <>
          {/* Desktop */}
          <Card className="!p-0 hidden md:block">
            <div className="grid grid-cols-[2fr_1fr_1fr_100px_160px_80px] px-6 py-[18px] border-b border-gray-100 text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
              <div>Établissement</div>
              <div>Spécialité</div>
              <div>Directeur</div>
              <div>Date</div>
              <div>Statut</div>
              <div></div>
            </div>
            {filtered.map((cand, i) => {
              const days = daysSince(cand.sent_at || cand.created_at);
              return (
                <div key={cand.id}
                  className={`grid grid-cols-[2fr_1fr_1fr_100px_160px_80px] px-6 py-[18px] items-center text-sm hover:bg-gray-50 transition-colors ${
                    i < filtered.length - 1 ? 'border-b border-gray-100' : ''
                  }`}>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{cand.establishment_name}</div>
                    <div className="text-[13px] text-gray-400">{cand.establishment_city}{cand.establishment_canton ? ` (${cand.establishment_canton})` : ''}</div>
                  </div>
                  <div className="text-gray-600 text-[13px] truncate">{cand.specialty || '--'}</div>
                  <div className="text-gray-600 text-[13px] truncate">{cand.director_name || '--'}</div>
                  <div className="text-gray-400 text-[13px]">{formatDate(cand.sent_at || cand.created_at)}</div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant={(allStatuses[cand.status] || allStatuses.draft).variant} icon={(allStatuses[cand.status] || allStatuses.draft).icon}>
                      {(allStatuses[cand.status] || allStatuses.draft).label}
                    </Badge>
                    {cand.status === 'sent' && days >= RELANCE_DAYS && <RelanceBadge cand={cand} />}
                  </div>
                  <div className="text-right">
                    <Button variant="ghost" size="small" onClick={() => onSelect(cand)}>Détails</Button>
                  </div>
                </div>
              );
            })}
          </Card>

          {/* Mobile */}
          <div className="flex flex-col gap-3 md:hidden">
            {filtered.map(cand => {
              const cfg = allStatuses[cand.status] || allStatuses.draft;
              return (
                <Card key={cand.id} className="cursor-pointer" onClick={() => onSelect(cand)}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">{cand.establishment_name}</div>
                      <div className="text-[13px] text-gray-400">{cand.establishment_city}{cand.establishment_canton ? ` (${cand.establishment_canton})` : ''}</div>
                    </div>
                    <Badge variant={cfg.variant} icon={cfg.icon}>{cfg.label}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-gray-600">{cand.specialty || '--'}</span>
                    <span className="text-gray-400">{formatDate(cand.sent_at || cand.created_at)}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}

// ============================================================
// Relance modal (send from kanban)
// ============================================================

function RelanceModal({ cand, onClose, user, profile }) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const userName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || '';

  const relanceText = `Cher Docteur ${cand.director_name || 'Madame, Monsieur'},

Je me permets de revenir vers vous concernant ma candidature envoyée le ${formatDate(cand.sent_at || cand.created_at)} pour un poste de médecin assistante au sein de ${cand.establishment_name}.

N'ayant pas encore eu de retour de votre part, je souhaitais renouveler mon intérêt pour cette opportunité et reste à votre entière disposition pour tout entretien ou information complémentaire.

Mes meilleures salutations,
${userName}`;

  async function handleSend() {
    setSending(true);
    try {
      const res = await sendApplication({
        to: cand.director_email,
        subject: `Relance - Candidature ${cand.specialty || 'Médecine'} - ${userName}`,
        body: relanceText,
        userName,
        userId: user.id,
        establishmentId: cand.establishment_id,
      });
      setResult(res.success ? { type: 'success', text: 'Relance envoyée !' } : { type: 'error', text: res.error });
    } catch (err) {
      setResult({ type: 'error', text: err.message });
    }
    setSending(false);
  }

  return (
    <div className="animate-fade fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <Card className="animate-scale max-w-[520px] w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold">Relancer {cand.establishment_name}</h3>
            <p className="text-sm text-gray-500">{cand.director_email}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 cursor-pointer"><Icon.X size={18} /></button>
        </div>

        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-4">
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{relanceText}</div>
        </div>

        {result && (
          <div className={`mb-4 p-3 rounded-xl text-sm flex items-center gap-2 ${
            result.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
          }`}>
            {result.type === 'success' ? <Icon.Check size={16} /> : <Icon.X size={16} />}
            {result.text}
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigator.clipboard.writeText(relanceText)} icon={<Icon.File size={16} />} className="flex-1">
            Copier
          </Button>
          {cand.director_email && (
            <Button onClick={handleSend} disabled={sending || result?.type === 'success'} icon={<Icon.Send size={16} />} className="flex-1">
              {sending ? 'Envoi...' : 'Envoyer la relance'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// Main page
// ============================================================

export default function ApplicationsPage() {
  const { user, profile } = useAuth();
  const [candidatures, setCandidatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('kanban');
  const [selectedCand, setSelectedCand] = useState(null);
  const [relanceCand, setRelanceCand] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [dropTarget, setDropTarget] = useState(null); // { candId, columnId } for reply popup

  useEffect(() => {
    if (!user?.id) return;
    loadData();
  }, [user?.id]);

  async function loadData() {
    setLoading(true);
    const { data } = await getCandidatures(user.id);
    setCandidatures(data);
    setLoading(false);
  }

  function handleUpdate(updated) {
    setCandidatures(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
    if (selectedCand?.id === updated.id) setSelectedCand(prev => ({ ...prev, ...updated }));
  }

  async function handleDelete(id) {
    const { error } = await deleteCandidature(id);
    if (!error) setCandidatures(prev => prev.filter(c => c.id !== id));
    setDeleteConfirm(null);
  }

  function handleModalSaved(candidature) {
    setCandidatures(prev => {
      const exists = prev.find(c => c.id === candidature.id);
      if (exists) return prev.map(c => c.id === candidature.id ? candidature : c);
      return [candidature, ...prev];
    });
    setEditTarget(null);
  }

  // Drag & drop handler
  async function handleDrop(candId, targetColumn) {
    const cand = candidatures.find(c => c.id === candId);
    if (!cand) return;
    const currentColumn = getColumn(cand);
    if (currentColumn === targetColumn) return;

    // Map column to status
    if (targetColumn === 'sent' || targetColumn === 'relance') {
      // Both map to 'sent' (relance is automatic based on date)
      if (cand.status !== 'sent') {
        const { data } = await updateCandidature(cand.id, { status: 'sent' });
        if (data) handleUpdate(data);
      }
    } else if (targetColumn === 'replied') {
      // Need to pick: replied / interview
      setDropTarget({ candId, columnId: targetColumn });
    } else if (targetColumn === 'done') {
      // Need to pick: accepted / rejected
      setDropTarget({ candId, columnId: targetColumn });
    }
  }

  async function handleDropSelect(status) {
    if (!dropTarget) return;
    const { data } = await updateCandidature(dropTarget.candId, { status });
    if (data) handleUpdate(data);
    setDropTarget(null);
  }

  // Build column data
  const columnData = {};
  columns.forEach(col => { columnData[col.id] = []; });
  candidatures.forEach(cand => {
    const col = getColumn(cand);
    if (columnData[col]) columnData[col].push(cand);
  });

  // Stats
  const relanceCount = columnData.relance?.length || 0;

  if (loading) {
    return (
      <div className="animate-fade">
        <div className="mb-8">
          <h1 className="text-[28px] font-bold tracking-tight mb-2">Candidatures</h1>
          <p className="text-gray-500 text-[15px]">Chargement...</p>
        </div>
        <Card className="text-center !py-16">
          <div className="w-[200px] h-1 bg-gray-100 rounded-full mx-auto overflow-hidden">
            <div className="w-[30%] h-full bg-gradient-to-r from-primary via-primary-light to-primary rounded-full animate-shimmer" />
          </div>
        </Card>
      </div>
    );
  }

  if (candidatures.length === 0) {
    return (
      <div className="animate-fade">
        <div className="mb-8">
          <h1 className="text-[28px] font-bold tracking-tight mb-2">Candidatures</h1>
          <p className="text-gray-500 text-[15px]">Gérez vos candidatures spontanées</p>
        </div>
        <Card className="text-center !py-16 !px-10">
          <Icon.Send size={40} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-lg font-bold mb-2">Aucune candidature</h2>
          <p className="text-gray-500 text-sm max-w-[380px] mx-auto">
            Recherchez un établissement dans la page Recherche et cliquez sur &laquo; Postuler &raquo; pour créer votre première candidature.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight mb-1">Candidatures</h1>
          <p className="text-gray-500 text-[15px]">{candidatures.length} candidature{candidatures.length > 1 ? 's' : ''}</p>
        </div>

        {/* View toggle */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setView('kanban')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              view === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2"><Icon.Grid size={14} /> Kanban</span>
          </button>
          <button
            onClick={() => setView('table')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              view === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2"><Icon.FileText size={14} /> Tableau</span>
          </button>
        </div>
      </div>

      {/* Relance alert */}
      {relanceCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 mb-5 bg-orange-50 border border-orange-100 rounded-xl text-sm text-orange-700">
          <Icon.AlertTriangle size={16} className="shrink-0" />
          <span className="font-semibold">{relanceCount} candidature{relanceCount > 1 ? 's' : ''} à relancer</span>
          <span className="text-orange-500">-- plus de {RELANCE_DAYS} jours sans réponse</span>
        </div>
      )}

      {/* Kanban view */}
      {view === 'kanban' && (
        <>
          <div className="flex gap-4 w-full pb-4">
            {columns.map(col => (
              <KanbanColumn
                key={col.id}
                col={col}
                cards={columnData[col.id]}
                onUpdate={handleUpdate}
                onSelect={setSelectedCand}
                onRelance={setRelanceCand}
                onDrop={handleDrop}
              />
            ))}
          </div>
          <DistributionBar columnData={columnData} total={candidatures.length} />
        </>
      )}

      {/* Table view */}
      {view === 'table' && (
        <TableView
          candidatures={candidatures}
          onUpdate={handleUpdate}
          onSelect={setSelectedCand}
          onDelete={(id) => setDeleteConfirm(id)}
        />
      )}

      {/* Drop target popup (for replied / done columns) */}
      {dropTarget && (
        <div className="animate-fade fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setDropTarget(null)}>
          <Card className="animate-scale max-w-[360px] w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">
              {dropTarget.columnId === 'replied' ? 'Type de réponse' : 'Résultat final'}
            </h3>
            <div className="space-y-2">
              {dropTarget.columnId === 'replied' ? (
                <>
                  <button onClick={() => handleDropSelect('replied')} className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 cursor-pointer transition-colors">
                    <Icon.Check size={18} className="text-emerald-600" />
                    <span className="font-medium">Réponse positive</span>
                  </button>
                  <button onClick={() => handleDropSelect('rejected')} className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-red-300 hover:bg-red-50 cursor-pointer transition-colors">
                    <Icon.X size={18} className="text-red-500" />
                    <span className="font-medium">Réponse négative</span>
                  </button>
                  <button onClick={() => handleDropSelect('interview')} className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors">
                    <Icon.Calendar size={18} className="text-blue-600" />
                    <span className="font-medium">Entretien proposé</span>
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => handleDropSelect('accepted')} className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 cursor-pointer transition-colors">
                    <Icon.Check size={18} className="text-emerald-600" />
                    <span className="font-medium">Acceptée</span>
                  </button>
                  <button onClick={() => handleDropSelect('rejected')} className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-red-300 hover:bg-red-50 cursor-pointer transition-colors">
                    <Icon.X size={18} className="text-red-500" />
                    <span className="font-medium">Refusée</span>
                  </button>
                </>
              )}
            </div>
            <button onClick={() => setDropTarget(null)} className="w-full mt-3 text-sm text-gray-500 hover:text-gray-700 py-2 cursor-pointer">Annuler</button>
          </Card>
        </div>
      )}

      {/* Detail panel */}
      {selectedCand && (
        <DetailPanel
          cand={selectedCand}
          onClose={() => setSelectedCand(null)}
          onUpdate={handleUpdate}
          user={user}
          profile={profile}
        />
      )}

      {/* Relance modal */}
      {relanceCand && (
        <RelanceModal
          cand={relanceCand}
          onClose={() => setRelanceCand(null)}
          user={user}
          profile={profile}
        />
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="animate-fade fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setDeleteConfirm(null)}>
          <Card className="animate-scale max-w-[400px] w-full" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-12 h-12 bg-error-bg rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon.Trash size={20} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold mb-2">Supprimer la candidature ?</h3>
              <p className="text-gray-500 text-sm mb-6">Cette action est irréversible.</p>
              <div className="flex gap-3 justify-center">
                <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
                <Button className="!bg-red-500 hover:!bg-red-600 !shadow-none" onClick={() => handleDelete(deleteConfirm)} icon={<Icon.Trash size={16} />}>Supprimer</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Edit modal */}
      {editTarget && (
        <ApplicationModal
          establishment={editTarget.establishment}
          existingCandidature={editTarget.candidature}
          onClose={() => setEditTarget(null)}
          onSaved={handleModalSaved}
        />
      )}
    </div>
  );
}
