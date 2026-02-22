import { useState } from 'react';
import Card from './Card';
import Badge from './Badge';
import Button from './Button';
import { Icon } from './Icons';
import EstablishmentCard from './EstablishmentCard';
import ApplicationModal from './ApplicationModal';
import { getEmail, cleanDirector } from '../services/siwfService';
import { updateEstablishmentEmail } from '../services/emailValidationService';
import { useAuth } from '../contexts/AuthContext';
import EmailStatusBadge from './EmailStatusBadge';
import CompatibilityBadge from './CompatibilityBadge';

const PAGE_SIZE = 20;

function EmailCell({ establishment }) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [emailInfo, setEmailInfo] = useState(() => getEmail(establishment));
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setDraft(emailInfo.email || '');
    setEditing(true);
  };

  const saveEdit = async () => {
    const trimmed = draft.trim();
    setSaving(true);
    try {
      await updateEstablishmentEmail({
        establishmentId: establishment.id,
        email: trimmed,
        userId: user?.id,
      });
      setEmailInfo(trimmed
        ? { email: trimmed, source: 'manual', status: 'manually_verified', bounceCount: 0 }
        : getEmail(establishment)
      );
    } catch {
      setEmailInfo(trimmed
        ? { email: trimmed, source: 'manual', status: 'manually_verified', bounceCount: 0 }
        : getEmail(establishment)
      );
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="flex gap-1.5 items-center">
        <input
          type="email"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveEdit();
            if (e.key === 'Escape') setEditing(false);
          }}
          className="w-full px-2 py-1 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-primary"
          placeholder="email@exemple.ch"
          autoFocus
          disabled={saving}
        />
        <button onClick={saveEdit} className="text-primary hover:text-primary-dark cursor-pointer" disabled={saving}>
          <Icon.Check size={14} />
        </button>
        <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer" disabled={saving}>
          <Icon.X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <EmailStatusBadge status={emailInfo.status} compact />
      {emailInfo.email ? (
        <a href={`mailto:${emailInfo.email}`} className="text-primary hover:underline text-xs break-all leading-tight">
          {emailInfo.email}
        </a>
      ) : (
        <span className="text-gray-400 text-[13px]">—</span>
      )}
      {emailInfo.status !== 'validated' && emailInfo.status !== 'manually_verified' && (
        emailInfo.status === 'invalid' ? (
          <button
            onClick={startEdit}
            className="text-red-500 hover:text-red-700 shrink-0 cursor-pointer text-[11px] font-medium"
            title="Corriger l'email invalide"
          >
            Corriger
          </button>
        ) : (
          <button
            onClick={startEdit}
            className="text-gray-400 hover:text-primary shrink-0 cursor-pointer"
            title="Modifier l'email"
          >
            <Icon.Edit size={13} />
          </button>
        )
      )}
    </div>
  );
}

export default function EstablishmentList({ establishments, selectionMode = false, selectedIds, onToggleSelect, onSelectAll, onDeselectAll }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [applyTarget, setApplyTarget] = useState(null);

  const visible = establishments.slice(0, visibleCount);
  const hasMore = visibleCount < establishments.length;

  if (establishments.length === 0) {
    return (
      <Card className="text-center py-12">
        <Icon.Building size={40} className="mx-auto text-gray-300 mb-4" />
        <div className="text-gray-500 text-[15px] font-medium mb-1">Aucun établissement trouvé</div>
        <div className="text-gray-400 text-[13px]">Essayez d&apos;élargir vos critères de recherche</div>
      </Card>
    );
  }

  const hasScores = establishments.length > 0 && establishments[0]._score != null;
  const allVisibleSelected = selectionMode && visible.every(e => selectedIds?.has(e.id));
  const someSelected = selectionMode && selectedIds?.size > 0;

  const siwfUrl = (id) =>
    `https://register.siwf.ch/SiwfRegister/Detail/${id}?suchDatum=${new Date().toISOString().split('T')[0]}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon.Building size={18} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-700">
            {establishments.length} établissement{establishments.length > 1 ? 's' : ''} trouvé{establishments.length > 1 ? 's' : ''}
          </span>
        </div>
        {selectionMode && (
          <div className="flex items-center gap-3">
            {someSelected && (
              <span className="text-sm font-medium text-primary">
                {selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={allVisibleSelected ? onDeselectAll : onSelectAll}
              className="text-[13px] font-medium text-gray-600 hover:text-primary cursor-pointer flex items-center gap-1.5"
            >
              {allVisibleSelected ? (
                <><Icon.MinusSquare size={16} /> Tout désélectionner</>
              ) : (
                <><Icon.CheckSquare size={16} /> Tout sélectionner</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Desktop table */}
      <Card className="!p-0 hidden md:block">
        <div className={`grid ${selectionMode ? (hasScores ? 'grid-cols-[36px_2fr_64px_1.5fr_0.8fr_1.2fr_1.5fr_70px_48px]' : 'grid-cols-[36px_2fr_1.5fr_0.8fr_1.5fr_1.5fr_80px_60px]') : (hasScores ? 'grid-cols-[2fr_64px_1.5fr_0.8fr_1.2fr_1.5fr_70px_48px]' : 'grid-cols-[2fr_1.5fr_0.8fr_1.5fr_1.5fr_80px_60px]')} px-6 py-[18px] border-b border-gray-100 text-[11px] text-gray-400 uppercase tracking-wider font-semibold`}>
          {selectionMode && <div></div>}
          <div>Établissement</div>
          {hasScores && <div className="text-center">Match</div>}
          <div>Spécialité</div>
          <div>Catégorie</div>
          <div>Directeur</div>
          <div>Contact</div>
          <div></div>
          <div></div>
        </div>
        {visible.map((est, i) => {
          const isSelected = selectionMode && selectedIds?.has(est.id);
          return (
            <div
              key={est.id}
              className={`grid ${selectionMode ? (hasScores ? 'grid-cols-[36px_2fr_64px_1.5fr_0.8fr_1.2fr_1.5fr_70px_48px]' : 'grid-cols-[36px_2fr_1.5fr_0.8fr_1.5fr_1.5fr_80px_60px]') : (hasScores ? 'grid-cols-[2fr_64px_1.5fr_0.8fr_1.2fr_1.5fr_70px_48px]' : 'grid-cols-[2fr_1.5fr_0.8fr_1.5fr_1.5fr_80px_60px]')} px-6 py-[18px] items-center text-sm transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'} ${
                i < visible.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              {selectionMode && (
                <div>
                  <button
                    onClick={() => onToggleSelect(est.id)}
                    className="cursor-pointer text-gray-400 hover:text-primary"
                  >
                    {isSelected ? (
                      <Icon.CheckSquare size={18} className="text-primary" />
                    ) : (
                      <Icon.Square size={18} />
                    )}
                  </button>
                </div>
              )}
              <div className="min-w-0">
                <div className="font-semibold truncate flex items-center gap-1.5">
                  {est.name}
                  {est.setting === 'hospitalier' && <span title="Hospitalier" className="text-[11px] shrink-0">{'\uD83C\uDFE5'}</span>}
                  {est.setting === 'ambulatoire' && <span title="Ambulatoire" className="text-[11px] shrink-0">{'\uD83C\uDFE2'}</span>}
                </div>
                <div className="text-[13px] text-gray-400">{est.city}{est.canton ? ` (${est.canton})` : ''}</div>
              </div>
              {hasScores && (
                <div className="flex justify-center">
                  {est._score != null ? <CompatibilityBadge score={est._score} /> : <span className="text-gray-300 text-[11px]">—</span>}
                </div>
              )}
              <div className="text-gray-600 text-[13px] truncate">{est.specialty || '—'}</div>
              <div>
                {est.category ? (
                  <Badge>{est.category}</Badge>
                ) : (
                  <span className="text-gray-400 text-[13px]">—</span>
                )}
              </div>
              <div className="text-gray-600 text-[13px]">{cleanDirector(est.director)}</div>
              <div className="min-w-0">
                <EmailCell establishment={est} />
              </div>
              <div className="text-center">
                <button
                  onClick={() => setApplyTarget(est)}
                  className="text-primary hover:underline text-[13px] font-medium cursor-pointer"
                >
                  Postuler
                </button>
              </div>
              <div className="text-right">
                <a
                  href={siwfUrl(est.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-primary inline-flex"
                  title="Fiche SIWF"
                >
                  <Icon.ExternalLink size={16} />
                </a>
              </div>
            </div>
          );
        })}
      </Card>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {visible.map((est) => {
          const isSelected = selectionMode && selectedIds?.has(est.id);
          return (
            <div key={est.id} className="relative">
              {selectionMode && (
                <button
                  onClick={() => onToggleSelect(est.id)}
                  className={`absolute top-3 left-3 z-10 cursor-pointer ${isSelected ? 'text-primary' : 'text-gray-400'}`}
                >
                  {isSelected ? <Icon.CheckSquare size={20} /> : <Icon.Square size={20} />}
                </button>
              )}
              <div className={selectionMode ? 'pl-8' : ''}>
                <EstablishmentCard
                  establishment={est}
                  onApply={() => setApplyTarget(est)}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="text-center mt-6">
          <Button
            variant="secondary"
            onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
          >
            Afficher plus ({establishments.length - visibleCount} restants)
          </Button>
        </div>
      )}

      {/* Application Modal */}
      {applyTarget && (
        <ApplicationModal
          establishment={applyTarget}
          onClose={() => setApplyTarget(null)}
          onSaved={() => setApplyTarget(null)}
        />
      )}
    </div>
  );
}
