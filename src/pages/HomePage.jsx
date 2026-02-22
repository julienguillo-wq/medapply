import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { Icon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { cantonPaths } from '../components/SwitzerlandMap';

// --- Smart temporal status ---
function getSmartStatus(candidature) {
  if (candidature.status === 'replied') return { label: 'Réponse', variant: 'success', icon: <Icon.Check size={12} /> };
  if (candidature.status === 'rejected') return { label: 'Refusée', variant: 'error', icon: <Icon.X size={12} /> };
  if (candidature.status === 'draft') return { label: 'Brouillon', variant: 'default', icon: <Icon.Edit size={12} /> };

  const now = new Date();
  const sentDate = new Date(candidature.sent_at || candidature.created_at);
  const days = (now - sentDate) / (1000 * 60 * 60 * 24);

  if (days > 14) return { label: 'À relancer', variant: 'error', icon: <Icon.AlertTriangle size={12} /> };
  if (days > 7) return { label: 'En attente', variant: 'warning', icon: <Icon.Clock size={12} /> };
  return { label: 'Envoyée', variant: 'success', icon: <Icon.Send size={12} /> };
}

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

// --- Weekly chart data ---
function getWeeklyData(candidatures) {
  const now = new Date();
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - i * 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const count = candidatures.filter(c => {
      const date = new Date(c.created_at);
      return date >= weekStart && date < weekEnd;
    }).length;

    weeks.push({
      name: weekStart.toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit' }),
      candidatures: count,
    });
  }
  return weeks;
}

// --- Custom tooltip for chart ---
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white px-3 py-2 rounded-lg text-xs shadow-lg">
      <div className="text-gray-300 mb-0.5">{label}</div>
      <div className="font-semibold">{payload[0].value} candidature{payload[0].value > 1 ? 's' : ''}</div>
    </div>
  );
}

// --- Profile progress donut ---
function ProfileProgress({ profile, hasDocuments, hasCandidatures, hasParcours }) {
  const criteria = [
    {
      label: 'Profil rempli',
      done: !!(profile?.first_name && profile?.last_name && profile?.specialty),
      to: '/profil',
    },
    {
      label: 'CV complété',
      done: hasParcours,
      to: '/parcours',
    },
    {
      label: 'Documents uploadés',
      done: hasDocuments,
      to: '/documents',
    },
    {
      label: 'Cantons préférés définis',
      done: profile?.preferred_cantons?.length > 0,
      to: '/profil',
    },
    {
      label: 'Première candidature envoyée',
      done: hasCandidatures,
      to: '/recherche',
    },
  ];

  const completed = criteria.filter(c => c.done).length;
  const percent = Math.round((completed / criteria.length) * 100);
  const color = percent >= 80 ? '#10B981' : percent >= 40 ? '#F59E0B' : '#EF4444';

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <Card className="h-full">
      <h3 className="text-sm font-bold mb-4">Complétion du profil</h3>
      <div className="flex items-center gap-5">
        <div className="relative shrink-0">
          <svg width={96} height={96} className="-rotate-90">
            <circle cx={48} cy={48} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={8} />
            <circle
              cx={48} cy={48} r={radius}
              fill="none" stroke={color} strokeWidth={8}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold" style={{ color }}>{percent}%</span>
          </div>
        </div>
        <div className="flex-1 space-y-1.5">
          {criteria.map((c, i) => (
            <Link
              key={i}
              to={c.to}
              className="flex items-center gap-2 text-[13px] hover:text-primary transition-colors"
            >
              <span className="text-sm">{c.done ? '✅' : '⬜'}</span>
              <span className={c.done ? 'text-gray-400 line-through' : 'text-gray-700'}>{c.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </Card>
  );
}

// --- Mini Switzerland Map ---
function MiniSwitzerlandMap({ candidatureCantons, preferredCantons }) {
  return (
    <Card className="h-full flex flex-col">
      <h3 className="text-sm font-bold mb-3">Couverture géographique</h3>
      <div className="flex-1 flex items-center justify-center">
        <svg viewBox="0 0 460 440" className="w-full max-w-[300px] h-auto">
          <defs>
            <linearGradient id="appliedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0066FF" />
              <stop offset="100%" stopColor="#0052CC" />
            </linearGradient>
          </defs>
          {Object.entries(cantonPaths).map(([id, path]) => {
            const hasApplied = candidatureCantons.includes(id);
            const isPreferred = preferredCantons.includes(id);

            let fill = '#e5e5e5';
            let textFill = '#737373';
            if (hasApplied) {
              fill = 'url(#appliedGrad)';
              textFill = 'white';
            } else if (isPreferred) {
              fill = '#b3d4ff';
              textFill = '#0052CC';
            }

            return (
              <g key={id}>
                <path d={path.d} fill={fill} stroke="#fff" strokeWidth={1} />
                <text
                  x={path.cx} y={path.cy}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize="9" fontWeight="600"
                  fill={textFill}
                  style={{ pointerEvents: 'none' }}
                >
                  {id}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex items-center justify-center gap-4 mt-3 text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0066FF] inline-block" /> Postulé
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#b3d4ff] inline-block" /> À contacter
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" /> Non ciblé
        </span>
      </div>
    </Card>
  );
}

// --- Motivation message ---
function MotivationMessage({ sentCount }) {
  let text, emoji;
  if (sentCount === 0) {
    text = 'Prêt à lancer vos candidatures ? Commencez par la page Recherche';
    emoji = '🚀';
  } else if (sentCount <= 5) {
    text = 'Bon début ! Continuez à élargir vos recherches';
    emoji = '💪';
  } else if (sentCount <= 15) {
    text = `Vous avez contacté ${sentCount} établissements, excellent travail !`;
    emoji = '🎯';
  } else {
    text = `Impressionnant ! ${sentCount} candidatures envoyées, les réponses vont arriver`;
    emoji = '🌟';
  }

  return (
    <div className="rounded-2xl bg-gradient-to-r from-blue-50 via-violet-50 to-blue-50 p-6 md:p-8">
      <p className="text-center text-sm md:text-base text-gray-600 font-medium">
        {text} {emoji}
      </p>
    </div>
  );
}

// === Main component ===
export default function HomePage() {
  const { user, profile } = useAuth();
  const [candidatures, setCandidatures] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [hasParcours, setHasParcours] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    async function loadData() {
      const [candResult, docsResult, parcoursResult] = await Promise.all([
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
        supabase
          .from('parcours_stages')
          .select('id')
          .eq('user_id', user.id)
          .limit(1),
      ]);

      setCandidatures(candResult.data || []);
      setDocuments(docsResult.data || []);
      setHasParcours((parcoursResult.data || []).length > 0);
      setLoading(false);
    }

    loadData();
  }, [user?.id]);

  // --- Stats ---
  const sent = candidatures.filter(c => c.status === 'sent' || c.status === 'replied' || c.status === 'rejected');
  const pending = candidatures.filter(c => c.status === 'sent');
  const replied = candidatures.filter(c => c.status === 'replied' || c.status === 'rejected');
  const responseRate = sent.length > 0 ? Math.round((replied.length / sent.length) * 100) : 0;

  // --- Chart data ---
  const weeklyData = useMemo(() => getWeeklyData(candidatures), [candidatures]);

  // --- Canton data for mini map ---
  const candidatureCantons = useMemo(
    () => [...new Set(candidatures.filter(c => c.establishment_canton).map(c => c.establishment_canton))],
    [candidatures]
  );
  const preferredCantons = profile?.preferred_cantons || [];

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

      {/* Ligne 1: Stats (4 cartes) + Cercle de progression */}
      <div className="flex flex-col lg:flex-row gap-4 mb-8">
        <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
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
        <div className="lg:w-[320px] shrink-0">
          <ProfileProgress
            profile={profile}
            hasDocuments={documents.length > 0}
            hasCandidatures={candidatures.some(c => c.status !== 'draft')}
            hasParcours={hasParcours}
          />
        </div>
      </div>

      {/* Ligne 2: Graphique + Mini carte */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 mb-8">
        <Card>
          <h3 className="text-sm font-bold mb-4">Activité des candidatures</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0066FF" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0066FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="candidatures"
                  stroke="#0066FF"
                  strokeWidth={2.5}
                  fill="url(#chartGradient)"
                  dot={{ r: 4, fill: '#0066FF', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: '#0066FF', strokeWidth: 2, stroke: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <MiniSwitzerlandMap
          candidatureCantons={candidatureCantons}
          preferredCantons={preferredCantons}
        />
      </div>

      {/* Ligne 3: Recommendations */}
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

      {/* Ligne 4: Recent candidatures table */}
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
                const status = getSmartStatus(cand);
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
                const status = getSmartStatus(cand);
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

      {/* Ligne 5: Activity timeline */}
      {!loading && activities.length > 0 && (
        <div className="mb-8">
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

      {/* Ligne 6: Motivation message */}
      {!loading && (
        <MotivationMessage sentCount={sent.length} />
      )}
    </div>
  );
}
