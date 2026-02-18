import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  loadEstablishments,
  loadSpecialties,
  filterEstablishments,
  computeCantonCounts,
  getEmail,
  migrateLocalStorageEmails,
} from '../services/siwfService';
import { loadEmailValidationData } from '../services/emailValidationService';
import { loadParcoursFromSupabase } from '../services/parcoursService';
import { calculateScore } from '../services/compatibilityService';
import { useAuth } from '../contexts/AuthContext';

export default function useSiwfData() {
  const { user, profile } = useAuth();
  const [allEstablishments, setAllEstablishments] = useState([]);
  const [allSpecialties, setAllSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedCantons, setSelectedCantons] = useState([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sortBy, setSortBy] = useState('score'); // 'score' | 'name'

  // Parcours stages for experience calculation
  const [parcoursStages, setParcoursStages] = useState([]);

  // Debounce search query
  const timerRef = useRef(null);
  useEffect(() => {
    timerRef.current = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timerRef.current);
  }, [searchQuery]);

  // Load data on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [establishments, specialties] = await Promise.all([
          loadEstablishments(),
          loadSpecialties(),
          loadEmailValidationData(),
        ]);
        if (!cancelled) {
          setAllEstablishments(establishments);
          setAllSpecialties(specialties);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Load parcours stages when user is available
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    loadParcoursFromSupabase(user.id).then(data => {
      if (!cancelled && data?.stages) {
        setParcoursStages(data.stages);
      }
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  const toggleCanton = useCallback((id) => {
    setSelectedCantons(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  }, []);

  const toggleSpecialty = useCallback((name) => {
    setSelectedSpecialties(prev =>
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    );
  }, []);

  // Canton counts based on selected specialties only
  const cantonCounts = useMemo(
    () => computeCantonCounts(allEstablishments, selectedSpecialties),
    [allEstablishments, selectedSpecialties]
  );

  // Migrate localStorage emails to backend (once after load)
  const migrationDone = useRef(false);
  useEffect(() => {
    if (!loading && user?.id && !migrationDone.current) {
      migrationDone.current = true;
      migrateLocalStorageEmails(user.id);
    }
  }, [loading, user?.id]);

  // Filtered establishments with scores
  const filtered = useMemo(() => {
    let results = filterEstablishments(allEstablishments, {
      cantons: selectedCantons,
      specialties: selectedSpecialties,
      query: debouncedQuery,
    });

    // Calculate scores if profile is available
    if (profile) {
      results = results.map(est => ({
        ...est,
        _score: calculateScore(est, profile, parcoursStages),
      }));

      // Sort by score descending if requested
      if (sortBy === 'score') {
        results.sort((a, b) => (b._score ?? -1) - (a._score ?? -1));
      }
    }

    return results;
  }, [allEstablishments, selectedCantons, selectedSpecialties, debouncedQuery, profile, parcoursStages, sortBy]);

  // Email validation stats for filtered results
  const emailStats = useMemo(() => {
    const stats = { validated: 0, suggested: 0, invalid: 0, manually_verified: 0 };
    for (const est of filtered) {
      const info = getEmail(est);
      const s = info.status || 'suggested';
      if (s in stats) stats[s]++;
      else stats.suggested++;
    }
    return stats;
  }, [filtered]);

  const hasProfile = !!profile?.specialty;

  return {
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
    totalCount: allEstablishments.length,
    emailStats,
    sortBy,
    setSortBy,
    hasProfile,
  };
}
