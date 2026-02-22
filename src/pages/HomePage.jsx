import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { Icon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const statusConfig = {
  draft: { label: 'Brouillon', variant: 'default', icon: <Icon.Edit size={12} /> },
  sent: { label: 'Envoyée', variant: 'warning', icon: <Icon.Clock size={12} /> },
  replied: { label: 'Réponse', variant: 'success', icon: <Icon.Check size={12} /> },
  rejected: { label: 'Refusée', variant: 'error', icon: <Icon.X size={12} /> },
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return 'Il y a 1 jour';
  return `Il y a ${days} jours`;
}

export default function HomePage() {
  const { user, profile } = useAuth();
  const [candidatures, setCandidatures] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    async function loadData() {
      const [candResult, docsResult] = await Promise.all([
        supabase
          .from('candidatures')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('documents')
          .select('id')
          .eq('user_id', user.id)
          .limit(1),
      ]);

      setCandidatures(candResult.data || []);
      setDocuments(docsResult.data || []);
      setLoading(false);
    }

    loadData();
  }, [user?.id]);

  // --- Stats ---
  const sent = candidatures.filter(c => c.status === 'sent' || c.status === 'replied' || c.status === 'rejected');
  const pending = candidatures.filter(c => c.status === 'sent');
  const replied = candidatures.filter(c => c.status === 'replied' || c.status === 'rejected');
  const responseRate = sent.length > 0 ? Math.round((replied.length / sent.length) * 100) : 0;

  // --- Recommendations ---
  const recommendations = [];

  const isProfileIncomplete = !profile?.first_name || !profile?.last_name || !profile?.specialty;
  if (isProfileIncomplete) {
    recommendations.push({
      title: 'Complétez votre profil',
      description: 'Ajoutez vos informations personnelles pour postuler',
      to: '/profil',
      icon: <Icon.User size={20} />,
      color: 'text-primary',
      bg: 'bg-primary-bg',
    });
  }

  if (documents.length === 0) {
    recommendations.push({
      title: 'Ajoutez vos documents',
      description: 'CV, diplômes et lettres de recommandation',
      to: '/documents',
      icon: <Icon.File size={20} />,
      color: 'text-amber-700',
      bg: 'bg-warning-bg',
    });
  }

  const hasNoCantons = !profile?.preferred_cantons || profile.preferred_cantons.length === 0;
  if (hasNoCantons) {
    recommendations.push({
      title: 'Définissez vos cantons préférés',
      description: 'Pour cibler les établissements compatibles',
      to: '/profil',
      icon: <Icon.Map size={20} />,
      color: 'text-emerald-700',
      bg: 'bg-success-bg',
    });
  }

  // Candidatures > 14 jours sans réponse
  const now = new Date();
  const stale = candidatures.filter(c => {
    if (c.status !== 'sent') return false;
    const sentDate = new Date(c.sent_at || c.created_at);
    return (now - sentDate) / (1000 * 60 * 60 * 24) > 14;
  });
  if (stale.length > 0) {
    recommendations.push({
      title: `${stale.length} candidature${stale.length > 1 ? 's' : ''} à relancer`,
      description: stale.slice(0, 3).map(c => c.establishment_name).join(', ') + (stale.length > 3 ? '…' : ''),
      to: '/tableau-de-bord',
      icon: <Icon.Clock size={20} />,
      color: 'text-red-700',
      bg: 'bg-error-bg',
    });
  }

  // --- Activity timeline ---
  const activities = candidatures.slice(0, 10).map(c => {
    const isSent = c.status === 'sent' || c.status === 'draft';
    return {
      id: c.id,
      date: c.sent_at || c.created_at,
      text: isSent
        ? `Candidature envoyée à ${c.establishment_name}`
        : c.status === 'replied'
          ? `Réponse reçue de ${c.establishment_name}`
          : c.status === 'rejected'
            ? `Refus reçu de ${c.establishment_name}`
            : `Candidature créée pour ${c.establishment_name}`,
      icon: isSent ? <Icon.Send size={16} /> : c.status === 'rejected' ? <Icon.X size={16} /> : <Icon.Check size={16} />,
      color: isSent ? 'text-primary bg-primary-bg' : c.status === 'rejected' ? 'text-red-700 bg-error-bg' : 'text-emerald-700 bg-success-bg',
    };
  });

  // --- Last 5 candidatures ---
  const recent5 = candidatures.slice(0, 5);

  const firstName = profile?.first_name || 'Docteur';

  return (
    <div className="animate-fade">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-bold tracking-tight mb-2">
          Bonjour, {firstName}
        </h1>
        <p className="text-gray-500 text-[15px]">
          Voici un résumé de vos candidatures
        </p>
      </div>

      {/* Section 1: Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
        {[
          { label: 'Candidatures envoyées', value: sent.length, color: 'text-primary', bg: 'bg-primary-bg', icon: <Icon.Send size={20} /> },
          { label: 'En attente', value: pending.length, color: 'text-amber-700', bg: 'bg-warning-bg', icon: <Icon.Clock size={20} /> },
          { label: 'Réponses reçues', value: replied.length, color: 'text-emerald-700', bg: 'bg-success-bg', icon: <Icon.Check size={20} /> },
          { label: 'Taux de réponse', value: `${responseRate}%`, color: 'text-violet-700', bg: 'bg-violet-50', icon: <Icon.Activity size={20} /> },
        ].map((stat, i) => (
          <Card key={i} className={`animate-slide delay-${i + 1}`}>
            <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
              {stat.icon}
            </div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{stat.label}</div>
            <div className={`text-[28px] font-bold ${stat.color}`}>{loading ? '—' : stat.value}</div>
          </Card>
        ))}
      </div>

      {/* Section 2: Recommendations */}
      {!loading && recommendations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4">Actions recommandées</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendations.map((rec, i) => (
              <Link key={i} to={rec.to} className="block">
                <Card hoverable className="!p-5 flex items-center gap-4">
                  <div className={`w-10 h-10 ${rec.bg} rounded-xl flex items-center justify-center shrink-0 ${rec.color}`}>
                    {rec.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm">{rec.title}</div>
                    <div className="text-gray-400 text-[13px] truncate">{rec.description}</div>
                  </div>
                  <Icon.ChevronRight size={18} className="text-gray-300 shrink-0" />
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Recent candidatures table */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Dernières candidatures</h2>
          {candidatures.length > 5 && (
            <Link to="/tableau-de-bord" className="text-primary text-sm font-semibold hover:underline">
              Voir tout
            </Link>
          )}
        </div>

        {loading ? (
          <Card className="text-center !py-12">
            <div className="w-[200px] h-1 bg-gray-100 rounded-full mx-auto overflow-hidden">
              <div className="w-[30%] h-full bg-gradient-to-r from-primary via-primary-light to-primary rounded-full animate-shimmer" />
            </div>
          </Card>
        ) : recent5.length === 0 ? (
          <Card className="text-center !py-10">
            <Icon.Send size={36} className="mx-auto text-gray-300 mb-3" />
            <div className="text-gray-500 text-sm font-medium mb-1">Aucune candidature</div>
            <div className="text-gray-400 text-[13px]">
              Rendez-vous sur la page{' '}
              <Link to="/recherche" className="text-primary hover:underline">Recherche</Link>{' '}
              pour postuler
            </div>
          </Card>
        ) : (
          <>
            {/* Desktop table */}
            <Card className="!p-0 hidden md:block">
              <div className="grid grid-cols-[1fr_120px_80px_130px] px-6 py-3 border-b border-gray-100 text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
                <div>Établissement</div>
                <div>Date</div>
                <div>Canton</div>
                <div>Statut</div>
              </div>
              {recent5.map((cand, i) => {
                const status = statusConfig[cand.status] || statusConfig.draft;
                return (
                  <div
                    key={cand.id}
                    className={`grid grid-cols-[1fr_120px_80px_130px] px-6 py-4 items-center text-sm hover:bg-gray-50 transition-colors ${
                      i < recent5.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{cand.establishment_name}</div>
                      <div className="text-[13px] text-gray-400">{cand.establishment_city}</div>
                    </div>
                    <div className="text-gray-400 text-[13px]">{formatDate(cand.sent_at || cand.created_at)}</div>
                    <div className="text-gray-600 text-[13px]">{cand.establishment_canton || '—'}</div>
                    <div>
                      <Badge variant={status.variant} icon={status.icon}>{status.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </Card>

            {/* Mobile cards */}
            <div className="flex flex-col gap-3 md:hidden">
              {recent5.map((cand) => {
                const status = statusConfig[cand.status] || statusConfig.draft;
                return (
                  <Card key={cand.id}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm">{cand.establishment_name}</div>
                        <div className="text-[13px] text-gray-400">{cand.establishment_city}{cand.establishment_canton ? ` (${cand.establishment_canton})` : ''}</div>
                      </div>
                      <Badge variant={status.variant} icon={status.icon}>{status.label}</Badge>
                    </div>
                    <div className="text-gray-400 text-[13px]">{formatDate(cand.sent_at || cand.created_at)}</div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Section 4: Activity timeline */}
      {!loading && activities.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-4">Activité récente</h2>
          <Card className="!p-0">
            {activities.map((activity, i) => (
              <div
                key={activity.id}
                className={`flex items-start gap-4 px-6 py-4 ${
                  i < activities.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${activity.color}`}>
                  {activity.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{activity.text}</div>
                  <div className="text-[13px] text-gray-400 mt-0.5">{timeAgo(activity.date)}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
