import { useState } from 'react';
import Badge from './Badge';
import { Icon } from './Icons';
import { getEmail, saveManualEmail } from '../services/siwfService';

export default function EstablishmentCard({ establishment }) {
  const { id, name, city, canton, specialty, category, director, homepage } = establishment;
  const [editing, setEditing] = useState(false);
  const [emailInfo, setEmailInfo] = useState(() => getEmail(establishment));
  const [draft, setDraft] = useState('');

  const siwfUrl = `https://register.siwf.ch/SiwfRegister/Detail/${id}?suchDatum=${new Date().toISOString().split('T')[0]}`;

  const startEdit = () => {
    setDraft(emailInfo.email || '');
    setEditing(true);
  };

  const saveEdit = () => {
    const trimmed = draft.trim();
    saveManualEmail(id, trimmed);
    setEmailInfo(trimmed ? { email: trimmed, source: 'manual' } : getEmail(establishment));
    setEditing(false);
  };

  const cancelEdit = () => setEditing(false);

  return (
    <div className="p-4 border border-gray-100 rounded-xl bg-white">
      <div className="flex justify-between items-start mb-2">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm truncate">{name}</div>
          <div className="text-[13px] text-gray-400">{city}{canton ? ` (${canton})` : ''}</div>
        </div>
        <a
          href={siwfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-primary shrink-0 ml-2"
          title="Fiche SIWF"
        >
          <Icon.ExternalLink size={16} />
        </a>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {specialty && <Badge variant="primary">{specialty}</Badge>}
        {category && <Badge>{category}</Badge>}
      </div>

      {director && (
        <div className="text-[13px] text-gray-600 mb-2">
          <span className="text-gray-400">Directeur : </span>{director}
        </div>
      )}

      {/* Email */}
      <div className="text-[13px]">
        {editing ? (
          <div className="flex gap-2 items-center">
            <input
              type="email"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
              className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-primary"
              placeholder="email@exemple.ch"
              autoFocus
            />
            <button onClick={saveEdit} className="text-primary hover:text-primary-dark cursor-pointer">
              <Icon.Check size={16} />
            </button>
            <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600 cursor-pointer">
              <Icon.X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {emailInfo.email ? (
              <>
                <Icon.Mail size={14} className="text-gray-400 shrink-0" />
                <a href={`mailto:${emailInfo.email}`} className="text-primary hover:underline truncate">
                  {emailInfo.email}
                </a>
                {emailInfo.source === 'pattern' && (
                  <span className="text-[11px] text-gray-400">(suggéré)</span>
                )}
              </>
            ) : (
              <span className="text-gray-400">Pas d&apos;email</span>
            )}
            <button
              onClick={startEdit}
              className="text-gray-400 hover:text-primary shrink-0 cursor-pointer"
              title="Modifier l'email"
            >
              <Icon.Edit size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
