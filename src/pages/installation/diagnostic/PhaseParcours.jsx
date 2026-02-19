import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { Icon } from '../../../components/Icons';
import FormField, { Input, Select } from './FormField';
import { NATIONALITIES, SPECIALTIES, CANTONS } from './constants';

const YEARS = Array.from({ length: 30 }, (_, i) => String(2026 - i));
const FUTURE_YEARS = Array.from({ length: 10 }, (_, i) => String(2025 + i));
const EXPERIENCE_OPTIONS = ['< 1 an', '1-2 ans', '3-5 ans', '5-10 ans', '> 10 ans'];

export default function PhaseParcours({ data, errors, onChange, onNext, onBack }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  const toggleCanton = (code) => {
    const cantons = data.targetCantons || [];
    set('targetCantons', cantons.includes(code) ? cantons.filter(c => c !== code) : [...cantons, code]);
  };

  return (
    <div className="max-w-2xl">
      <Card className="animate-slide">
        <h2 className="text-lg font-semibold mb-6">Parcours médical</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Pays du diplôme de médecine" required error={errors.diplomaCountry}>
            <Select value={data.diplomaCountry} onChange={v => set('diplomaCountry', v)} options={NATIONALITIES} placeholder="Sélectionner..." error={errors.diplomaCountry} />
          </FormField>

          <FormField label="Université" required error={errors.university}>
            <Input value={data.university} onChange={v => set('university', v)} placeholder="Nom de l'université" error={errors.university} />
          </FormField>

          <FormField label="Année du diplôme" required error={errors.diplomaYear}>
            <Select value={data.diplomaYear} onChange={v => set('diplomaYear', v)} options={YEARS} placeholder="Année..." error={errors.diplomaYear} />
          </FormField>

          <FormField label="Expérience clinique" required error={errors.clinicalExperienceYears}>
            <Select value={data.clinicalExperienceYears} onChange={v => set('clinicalExperienceYears', v)} options={EXPERIENCE_OPTIONS} placeholder="Sélectionner..." error={errors.clinicalExperienceYears} />
          </FormField>
        </div>

        {/* Specialist status */}
        <div className="mt-6">
          <FormField label="Avez-vous un titre de spécialiste ?" required error={errors.specialistStatus}>
            <div className="flex gap-3 mt-1">
              {[
                { value: 'yes', label: 'Oui' },
                { value: 'in_progress', label: 'En cours' },
                { value: 'no', label: 'Non' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('specialistStatus', opt.value)}
                  className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    data.specialistStatus === opt.value
                      ? 'bg-install text-white border-2 border-install'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-transparent'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </FormField>
        </div>

        {/* Conditional specialist fields */}
        {data.specialistStatus === 'yes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-gray-50 rounded-xl">
            <FormField label="Titre de spécialiste" required error={errors.specialistTitle}>
              <Select value={data.specialistTitle} onChange={v => set('specialistTitle', v)} options={SPECIALTIES} placeholder="Sélectionner..." error={errors.specialistTitle} />
            </FormField>
            <FormField label="Pays d'obtention" required error={errors.specialistCountry}>
              <Select value={data.specialistCountry} onChange={v => set('specialistCountry', v)} options={NATIONALITIES} placeholder="Sélectionner..." error={errors.specialistCountry} />
            </FormField>
            <FormField label="Année d'obtention" required error={errors.specialistYear}>
              <Select value={data.specialistYear} onChange={v => set('specialistYear', v)} options={YEARS} placeholder="Année..." error={errors.specialistYear} />
            </FormField>
          </div>
        )}

        {data.specialistStatus === 'in_progress' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-gray-50 rounded-xl">
            <FormField label="Spécialité visée" required error={errors.specialistTitle}>
              <Select value={data.specialistTitle} onChange={v => set('specialistTitle', v)} options={SPECIALTIES} placeholder="Sélectionner..." error={errors.specialistTitle} />
            </FormField>
            <FormField label="Année prévue d'obtention" required error={errors.specialistExpectedYear}>
              <Select value={data.specialistExpectedYear} onChange={v => set('specialistExpectedYear', v)} options={FUTURE_YEARS} placeholder="Année..." error={errors.specialistExpectedYear} />
            </FormField>
          </div>
        )}

        {/* Current position (optional) */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Situation actuelle</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Poste actuel">
              <Input value={data.currentJobTitle} onChange={v => set('currentJobTitle', v)} placeholder="Ex: Médecin assistant" />
            </FormField>
            <FormField label="Établissement">
              <Input value={data.currentEstablishment} onChange={v => set('currentEstablishment', v)} placeholder="Nom de l'établissement" />
            </FormField>
            <FormField label="Pays">
              <Select value={data.currentCountry} onChange={v => set('currentCountry', v)} options={NATIONALITIES} placeholder="Sélectionner..." />
            </FormField>
            <FormField label="Date d'arrivée souhaitée en Suisse">
              <input
                type="month"
                value={data.desiredArrivalDate}
                onChange={e => set('desiredArrivalDate', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-install focus:ring-1 focus:ring-install/20"
              />
            </FormField>
          </div>
        </div>

        {/* Target cantons */}
        <div className="mt-6">
          <FormField label="Cantons ciblés pour votre installation" required error={errors.targetCantons}>
            <div className="flex flex-wrap gap-2 mt-1">
              {Object.entries(CANTONS).map(([code, name]) => {
                const selected = (data.targetCantons || []).includes(code);
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => toggleCanton(code)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      selected
                        ? 'bg-install text-white border border-install'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {code} — {name}
                  </button>
                );
              })}
            </div>
          </FormField>
        </div>

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
