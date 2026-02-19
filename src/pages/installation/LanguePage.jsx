import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { Icon } from '../../components/Icons';
import TipCard from '../../components/TipCard';
import ResourceCard from '../../components/ResourceCard';
import StepChecklist from '../../components/StepChecklist';

const FR_CANTONS = ['VD', 'GE', 'NE', 'JU', 'FR', 'VS'];
const DE_CANTONS = ['ZH', 'BE', 'BS', 'BL', 'LU', 'SG', 'AG', 'SO', 'ZG', 'SZ', 'NW', 'OW', 'UR', 'GL', 'SH', 'AR', 'AI', 'TG', 'GR'];
const IT_CANTONS = ['TI'];

function guessLanguage(targetCantons) {
  if (!targetCantons?.length) return '';
  let fr = 0, de = 0, it = 0;
  for (const c of targetCantons) {
    if (FR_CANTONS.includes(c)) fr++;
    else if (IT_CANTONS.includes(c)) it++;
    else if (DE_CANTONS.includes(c)) de++;
  }
  if (it >= fr && it >= de && it > 0) return 'Italien';
  if (de > fr) return 'Allemand';
  if (fr > 0) return 'Français';
  return '';
}

const LANGUAGE_REQUIREMENTS = [
  { canton: 'Vaud', language: 'Français', level: 'B2' },
  { canton: 'Genève', language: 'Français', level: 'B2' },
  { canton: 'Fribourg', language: 'Français / Allemand', level: 'B2' },
  { canton: 'Valais', language: 'Français / Allemand', level: 'B2' },
  { canton: 'Neuchâtel', language: 'Français', level: 'B2' },
  { canton: 'Jura', language: 'Français', level: 'B2' },
  { canton: 'Berne', language: 'Allemand / Français', level: 'B2' },
  { canton: 'Zurich', language: 'Allemand', level: 'C1' },
  { canton: 'Bâle-Ville', language: 'Allemand', level: 'B2' },
  { canton: 'Bâle-Campagne', language: 'Allemand', level: 'B2' },
  { canton: 'Lucerne', language: 'Allemand', level: 'B2' },
  { canton: 'Saint-Gall', language: 'Allemand', level: 'B2' },
  { canton: 'Argovie', language: 'Allemand', level: 'B2' },
  { canton: 'Tessin', language: 'Italien', level: 'B2' },
];

const EXAM_CENTERS = {
  francais: [
    { name: 'Alliance Française', description: 'DELF/DALF — Centres en Suisse romande', url: 'https://www.alliancefrancaise.ch', iconBg: 'bg-blue-100', iconText: 'text-blue-600' },
    { name: 'Centre DELF-DALF Suisse', description: 'Certificats officiels de français', url: 'https://delfdalf.ch', iconBg: 'bg-indigo-100', iconText: 'text-indigo-600' },
  ],
  allemand: [
    { name: 'Goethe-Institut', description: 'Certificats B2/C1 en allemand', url: 'https://www.goethe.de/ins/ch/fr/index.html', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600' },
    { name: 'telc', description: 'Certificats telc Deutsch B2/C1 Medizin', url: 'https://www.telc.net', iconBg: 'bg-amber-100', iconText: 'text-amber-600' },
    { name: 'ÖSD', description: 'Diplômes autrichiens d\'allemand', url: 'https://www.osd.at', iconBg: 'bg-red-100', iconText: 'text-red-600' },
  ],
  italien: [
    { name: 'CELI / CILS', description: 'Certificats officiels d\'italien', url: 'https://www.unistrapg.it/celi', iconBg: 'bg-green-100', iconText: 'text-green-600' },
  ],
};

export default function LanguePage() {
  const { state, update } = useOutletContext();
  const langue = state.langue;
  const selectedPlan = state.diagnostic.service?.selectedPlan || '';
  const targetCantons = state.diagnostic.career?.targetCantons || [];
  const isConfortOrPremium = selectedPlan === 'confort' || selectedPlan === 'premium';
  const isEssentiel = selectedPlan === 'essentiel';
  const planLabel = selectedPlan === 'premium' ? 'Premium' : 'Confort';

  const [inscription, setInscription] = useState(() => ({
    langue: langue.inscriptionLangue || guessLanguage(targetCantons),
    niveau: langue.inscriptionNiveau || 'B2',
    ville: langue.inscriptionVille || '',
    periode: langue.inscriptionPeriode || '',
  }));
  const [inscriptionSent, setInscriptionSent] = useState(!!langue.inscriptionSent);

  const handleInscriptionSubmit = () => {
    update('langue', {
      ...langue,
      inscriptionLangue: inscription.langue,
      inscriptionNiveau: inscription.niveau,
      inscriptionVille: inscription.ville,
      inscriptionPeriode: inscription.periode,
      inscriptionSent: true,
    });
    setInscriptionSent(true);
  };

  const handleToggle = (field) => {
    update('langue', { ...langue, [field]: !langue[field] });
  };

  const handleChange = (field, value) => {
    update('langue', { ...langue, [field]: value });
  };

  const checklistItems = [
    {
      id: 'testPassed',
      label: 'Test de langue passé',
      description: 'Date et résultat du test',
      checked: langue.testPassed,
      showDate: true,
      date: langue.testDate,
      showNotes: true,
      notes: langue.testResult,
    },
    {
      id: 'certificateUploaded',
      label: 'Certificat uploadé',
      description: 'Uploadez le certificat dans les Documents',
      checked: langue.certificateUploaded,
    },
  ];

  const handleCheckToggle = (id) => {
    handleToggle(id);
  };

  const handleDateChange = (id, value) => {
    if (id === 'testPassed') handleChange('testDate', value);
  };

  const handleNotesChange = (id, value) => {
    if (id === 'testPassed') handleChange('testResult', value);
  };

  return (
    <div className="animate-fade">
      <div className="mb-8">
        <h1 className="text-2xl md:text-[28px] font-bold tracking-tight mb-2">Test de langue</h1>
        <p className="text-gray-500 text-[15px]">Orientation et suivi de votre certification linguistique</p>
      </div>

      {/* DocStart section */}
      {isConfortOrPremium && (
        <Card className="mb-6 animate-slide border-install/30 bg-install-bg/10">
          <div className="flex items-start gap-3 mb-4">
            <span className="text-xl">🎯</span>
            <div>
              <p className="text-sm font-medium text-gray-800">
                Inclus dans votre pack <strong className="text-install">{planLabel}</strong> : nous trouvons le centre d'examen le plus proche, nous vous inscrivons et nous vous envoyons toutes les informations pratiques.
              </p>
            </div>
          </div>

          {inscriptionSent ? (
            <div className="flex items-start gap-3 p-4 bg-install-bg rounded-xl">
              <span className="text-lg">✅</span>
              <p className="text-sm text-install font-medium">
                Nous recherchons les prochaines sessions disponibles et revenons vers vous sous 48h.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Langue souhaitée</label>
                <select
                  value={inscription.langue}
                  onChange={e => setInscription(p => ({ ...p, langue: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-install focus:ring-1 focus:ring-install/20 bg-white"
                >
                  <option value="">Sélectionner...</option>
                  <option value="Français">Français</option>
                  <option value="Allemand">Allemand</option>
                  <option value="Italien">Italien</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Niveau visé</label>
                <select
                  value={inscription.niveau}
                  onChange={e => setInscription(p => ({ ...p, niveau: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-install focus:ring-1 focus:ring-install/20 bg-white"
                >
                  <option value="B2">B2</option>
                  <option value="C1">C1</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Ville préférée pour le test</label>
                <input
                  type="text"
                  value={inscription.ville}
                  onChange={e => setInscription(p => ({ ...p, ville: e.target.value }))}
                  placeholder="Ex: Lausanne, Genève..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-install focus:ring-1 focus:ring-install/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Période souhaitée</label>
                <select
                  value={inscription.periode}
                  onChange={e => setInscription(p => ({ ...p, periode: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-install focus:ring-1 focus:ring-install/20 bg-white"
                >
                  <option value="">Sélectionner...</option>
                  <option value="asap">Dès que possible</option>
                  <option value="1month">Dans 1 mois</option>
                  <option value="2-3months">Dans 2-3 mois</option>
                  <option value="flexible">Flexible</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <Button variant="install" onClick={handleInscriptionSubmit} disabled={!inscription.langue || !inscription.periode}>
                  Demander l'inscription
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {isEssentiel && (
        <Card className="mb-6 animate-slide border-amber-200/50 bg-amber-50/30">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <span className="text-xl">💡</span>
              <p className="text-sm text-gray-700">
                Besoin d'aide pour vous inscrire ? Ajoutez l'option inscription test de langue pour <strong>150 CHF</strong>.
              </p>
            </div>
            <Button variant="secondary" size="small" onClick={() => {
              update('langue', { ...langue, optionInscription: true });
            }}>
              {langue.optionInscription ? '✅ Option ajoutée' : 'Ajouter'}
            </Button>
          </div>
        </Card>
      )}

      {/* Section 1: Niveau requis */}
      <Card className="mb-6 animate-slide">
        <h2 className="text-base font-semibold mb-1">Niveau requis par canton</h2>
        <p className="text-sm text-gray-400 mb-4">Le niveau minimum varie selon le canton où vous souhaitez exercer</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2.5 pr-4 text-xs font-bold text-gray-400 uppercase tracking-wide">Canton</th>
                <th className="text-left py-2.5 pr-4 text-xs font-bold text-gray-400 uppercase tracking-wide">Langue</th>
                <th className="text-left py-2.5 text-xs font-bold text-gray-400 uppercase tracking-wide">Niveau</th>
              </tr>
            </thead>
            <tbody>
              {LANGUAGE_REQUIREMENTS.map((req) => (
                <tr key={req.canton} className="border-b border-gray-100">
                  <td className="py-2.5 pr-4 font-medium">{req.canton}</td>
                  <td className="py-2.5 pr-4 text-gray-600">{req.language}</td>
                  <td className="py-2.5">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                      req.level === 'C1' ? 'bg-amber-100 text-amber-700' : 'bg-install-bg text-install'
                    }`}>
                      {req.level}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <TipCard>
        Le test de langue n'est pas toujours obligatoire si votre diplôme a été obtenu dans une langue officielle suisse (français, allemand ou italien).
      </TipCard>

      {/* Section 2: Centres d'examen */}
      <h2 className="text-base font-semibold mt-8 mb-4">Centres d'examen</h2>

      <div className="space-y-6 mb-8">
        {Object.entries(EXAM_CENTERS).map(([lang, centers]) => (
          <div key={lang}>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {lang === 'francais' ? 'Français' : lang === 'allemand' ? 'Allemand' : 'Italien'}
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {centers.map((center) => (
                <ResourceCard key={center.name} {...center} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Section 3: Checklist */}
      <Card className="animate-slide">
        <h2 className="text-base font-semibold mb-4">Votre suivi</h2>
        <StepChecklist
          items={checklistItems}
          onToggle={handleCheckToggle}
          onDateChange={handleDateChange}
          onNotesChange={handleNotesChange}
        />
      </Card>
    </div>
  );
}
