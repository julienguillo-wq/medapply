import { useState, useEffect } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { Icon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';
import { getCandidatures } from '../services/candidaturesService';

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

export default function DashboardPage() {
  const { user } = useAuth();
  const [candidatures, setCandidatures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    async function load() {
      const { data } = await getCandidatures(user.id);
      setCandidatures(data);
      setLoading(false);
    }
    load();
  }, [user?.id]);

  const stats = {
    total: candidatures.length,
    draft: candidatures.filter(c => c.status === 'draft').length,
    sent: candidatures.filter(c => c.status === 'sent').length,
    replied: candidatures.filter(c => c.status === 'replied').length,
    rejected: candidatures.filter(c => c.status === 'rejected').length,
  };

  return (
    <div className="animate-fade">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold tracking-tight mb-2">Tableau de bord</h1>
        <p className="text-gray-500 text-[15px]">Suivez l&apos;état de vos candidatures</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
        {[
          { label: 'Total', value: stats.total, color: 'text-primary', bg: 'bg-primary-bg' },
          { label: 'Envoyées', value: stats.sent, color: 'text-amber-700', bg: 'bg-warning-bg' },
          { label: 'Réponses', value: stats.replied, color: 'text-emerald-700', bg: 'bg-success-bg' },
          { label: 'Refusées', value: stats.rejected, color: 'text-red-700', bg: 'bg-error-bg' },
        ].map((stat, i) => (
          <Card key={i} className={`animate-slide delay-${i + 1}`}>
            <div className={`w-11 h-11 ${stat.bg} rounded-xl mb-4`} />
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{stat.label}</div>
            <div className={`text-[32px] font-bold ${stat.color}`}>{loading ? '—' : stat.value}</div>
          </Card>
        ))}
      </div>

      {loading ? (
        <Card className="text-center !py-16">
          <div className="w-[200px] h-1 bg-gray-100 rounded-full mx-auto overflow-hidden">
            <div className="w-[30%] h-full bg-gradient-to-r from-primary via-primary-light to-primary rounded-full animate-shimmer" />
          </div>
        </Card>
      ) : candidatures.length === 0 ? (
        <Card className="text-center !py-12">
          <Icon.Send size={40} className="mx-auto text-gray-300 mb-4" />
          <div className="text-gray-500 text-[15px] font-medium mb-1">Aucune candidature</div>
          <div className="text-gray-400 text-[13px]">Vos candidatures apparaîtront ici</div>
        </Card>
      ) : (
        <>
          {/* Table — Desktop */}
          <Card className="!p-0 hidden md:block">
            <div className="grid grid-cols-[2fr_1fr_1fr_140px_100px] px-6 py-[18px] border-b border-gray-100 text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
              <div>Établissement</div>
              <div>Spécialité</div>
              <div>Date</div>
              <div>Statut</div>
              <div></div>
            </div>
            {candidatures.map((cand, i) => {
              const status = statusConfig[cand.status] || statusConfig.draft;
              return (
                <div
                  key={cand.id}
                  className={`grid grid-cols-[2fr_1fr_1fr_140px_100px] px-6 py-[18px] items-center text-sm transition-colors hover:bg-gray-50 animate-slide delay-${Math.min(i + 1, 5)} ${
                    i < candidatures.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <div>
                    <div className="font-semibold">{cand.establishment_name}</div>
                    <div className="text-[13px] text-gray-400">{cand.establishment_city}{cand.establishment_canton ? ` (${cand.establishment_canton})` : ''}</div>
                  </div>
                  <div className="text-gray-600">{cand.specialty || '—'}</div>
                  <div className="text-gray-400">{formatDate(cand.sent_at || cand.created_at)}</div>
                  <div>
                    <Badge variant={status.variant} icon={status.icon}>{status.label}</Badge>
                  </div>
                  <div className="text-right">
                    <Button variant="ghost" size="small">Détails</Button>
                  </div>
                </div>
              );
            })}
          </Card>

          {/* Cards — Mobile */}
          <div className="flex flex-col gap-3 md:hidden">
            {candidatures.map((cand, i) => {
              const status = statusConfig[cand.status] || statusConfig.draft;
              return (
                <Card key={cand.id} className={`animate-slide delay-${Math.min(i + 1, 5)}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold">{cand.establishment_name}</div>
                      <div className="text-[13px] text-gray-400">{cand.establishment_city}{cand.establishment_canton ? ` (${cand.establishment_canton})` : ''}</div>
                    </div>
                    <Badge variant={status.variant} icon={status.icon}>{status.label}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-gray-600">{cand.specialty || '—'}</span>
                    <span className="text-gray-400">{formatDate(cand.sent_at || cand.created_at)}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
