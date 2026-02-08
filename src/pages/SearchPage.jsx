import { useState } from 'react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { Icon } from '../components/Icons';
import { cantonData } from '../data/mockData';
import SwitzerlandMap from '../components/SwitzerlandMap';

const specialties = [
  'Médecine interne générale', 'Gériatrie', 'Cardiologie', 'Pneumologie',
  'Neurologie', 'Psychiatrie', 'Chirurgie générale', 'Orthopédie',
  'Urgences', 'Anesthésiologie',
];

export default function SearchPage() {
  const [selectedCantons, setSelectedCantons] = useState(['VD', 'GE', 'NE']);
  const [selectedSpecialties, setSelectedSpecialties] = useState(['Gériatrie', 'Médecine interne générale']);

  const toggleCanton = (id) => {
    setSelectedCantons(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleSpecialty = (s) => {
    setSelectedSpecialties(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  };

  const totalEstablishments = selectedCantons.reduce((acc, id) => acc + (cantonData[id]?.count || 0), 0);

  return (
    <div className="animate-fade">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold tracking-tight mb-2">Recherche</h1>
        <p className="text-gray-500 text-[15px]">Sélectionnez les cantons et spécialités ciblés</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-5 md:gap-7">
        {/* Map */}
        <Card>
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-base font-semibold">Carte de la Suisse</h3>
            <Badge variant="primary">
              {selectedCantons.length} canton{selectedCantons.length > 1 ? 's' : ''} sélectionné{selectedCantons.length > 1 ? 's' : ''}
            </Badge>
          </div>
          <SwitzerlandMap
            selectedCantons={selectedCantons}
            onToggleCanton={toggleCanton}
            cantonData={cantonData}
          />
          <div className="flex gap-5 mt-5 pt-5 border-t border-gray-100 text-[13px]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded-sm" />
              <span className="text-gray-500">Sélectionné</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-200 rounded-sm" />
              <span className="text-gray-500">Non sélectionné</span>
            </div>
          </div>
        </Card>

        {/* Sidebar */}
        <div>
          <Card className="mb-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
              Spécialités
            </h3>
            <div className="flex flex-col gap-2">
              {specialties.map((spec) => {
                const isSelected = selectedSpecialties.includes(spec);
                return (
                  <button
                    key={spec}
                    onClick={() => toggleSpecialty(spec)}
                    className={`flex items-center justify-between px-3.5 py-3 rounded-[10px] text-[13px] font-medium text-left transition-all cursor-pointer ${
                      isSelected ? 'bg-primary text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {spec}
                    {isSelected && <Icon.Check size={16} />}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="!bg-gray-900 !text-white !border-gray-800">
            <div className="mb-5">
              <div className="text-xs opacity-60 uppercase tracking-wider mb-2">Établissements</div>
              <div className="text-[42px] font-bold">{totalEstablishments || '—'}</div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-5 border-t border-white/10">
              <div>
                <div className="text-[11px] opacity-50 mb-1">Cantons</div>
                <div className="text-xl font-semibold">{selectedCantons.length}</div>
              </div>
              <div>
                <div className="text-[11px] opacity-50 mb-1">Spécialités</div>
                <div className="text-xl font-semibold">{selectedSpecialties.length}</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
