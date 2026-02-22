import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Card from '../components/Card';
import Badge from '../components/Badge';
import { Icon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { cantonPaths } from '../components/SwitzerlandMap';

// --- Animated counter hook ---
function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    }
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [target, duration]);

  return value;
}

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

function isStale(cand) {
  if (cand.status !== 'sent') return false;
  const days = (new Date() - new Date(cand.sent_at || cand.created_at)) / (1000 * 60 * 60 * 24);
  return days > 14;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
  const days = Math.floor(diff / 86400);
  return days === 1 ? 'Il y a 1 jour' : `Il y a ${days} jours`;
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
      const d = new Date(c.created_at);
      return d >= weekStart && d < weekEnd;
    }).length;
    weeks.push({
      name: weekStart.toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit' }),
      candidatures: count,
    });
  }
  return weeks;
}

// --- Custom chart tooltip ---
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white px-3.5 py-2.5 rounded-xl text-xs shadow-xl border border-white/10">
      <div className="text-gray-400 mb-0.5">{label}</div>
      <div className="font-bold text-[13px]">{payload[0].value} candidature{payload[0].value !== 1 ? 's' : ''}</div>
    </div>
  );
}

// --- Section title with colored bar ---
function SectionTitle({ children }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-bold">{children}</h2>
      <div className="w-10 h-[3px] bg-primary rounded-full mt-1.5" />
    </div>
  );
}

// --- Gradient stat card ---
const statCardConfigs = [
  { label: 'Candidatures envoyées', gradient: 'from-[#3B82F6] to-[#1D4ED8]', shadow: 'rgba(59,130,246,0.3)', iconComp: Icon.Send },
  { label: 'En attente', gradient: 'from-[#F59E0B] to-[#D97706]', shadow: 'rgba(245,158,11,0.3)', iconComp: Icon.Clock },
  { label: 'Réponses reçues', gradient: 'from-[#10B981] to-[#059669]', shadow: 'rgba(16,185,129,0.3)', iconComp: Icon.Check },
  { label: 'Taux de réponse', gradient: 'from-[#8B5CF6] to-[#6D28D9]', shadow: 'rgba(139,92,246,0.3)', iconComp: Icon.Activity },
];

function StatCard({ config, value, suffix = '', loading, delay }) {
  const animated = useCountUp(loading ? 0 : (typeof value === 'number' ? value : 0), 800);
  const display = loading ? '—' : (typeof value === 'number' ? `${animated}${suffix}` : value);
  const IconComp = config.iconComp;

  return (
    <div
      className={`animate-slide delay-${delay} relative overflow-hidden rounded-2xl bg-gradient-to-br ${config.gradient} p-5 text-white transition-all duration-300 hover:-translate-y-0.5 cursor-default`}
      style={{ boxShadow: `0 4px 20px ${config.shadow}` }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 8px 30px ${config.shadow}`; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 4px 20px ${config.shadow}`; }}
    >
      {/* Watermark icon */}
      <div className="absolute top-3 right-3 opacity-15">
        <IconComp size={48} />
      </div>
      <div className="relative">
        <div className="text-[11px] uppercase tracking-[0.1em] text-white/70 mb-2 font-semibold">{config.label}</div>
        <div className="text-[48px] font-[800] leading-none">{display}</div>
      </div>
    </div>
  );
}

// --- Profile progress donut ---
function ProfileProgress({ profile, hasDocuments, hasCandidatures, hasParcours }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { const t = setTimeout(() => setMounted(true), 200); return () => clearTimeout(t); }, []);

  const criteria = [
    { label: 'Profil rempli', done: !!(profile?.first_name && profile?.last_name && profile?.specialty), to: '/profil' },
    { label: 'CV complété', done: hasParcours, to: '/parcours' },
    { label: 'Documents uploadés', done: hasDocuments, to: '/documents' },
    { label: 'Cantons préférés', done: profile?.preferred_cantons?.length > 0, to: '/profil' },
    { label: 'Candidature envoyée', done: hasCandidatures, to: '/recherche' },
  ];

  const completed = criteria.filter(c => c.done).length;
  const percent = Math.round((completed / criteria.length) * 100);
  const colorStart = percent >= 80 ? '#10B981' : percent >= 40 ? '#FBBF24' : '#F87171';
  const colorEnd = percent >= 80 ? '#059669' : percent >= 40 ? '#D97706' : '#DC2626';

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div
      className="bg-white rounded-2xl border border-gray-200 shadow-sm h-full p-6 transition-all duration-250"
      style={{ borderLeft: '4px solid #10B981' }}
    >
      <h3 className="text-sm font-bold mb-4">Complétion du profil</h3>
      <div className="flex items-center gap-5">
        <div className="relative shrink-0">
          <svg width={120} height={120} className="-rotate-90">
            <defs>
              <linearGradient id="donutGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={colorStart} />
                <stop offset="100%" stopColor={colorEnd} />
              </linearGradient>
            </defs>
            <circle cx={60} cy={60} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={8} />
            <circle
              cx={60} cy={60} r={radius}
              fill="none" stroke="url(#donutGrad)" strokeWidth={8}
              strokeDasharray={circumference}
              strokeDashoffset={mounted ? offset : circumference}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-[800]" style={{ color: colorEnd }}>{percent}%</span>
          </div>
        </div>
        <div className="flex-1 space-y-2.5">
          {criteria.map((c, i) => (
            <Link
              key={i}
              to={c.to}
              className="flex items-center gap-2.5 text-[13px] hover:text-primary transition-colors group"
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                  c.done
                    ? 'bg-emerald-500 text-white'
                    : 'border-2 border-gray-300 group-hover:border-primary'
                }`}
                style={c.done ? { animation: `checkPop 0.4s ease-out ${0.8 + i * 0.1}s both` } : undefined}
              >
                {c.done && (
                  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </span>
              <span className={c.done ? 'text-gray-400 line-through' : 'text-gray-700'}>{c.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// --- Mini Switzerland Map ---
function MiniSwitzerlandMap({ candidatureCantons, preferredCantons }) {
  const [hovered, setHovered] = useState(null);

  return (
    <Card className="h-full flex flex-col">
      <h3 className="text-sm font-bold mb-3">Couverture géographique</h3>
      <div className="flex-1 flex items-center justify-center">
        <svg viewBox="0 0 460 440" className="w-full max-w-[300px] h-auto">
          <defs>
            <linearGradient id="appliedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
            <filter id="cantonShadow">
              <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.15" />
            </filter>
          </defs>
          {Object.entries(cantonPaths).map(([id, path]) => {
            const hasApplied = candidatureCantons.includes(id);
            const isPreferred = preferredCantons.includes(id);
            const isHovered = hovered === id;

            let fill = '#e5e5e5';
            let textFill = '#737373';
            if (hasApplied) { fill = 'url(#appliedGrad)'; textFill = 'white'; }
            else if (isPreferred) { fill = '#b3d4ff'; textFill = '#0052CC'; }

            return (
              <g key={id}>
                <path
                  d={path.d} fill={fill} stroke="#fff" strokeWidth={1}
                  filter={isHovered ? 'url(#cantonShadow)' : undefined}
                  style={{
                    transition: 'all 0.25s ease',
                    transform: isHovered ? 'scale(1.03)' : 'scale(1)',
                    transformOrigin: `${path.cx}px ${path.cy}px`,
                    cursor: 'default',
                  }}
                  onMouseEnter={() => setHovered(id)}
                  onMouseLeave={() => setHovered(null)}
                />
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
          <span className="w-2.5 h-2.5 rounded-full bg-[#1D4ED8] inline-block" /> Postulé
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
    <div
      className="rounded-2xl p-6 md:p-8"
      style={{
        borderLeft: '4px solid #8B5CF6',
        background: 'linear-gradient(135deg, #EFF6FF 0%, #F5F3FF 40%, #FDF2F8 100%)',
      }}
    >
      <p className="text-center text-[15px] md:text-base text-gray-600 font-medium">
        {text} <span className="text-2xl align-middle">{emoji}</span>
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
  const [recentReplies, setRecentReplies] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    async function loadData() {
      const [candResult, docsResult, parcoursResult] = await Promise.all([
        supabase.from('candidatures').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('documents').select('id').eq('user_id', user.id).limit(1),
        supabase.from('parcours_stages').select('id').eq('user_id', user.id).limit(1),
      ]);
      const cands = candResult.data || [];
      setCandidatures(cands);
      setDocuments(docsResult.data || []);
      setHasParcours((parcoursResult.data || []).length > 0);

      // Compter les réponses détectées dans les dernières 24h
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const recent = cands.filter(c =>
        c.reply_detected_at && new Date(c.reply_detected_at).getTime() > oneDayAgo
      ).length;
      setRecentReplies(recent);

      setLoading(false);
    }
    loadData();
  }, [user?.id]);

  // --- Stats ---
  const sent = candidatures.filter(c => c.status === 'sent' || c.status === 'replied' || c.status === 'rejected');
  const pending = candidatures.filter(c => c.status === 'sent');
  const replied = candidatures.filter(c => c.status === 'replied' || c.status === 'rejected');
  const responseRate = sent.length > 0 ? Math.round((replied.length / sent.length) * 100) : 0;
  const statValues = [sent.length, pending.length, replied.length, responseRate];

  // --- Chart data ---
  const weeklyData = useMemo(() => getWeeklyData(candidatures), [candidatures]);

  // --- Canton data ---
  const candidatureCantons = useMemo(
    () => [...new Set(candidatures.filter(c => c.establishment_canton).map(c => c.establishment_canton))],
    [candidatures]
  );
  const preferredCantons = profile?.preferred_cantons || [];

  // --- Recommendations ---
  const recommendations = [];
  if (!profile?.first_name || !profile?.last_name || !profile?.specialty) {
    recommendations.push({ title: 'Complétez votre profil', description: 'Ajoutez vos informations personnelles pour postuler', to: '/profil', icon: <Icon.User size={20} />, color: 'text-primary', bg: 'bg-primary-bg' });
  }
  if (documents.length === 0) {
    recommendations.push({ title: 'Ajoutez vos documents', description: 'CV, diplômes et lettres de recommandation', to: '/documents', icon: <Icon.File size={20} />, color: 'text-amber-700', bg: 'bg-warning-bg' });
  }
  if (!profile?.preferred_cantons?.length) {
    recommendations.push({ title: 'Définissez vos cantons préférés', description: 'Pour cibler les établissements compatibles', to: '/profil', icon: <Icon.Map size={20} />, color: 'text-emerald-700', bg: 'bg-success-bg' });
  }
  const stale = candidatures.filter(c => isStale(c));
  if (stale.length > 0) {
    recommendations.push({
      title: `${stale.length} candidature${stale.length > 1 ? 's' : ''} à relancer`,
      description: stale.slice(0, 3).map(c => c.establishment_name).join(', ') + (stale.length > 3 ? '…' : ''),
      to: '/candidatures', icon: <Icon.Clock size={20} />, color: 'text-red-700', bg: 'bg-error-bg',
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

  const recent5 = candidatures.slice(0, 5);
  const firstName = profile?.first_name || 'Docteur';

  return (
    <div className="animate-fade">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[32px] font-[800] tracking-tight mb-1">
          Bonjour, {firstName}
        </h1>
        <p className="text-gray-500 text-[15px]">
          Voici un résumé de vos candidatures
        </p>
      </div>

      {/* Bannière réponses reçues */}
      {!loading && recentReplies > 0 && (
        <Link
          to="/candidatures"
          className="flex items-center gap-3 px-5 py-3.5 mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm text-emerald-800 hover:bg-emerald-100 transition-colors group"
        >
          <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
            <Icon.Mail size={16} className="text-white" />
          </div>
          <span className="font-semibold flex-1">
            {recentReplies} nouvelle{recentReplies > 1 ? 's' : ''} réponse{recentReplies > 1 ? 's' : ''} reçue{recentReplies > 1 ? 's' : ''} !
          </span>
          <span className="text-emerald-600 text-xs font-medium group-hover:underline">Voir les candidatures</span>
          <Icon.ChevronRight size={16} className="text-emerald-400" />
        </Link>
      )}

      {/* Ligne 1: Gradient stats + Profile progress */}
      <div className="flex flex-col lg:flex-row gap-4 mb-8">
        <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {statCardConfigs.map((config, i) => (
            <StatCard
              key={i}
              config={config}
              value={i === 3 ? responseRate : statValues[i]}
              suffix={i === 3 ? '%' : ''}
              loading={loading}
              delay={i + 1}
            />
          ))}
        </div>
        <div className="lg:w-[340px] shrink-0">
          <ProfileProgress
            profile={profile}
            hasDocuments={documents.length > 0}
            hasCandidatures={candidatures.some(c => c.status !== 'draft')}
            hasParcours={hasParcours}
          />
        </div>
      </div>

      {/* Ligne 2: Chart + Mini map */}
      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 mb-8">
        <Card>
          <SectionTitle>Activité des candidatures</SectionTitle>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#3B82F6', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area
                  type="monotone"
                  dataKey="candidatures"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  fill="url(#chartGradient)"
                  dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7, fill: '#3B82F6', strokeWidth: 3, stroke: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <MiniSwitzerlandMap candidatureCantons={candidatureCantons} preferredCantons={preferredCantons} />
      </div>

      {/* Ligne 3: Recommendations */}
      {!loading && recommendations.length > 0 && (
        <div className="mb-8">
          <SectionTitle>Actions recommandées</SectionTitle>
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
        <div className="flex items-center justify-between">
          <SectionTitle>Dernières candidatures</SectionTitle>
          {candidatures.length > 5 && (
            <Link to="/candidatures" className="text-primary text-sm font-semibold hover:underline mb-5">
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
            <Card className="!p-0 hidden md:block overflow-hidden">
              <div className="grid grid-cols-[1fr_120px_80px_140px_100px] px-6 py-3 border-b border-gray-100 text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
                <div>Établissement</div>
                <div>Date</div>
                <div>Canton</div>
                <div>Statut</div>
                <div>Action</div>
              </div>
              {recent5.map((cand, i) => {
                const status = getSmartStatus(cand);
                const staleRow = isStale(cand);
                return (
                  <div
                    key={cand.id}
                    className={`grid grid-cols-[1fr_120px_80px_140px_100px] px-6 py-4 items-center text-sm transition-colors hover:bg-blue-50/50 ${
                      i < recent5.length - 1 ? 'border-b border-gray-100' : ''
                    } ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}
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
                    <div>
                      {staleRow ? (
                        <Link
                          to="/candidatures"
                          className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline transition-colors"
                        >
                          Relancer
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </Card>

            {/* Mobile cards */}
            <div className="flex flex-col gap-3 md:hidden">
              {recent5.map((cand) => {
                const status = getSmartStatus(cand);
                const staleRow = isStale(cand);
                return (
                  <Card key={cand.id}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm">{cand.establishment_name}</div>
                        <div className="text-[13px] text-gray-400">{cand.establishment_city}{cand.establishment_canton ? ` (${cand.establishment_canton})` : ''}</div>
                      </div>
                      <Badge variant={status.variant} icon={status.icon}>{status.label}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-gray-400 text-[13px]">{formatDate(cand.sent_at || cand.created_at)}</div>
                      {staleRow && (
                        <Link to="/candidatures" className="text-xs font-semibold text-red-600">
                          Relancer
                        </Link>
                      )}
                    </div>
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
          <SectionTitle>Activité récente</SectionTitle>
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
      {!loading && <MotivationMessage sentCount={sent.length} />}
    </div>
  );
}
