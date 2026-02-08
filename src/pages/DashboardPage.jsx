import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { Icon } from '../components/Icons';

const applications = [
  { id: 1, hospital: 'CHUV', city: 'Lausanne', status: 'pending', date: '02.02.2026', specialty: 'Gériatrie' },
  { id: 2, hospital: 'HUG', city: 'Genève', status: 'positive', date: '01.02.2026', specialty: 'Gériatrie' },
  { id: 3, hospital: 'Hôpital de Nyon', city: 'Nyon', status: 'pending', date: '31.01.2026', specialty: 'Médecine interne' },
  { id: 4, hospital: 'HNE', city: 'Neuchâtel', status: 'negative', date: '30.01.2026', specialty: 'Gériatrie' },
  { id: 5, hospital: 'Hôpital du Valais', city: 'Sion', status: 'pending', date: '29.01.2026', specialty: 'Cardiologie' },
];

const statusConfig = {
  pending: { label: 'En attente', variant: 'warning', icon: <Icon.Clock size={12} /> },
  positive: { label: 'Acceptée', variant: 'success', icon: <Icon.Check size={12} /> },
  negative: { label: 'Refusée', variant: 'error', icon: <Icon.X size={12} /> },
};

export default function DashboardPage() {
  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    positive: applications.filter(a => a.status === 'positive').length,
    negative: applications.filter(a => a.status === 'negative').length,
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
          { label: 'Total envoyées', value: stats.total, color: 'text-primary', bg: 'bg-primary-bg' },
          { label: 'En attente', value: stats.pending, color: 'text-amber-700', bg: 'bg-warning-bg' },
          { label: 'Acceptées', value: stats.positive, color: 'text-emerald-700', bg: 'bg-success-bg' },
          { label: 'Refusées', value: stats.negative, color: 'text-red-700', bg: 'bg-error-bg' },
        ].map((stat, i) => (
          <Card key={i} className={`animate-slide delay-${i + 1}`}>
            <div className={`w-11 h-11 ${stat.bg} rounded-xl mb-4`} />
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{stat.label}</div>
            <div className={`text-[32px] font-bold ${stat.color}`}>{stat.value}</div>
          </Card>
        ))}
      </div>

      {/* Table — Desktop */}
      <Card className="!p-0 hidden md:block">
        <div className="grid grid-cols-[2fr_1fr_1fr_140px_100px] px-6 py-[18px] border-b border-gray-100 text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
          <div>Établissement</div>
          <div>Spécialité</div>
          <div>Date</div>
          <div>Statut</div>
          <div></div>
        </div>
        {applications.map((app, i) => {
          const status = statusConfig[app.status];
          return (
            <div
              key={app.id}
              className={`grid grid-cols-[2fr_1fr_1fr_140px_100px] px-6 py-[18px] items-center text-sm transition-colors hover:bg-gray-50 animate-slide delay-${i + 1} ${
                i < applications.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div>
                <div className="font-semibold">{app.hospital}</div>
                <div className="text-[13px] text-gray-400">{app.city}</div>
              </div>
              <div className="text-gray-600">{app.specialty}</div>
              <div className="text-gray-400">{app.date}</div>
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
        {applications.map((app, i) => {
          const status = statusConfig[app.status];
          return (
            <Card key={app.id} className={`animate-slide delay-${i + 1}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-semibold">{app.hospital}</div>
                  <div className="text-[13px] text-gray-400">{app.city}</div>
                </div>
                <Badge variant={status.variant} icon={status.icon}>{status.label}</Badge>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-gray-600">{app.specialty}</span>
                <span className="text-gray-400">{app.date}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
