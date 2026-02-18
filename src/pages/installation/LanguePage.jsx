import { useOutletContext } from 'react-router-dom';
import Card from '../../components/Card';
import { Icon } from '../../components/Icons';
import TipCard from '../../components/TipCard';
import ResourceCard from '../../components/ResourceCard';
import StepChecklist from '../../components/StepChecklist';

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
