import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { Icon } from '../../../components/Icons';
import { ONBOARDING_DOCUMENTS } from './constants';

const STATUS_OPTIONS = [
  { value: 'has', label: 'J\'ai', icon: '✅' },
  { value: 'missing', label: 'À obtenir', icon: '📋' },
  { value: 'docstart', label: 'DocStart', icon: '🤝' },
];

export default function PhaseDocuments({ data, errors, onChange, onNext, onBack }) {
  const docs = data || {};
  const setDoc = (id, val) => onChange({ ...docs, [id]: val });

  const counts = {
    has: Object.values(docs).filter(v => v === 'has').length,
    missing: Object.values(docs).filter(v => v === 'missing').length,
    docstart: Object.values(docs).filter(v => v === 'docstart').length,
  };

  const hasDocStart = counts.docstart > 0;
  const hasCasierDocStart = docs.casier_judiciaire === 'docstart';

  return (
    <div className="max-w-2xl">
      <Card className="animate-slide">
        <h2 className="text-lg font-semibold mb-2">Documents disponibles</h2>
        <p className="text-sm text-gray-500 mb-6">
          Pour chaque document, indiquez si vous l'avez déjà, s'il est à obtenir, ou si vous souhaitez que DocStart s'en charge.
        </p>

        <div className="flex flex-col gap-3">
          {ONBOARDING_DOCUMENTS.map(doc => (
            <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 bg-gray-50 rounded-xl">
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-800">{doc.name}</span>
                {doc.note && <span className="text-xs text-gray-400 ml-1.5">({doc.note})</span>}
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                {STATUS_OPTIONS.map(opt => {
                  const selected = docs[doc.id] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDoc(doc.id, opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                        selected
                          ? opt.value === 'has' ? 'bg-green-100 text-green-700 border border-green-300'
                          : opt.value === 'missing' ? 'bg-amber-100 text-amber-700 border border-amber-300'
                          : 'bg-install-bg text-install border border-install/30'
                          : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {opt.icon} {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Counter */}
        <div className="flex flex-wrap gap-3 mt-6 p-4 bg-gray-50 rounded-xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
            ✅ {counts.has} prêts
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
            📋 {counts.missing} à obtenir
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-install-bg text-install">
            🤝 {counts.docstart} DocStart
          </span>
        </div>

        {/* DocStart notice */}
        {hasDocStart && (
          <div className="mt-4 p-4 bg-install-bg/50 border border-install/20 rounded-xl">
            <div className="flex gap-3">
              <Icon.FileText size={18} className="text-install flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-install">Procuration DocStart</p>
                <p className="text-xs text-gray-600 mt-1">
                  Pour les documents confiés à DocStart, une procuration vous sera envoyée à signer après validation de votre dossier.
                </p>
              </div>
            </div>
          </div>
        )}

        {hasCasierDocStart && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs text-amber-700">
              <strong>Note :</strong> L'extrait de casier judiciaire doit être récent (moins de 3 mois). DocStart s'occupera de la demande dans les délais requis.
            </p>
          </div>
        )}

        {errors._global && (
          <p className="mt-4 text-sm text-red-500">{errors._global}</p>
        )}

        <p className="mt-4 text-xs text-gray-400">
          Le CV médical détaillé est automatiquement inclus et sera généré à partir de votre profil MedApply.
        </p>

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer">
            <Icon.ChevronRight size={14} className="rotate-180" />
            Retour
          </button>
          <Button variant="install" onClick={onNext} icon={<Icon.Arrow size={16} />}>
            Suivant
          </Button>
        </div>
      </Card>
    </div>
  );
}
