import { useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { Icon } from '../components/Icons';

const mockApplications = [
  { id: 1, hospital: 'CHUV', city: 'Lausanne', canton: 'VD', chief: 'Prof. Pierre Martin', specialty: 'Gériatrie' },
  { id: 2, hospital: 'HUG', city: 'Genève', canton: 'GE', chief: 'Dr. Marie Dupont', specialty: 'Gériatrie' },
  { id: 3, hospital: 'Hôpital de Nyon', city: 'Nyon', canton: 'VD', chief: 'Dr. Jean Rochat', specialty: 'Médecine interne' },
  { id: 4, hospital: 'HNE Pourtalès', city: 'Neuchâtel', canton: 'NE', chief: 'Dr. Sarah Weber', specialty: 'Gériatrie' },
];

export default function ApplicationsPage() {
  const [generating, setGenerating] = useState(false);
  const [applications, setApplications] = useState([]);
  const [preview, setPreview] = useState(null);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setApplications(mockApplications);
      setGenerating(false);
    }, 1800);
  };

  if (applications.length === 0) {
    return (
      <div className="animate-fade">
        <div className="mb-8">
          <h1 className="text-[28px] font-bold tracking-tight mb-2">Candidatures</h1>
          <p className="text-gray-500 text-[15px]">Générez des lettres de motivation personnalisées</p>
        </div>

        <Card className="text-center !py-20 !px-10">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-7 text-white shadow-[0_12px_40px_rgba(0,102,255,0.3)] ${
            generating ? 'bg-primary' : 'bg-gradient-to-br from-primary to-primary-dark'
          } ${!generating ? 'animate-float' : ''}`}>
            <Icon.Sparkle size={36} />
          </div>
          <h2 className="text-2xl font-bold mb-3">
            {generating ? 'Génération en cours...' : 'Prêt à générer'}
          </h2>
          <p className="text-gray-500 max-w-[400px] mx-auto mb-8 text-[15px]">
            {generating
              ? "L'IA analyse vos critères et rédige des lettres personnalisées..."
              : "L'IA va créer des lettres de motivation uniques pour chaque établissement."
            }
          </p>

          {!generating && (
            <div className="flex justify-center gap-10 mb-9">
              <div>
                <div className="text-[32px] font-bold text-primary">3</div>
                <div className="text-[13px] text-gray-400">Cantons</div>
              </div>
              <div>
                <div className="text-[32px] font-bold text-primary">2</div>
                <div className="text-[13px] text-gray-400">Spécialités</div>
              </div>
            </div>
          )}

          <Button size="large" onClick={handleGenerate} disabled={generating} icon={generating ? null : <Icon.Sparkle size={20} />}>
            {generating ? 'Génération en cours...' : 'Générer les candidatures'}
          </Button>

          {generating && (
            <div className="mt-8">
              <div className="w-[200px] h-1 bg-gray-100 rounded-full mx-auto overflow-hidden">
                <div className="w-[30%] h-full bg-gradient-to-r from-primary via-primary-light to-primary rounded-full animate-shimmer" />
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight mb-2">Candidatures</h1>
          <p className="text-gray-500 text-[15px]">{applications.length} lettres générées et prêtes à envoyer</p>
        </div>
        <Button icon={<Icon.Send size={18} />}>Tout envoyer</Button>
      </div>

      <div className="flex flex-col gap-3">
        {applications.map((app, i) => (
          <Card key={app.id} hoverable className={`!py-5 !px-6 animate-slide delay-${i + 1}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-[52px] h-[52px] bg-primary-bg rounded-[14px] flex items-center justify-center font-bold text-sm text-primary">
                  {app.canton}
                </div>
                <div>
                  <div className="font-semibold text-[15px] mb-1">{app.hospital}</div>
                  <div className="text-[13px] text-gray-500">{app.specialty} &bull; {app.chief}</div>
                </div>
              </div>
              <div className="flex gap-2.5">
                <Button variant="secondary" size="small" icon={<Icon.Eye size={16} />} onClick={() => setPreview(app)}>
                  Aperçu
                </Button>
                <Button size="small" icon={<Icon.Send size={16} />}>Envoyer</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Preview Modal */}
      {preview && (
        <div
          className="animate-fade fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-10"
          onClick={() => setPreview(null)}
        >
          <Card className="animate-scale max-w-[640px] w-full max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold">{preview.hospital}</h3>
                <p className="text-gray-500 text-sm">{preview.city} &bull; {preview.chief}</p>
              </div>
              <button onClick={() => setPreview(null)} className="bg-gray-100 rounded-[10px] p-2.5 cursor-pointer">
                <Icon.X size={18} />
              </button>
            </div>

            <div className="bg-gray-50 rounded-2xl p-7 text-sm leading-[1.8] text-gray-700 mb-6">
              <p className="mb-4">{preview.chief},</p>
              <p className="mb-4">
                Je me permets de vous adresser ma candidature pour un poste de médecin assistant
                au sein du service de {preview.specialty} du {preview.hospital}.
              </p>
              <p className="mb-4">
                Mon parcours m&apos;a permis de développer des compétences solides en médecine clinique
                que je souhaite approfondir au sein de votre équipe réputée pour la qualité de sa formation.
              </p>
              <p className="mb-4">
                Je reste à votre disposition pour un entretien et vous prie d&apos;agréer l&apos;expression
                de mes salutations distinguées.
              </p>
              <p className="font-semibold">Dr. Giulia Scattu</p>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setPreview(null)}>Fermer</Button>
              <Button icon={<Icon.Send size={16} />}>Envoyer</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
