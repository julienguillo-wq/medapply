import { useOutletContext } from 'react-router-dom';
import Card from '../../components/Card';
import { Icon } from '../../components/Icons';
import TipCard from '../../components/TipCard';
import StepChecklist from '../../components/StepChecklist';

export default function PermisPage() {
  const { state, update, isEUPath } = useOutletContext();
  const permis = state.permis;

  const handleToggle = (field) => {
    update('permis', { ...permis, [field]: !permis[field] });
  };

  const handleChange = (field, value) => {
    update('permis', { ...permis, [field]: value });
  };

  const checklistItems = [
    {
      id: 'jobObtained',
      label: 'Offre d\'emploi / contrat obtenu',
      description: isEUPath ? 'Recommandé mais pas obligatoire pour UE/AELE' : 'Obligatoire pour obtenir un permis hors-UE',
      checked: permis.jobObtained,
    },
    {
      id: 'permitRequested',
      label: 'Demande de permis déposée',
      description: 'Auprès des autorités cantonales de migration',
      checked: permis.permitRequested,
      showDate: true,
      date: permis.permitRequestDate,
    },
    {
      id: 'permitObtained',
      label: 'Permis obtenu',
      description: permis.permitType ? `Type: ${permis.permitType}` : 'Indiquez le type de permis obtenu',
      checked: permis.permitObtained,
      showDate: true,
      date: permis.permitDate,
      showNotes: true,
      notes: permis.permitType,
    },
  ];

  const handleCheckToggle = (id) => handleToggle(id);

  const handleDateChange = (id, value) => {
    if (id === 'permitRequested') handleChange('permitRequestDate', value);
    if (id === 'permitObtained') handleChange('permitDate', value);
  };

  const handleNotesChange = (id, value) => {
    if (id === 'permitObtained') handleChange('permitType', value);
  };

  return (
    <div className="animate-fade">
      <div className="mb-8">
        <h1 className="text-2xl md:text-[28px] font-bold tracking-tight mb-2">Permis de travail</h1>
        <p className="text-gray-500 text-[15px]">Informations et suivi de votre autorisation de travail en Suisse</p>
      </div>

      {isEUPath ? (
        <Card className="mb-6 animate-slide">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-install-bg text-install flex items-center justify-center">
              <Icon.ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-base font-semibold">Permis B — Ressortissants UE/AELE</h2>
              <p className="text-sm text-gray-400">Autorisation de séjour avec activité lucrative</p>
            </div>
          </div>

          <div className="space-y-3 text-sm text-gray-700 mb-4">
            <p>En tant que ressortissant UE/AELE, vous bénéficiez de la <strong>libre circulation des personnes</strong>. Le permis B est délivré quasi automatiquement si vous avez un contrat de travail ou une promesse d'embauche.</p>
            <p>La demande est généralement faite par votre employeur (hôpital/clinique). Vous recevrez votre permis par courrier après votre inscription au contrôle des habitants.</p>
          </div>

          <TipCard>
            L'employeur (hôpital) fait souvent la demande pour vous. Renseignez-vous auprès de votre futur service RH.
          </TipCard>
        </Card>
      ) : (
        <Card className="mb-6 animate-slide">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-warning-bg text-warning flex items-center justify-center">
              <Icon.AlertTriangle size={22} />
            </div>
            <div>
              <h2 className="text-base font-semibold">Permis de travail — Hors-UE</h2>
              <p className="text-sm text-gray-400">Soumis aux contingents et conditions strictes</p>
            </div>
          </div>

          <div className="space-y-3 text-sm text-gray-700 mb-4">
            <p>Pour les ressortissants hors-UE, l'obtention d'un permis de travail est soumise à des <strong>contingents annuels limités</strong> et à la démonstration que le poste ne peut pas être pourvu par un candidat suisse ou UE.</p>
            <p>Conditions principales :</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Offre d'emploi ferme d'un employeur suisse (obligatoire)</li>
              <li>Qualification élevée et expérience démontrée</li>
              <li>L'employeur doit prouver qu'aucun candidat local n'est disponible</li>
              <li>Le salaire doit correspondre aux normes suisses</li>
            </ul>
          </div>

          <TipCard variant="warning">
            Les contingents sont limités et souvent épuisés en début d'année. Anticipez votre demande le plus tôt possible.
          </TipCard>
        </Card>
      )}

      {/* Checklist */}
      <Card className="animate-slide">
        <h2 className="text-base font-semibold mb-4">Suivi de votre demande</h2>
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
