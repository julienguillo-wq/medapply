import { useState, useEffect } from 'react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { Icon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';
import { getCampaigns, getCampaign, sendNextBatch, updateCampaignStatus, getCronStatus } from '../services/campaignService';

const statusConfig = {
  draft: { label: 'Brouillon', variant: 'default' },
  in_progress: { label: 'En cours', variant: 'warning' },
  paused: { label: 'En pause', variant: 'default' },
  completed: { label: 'Terminee', variant: 'success' },
};

const itemStatusConfig = {
  pending: { label: 'En attente', color: 'bg-gray-400', icon: 'Clock' },
  generating: { label: 'Generation...', color: 'bg-blue-400', icon: 'Clock' },
  ready: { label: 'En file d\'attente', color: 'bg-amber-400', icon: 'Clock' },
  sent: { label: 'Envoye', color: 'bg-emerald-400', icon: 'Check' },
  failed: { label: 'Echec', color: 'bg-red-400', icon: 'X' },
};

function formatDate(dateStr) {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('fr-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-CH', {
    day: '2-digit',
    month: 'short',
  }) + ' ' + d.toLocaleTimeString('fr-CH', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getEstimation(readyCount, sendPerDay) {
  if (readyCount <= 0) return null;
  const days = Math.ceil(readyCount / sendPerDay);
  if (days === 1) return 'Envoi termine demain';
  return `Envoi termine dans ~${days} jours`;
}

// ============================================================
// Barre de progression amelioree
// ============================================================
function ProgressBar({ sent, failed, total, sendPerDay }) {
  const successPct = total > 0 ? (sent / total) * 100 : 0;
  const failedPct = total > 0 ? (failed / total) * 100 : 0;
  const remaining = Math.max(0, total - sent - failed);
  const estimation = getEstimation(remaining, sendPerDay);

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="font-semibold text-gray-700">
          {sent}/{total} envoye{sent > 1 ? 's' : ''}
        </span>
        <span className="text-gray-500">{Math.round(successPct + failedPct)}%</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
        {successPct > 0 && (
          <div
            className="h-full bg-emerald-400 transition-all duration-700 ease-out"
            style={{ width: `${successPct}%` }}
          />
        )}
        {failedPct > 0 && (
          <div
            className="h-full bg-red-400 transition-all duration-700 ease-out"
            style={{ width: `${failedPct}%` }}
          />
        )}
      </div>
      {estimation && (
        <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
          <Icon.Clock size={12} />
          {estimation}
        </p>
      )}
    </div>
  );
}

// ============================================================
// Badge statut du scheduler
// ============================================================
function SchedulerBadge({ campaign, cronActive }) {
  const remaining = Math.max(0, campaign.total_count - campaign.sent_count - campaign.failed_count);

  if (campaign.status === 'completed') {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-700">
        <Icon.Check size={16} className="shrink-0" />
        <span>Campagne terminee -- {campaign.sent_count}/{campaign.total_count} envoye{campaign.sent_count > 1 ? 's' : ''}</span>
      </div>
    );
  }

  if (campaign.status === 'paused') {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600">
        <Icon.Pause size={16} className="shrink-0" />
        <span>Campagne en pause -- envoi automatique suspendu</span>
      </div>
    );
  }

  if (cronActive && remaining > 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
        </span>
        <span>
          Envoi automatique actif -- prochain batch demain 08:00 ({Math.min(remaining, campaign.send_per_day)} mail{Math.min(remaining, campaign.send_per_day) > 1 ? 's' : ''})
        </span>
      </div>
    );
  }

  return null;
}

// ============================================================
// Timeline des envois
// ============================================================
function SendTimeline({ items, campaign }) {
  // Grouper les items envoyés par date
  const sentItems = items.filter(i => i.item_status === 'sent' && i.sent_at);
  const readyItems = items.filter(i => i.item_status === 'ready');

  // Regrouper par jour
  const batches = {};
  sentItems.forEach(item => {
    const d = new Date(item.sent_at);
    const key = d.toLocaleDateString('fr-CH');
    if (!batches[key]) batches[key] = { date: d, items: [] };
    batches[key].items.push(item);
  });

  const batchList = Object.values(batches).sort((a, b) => b.date - a.date);

  // Prochain batch prévu
  const nextBatchCount = Math.min(readyItems.length, campaign.send_per_day);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);

  return (
    <div className="relative">
      {/* Ligne verticale */}
      <div className="absolute left-[11px] top-3 bottom-3 w-px bg-gray-200" />

      {/* Prochain batch prevu */}
      {readyItems.length > 0 && campaign.status !== 'paused' && campaign.status !== 'completed' && (
        <div className="relative flex gap-3 mb-4">
          <div className="relative z-10 w-6 h-6 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center shrink-0 mt-0.5">
            <Icon.Clock size={12} className="text-amber-600" />
          </div>
          <div className="flex-1 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-amber-700">
                {formatDateTime(tomorrow)} -- {nextBatchCount} mail{nextBatchCount > 1 ? 's' : ''} prevu{nextBatchCount > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {readyItems.slice(0, nextBatchCount).map(item => (
                <span key={item.id} className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                  {item.director_name || item.establishment_name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Batches deja envoyes */}
      {batchList.map((batch, i) => (
        <div key={i} className="relative flex gap-3 mb-4 last:mb-0">
          <div className="relative z-10 w-6 h-6 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
            <Icon.Check size={12} className="text-emerald-600" />
          </div>
          <div className="flex-1 bg-white border border-gray-100 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-gray-700">
                {formatDateTime(batch.date)} -- {batch.items.length} mail{batch.items.length > 1 ? 's' : ''} envoye{batch.items.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {batch.items.map(item => (
                <span key={item.id} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                  {item.director_name || item.establishment_name}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}

      {batchList.length === 0 && readyItems.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">Aucun envoi pour le moment</p>
      )}
    </div>
  );
}

// ============================================================
// Detail d'une campagne
// ============================================================
function CampaignDetail({ campaign: initialCampaign, onBack, onRefresh, cronActive }) {
  const [campaign, setCampaign] = useState(initialCampaign);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [activeTab, setActiveTab] = useState('timeline');

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
        text: `${result.sent} email${result.sent > 1 ? 's' : ''} envoye${result.sent > 1 ? 's' : ''}${result.failed ? `, ${result.failed} echoue${result.failed > 1 ? 's' : ''}` : ''}`,
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
  const sentItems = items.filter(i => i.item_status === 'sent');
  const failedItems = items.filter(i => i.item_status === 'failed');
  const readyItems = items.filter(i => i.item_status === 'ready');

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

      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold">{campaign.name}</h2>
          <p className="text-gray-500 text-sm mt-1">
            Creee le {formatDate(campaign.created_at)} -- {campaign.send_per_day} envois/jour
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
                {sending ? 'Envoi...' : `Envoyer maintenant (${Math.min(readyCount, campaign.send_per_day)})`}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Scheduler status badge */}
      <div className="mb-5">
        <SchedulerBadge campaign={campaign} cronActive={cronActive} />
      </div>

      {/* Progress bar */}
      <Card className="mb-5">
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Total</div>
            <div className="text-2xl font-bold">{campaign.total_count}</div>
          </div>
          <div>
            <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Envoyes</div>
            <div className="text-2xl font-bold text-emerald-600">{campaign.sent_count}</div>
          </div>
          <div>
            <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Echoues</div>
            <div className="text-2xl font-bold text-red-500">{campaign.failed_count}</div>
          </div>
          <div>
            <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Restants</div>
            <div className="text-2xl font-bold text-amber-500">{readyCount}</div>
          </div>
        </div>
        <ProgressBar
          sent={campaign.sent_count}
          failed={campaign.failed_count}
          total={campaign.total_count}
          sendPerDay={campaign.send_per_day}
        />
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

      {/* Tabs: Timeline / Destinataires */}
      {loading ? (
        <Card className="text-center !py-12">
          <div className="w-[200px] h-1 bg-gray-100 rounded-full mx-auto overflow-hidden">
            <div className="w-[30%] h-full bg-gradient-to-r from-primary via-primary-light to-primary rounded-full animate-shimmer" />
          </div>
        </Card>
      ) : (
        <>
          <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'timeline'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <Icon.Clock size={14} />
                Timeline des envois
              </span>
            </button>
            <button
              onClick={() => setActiveTab('recipients')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === 'recipients'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <Icon.User size={14} />
                Destinataires ({items.length})
              </span>
            </button>
          </div>

          {activeTab === 'timeline' && (
            <Card>
              <SendTimeline items={items} campaign={campaign} />
            </Card>
          )}

          {activeTab === 'recipients' && (
            <Card className="!p-0">
              {/* Summary counters */}
              <div className="flex items-center gap-4 px-6 py-3 border-b border-gray-100 bg-gray-50/50">
                <span className="text-xs text-gray-500 flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                  {sentItems.length} envoye{sentItems.length > 1 ? 's' : ''}
                </span>
                <span className="text-xs text-gray-500 flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                  {readyItems.length} en attente
                </span>
                <span className="text-xs text-gray-500 flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
                  {failedItems.length} echoue{failedItems.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Recipients list */}
              {items.map((item, i) => {
                const statusCfg = itemStatusConfig[item.item_status] || itemStatusConfig.pending;
                const StatusIcon = Icon[statusCfg.icon] || Icon.Clock;

                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors ${
                      i < items.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    {/* Status icon */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      item.item_status === 'sent' ? 'bg-emerald-100' :
                      item.item_status === 'failed' ? 'bg-red-100' :
                      'bg-gray-100'
                    }`}>
                      <StatusIcon size={14} className={
                        item.item_status === 'sent' ? 'text-emerald-600' :
                        item.item_status === 'failed' ? 'text-red-500' :
                        'text-gray-400'
                      } />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.establishment_name}</div>
                      <div className="text-xs text-gray-400 truncate">
                        {item.director_name || '--'} -- {item.director_email || 'Pas d\'email'}
                      </div>
                    </div>

                    {/* Specialty */}
                    {item.specialty && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0 hidden sm:block">
                        {item.specialty}
                      </span>
                    )}

                    {/* Status + date */}
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${statusCfg.color}`} />
                        <span className="text-xs font-medium">{statusCfg.label}</span>
                      </div>
                      {item.sent_at && (
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {formatDateTime(item.sent_at)}
                        </div>
                      )}
                      {item.error_message && (
                        <div className="text-[11px] text-red-400 mt-0.5 max-w-[200px] truncate" title={item.error_message}>
                          {item.error_message}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// Page principale — liste des campagnes
// ============================================================
export default function CampaignsPage() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [cronActive, setCronActive] = useState(false);

  useEffect(() => {
    if (user?.id) loadCampaigns();
    loadCronStatus();
  }, [user?.id]);

  async function loadCampaigns() {
    setLoading(true);
    const { data } = await getCampaigns(user.id);
    setCampaigns(data);
    setLoading(false);
  }

  async function loadCronStatus() {
    try {
      const status = await getCronStatus();
      setCronActive(status.active === true);
    } catch {
      setCronActive(false);
    }
  }

  if (selectedCampaign) {
    return (
      <div className="animate-fade">
        <CampaignDetail
          campaign={selectedCampaign}
          onBack={() => setSelectedCampaign(null)}
          onRefresh={loadCampaigns}
          cronActive={cronActive}
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
          <p className="text-gray-500 text-[15px]">Envoi groupe de candidatures</p>
        </div>
        <Card className="text-center !py-16 !px-10">
          <Icon.Layers size={40} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-lg font-bold mb-2">Aucune campagne</h2>
          <p className="text-gray-500 text-sm max-w-[380px] mx-auto">
            Selectionnez des etablissements dans la page Recherche puis cliquez sur &laquo; Lancer une campagne &raquo; pour creer votre premiere campagne d&apos;envoi groupe.
          </p>
        </Card>
      </div>
    );
  }

  // Compter campagnes actives
  const activeCampaigns = campaigns.filter(c => c.status === 'in_progress' || c.status === 'draft');

  return (
    <div className="animate-fade">
      <div className="mb-6">
        <h1 className="text-[28px] font-bold tracking-tight mb-2">Campagnes</h1>
        <p className="text-gray-500 text-[15px]">{campaigns.length} campagne{campaigns.length > 1 ? 's' : ''}</p>
      </div>

      {/* Global scheduler status */}
      {cronActive && activeCampaigns.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 mb-5 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
          </span>
          <span>
            Envoi automatique actif -- {activeCampaigns.length} campagne{activeCampaigns.length > 1 ? 's' : ''} en cours, prochain envoi demain 08:00
          </span>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {campaigns.map((campaign) => {
          const status = statusConfig[campaign.status] || statusConfig.draft;
          const readyCount = campaign.total_count - campaign.sent_count - campaign.failed_count;
          const estimation = getEstimation(readyCount, campaign.send_per_day);

          return (
            <Card
              key={campaign.id}
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => setSelectedCampaign(campaign)}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    campaign.status === 'completed' ? 'bg-emerald-100' :
                    campaign.status === 'paused' ? 'bg-gray-100' :
                    'bg-primary/10'
                  }`}>
                    {campaign.status === 'completed' ? (
                      <Icon.Check size={20} className="text-emerald-600" />
                    ) : campaign.status === 'paused' ? (
                      <Icon.Pause size={20} className="text-gray-400" />
                    ) : (
                      <Icon.Layers size={20} className="text-primary" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{campaign.name}</h3>
                    <p className="text-[13px] text-gray-400">
                      {formatDate(campaign.created_at)} -- {campaign.send_per_day} envois/jour
                      {estimation && campaign.status !== 'completed' && campaign.status !== 'paused' && (
                        <span className="text-blue-500 ml-2">-- {estimation}</span>
                      )}
                    </p>
                  </div>
                </div>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>

              <ProgressBar
                sent={campaign.sent_count}
                failed={campaign.failed_count}
                total={campaign.total_count}
                sendPerDay={campaign.send_per_day}
              />

              <div className="flex items-center gap-4 mt-3 text-[13px] text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                  {campaign.sent_count} envoye{campaign.sent_count > 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
                  {campaign.failed_count} echoue{campaign.failed_count > 1 ? 's' : ''}
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
