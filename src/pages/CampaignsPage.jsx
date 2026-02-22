import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import { Icon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getCampaigns, getCampaign, sendNextBatch, updateCampaignStatus, getCronStatus } from '../services/campaignService';

const statusConfig = {
  draft: { label: 'Brouillon', variant: 'default' },
  in_progress: { label: 'En cours', variant: 'warning' },
  paused: { label: 'En pause', variant: 'default' },
  completed: { label: 'Terminée', variant: 'success' },
};

function formatDate(dateStr) {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-CH', { day: '2-digit', month: 'short' })
    + ' ' + d.toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });
}

function formatShortDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fr-CH', { day: '2-digit', month: 'short' });
}

// ============================================================
// Progress bar
// ============================================================
function ProgressBar({ sent, failed, total }) {
  const successPct = total > 0 ? (sent / total) * 100 : 0;
  const failedPct = total > 0 ? (failed / total) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="font-semibold text-gray-700">
          {sent}/{total} envoyé{sent > 1 ? 's' : ''}
        </span>
        <span className="text-gray-500">{Math.round(successPct + failedPct)}%</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
        {successPct > 0 && (
          <div className="h-full bg-emerald-400 transition-all duration-700 ease-out" style={{ width: `${successPct}%` }} />
        )}
        {failedPct > 0 && (
          <div className="h-full bg-red-400 transition-all duration-700 ease-out" style={{ width: `${failedPct}%` }} />
        )}
      </div>
    </div>
  );
}

// ============================================================
// Recipient status badge
// ============================================================
function RecipientBadge({ item, hasReply }) {
  if (hasReply) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
        <Icon.Mail size={12} />
        Réponse reçue
      </span>
    );
  }
  if (item.item_status === 'sent') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
        <Icon.Check size={12} />
        Envoyé
      </span>
    );
  }
  if (item.item_status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 px-2.5 py-1 rounded-full" title={item.error_message || ''}>
        <Icon.X size={12} />
        Échec
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
      <Icon.Clock size={12} />
      En file
    </span>
  );
}

// ============================================================
// Mini timeline (batch summary)
// ============================================================
function MiniTimeline({ items, campaign }) {
  const sentItems = items.filter(i => i.item_status === 'sent' && i.sent_at);
  const readyItems = items.filter(i => i.item_status === 'ready');

  // Group sent items by day
  const batches = {};
  sentItems.forEach(item => {
    const key = new Date(item.sent_at).toLocaleDateString('fr-CH');
    if (!batches[key]) batches[key] = { date: new Date(item.sent_at), items: [] };
    batches[key].items.push(item);
  });
  const batchList = Object.values(batches).sort((a, b) => a.date - b.date);

  // Next batch
  const nextCount = Math.min(readyItems.length, campaign.send_per_day);
  const sendHour = campaign.send_hour || '08:00';
  const isActive = campaign.status !== 'paused' && campaign.status !== 'completed';

  return (
    <div className="space-y-2">
      <h4 className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold mb-2">Historique des envois</h4>

      {batchList.map((batch, i) => (
        <div key={i} className="flex items-center gap-2.5 text-[13px]">
          <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <Icon.Check size={10} className="text-emerald-600" />
          </div>
          <span className="text-gray-600">
            <span className="font-medium">Batch {i + 1}</span>
            {' — '}{formatShortDate(batch.date)}
            {' — '}{batch.items.length} envoyé{batch.items.length > 1 ? 's' : ''}
          </span>
        </div>
      ))}

      {isActive && readyItems.length > 0 && (
        <div className="flex items-center gap-2.5 text-[13px]">
          <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <Icon.Clock size={10} className="text-amber-600" />
          </div>
          <span className="text-amber-700">
            <span className="font-medium">Batch {batchList.length + 1}</span>
            {' — '}demain {sendHour}
            {' — '}{nextCount} prévu{nextCount > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {batchList.length === 0 && readyItems.length === 0 && (
        <p className="text-xs text-gray-400">Aucun envoi pour le moment</p>
      )}
    </div>
  );
}

// ============================================================
// Recipients table
// ============================================================
function RecipientsTable({ items, replyMap }) {
  const [search, setSearch] = useState('');

  // Sort: sent (most recent first) → failed → ready/pending
  const sorted = useMemo(() => {
    const statusOrder = { sent: 0, failed: 1, ready: 2, pending: 3, generating: 4 };
    return [...items].sort((a, b) => {
      const oa = statusOrder[a.item_status] ?? 5;
      const ob = statusOrder[b.item_status] ?? 5;
      if (oa !== ob) return oa - ob;
      // Within sent, most recent first
      if (a.item_status === 'sent' && b.item_status === 'sent') {
        return new Date(b.sent_at) - new Date(a.sent_at);
      }
      return 0;
    });
  }, [items]);

  const filtered = useMemo(() => {
    if (!search.trim()) return sorted;
    const q = search.toLowerCase();
    return sorted.filter(i =>
      (i.establishment_name || '').toLowerCase().includes(q) ||
      (i.director_name || '').toLowerCase().includes(q) ||
      (i.establishment_city || '').toLowerCase().includes(q)
    );
  }, [sorted, search]);

  return (
    <div>
      {/* Search */}
      <div className="px-5 py-3 border-b border-gray-100">
        <div className="relative">
          <Icon.Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un établissement..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        <div className="grid grid-cols-[2fr_1fr_1.2fr_130px_120px] px-5 py-2.5 border-b border-gray-100 text-[11px] text-gray-400 uppercase tracking-wider font-semibold">
          <div>Établissement</div>
          <div>Ville</div>
          <div>Directeur</div>
          <div>Statut</div>
          <div>Date d'envoi</div>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-sm text-gray-400">Aucun résultat</div>
        )}
        {filtered.map((item, i) => {
          const hasReply = !!replyMap[`${item.establishment_id}|${item.director_email}`];
          return (
            <div
              key={item.id}
              className={`grid grid-cols-[2fr_1fr_1.2fr_130px_120px] px-5 py-3.5 items-center text-sm hover:bg-gray-50/70 transition-colors ${
                i < filtered.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div className="font-medium truncate pr-2">{item.establishment_name}</div>
              <div className="text-gray-500 text-[13px] truncate">{item.establishment_city || '--'}</div>
              <div className="text-gray-500 text-[13px] truncate">{item.director_name || '--'}</div>
              <div><RecipientBadge item={item} hasReply={hasReply} /></div>
              <div className="text-[13px] text-gray-400">{item.sent_at ? formatDateTime(item.sent_at) : '--'}</div>
            </div>
          );
        })}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden">
        {filtered.length === 0 && (
          <div className="text-center py-8 text-sm text-gray-400">Aucun résultat</div>
        )}
        {filtered.map((item) => {
          const hasReply = !!replyMap[`${item.establishment_id}|${item.director_email}`];
          return (
            <div key={item.id} className="px-5 py-3.5 border-b border-gray-100">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{item.establishment_name}</div>
                  <div className="text-xs text-gray-400">{item.establishment_city || '--'} — {item.director_name || '--'}</div>
                </div>
                <RecipientBadge item={item} hasReply={hasReply} />
              </div>
              {item.sent_at && <div className="text-[11px] text-gray-400">{formatDateTime(item.sent_at)}</div>}
              {item.error_message && <div className="text-[11px] text-red-400 mt-0.5 truncate">{item.error_message}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Campaign detail
// ============================================================
function CampaignDetail({ campaign: initialCampaign, onBack, onRefresh, cronActive }) {
  const { user } = useAuth();
  const [campaign, setCampaign] = useState(initialCampaign);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [replyMap, setReplyMap] = useState({});

  useEffect(() => { loadDetail(); }, [initialCampaign.id]);

  async function loadDetail() {
    setLoading(true);
    const { data } = await getCampaign(initialCampaign.id);
    if (data) setCampaign(data);

    // Load reply status from candidatures
    if (user?.id) {
      const { data: cands } = await supabase
        .from('candidatures')
        .select('establishment_id, director_email, reply_detected_at')
        .eq('user_id', user.id)
        .not('reply_detected_at', 'is', null);

      const map = {};
      (cands || []).forEach(c => {
        map[`${c.establishment_id}|${c.director_email}`] = c.reply_detected_at;
      });
      setReplyMap(map);
    }

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
  const sentItems = items.filter(i => i.item_status === 'sent');
  const failedItems = items.filter(i => i.item_status === 'failed');

  // Stats
  const successRate = sentItems.length + failedItems.length > 0
    ? `${sentItems.length}/${sentItems.length + failedItems.length} envoyés sans erreur`
    : 'Aucun envoi';
  const sendHour = campaign.send_hour || '08:00';
  const nextBatchCount = Math.min(readyCount, campaign.send_per_day);
  const replyCount = Object.keys(replyMap).length;
  const isActive = campaign.status !== 'paused' && campaign.status !== 'completed';

  return (
    <div>
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5 cursor-pointer">
        <Icon.Arrow size={16} className="rotate-180" />
        Retour aux campagnes
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-xl font-bold">{campaign.name}</h2>
          <p className="text-gray-500 text-sm mt-1">
            Créée le {formatDate(campaign.created_at)} — {campaign.send_per_day} envois/jour à {sendHour}
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
                {campaign.status === 'paused' ? 'Reprendre' : 'Mettre en pause'}
              </Button>
              <Button
                size="small"
                onClick={handleSendBatch}
                disabled={sending || readyCount === 0 || campaign.status === 'paused'}
                icon={<Icon.Send size={14} />}
              >
                {sending ? 'Envoi...' : `Envoyer maintenant (${nextBatchCount})`}
              </Button>
            </>
          )}
        </div>
      </div>

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

      {loading ? (
        <Card className="text-center !py-12">
          <div className="w-[200px] h-1 bg-gray-100 rounded-full mx-auto overflow-hidden">
            <div className="w-[30%] h-full bg-gradient-to-r from-primary via-primary-light to-primary rounded-full animate-shimmer" />
          </div>
        </Card>
      ) : (
        <>
          {/* Stats + Progress + Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 mb-5">
            <Card>
              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="bg-gray-50 rounded-xl p-3.5">
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Taux de réussite</div>
                  <div className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <Icon.Check size={14} className="text-emerald-500" />
                    {successRate}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3.5">
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Prochaine salve</div>
                  <div className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    {isActive && readyCount > 0 ? (
                      <>
                        <Icon.Clock size={14} className="text-amber-500" />
                        Demain {sendHour} — {nextBatchCount} mail{nextBatchCount > 1 ? 's' : ''}
                      </>
                    ) : campaign.status === 'completed' ? (
                      <>
                        <Icon.Check size={14} className="text-emerald-500" />
                        Terminée
                      </>
                    ) : campaign.status === 'paused' ? (
                      <>
                        <Icon.Pause size={14} className="text-gray-400" />
                        En pause
                      </>
                    ) : (
                      <>
                        <Icon.Check size={14} className="text-emerald-500" />
                        Tous envoyés
                      </>
                    )}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3.5">
                  <div className="text-[11px] text-gray-400 uppercase tracking-wider mb-1">Réponses détectées</div>
                  <div className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                    <Icon.Mail size={14} className="text-blue-500" />
                    {replyCount > 0 ? (
                      <Link to="/candidatures" className="text-blue-600 hover:underline">
                        {replyCount} réponse{replyCount > 1 ? 's' : ''} reçue{replyCount > 1 ? 's' : ''}
                      </Link>
                    ) : (
                      <span className="text-gray-400">Aucune pour le moment</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <ProgressBar sent={campaign.sent_count} failed={campaign.failed_count} total={campaign.total_count} />

              {/* Inline counters */}
              <div className="flex items-center gap-4 mt-3 text-[13px] text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                  {sentItems.length} envoyé{sentItems.length > 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
                  {failedItems.length} échoué{failedItems.length > 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                  {readyCount} restant{readyCount > 1 ? 's' : ''}
                </span>
              </div>
            </Card>

            {/* Mini timeline */}
            <Card>
              <MiniTimeline items={items} campaign={campaign} />
            </Card>
          </div>

          {/* Recipients table */}
          <Card className="!p-0">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Icon.User size={15} />
                Destinataires ({items.length})
              </h3>
            </div>
            <RecipientsTable items={items} replyMap={replyMap} />
          </Card>
        </>
      )}
    </div>
  );
}

// ============================================================
// Campaign list page
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
            Envoi automatique actif — {activeCampaigns.length} campagne{activeCampaigns.length > 1 ? 's' : ''} en cours
          </span>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {campaigns.map((campaign) => {
          const status = statusConfig[campaign.status] || statusConfig.draft;
          const readyCount = Math.max(0, campaign.total_count - campaign.sent_count - campaign.failed_count);
          const remaining = readyCount > 0 ? `~${Math.ceil(readyCount / campaign.send_per_day)}j restant` : null;

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
                      {formatDate(campaign.created_at)} — {campaign.send_per_day}/jour à {campaign.send_hour || '08:00'}
                      {remaining && campaign.status !== 'completed' && campaign.status !== 'paused' && (
                        <span className="text-blue-500 ml-2">— {remaining}</span>
                      )}
                    </p>
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
