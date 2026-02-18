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
import { useAuth } from '../contexts/AuthContext';

export default function useSiwfData() {
  const { user } = useAuth();
  const [allEstablishments, setAllEstablishments] = useState([]);
  const [allSpecialties, setAllSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedCantons, setSelectedCantons] = useState([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

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

  // Filtered establishments
  const filtered = useMemo(
    () => filterEstablishments(allEstablishments, {
      cantons: selectedCantons,
      specialties: selectedSpecialties,
      query: debouncedQuery,
    }),
    [allEstablishments, selectedCantons, selectedSpecialties, debouncedQuery]
  );

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
  };
}
