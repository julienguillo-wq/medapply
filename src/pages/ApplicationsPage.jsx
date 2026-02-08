import { useState, useEffect, useRef } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { Icon } from '../components/Icons';
import ApplicationModal from '../components/ApplicationModal';
import { useAuth } from '../contexts/AuthContext';
import { getCandidatures, updateCandidature, deleteCandidature } from '../services/candidaturesService';

const statusConfig = {
  draft: { label: 'Brouillon', variant: 'default', icon: <Icon.Edit size={12} /> },
  sent: { label: 'Envoyée', variant: 'warning', icon: <Icon.Clock size={12} /> },
  replied: { label: 'Réponse', variant: 'success', icon: <Icon.Check size={12} /> },
  rejected: { label: 'Refusée', variant: 'error', icon: <Icon.X size={12} /> },
};

const statusOptions = ['draft', 'sent', 'replied', 'rejected'];

function StatusDropdown({ candidature, onUpdate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  async function handleSelect(status) {
    setOpen(false);
    if (status === candidature.status) return;
    const updates = { status };
    if (status === 'sent' && !candidature.sent_at) {
      updates.sent_at = new Date().toISOString();
    }
    const { data } = await updateCandidature(candidature.id, updates);
    if (data) onUpdate(data);
  }

  const current = statusConfig[candidature.status] || statusConfig.draft;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="cursor-pointer inline-flex items-center gap-1"
      >
        <Badge variant={current.variant} icon={current.icon}>
          {current.label}
        </Badge>
        <Icon.ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1 min-w-[140px]">
          {statusOptions.map((s) => {
            const cfg = statusConfig[s];
            return (
              <button
                key={s}
                onClick={() => handleSelect(s)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 cursor-pointer ${
                  s === candidature.status ? 'font-semibold text-primary' : 'text-gray-700'
                }`}
              >
                {cfg.icon}
                {cfg.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function ApplicationsPage() {
  const { user } = useAuth();
  const [candidatures, setCandidatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

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
    setCandidatures(prev => prev.map(c => c.id === updated.id ? updated : c));
  }

  async function handleDelete(id) {
    const { error } = await deleteCandidature(id);
    if (!error) {
      setCandidatures(prev => prev.filter(c => c.id !== id));
    }
    setDeleteConfirm(null);
  }

  function handleModalSaved(candidature) {
    // Update or add
    setCandidatures(prev => {
      const exists = prev.find(c => c.id === candidature.id);
      if (exists) return prev.map(c => c.id === candidature.id ? candidature : c);
      return [candidature, ...prev];
    });
    setEditTarget(null);
  }

  function openEdit(cand) {
    // Reconstruct a pseudo-establishment for the modal
    setEditTarget({
      candidature: cand,
      establishment: {
        id: cand.establishment_id,
        name: cand.establishment_name,
        city: cand.establishment_city,
        canton: cand.establishment_canton,
        director: cand.director_name,
        specialty: cand.specialty,
        category: '',
      },
    });
  }

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
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight mb-2">Candidatures</h1>
          <p className="text-gray-500 text-[15px]">{candidatures.length} candidature{candidatures.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Desktop table */}
      <Card className="!p-0 hidden md:block">
        <div className="grid grid-cols-[2fr_1.2fr_1.2fr_100px_130px_120px] px-6 py-[18px] border-b border-gray-100 text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
          <div>Établissement</div>
          <div>Spécialité</div>
          <div>Directeur</div>
          <div>Date</div>
          <div>Statut</div>
          <div></div>
        </div>
        {candidatures.map((cand, i) => (
          <div
            key={cand.id}
            className={`grid grid-cols-[2fr_1.2fr_1.2fr_100px_130px_120px] px-6 py-[18px] items-center text-sm transition-colors hover:bg-gray-50 ${
              i < candidatures.length - 1 ? 'border-b border-gray-100' : ''
            }`}
          >
            <div className="min-w-0">
              <div className="font-semibold truncate">{cand.establishment_name}</div>
              <div className="text-[13px] text-gray-400">{cand.establishment_city}{cand.establishment_canton ? ` (${cand.establishment_canton})` : ''}</div>
            </div>
            <div className="text-gray-600 text-[13px] truncate">{cand.specialty || '—'}</div>
            <div className="text-gray-600 text-[13px] truncate">{cand.director_name || '—'}</div>
            <div className="text-gray-400 text-[13px]">{formatDate(cand.created_at)}</div>
            <div>
              <StatusDropdown candidature={cand} onUpdate={handleUpdate} />
            </div>
            <div className="flex gap-1.5 justify-end">
              {cand.status === 'draft' && (
                <Button variant="ghost" size="small" onClick={() => openEdit(cand)} icon={<Icon.Edit size={14} />}>
                  Modifier
                </Button>
              )}
              <button
                onClick={() => setDeleteConfirm(cand.id)}
                className="text-gray-400 hover:text-red-500 p-2 cursor-pointer"
                title="Supprimer"
              >
                <Icon.Trash size={15} />
              </button>
            </div>
          </div>
        ))}
      </Card>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {candidatures.map((cand) => {
          const status = statusConfig[cand.status] || statusConfig.draft;
          return (
            <Card key={cand.id}>
              <div className="flex justify-between items-start mb-2">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{cand.establishment_name}</div>
                  <div className="text-[13px] text-gray-400">{cand.establishment_city}{cand.establishment_canton ? ` (${cand.establishment_canton})` : ''}</div>
                </div>
                <StatusDropdown candidature={cand} onUpdate={handleUpdate} />
              </div>
              <div className="flex items-center justify-between text-[13px] mb-3">
                <span className="text-gray-600">{cand.specialty}</span>
                <span className="text-gray-400">{formatDate(cand.created_at)}</span>
              </div>
              <div className="flex gap-2">
                {cand.status === 'draft' && (
                  <Button variant="secondary" size="small" onClick={() => openEdit(cand)} icon={<Icon.Edit size={14} />}>
                    Modifier
                  </Button>
                )}
                <button
                  onClick={() => setDeleteConfirm(cand.id)}
                  className="text-gray-400 hover:text-red-500 p-2 cursor-pointer"
                  title="Supprimer"
                >
                  <Icon.Trash size={15} />
                </button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div
          className="animate-fade fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
          onClick={() => setDeleteConfirm(null)}
        >
          <Card className="animate-scale max-w-[400px] w-full" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="w-12 h-12 bg-error-bg rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon.Trash size={20} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold mb-2">Supprimer la candidature ?</h3>
              <p className="text-gray-500 text-sm mb-6">Cette action est irréversible.</p>
              <div className="flex gap-3 justify-center">
                <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Annuler</Button>
                <Button
                  className="!bg-red-500 hover:!bg-red-600 !shadow-none"
                  onClick={() => handleDelete(deleteConfirm)}
                  icon={<Icon.Trash size={16} />}
                >
                  Supprimer
                </Button>
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
