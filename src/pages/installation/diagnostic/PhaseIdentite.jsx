import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { Icon } from '../../../components/Icons';
import FormField, { Input, Select } from './FormField';
import { NATIONALITIES, EU_COUNTRIES, PHONE_CODES, LANGUAGES } from './constants';

export default function PhaseIdentite({ data, errors, onChange, onNext, onBack }) {
  const set = (key, val) => onChange({ ...data, [key]: val });
  const toggleLang = (id) => {
    const langs = data.languages || [];
    set('languages', langs.includes(id) ? langs.filter(l => l !== id) : [...langs, id]);
  };
  const isEU = EU_COUNTRIES.includes(data.nationality);

  return (
    <div className="max-w-2xl">
      <Card className="animate-slide">
        <h2 className="text-lg font-semibold mb-6">Identité et coordonnées</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Prénom" required error={errors.firstName}>
            <Input value={data.firstName} onChange={v => set('firstName', v)} placeholder="Votre prénom" error={errors.firstName} />
          </FormField>

          <FormField label="Nom" required error={errors.lastName}>
            <Input value={data.lastName} onChange={v => set('lastName', v)} placeholder="Votre nom" error={errors.lastName} />
          </FormField>

          <FormField label="Email" required error={errors.email} className="md:col-span-2">
            <Input type="email" value={data.email} onChange={v => set('email', v)} placeholder="votre@email.com" error={errors.email} />
          </FormField>

          <FormField label="Téléphone" required error={errors.phoneNumber}>
            <div className="flex gap-2">
              <select
                value={data.phoneCode}
                onChange={e => set('phoneCode', e.target.value)}
                className="w-24 px-2 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-install focus:ring-1 focus:ring-install/20 bg-white"
              >
                {PHONE_CODES.map(p => (
                  <option key={p.code} value={p.code}>{p.code}</option>
                ))}
              </select>
              <Input value={data.phoneNumber} onChange={v => set('phoneNumber', v)} placeholder="6 12 34 56 78" error={errors.phoneNumber} />
            </div>
          </FormField>

          <FormField label="Nationalité" required error={errors.nationality}>
            <div>
              <Select
                value={data.nationality}
                onChange={v => set('nationality', v)}
                options={NATIONALITIES}
                placeholder="Sélectionner..."
                error={errors.nationality}
              />
              {data.nationality && (
                <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                  isEU ? 'bg-install-bg text-install' : 'bg-amber-50 text-amber-600'
                }`}>
                  {isEU ? 'UE / AELE' : 'Hors UE'}
                </span>
              )}
            </div>
          </FormField>

          <FormField label="Pays de résidence" required error={errors.residenceCountry}>
            <Select
              value={data.residenceCountry}
              onChange={v => set('residenceCountry', v)}
              options={NATIONALITIES}
              placeholder="Sélectionner..."
              error={errors.residenceCountry}
            />
          </FormField>
        </div>

        {/* Languages */}
        <div className="mt-5">
          <FormField label="Langues parlées" required error={errors.languages}>
            <div className="flex flex-wrap gap-2 mt-1">
              {LANGUAGES.map(lang => {
                const selected = (data.languages || []).includes(lang.id);
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => toggleLang(lang.id)}
                    className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer ${
                      selected
                        ? 'bg-install text-white border border-install'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {lang.label}
                  </button>
                );
              })}
            </div>
          </FormField>
        </div>

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
          {onBack ? (
            <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer">
              <Icon.ChevronRight size={14} className="rotate-180" />
              Retour
            </button>
          ) : <div />}
          <Button variant="install" onClick={onNext} icon={<Icon.Arrow size={16} />}>
            Suivant
          </Button>
        </div>
      </Card>
    </div>
  );
}
