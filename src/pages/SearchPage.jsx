import { useState, useCallback, useMemo } from 'react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { Icon } from '../components/Icons';
import SwitzerlandMap from '../components/SwitzerlandMap';
import EstablishmentList from '../components/EstablishmentList';
import CampaignModal from '../components/CampaignModal';
import useSiwfData from '../hooks/useSiwfData';
import { useAuth } from '../contexts/AuthContext';

export default function SearchPage() {
  const { profile } = useAuth();
  const {
    loading,
    error,
    allSpecialties,
    selectedCantons,
    setSelectedCantons,
    selectedSpecialties,
    setSelectedSpecialties,
    searchQuery,
    setSearchQuery,
    toggleCanton,
    toggleSpecialty,
    cantonCounts,
    filtered,
    totalCount,
    emailStats,
    settingFilter,
    setSettingFilter,
    settingCounts,
    sortBy,
    setSortBy,
    hasProfile,
  } = useSiwfData();

  const preferredCantons = profile?.preferred_cantons || [];
  const hasPreferredCantons = preferredCantons.length > 0;
  const preferredSpecialties = profile?.preferred_specialties || [];
  const hasPreferredSpecs = preferredSpecialties.length > 0;

  // Check if current selection matches preferred cantons exactly
  const isPreferredCantonsActive = useMemo(() => {
    if (!hasPreferredCantons) return false;
    if (selectedCantons.length !== preferredCantons.length) return false;
    return preferredCantons.every(c => selectedCantons.includes(c));
  }, [selectedCantons, preferredCantons, hasPreferredCantons]);

  // Check if current selection matches preferred specialties exactly
  const isPreferredSpecsActive = useMemo(() => {
    if (!hasPreferredSpecs) return false;
    if (selectedSpecialties.length !== preferredSpecialties.length) return false;
    return preferredSpecialties.every(s => selectedSpecialties.includes(s));
  }, [selectedSpecialties, preferredSpecialties, hasPreferredSpecs]);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showCampaignModal, setShowCampaignModal] = useState(false);

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filtered.map(e => e.id)));
  }, [filtered]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleSelectionMode = () => {
    if (selectionMode) {
      setSelectedIds(new Set());
    }
    setSelectionMode(!selectionMode);
  };

  const selectedEstablishments = filtered.filter(e => selectedIds.has(e.id));

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
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base font-semibold">Carte de la Suisse</h3>
            <Badge variant="primary">
              {selectedCantons.length} canton{selectedCantons.length > 1 ? 's' : ''} sélectionné{selectedCantons.length > 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mb-5">
            <button
              onClick={() => hasPreferredCantons && setSelectedCantons([...preferredCantons])}
              disabled={!hasPreferredCantons}
              title={hasPreferredCantons ? 'Sélectionner mes cantons préférés' : 'Définissez vos cantons dans votre Profil'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all cursor-pointer ${
                !hasPreferredCantons
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : isPreferredCantonsActive
                    ? 'bg-primary text-white'
                    : 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30'
              }`}
            >
              <span>⭐</span>
              Mes cantons préférés
            </button>
            {selectedCantons.length > 0 && (
              <button
                onClick={() => setSelectedCantons([])}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all cursor-pointer"
              >
                <Icon.X size={13} />
                Tout désélectionner
              </button>
            )}
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Spécialités {!loading && `(${allSpecialties.length})`}
              </h3>
              {selectedSpecialties.length > 0 && (
                <button
                  onClick={() => setSelectedSpecialties([])}
                  className="text-[11px] text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  Effacer
                </button>
              )}
            </div>
            <div className="mb-4">
              <button
                onClick={() => hasPreferredSpecs && setSelectedSpecialties([...preferredSpecialties])}
                disabled={!hasPreferredSpecs}
                title={hasPreferredSpecs ? 'Sélectionner mes spécialités préférées' : 'Définissez vos spécialités dans votre Profil'}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all cursor-pointer w-full justify-center ${
                  !hasPreferredSpecs
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : isPreferredSpecsActive
                      ? 'bg-primary text-white'
                      : 'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30'
                }`}
              >
                <span>{'\u2B50'}</span>
                Mes spécialités préférées
              </button>
            </div>
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
          {/* Sort + Setting filter + Selection mode bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              {hasProfile && (
                <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
                  <button
                    onClick={() => setSortBy('score')}
                    className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors cursor-pointer ${
                      sortBy === 'score' ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Par compatibilité
                  </button>
                  <button
                    onClick={() => setSortBy('name')}
                    className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors cursor-pointer ${
                      sortBy === 'name' ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Par nom
                  </button>
                </div>
              )}
              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
                {[
                  { key: 'all', label: 'Tous' },
                  { key: 'hospitalier', label: 'Hospitalier', icon: '\uD83C\uDFE5' },
                  { key: 'ambulatoire', label: 'Ambulatoire', icon: '\uD83C\uDFE2' },
                ].map(({ key, label, icon }) => (
                  <button
                    key={key}
                    onClick={() => setSettingFilter(key)}
                    className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors cursor-pointer ${
                      settingFilter === key ? 'bg-primary text-white' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {icon ? `${icon} ` : ''}{label}{key !== 'all' && settingCounts[key] != null ? ` (${settingCounts[key]})` : ''}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant={selectionMode ? 'primary' : 'secondary'}
                size="small"
                onClick={toggleSelectionMode}
                icon={selectionMode ? <Icon.X size={15} /> : <Icon.CheckSquare size={15} />}
              >
                {selectionMode ? 'Annuler sélection' : 'Sélection multiple'}
              </Button>
            </div>
          </div>

          {/* Email validation stats */}
          {emailStats && (
            <div className="flex flex-wrap items-center gap-4 mb-4 text-[13px] text-gray-500">
              <span className="font-medium text-gray-600">Emails :</span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                {emailStats.validated} vérifié{emailStats.validated > 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
                {emailStats.manually_verified} confirmé{emailStats.manually_verified > 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                {emailStats.suggested} suggéré{emailStats.suggested > 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
                {emailStats.invalid} invalide{emailStats.invalid > 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Campaign action bar */}
          {selectionMode && selectedIds.size > 0 && (
            <div className="flex items-center justify-between p-4 mb-4 bg-primary/5 border border-primary/20 rounded-xl">
              <span className="text-sm font-medium text-primary">
                {selectedIds.size} établissement{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}
              </span>
              <Button
                size="small"
                onClick={() => setShowCampaignModal(true)}
                icon={<Icon.Layers size={16} />}
              >
                Lancer une campagne
              </Button>
            </div>
          )}

          <EstablishmentList
            establishments={filtered}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onSelectAll={selectAll}
            onDeselectAll={deselectAll}
          />
        </div>
      )}

      {/* Source footer */}
      {!loading && (
        <div className="mt-8 text-center text-[12px] text-gray-400">
          Source : Registre ISFM (register.siwf.ch) — {totalCount} établissements
        </div>
      )}

      {/* Campaign Modal */}
      {showCampaignModal && (
        <CampaignModal
          establishments={selectedEstablishments}
          onClose={() => setShowCampaignModal(false)}
          onCreated={() => {
            setShowCampaignModal(false);
            setSelectionMode(false);
            setSelectedIds(new Set());
          }}
        />
      )}
    </div>
  );
}
