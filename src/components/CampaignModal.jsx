import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from './Card';
import Button from './Button';
import Badge from './Badge';
import { Icon } from './Icons';
import { useAuth } from '../contexts/AuthContext';
import { getEmail, cleanDirector } from '../services/siwfService';
import EmailStatusBadge from './EmailStatusBadge';
import CompatibilityBadge from './CompatibilityBadge';
import { createCampaign } from '../services/campaignService';

export default function CampaignModal({ establishments, onClose, onCreated }) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [excludedIds, setExcludedIds] = useState(new Set());
  const [sendPerDay, setSendPerDay] = useState(5);
  const [sendHour, setSendHour] = useState('08:00');
  const [campaignName, setCampaignName] = useState(
    `Campagne ${new Date().toLocaleDateString('fr-CH', { month: 'long', year: 'numeric' })}`
  );
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const included = useMemo(
    () => establishments.filter(e => !excludedIds.has(e.id)),
    [establishments, excludedIds]
  );

  const enriched = useMemo(
    () => included.map(est => {
      const emailInfo = getEmail(est);
      return { ...est, emailInfo, directorClean: cleanDirector(est.director) };
    }),
    [included]
  );

  const suggestedCount = enriched.filter(e => e.emailInfo.status === 'suggested').length;
  const noEmailCount = enriched.filter(e => !e.emailInfo.email).length;
  const daysEstimate = Math.ceil(enriched.length / sendPerDay);

  const toggleExclude = (id) => {
    setExcludedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  async function handleCreate() {
    if (enriched.length === 0) return;
    setCreating(true);
    setError(null);

    try {
      const items = enriched.map(est => ({
        establishmentId: String(est.id),
        establishmentName: est.name,
        establishmentCity: est.city || '',
        establishmentCanton: est.canton || '',
        directorName: est.directorClean,
        directorEmail: est.emailInfo.email || '',
        specialty: est.specialty || '',
      }));

      await createCampaign({
        name: campaignName,
        sendPerDay,
        sendHour,
        items,
        userId: user.id,
      });

      onCreated();
      navigate('/campagnes');
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div
      className="animate-fade fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 md:p-10"
      onClick={onClose}
    >
      <Card
        className="animate-scale max-w-[720px] w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-5">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Icon.Layers size={22} className="text-primary" />
              Lancer une campagne
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              Envoi groupé échelonné de candidatures
            </p>
          </div>
          <button onClick={onClose} className="bg-gray-100 rounded-[10px] p-2.5 cursor-pointer shrink-0 ml-3">
            <Icon.X size={18} />
          </button>
        </div>

        {/* Campaign name */}
        <div className="mb-5">
          <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Nom de la campagne</label>
          <input
            type="text"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Send rate slider */}
        <div className="mb-5">
          <label className="text-sm font-semibold text-gray-700 mb-3 block">Envois par jour</label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={2}
              max={10}
              value={sendPerDay}
              onChange={(e) => setSendPerDay(Number(e.target.value))}
              className="flex-1 h-2 rounded-full appearance-none cursor-pointer accent-primary bg-gray-200"
            />
            <span className="text-2xl font-[800] text-primary w-10 text-center shrink-0">{sendPerDay}</span>
          </div>
          <p className={`text-[13px] mt-2 ${
            sendPerDay <= 5 ? 'text-emerald-600' : sendPerDay <= 8 ? 'text-amber-600' : 'text-red-600'
          }`}>
            {sendPerDay <= 5
              ? '\u{1F7E2} Rythme sûr — aucun risque pour votre compte'
              : sendPerDay <= 8
                ? '\u{1F7E1} Rythme modéré — recommandé pour les comptes actifs'
                : '\u{1F534} Rythme élevé — surveillez votre boîte d\u2019envoi'}
          </p>
          <p className="text-[12px] text-gray-400 mt-1">
            {enriched.length} candidature{enriched.length > 1 ? 's' : ''} restante{enriched.length > 1 ? 's' : ''} — envoi terminé dans ~{daysEstimate} jour{daysEstimate > 1 ? 's' : ''}
          </p>
        </div>

        {/* Send hour */}
        <div className="mb-5">
          <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Heure d&apos;envoi quotidien</label>
          <select
            value={sendHour}
            onChange={(e) => setSendHour(e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary transition-colors cursor-pointer bg-white"
          >
            {Array.from({ length: 23 }, (_, i) => {
              const h = 7 + Math.floor(i / 2);
              const m = i % 2 === 0 ? '00' : '30';
              const val = `${String(h).padStart(2, '0')}:${m}`;
              return <option key={val} value={val}>{val}</option>;
            })}
          </select>
          <p className="text-[12px] text-gray-400 mt-1.5">
            Les mails envoyés entre 8h et 10h ont le meilleur taux d&apos;ouverture
          </p>
        </div>

        {/* Warnings */}
        {suggestedCount > 0 && (
          <div className="flex items-start gap-2 mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
            <Icon.AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[13px] text-amber-700">
              {suggestedCount} email{suggestedCount > 1 ? 's' : ''} n&apos;{suggestedCount > 1 ? 'ont' : 'a'} pas été vérifié{suggestedCount > 1 ? 's' : ''}
            </p>
          </div>
        )}
        {noEmailCount > 0 && (
          <div className="flex items-start gap-2 mb-4 p-3 bg-red-50 border border-red-100 rounded-xl">
            <Icon.AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-[13px] text-red-700">
              {noEmailCount} établissement{noEmailCount > 1 ? 's' : ''} sans email — ils seront ignorés lors de l&apos;envoi
            </p>
          </div>
        )}

        {/* Establishments list */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Établissements ({enriched.length})</span>
            {excludedIds.size > 0 && (
              <button
                onClick={() => setExcludedIds(new Set())}
                className="text-[13px] text-primary hover:underline cursor-pointer"
              >
                Tout réinclure ({excludedIds.size} exclu{excludedIds.size > 1 ? 's' : ''})
              </button>
            )}
          </div>
          <div className="border border-gray-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
            {establishments.map((est, i) => {
              const emailInfo = getEmail(est);
              const director = cleanDirector(est.director);
              const isExcluded = excludedIds.has(est.id);

              return (
                <div
                  key={est.id}
                  className={`flex items-center gap-3 px-4 py-3 text-sm ${
                    i < establishments.length - 1 ? 'border-b border-gray-100' : ''
                  } ${isExcluded ? 'opacity-40 bg-gray-50' : ''}`}
                >
                  <button
                    onClick={() => toggleExclude(est.id)}
                    className="cursor-pointer shrink-0"
                  >
                    {isExcluded ? (
                      <Icon.Square size={18} className="text-gray-400" />
                    ) : (
                      <Icon.CheckSquare size={18} className="text-primary" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{est.name}</div>
                    <div className="text-[12px] text-gray-400 flex items-center gap-2 flex-wrap">
                      {director && <span>{director}</span>}
                      {emailInfo.email && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <EmailStatusBadge status={emailInfo.status} compact />
                            {emailInfo.email}
                          </span>
                        </>
                      )}
                      {!emailInfo.email && <span className="text-red-400">Pas d&apos;email</span>}
                    </div>
                  </div>
                  {est._score != null && (
                    <div className="shrink-0">
                      <CompatibilityBadge score={est._score} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 flex items-center gap-2">
            <Icon.X size={16} />
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1" disabled={creating}>
            Annuler
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating || enriched.length === 0 || !campaignName.trim()}
            icon={<Icon.Layers size={16} />}
            className="flex-1"
          >
            {creating ? 'Création...' : 'Lancer la campagne'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
