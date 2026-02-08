import Card from '../components/Card';
import Badge from '../components/Badge';
import { Icon } from '../components/Icons';
import SwitzerlandMap from '../components/SwitzerlandMap';
import EstablishmentList from '../components/EstablishmentList';
import useSiwfData from '../hooks/useSiwfData';

export default function SearchPage() {
  const {
    loading,
    error,
    allSpecialties,
    selectedCantons,
    selectedSpecialties,
    searchQuery,
    setSearchQuery,
    toggleCanton,
    toggleSpecialty,
    cantonCounts,
    filtered,
    totalCount,
  } = useSiwfData();

  if (error) {
    return (
      <div className="animate-fade">
        <div className="mb-8">
          <h1 className="text-[28px] font-bold tracking-tight mb-2">Recherche</h1>
        </div>
        <Card className="text-center py-12">
          <div className="text-red-500 text-[15px] font-medium mb-2">Erreur de chargement</div>
          <div className="text-gray-400 text-[13px]">{error}</div>
        </Card>
      </div>
    );
  }

  const showingFiltered = selectedCantons.length > 0 || selectedSpecialties.length > 0 || searchQuery.trim();

  return (
    <div className="animate-fade">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold tracking-tight mb-2">Recherche</h1>
        <p className="text-gray-500 text-[15px]">
          {loading
            ? 'Chargement des données SIWF...'
            : `${totalCount} établissements de formation — Sélectionnez cantons et spécialités`
          }
        </p>
      </div>

      {/* Search bar */}
      <div className="mb-5">
        <div className="relative">
          <Icon.Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un établissement, une ville, un directeur..."
            className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <Icon.X size={16} />
            </button>
          )}
        </div>
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
          {loading ? (
            <div className="aspect-[460/440] bg-gray-50 rounded-xl animate-pulse" />
          ) : (
            <SwitzerlandMap
              selectedCantons={selectedCantons}
              onToggleCanton={toggleCanton}
              cantonData={cantonCounts}
            />
          )}
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
              Spécialités {!loading && `(${allSpecialties.length})`}
            </h3>
            {loading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-11 bg-gray-50 rounded-[10px] animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
                {allSpecialties.map((spec) => {
                  const isSelected = selectedSpecialties.includes(spec.name);
                  return (
                    <button
                      key={spec.id}
                      onClick={() => toggleSpecialty(spec.name)}
                      className={`flex items-center justify-between px-3.5 py-3 rounded-[10px] text-[13px] font-medium text-left transition-all cursor-pointer ${
                        isSelected ? 'bg-primary text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span className="truncate">{spec.name}</span>
                      {isSelected && <Icon.Check size={16} />}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="!bg-gray-900 !text-white !border-gray-800">
            <div className="mb-5">
              <div className="text-xs opacity-60 uppercase tracking-wider mb-2">
                {showingFiltered ? 'Résultats filtrés' : 'Établissements'}
              </div>
              <div className="text-[42px] font-bold">
                {loading ? '...' : (showingFiltered ? filtered.length : totalCount) || '—'}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-5 border-t border-white/10">
              <div>
                <div className="text-[11px] opacity-50 mb-1">Cantons</div>
                <div className="text-xl font-semibold">{selectedCantons.length || '—'}</div>
              </div>
              <div>
                <div className="text-[11px] opacity-50 mb-1">Spécialités</div>
                <div className="text-xl font-semibold">{selectedSpecialties.length || '—'}</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Establishment list */}
      {!loading && showingFiltered && (
        <div className="mt-7">
          <EstablishmentList establishments={filtered} />
        </div>
      )}

      {/* Source footer */}
      {!loading && (
        <div className="mt-8 text-center text-[12px] text-gray-400">
          Source : Registre ISFM (register.siwf.ch) — {totalCount} établissements
        </div>
      )}
    </div>
  );
}
