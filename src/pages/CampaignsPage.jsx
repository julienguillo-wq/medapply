import { useState, useEffect } from 'react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { Icon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';
import { getCampaigns, getCampaign, sendNextBatch, updateCampaignStatus } from '../services/campaignService';

const statusConfig = {
  draft: { label: 'Brouillon', variant: 'default' },
  in_progress: { label: 'En cours', variant: 'warning' },
  paused: { label: 'En pause', variant: 'default' },
  completed: { label: 'Terminée', variant: 'success' },
};

const itemStatusConfig = {
  pending: { label: 'En attente', color: 'bg-gray-400' },
  generating: { label: 'Génération...', color: 'bg-blue-400' },
  ready: { label: 'Prêt', color: 'bg-amber-400' },
  sent: { label: 'Envoyé', color: 'bg-emerald-400' },
  failed: { label: 'Échoué', color: 'bg-red-400' },
};

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function ProgressBar({ sent, failed, total }) {
  const successPct = total > 0 ? (sent / total) * 100 : 0;
  const failedPct = total > 0 ? (failed / total) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between text-[12px] text-gray-500 mb-1.5">
        <span>{sent + failed}/{total}</span>
        <span>{Math.round(successPct + failedPct)}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
        {successPct > 0 && (
          <div
            className="h-full bg-emerald-400 transition-all duration-500"
            style={{ width: `${successPct}%` }}
          />
        )}
        {failedPct > 0 && (
          <div
            className="h-full bg-red-400 transition-all duration-500"
            style={{ width: `${failedPct}%` }}
          />
        )}
      </div>
    </div>
  );
}

function CampaignDetail({ campaign: initialCampaign, onBack, onRefresh }) {
  const [campaign, setCampaign] = useState(initialCampaign);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  useEffect(() => {
    loadDetail();
  }, [initialCampaign.id]);

  async function loadDetail() {
    setLoading(true);
    const { data } = await getCampaign(initialCampaign.id);
    if (data) setCampaign(data);
    setLoading(false);
  }

  async function handleSendBatch() {
    setSending(true);
    setSendResult(null);
    try {
      const result = await sendNextBatch(campaign.id);
      setSendResult({
        type: 'success',
        text: `${result.sent} email${result.sent > 1 ? 's' : ''} envoyé${result.sent > 1 ? 's' : ''}${result.failed ? `, ${result.failed} échoué${result.failed > 1 ? 's' : ''}` : ''}`,
      });
      await loadDetail();
      onRefresh();
    } catch (err) {
      setSendResult({ type: 'error', text: err.message });
    } finally {
      setSending(false);
    }
  }

  async function handleTogglePause() {
    const newStatus = campaign.status === 'paused' ? 'in_progress' : 'paused';
    const { data } = await updateCampaignStatus(campaign.id, newStatus);
    if (data) {
      setCampaign(prev => ({ ...prev, ...data }));
      onRefresh();
    }
  }

  const items = campaign.items || [];
  const readyCount = items.filter(i => i.item_status === 'ready').length;

  return (
    <div>
      {/* Back + header */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5 cursor-pointer"
      >
        <Icon.Arrow size={16} className="rotate-180" />
        Retour aux campagnes
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold">{campaign.name}</h2>
          <p className="text-gray-500 text-sm mt-1">
            Créée le {formatDate(campaign.created_at)} · {campaign.send_per_day} envois/jour
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={statusConfig[campaign.status]?.variant || 'default'}>
            {statusConfig[campaign.status]?.label || campaign.status}
          </Badge>
          {campaign.status !== 'completed' && (
            <>
              <Button
                variant="secondary"
                size="small"
                onClick={handleTogglePause}
                icon={campaign.status === 'paused' ? <Icon.Play size={14} /> : <Icon.Pause size={14} />}
              >
                {campaign.status === 'paused' ? 'Reprendre' : 'Pause'}
              </Button>
              <Button
                size="small"
                onClick={handleSendBatch}
                disabled={sending || readyCount === 0 || campaign.status === 'paused'}
                icon={<Icon.Send size={14} />}
              >
                {sending ? 'Envoi...' : `Envoyer le prochain batch (${Math.min(readyCount, campaign.send_per_day)})`}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Reminder */}
      {readyCount > 0 && campaign.status !== 'paused' && campaign.status !== 'completed' && (
        <div className="flex items-center gap-2 mb-5 p-3.5 bg-blue-50 border border-blue-100 rounded-xl">
          <Icon.Mail size={16} className="text-blue-600 shrink-0" />
          <p className="text-sm text-blue-700">
            <span className="font-semibold">{Math.min(readyCount, campaign.send_per_day)} candidature{Math.min(readyCount, campaign.send_per_day) > 1 ? 's' : ''}</span> prête{Math.min(readyCount, campaign.send_per_day) > 1 ? 's' : ''} à envoyer aujourd&apos;hui
          </p>
        </div>
      )}

      {/* Progress */}
      <Card className="mb-5">
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Total</div>
            <div className="text-2xl font-bold">{campaign.total_count}</div>
          </div>
          <div>
            <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Envoyés</div>
            <div className="text-2xl font-bold text-emerald-600">{campaign.sent_count}</div>
          </div>
          <div>
            <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Échoués</div>
            <div className="text-2xl font-bold text-red-500">{campaign.failed_count}</div>
          </div>
          <div>
            <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Restants</div>
            <div className="text-2xl font-bold text-amber-500">{readyCount}</div>
          </div>
        </div>
        <ProgressBar sent={campaign.sent_count} failed={campaign.failed_count} total={campaign.total_count} />
      </Card>

      {/* Send result */}
      {sendResult && (
        <div className={`mb-5 p-3 rounded-xl text-sm flex items-center gap-2 ${
          sendResult.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-100'
            : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {sendResult.type === 'success' ? <Icon.Check size={16} /> : <Icon.X size={16} />}
          {sendResult.text}
        </div>
      )}

      {/* Items list */}
      {loading ? (
        <Card className="text-center !py-12">
          <div className="w-[200px] h-1 bg-gray-100 rounded-full mx-auto overflow-hidden">
            <div className="w-[30%] h-full bg-gradient-to-r from-primary via-primary-light to-primary rounded-full animate-shimmer" />
          </div>
        </Card>
      ) : (
        <Card className="!p-0">
          <div className="grid grid-cols-[2fr_1.2fr_1.5fr_100px_100px] px-6 py-[18px] border-b border-gray-100 text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
            <div>Établissement</div>
            <div>Directeur</div>
            <div>Email</div>
            <div>Statut</div>
            <div>Envoyé le</div>
          </div>
          {items.map((item, i) => {
            const statusCfg = itemStatusConfig[item.item_status] || itemStatusConfig.pending;
            return (
              <div
                key={item.id}
                className={`grid grid-cols-[2fr_1.2fr_1.5fr_100px_100px] px-6 py-[18px] items-center text-sm hover:bg-gray-50 transition-colors ${
                  i < items.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className="min-w-0">
                  <div className="font-medium truncate">{item.establishment_name}</div>
                  {item.specialty && <div className="text-[12px] text-gray-400">{item.specialty}</div>}
                </div>
                <div className="text-gray-600 text-[13px] truncate">{item.director_name || '—'}</div>
                <div className="text-gray-600 text-[13px] truncate">{item.director_email || '—'}</div>
                <div className="flex items-center gap-1.5">
                  <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${statusCfg.color}`} />
                  <span className="text-[13px]">{statusCfg.label}</span>
                </div>
                <div className="text-gray-400 text-[13px]">
                  {item.sent_at ? formatDate(item.sent_at) : '—'}
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

export default function CampaignsPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);

  useEffect(() => {
    if (user?.id) loadCampaigns();
  }, [user?.id]);

  async function loadCampaigns() {
    setLoading(true);
    const { data } = await getCampaigns(user.id);
    setCampaigns(data);
    setLoading(false);
  }

  if (selectedCampaign) {
    return (
      <div className="animate-fade">
        <CampaignDetail
          campaign={selectedCampaign}
          onBack={() => setSelectedCampaign(null)}
          onRefresh={loadCampaigns}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="animate-fade">
        <div className="mb-8">
          <h1 className="text-[28px] font-bold tracking-tight mb-2">Campagnes</h1>
          <p className="text-gray-500 text-[15px]">Chargement...</p>
        </div>
        <Card className="text-center !py-16">
          <div className="w-[200px] h-1 bg-gray-100 rounded-full mx-auto overflow-hidden">
            <div className="w-[30%] h-full bg-gradient-to-r from-primary via-primary-light to-primary rounded-full animate-shimmer" />
          </div>
        </Card>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="animate-fade">
        <div className="mb-8">
          <h1 className="text-[28px] font-bold tracking-tight mb-2">Campagnes</h1>
          <p className="text-gray-500 text-[15px]">Envoi groupé de candidatures</p>
        </div>
        <Card className="text-center !py-16 !px-10">
          <Icon.Layers size={40} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-lg font-bold mb-2">Aucune campagne</h2>
          <p className="text-gray-500 text-sm max-w-[380px] mx-auto">
            Sélectionnez des établissements dans la page Recherche puis cliquez sur &laquo; Lancer une campagne &raquo; pour créer votre première campagne d&apos;envoi groupé.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold tracking-tight mb-2">Campagnes</h1>
        <p className="text-gray-500 text-[15px]">{campaigns.length} campagne{campaigns.length > 1 ? 's' : ''}</p>
      </div>

      <div className="flex flex-col gap-4">
        {campaigns.map((campaign) => {
          const status = statusConfig[campaign.status] || statusConfig.draft;
          const readyCount = campaign.total_count - campaign.sent_count - campaign.failed_count;

          return (
            <Card
              key={campaign.id}
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => setSelectedCampaign(campaign)}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Icon.Layers size={20} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{campaign.name}</h3>
                    <p className="text-[13px] text-gray-400">{formatDate(campaign.created_at)} · {campaign.send_per_day} envois/jour</p>
                  </div>
                </div>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>

              <ProgressBar sent={campaign.sent_count} failed={campaign.failed_count} total={campaign.total_count} />

              <div className="flex items-center gap-4 mt-3 text-[13px] text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                  {campaign.sent_count} envoyé{campaign.sent_count > 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
                  {campaign.failed_count} échoué{campaign.failed_count > 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                  {readyCount} restant{readyCount > 1 ? 's' : ''}
                </span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
