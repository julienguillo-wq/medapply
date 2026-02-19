import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { Icon } from '../../../components/Icons';
import { SERVICE_PLANS, MEBEKO_TAXES } from './constants';

export default function PhaseService({ data, errors, onChange, onNext, onBack }) {
  const set = (key, val) => onChange({ ...data, [key]: val });

  return (
    <div className="max-w-4xl">
      <div className="animate-slide">
        <h2 className="text-lg font-semibold mb-2">Choisissez votre accompagnement</h2>
        <p className="text-sm text-gray-500 mb-6">
          Sélectionnez le niveau de service adapté à vos besoins.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {SERVICE_PLANS.map(plan => {
            const selected = data.selectedPlan === plan.id;
            return (
              <div
                key={plan.id}
                onClick={() => set('selectedPlan', plan.id)}
                className={`relative bg-white rounded-2xl p-6 transition-all cursor-pointer ${
                  selected
                    ? 'border-2 border-install ring-2 ring-install/20 shadow-lg scale-[1.02]'
                    : 'border-2 border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md'
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-install text-white text-[10px] font-bold uppercase tracking-wider rounded-full whitespace-nowrap">
                    {plan.badge}
                  </span>
                )}

                <h3 className="text-lg font-bold mt-1">{plan.name}</h3>
                <p className="text-xs text-gray-500 mt-1 mb-4">{plan.description}</p>

                <div className="mb-5">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-sm text-gray-500 ml-1">{plan.currency}</span>
                </div>

                <div className="flex flex-col gap-2">
                  {plan.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-2">
                      {feat.included ? (
                        <span className="text-install text-sm mt-0.5">✅</span>
                      ) : (
                        <span className="text-gray-300 text-sm mt-0.5">❌</span>
                      )}
                      <span className={`text-xs ${feat.included ? 'text-gray-700' : 'text-gray-300 line-through'}`}>
                        {feat.label}
                      </span>
                    </div>
                  ))}
                </div>

                {selected && (
                  <div className="mt-4 pt-3 border-t border-install/20">
                    <span className="text-xs font-semibold text-install">Sélectionné</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {errors.selectedPlan && (
          <p className="mt-4 text-sm text-red-500">{errors.selectedPlan}</p>
        )}

        {/* MEBEKO taxes checkbox */}
        <Card className="mt-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data.includeMebekoTaxes}
              onChange={e => set('includeMebekoTaxes', e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-gray-300 text-install focus:ring-install/20 accent-install"
            />
            <div>
              <span className="text-sm font-medium text-gray-800">{MEBEKO_TAXES.label}</span>
              <p className="text-xs text-gray-500 mt-0.5">{MEBEKO_TAXES.description}</p>
            </div>
          </label>
        </Card>

        <p className="mt-4 text-xs text-gray-400 text-center">
          Une question ? Contactez DocStart : <a href="mailto:contact@docstart.ch" className="text-install hover:underline">contact@docstart.ch</a>
        </p>

        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer">
            <Icon.ChevronRight size={14} className="rotate-180" />
            Retour
          </button>
          <Button variant="install" onClick={onNext} icon={<Icon.Arrow size={16} />}>
            Voir le récapitulatif
          </Button>
        </div>
      </div>
    </div>
  );
}
