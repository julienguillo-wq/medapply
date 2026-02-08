import { useState } from 'react';
import Card from './Card';
import Badge from './Badge';
import Button from './Button';
import { Icon } from './Icons';
import EstablishmentCard from './EstablishmentCard';
import { getEmail, saveManualEmail } from '../services/siwfService';

const PAGE_SIZE = 20;

function cleanDirector(name) {
  if (!name) return '—';
  return name.replace(/^(Herr|Frau)\s+/i, '');
}

function EmailCell({ establishment }) {
  const [editing, setEditing] = useState(false);
  const [emailInfo, setEmailInfo] = useState(() => getEmail(establishment));
  const [draft, setDraft] = useState('');

  const startEdit = () => {
    setDraft(emailInfo.email || '');
    setEditing(true);
  };

  const saveEdit = () => {
    const trimmed = draft.trim();
    saveManualEmail(establishment.id, trimmed);
    setEmailInfo(trimmed ? { email: trimmed, source: 'manual' } : getEmail(establishment));
    setEditing(false);
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
        />
        <button onClick={saveEdit} className="text-primary hover:text-primary-dark cursor-pointer">
          <Icon.Check size={14} />
        </button>
        <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
          <Icon.X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {emailInfo.email ? (
        <>
          <a href={`mailto:${emailInfo.email}`} className="text-primary hover:underline text-xs break-all leading-tight">
            {emailInfo.email}
          </a>
          {emailInfo.source === 'pattern' && (
            <span className="text-[11px] text-gray-400 shrink-0">(suggéré)</span>
          )}
        </>
      ) : (
        <span className="text-gray-400 text-[13px]">—</span>
      )}
      <button
        onClick={startEdit}
        className="text-gray-400 hover:text-primary shrink-0 cursor-pointer"
        title="Modifier l'email"
      >
        <Icon.Edit size={13} />
      </button>
    </div>
  );
}

export default function EstablishmentList({ establishments }) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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
      </div>

      {/* Desktop table */}
      <Card className="!p-0 hidden md:block">
        <div className="grid grid-cols-[2fr_1.5fr_1fr_1.5fr_1.5fr_60px] px-6 py-[18px] border-b border-gray-100 text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
          <div>Établissement</div>
          <div>Spécialité</div>
          <div>Catégorie</div>
          <div>Directeur</div>
          <div>Contact</div>
          <div></div>
        </div>
        {visible.map((est, i) => (
          <div
            key={est.id}
            className={`grid grid-cols-[2fr_1.5fr_1fr_1.5fr_1.5fr_60px] px-6 py-[18px] items-center text-sm transition-colors hover:bg-gray-50 ${
              i < visible.length - 1 ? 'border-b border-gray-100' : ''
            }`}
          >
            <div className="min-w-0">
              <div className="font-semibold truncate">{est.name}</div>
              <div className="text-[13px] text-gray-400">{est.city}{est.canton ? ` (${est.canton})` : ''}</div>
            </div>
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
        ))}
      </Card>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {visible.map((est) => (
          <EstablishmentCard key={est.id} establishment={est} />
        ))}
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
    </div>
  );
}
