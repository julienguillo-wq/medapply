import { useState, useEffect, useRef } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import { Icon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';
import { getEmailConfig, saveEmailConfig, testSmtpConnection } from '../services/emailConfigService';
import { getGmailAuthUrl, getGmailStatus, disconnectGmail } from '../services/gmailService';
import { loadSpecialties } from '../services/siwfService';

const CANTON_LANGUAGE_GROUPS = [
  {
    id: 'fr', label: 'Français', emoji: '\u{1F1EB}\u{1F1F7}',
    cantons: [
      { code: 'GE', name: 'Genève' }, { code: 'VD', name: 'Vaud' },
      { code: 'NE', name: 'Neuchâtel' }, { code: 'JU', name: 'Jura' },
      { code: 'FR', name: 'Fribourg' }, { code: 'VS', name: 'Valais' },
      { code: 'BE', name: 'Berne' },
    ],
  },
  {
    id: 'de', label: 'Allemand', emoji: '\u{1F1E9}\u{1F1EA}',
    cantons: [
      { code: 'ZH', name: 'Zurich' }, { code: 'BE', name: 'Berne' },
      { code: 'LU', name: 'Lucerne' }, { code: 'UR', name: 'Uri' },
      { code: 'SZ', name: 'Schwyz' }, { code: 'OW', name: 'Obwald' },
      { code: 'NW', name: 'Nidwald' }, { code: 'GL', name: 'Glaris' },
      { code: 'ZG', name: 'Zoug' }, { code: 'SO', name: 'Soleure' },
      { code: 'BS', name: 'Bâle-Ville' }, { code: 'BL', name: 'Bâle-Campagne' },
      { code: 'SH', name: 'Schaffhouse' }, { code: 'AR', name: 'Appenzell Rh.-Ext.' },
      { code: 'AI', name: 'Appenzell Rh.-Int.' }, { code: 'SG', name: 'Saint-Gall' },
      { code: 'GR', name: 'Grisons' }, { code: 'AG', name: 'Argovie' },
      { code: 'TG', name: 'Thurgovie' },
    ],
  },
  {
    id: 'it', label: 'Italien', emoji: '\u{1F1EE}\u{1F1F9}',
    cantons: [
      { code: 'TI', name: 'Tessin' }, { code: 'GR', name: 'Grisons' },
    ],
  },
];

const allQuestions = [
  { key: 'name', q: "Quel est votre nom complet ?" },
  { key: 'email', q: "Votre email professionnel ?" },
  { key: 'phone', q: "Votre numéro de téléphone ?" },
  { key: 'specialty', q: "Quelle spécialité visez-vous ?" },
  { key: 'currentPosition', q: "Votre poste actuel ?" },
  { key: 'experience', q: "Décrivez brièvement votre parcours." },
];

// Extract only the relevant data from a conversational answer
function extractValue(key, raw) {
  const text = raw.trim();

  switch (key) {
    case 'phone': {
      const match = text.match(/\+?[\d\s.\-()]{6,}/);
      return match ? match[0].replace(/[\s.\-()]/g, '') : text;
    }
    case 'email': {
      const match = text.match(/[\w.\-+]+@[\w.\-]+\.\w+/);
      return match ? match[0] : text;
    }
    case 'name': {
      return text
        .replace(/^(je m'appelle|mon nom (complet )?(est |c'est )|c'est |moi c'est |dr\.?\s*)/i, '')
        .replace(/[.,!]+$/, '')
        .trim() || text;
    }
    case 'specialty': {
      return text
        .replace(/^(je vise |ma spécialité (est |c'est )|en |je suis en |j'aimerais |je souhaite )/i, '')
        .replace(/[.,!]+$/, '')
        .trim() || text;
    }
    case 'currentPosition': {
      return text
        .replace(/^(je suis (actuellement )?(un |une )?|actuellement |mon poste (est |actuel est )|je travaille (comme |en tant que ))/i, '')
        .replace(/[.,!]+$/, '')
        .trim() || text;
    }
    default:
      return text;
  }
}

// Map Supabase profile fields to local profile keys
function buildProfileFromAuth(authProfile) {
  if (!authProfile) return {};
  const p = {};
  const fullName = [authProfile.first_name, authProfile.last_name].filter(Boolean).join(' ');
  if (fullName) p.name = fullName;
  if (authProfile.email) p.email = authProfile.email;
  if (authProfile.phone) p.phone = authProfile.phone;
  if (authProfile.specialty) p.specialty = authProfile.specialty;
  if (authProfile.current_position) p.currentPosition = authProfile.current_position;
  if (authProfile.experience) p.experience = authProfile.experience;
  if (authProfile.hospital) p.hospital = authProfile.hospital;
  return p;
}

// Convert a single local key + value into Supabase column updates
function toSupabaseUpdates(key, value) {
  switch (key) {
    case 'name': {
      const parts = value.trim().split(/\s+/);
      return { first_name: parts[0] || '', last_name: parts.slice(1).join(' ') || '' };
    }
    case 'email': return { email: value };
    case 'phone': return { phone: value };
    case 'specialty': return { specialty: value };
    case 'currentPosition': return { current_position: value };
    case 'experience': return { experience: value };
    default: return {};
  }
}

function buildGreeting(authProfile, remainingQuestions) {
  if (!authProfile) {
    if (remainingQuestions.length > 0) {
      return `Bonjour ! Je vais vous aider à créer votre profil médical. ${remainingQuestions[0].q}`;
    }
    return "Bonjour ! Votre profil est déjà complet.";
  }

  const firstName = authProfile.first_name;
  const specialty = authProfile.specialty;
  const hospital = authProfile.hospital;

  let greeting = 'Bonjour';
  if (firstName) greeting += ` Dr. ${firstName}`;
  greeting += ' !';

  const knownParts = [];
  if (specialty) knownParts.push(`vous êtes en ${specialty}`);
  if (hospital) knownParts.push(`à ${hospital}`);

  if (knownParts.length > 0) {
    greeting += ` Je vois que ${knownParts.join(' ')}.`;
  }

  if (remainingQuestions.length > 0) {
    greeting += ` Complétez votre profil pour optimiser vos candidatures. ${remainingQuestions[0].q}`;
  } else {
    greeting += ' Votre profil est déjà complet. Vous pouvez ajouter vos documents.';
  }

  return greeting;
}

export default function ProfilePage() {
  const { user, profile: authProfile, updateProfile } = useAuth();
  const [profile, setProfile] = useState({});
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [step, setStep] = useState(0);
  const [remainingQuestions, setRemainingQuestions] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const messagesEndRef = useRef(null);

  // Canton preferences state
  const [preferredCantons, setPreferredCantons] = useState([]);
  const [cantonsSaving, setCantonsSaving] = useState(false);
  const [cantonsMessage, setCantonsMessage] = useState(null);

  // Load preferred cantons from profile
  useEffect(() => {
    if (authProfile?.preferred_cantons) {
      setPreferredCantons(authProfile.preferred_cantons);
    }
  }, [authProfile]);

  const toggleCanton = (code) => {
    setPreferredCantons(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const toggleGroupCantons = (groupCantons) => {
    const codes = groupCantons.map(c => c.code);
    const allSelected = codes.every(code => preferredCantons.includes(code));
    if (allSelected) {
      setPreferredCantons(prev => prev.filter(c => !codes.includes(c)));
    } else {
      setPreferredCantons(prev => [...new Set([...prev, ...codes])]);
    }
  };

  const saveCantons = async () => {
    setCantonsSaving(true);
    setCantonsMessage(null);
    const { error } = await updateProfile({ preferred_cantons: preferredCantons });
    if (error) {
      setCantonsMessage({ type: 'error', text: 'Erreur lors de la sauvegarde.' });
    } else {
      setCantonsMessage({ type: 'success', text: 'Cantons préférés sauvegardés.' });
    }
    setCantonsSaving(false);
  };

  // Specialty preferences state
  const [allSpecialties, setAllSpecialties] = useState([]);
  const [preferredSpecialties, setPreferredSpecialties] = useState([]);
  const [specialtiesSaving, setSpecialtiesSaving] = useState(false);
  const [specialtiesMessage, setSpecialtiesMessage] = useState(null);
  const [specSearch, setSpecSearch] = useState('');

  // Load SIWF specialties list
  useEffect(() => {
    loadSpecialties().then(setAllSpecialties).catch(() => {});
  }, []);

  // Load preferred specialties from profile (+ auto-include main specialty)
  useEffect(() => {
    if (authProfile?.preferred_specialties?.length > 0) {
      setPreferredSpecialties(authProfile.preferred_specialties);
    } else if (authProfile?.specialty) {
      setPreferredSpecialties([authProfile.specialty]);
    }
  }, [authProfile]);

  const togglePreferredSpecialty = (name) => {
    setPreferredSpecialties(prev =>
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    );
  };

  const saveSpecialties = async () => {
    setSpecialtiesSaving(true);
    setSpecialtiesMessage(null);
    const { error } = await updateProfile({ preferred_specialties: preferredSpecialties });
    if (error) {
      setSpecialtiesMessage({ type: 'error', text: 'Erreur lors de la sauvegarde.' });
    } else {
      setSpecialtiesMessage({ type: 'success', text: 'Spécialités préférées sauvegardées.' });
    }
    setSpecialtiesSaving(false);
  };

  const filteredSpecialties = specSearch.trim()
    ? allSpecialties.filter(s => s.name.toLowerCase().includes(specSearch.trim().toLowerCase()))
    : allSpecialties;

  // Email SMTP config state
  const [smtpEmail, setSmtpEmail] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [smtpVerified, setSmtpVerified] = useState(false);
  const [smtpLoading, setSmtpLoading] = useState(false);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpMessage, setSmtpMessage] = useState(null); // { type: 'success'|'error', text }
  const [smtpConfigLoaded, setSmtpConfigLoaded] = useState(false);

  // Charger la config email existante
  useEffect(() => {
    if (!user || smtpConfigLoaded) return;
    getEmailConfig(user.id).then(({ data }) => {
      if (data) {
        setSmtpEmail(data.email_address || '');
        setSmtpPassword(data.smtp_password || '');
        setSmtpVerified(data.smtp_verified || false);
      }
      setSmtpConfigLoaded(true);
    });
  }, [user, smtpConfigLoaded]);

  async function handleTestSmtp() {
    if (!smtpEmail || !smtpPassword) {
      setSmtpMessage({ type: 'error', text: 'Remplissez l\'email et le mot de passe.' });
      return;
    }
    setSmtpTesting(true);
    setSmtpMessage(null);
    const result = await testSmtpConnection(smtpEmail, smtpPassword);
    if (result.success) {
      setSmtpVerified(true);
      setSmtpMessage({ type: 'success', text: 'Connexion SMTP réussie !' });
      // Sauvegarder avec verified = true
      await saveEmailConfig(user.id, smtpEmail, smtpPassword, true);
    } else {
      setSmtpVerified(false);
      setSmtpMessage({ type: 'error', text: result.error || 'Échec de la connexion' });
    }
    setSmtpTesting(false);
  }

  async function handleSaveSmtp() {
    if (!smtpEmail || !smtpPassword) {
      setSmtpMessage({ type: 'error', text: 'Remplissez tous les champs.' });
      return;
    }
    setSmtpLoading(true);
    setSmtpMessage(null);
    const { error } = await saveEmailConfig(user.id, smtpEmail, smtpPassword, smtpVerified);
    if (error) {
      setSmtpMessage({ type: 'error', text: 'Erreur lors de la sauvegarde.' });
    } else {
      setSmtpMessage({ type: 'success', text: 'Configuration sauvegardée.' });
    }
    setSmtpLoading(false);
  }

  // Gmail reply detection state
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState('');
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailMessage, setGmailMessage] = useState(null);

  // Check Gmail connection status
  useEffect(() => {
    if (!user) return;
    getGmailStatus(user.id).then(({ connected, email }) => {
      setGmailConnected(connected);
      if (email) setGmailEmail(email);
    });
  }, [user]);

  // Handle ?gmail=connected query param from OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmailParam = params.get('gmail');
    if (gmailParam === 'connected') {
      setGmailConnected(true);
      setGmailMessage({ type: 'success', text: 'Gmail connecté avec succès !' });
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      // Refresh status
      if (user) getGmailStatus(user.id).then(({ email }) => { if (email) setGmailEmail(email); });
    } else if (gmailParam === 'error') {
      setGmailMessage({ type: 'error', text: 'Erreur lors de la connexion Gmail.' });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [user]);

  async function handleConnectGmail() {
    setGmailLoading(true);
    setGmailMessage(null);
    const { url } = await getGmailAuthUrl(user.id);
    if (url) {
      window.location.href = url;
    } else {
      setGmailMessage({ type: 'error', text: 'Impossible de générer le lien de connexion.' });
      setGmailLoading(false);
    }
  }

  async function handleDisconnectGmail() {
    setGmailLoading(true);
    setGmailMessage(null);
    const { success } = await disconnectGmail(user.id);
    if (success) {
      setGmailConnected(false);
      setGmailEmail('');
      setGmailMessage({ type: 'success', text: 'Gmail déconnecté.' });
    } else {
      setGmailMessage({ type: 'error', text: 'Erreur lors de la déconnexion.' });
    }
    setGmailLoading(false);
  }

  // Initialize profile from Supabase data
  useEffect(() => {
    if (initialized) return;

    const prefilled = buildProfileFromAuth(authProfile);
    setProfile(prefilled);

    const remaining = allQuestions.filter(q => !prefilled[q.key]);
    setRemainingQuestions(remaining);

    const greeting = buildGreeting(authProfile, remaining);
    setMessages([{ role: 'assistant', content: greeting }]);

    setInitialized(true);
  }, [authProfile, initialized]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const isComplete = step >= remainingQuestions.length;

  const handleSend = () => {
    if (!input.trim() || isComplete) return;

    setMessages(prev => [...prev, { role: 'user', content: input }]);

    const currentQuestion = remainingQuestions[step];
    const extracted = extractValue(currentQuestion.key, input);
    const updatedProfile = { ...profile, [currentQuestion.key]: extracted };
    setProfile(updatedProfile);

    // Save this field immediately to Supabase
    updateProfile(toSupabaseUpdates(currentQuestion.key, extracted));

    const nextStep = step + 1;

    setTimeout(() => {
      if (nextStep < remainingQuestions.length) {
        setMessages(prev => [...prev, { role: 'assistant', content: remainingQuestions[nextStep].q }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "Parfait ! Votre profil est complet. Vous pouvez maintenant ajouter vos documents."
        }]);
      }
      setStep(nextStep);
    }, 400);

    setInput('');
  };

  const totalQuestions = allQuestions.length;
  const prefilledCount = totalQuestions - remainingQuestions.length;
  const progress = totalQuestions > 0
    ? Math.round(((prefilledCount + step) / totalQuestions) * 100)
    : 100;

  return (
    <div className="animate-fade">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold tracking-tight mb-2">Créez votre profil</h1>
        <p className="text-gray-500 text-[15px]">Répondez aux questions pour générer votre profil médical</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_360px] gap-5 md:gap-7">
        {/* Chat */}
        <Card className="!p-0 flex flex-col h-[420px] md:h-[560px]">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3.5">
            <div className="w-11 h-11 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center text-white">
              <Icon.Sparkle size={20} />
            </div>
            <div>
              <div className="font-semibold text-sm">Assistant MedPost</div>
              <div className="text-xs text-success flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-success rounded-full" />
                En ligne
              </div>
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex mb-4 animate-slide ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] px-[18px] py-3.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-white rounded-[18px_18px_4px_18px]'
                    : 'bg-gray-100 text-gray-800 rounded-[18px_18px_18px_4px]'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-6 py-5 border-t border-gray-100 flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isComplete ? "Profil complété !" : "Tapez votre réponse..."}
              disabled={isComplete}
              className="flex-1 px-[18px] py-3.5 border border-gray-200 rounded-xl text-base md:text-sm outline-none focus:border-primary transition-colors disabled:bg-gray-50 disabled:text-gray-400"
            />
            <Button onClick={handleSend} icon={<Icon.Send size={18} />} disabled={isComplete}>
              Envoyer
            </Button>
          </div>
        </Card>

        {/* Right Sidebar */}
        <div>
          <Card className="mb-5">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[13px] font-medium text-gray-500">Progression</span>
              <span className="text-sm font-bold text-primary">{progress}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </Card>

          <Card>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5">
              Aperçu du profil
            </h3>
            {[
              { label: 'Nom', value: profile.name },
              { label: 'Email', value: profile.email },
              { label: 'Téléphone', value: profile.phone },
              { label: 'Spécialité', value: profile.specialty },
              { label: 'Poste actuel', value: profile.currentPosition },
            ].map((field, i) => (
              <div key={i} className={`mb-4 pb-4 ${i < 4 ? 'border-b border-gray-100' : ''}`}>
                <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">{field.label}</div>
                <div className={`text-sm ${field.value ? 'font-medium text-gray-800' : 'text-gray-300'}`}>
                  {field.value || '—'}
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* Email SMTP Configuration */}
      <div className="mt-8">
        <h2 className="text-xl font-bold tracking-tight mb-2">Configuration email SMTP</h2>
        <p className="text-gray-500 text-[15px] mb-5">
          Configurez votre Gmail pour envoyer vos candidatures directement depuis MedApply.
        </p>

        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <Icon.Mail size={20} className="text-red-500" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Gmail SMTP</h3>
              <p className="text-xs text-gray-400">
                {smtpVerified ? 'Connecté et vérifié' : 'Non configuré'}
              </p>
            </div>
            {smtpVerified && (
              <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
                <Icon.Check size={14} />
                Vérifié
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Adresse Gmail
              </label>
              <input
                type="email"
                value={smtpEmail}
                onChange={(e) => { setSmtpEmail(e.target.value); setSmtpVerified(false); }}
                placeholder="votre.email@gmail.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Mot de passe d&apos;application Google
              </label>
              <input
                type="password"
                value={smtpPassword}
                onChange={(e) => { setSmtpPassword(e.target.value); setSmtpVerified(false); }}
                placeholder="xxxx xxxx xxxx xxxx"
                maxLength={19}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary transition-colors font-mono"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Générez un mot de passe d&apos;application sur{' '}
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  myaccount.google.com/apppasswords
                </a>
              </p>
            </div>
          </div>

          {smtpMessage && (
            <div className={`mt-4 p-3 rounded-xl text-sm flex items-center gap-2 ${
              smtpMessage.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-100'
                : 'bg-red-50 text-red-700 border border-red-100'
            }`}>
              {smtpMessage.type === 'success' ? <Icon.Check size={16} /> : <Icon.X size={16} />}
              {smtpMessage.text}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button
              variant="secondary"
              onClick={handleTestSmtp}
              disabled={smtpTesting || !smtpEmail || !smtpPassword}
              icon={<Icon.Activity size={16} />}
              className="flex-1"
            >
              {smtpTesting ? 'Test en cours...' : 'Tester la connexion'}
            </Button>
            <Button
              onClick={handleSaveSmtp}
              disabled={smtpLoading || !smtpEmail || !smtpPassword}
              icon={<Icon.Save size={16} />}
              className="flex-1"
            >
              {smtpLoading ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Gmail Reply Detection */}
      <div className="mt-8">
        <h2 className="text-xl font-bold tracking-tight mb-2">Détection automatique des réponses</h2>
        <p className="text-gray-500 text-[15px] mb-5">
          Connectez votre Gmail pour détecter automatiquement les réponses à vos candidatures.
        </p>

        <Card>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Icon.Mail size={20} className="text-blue-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm">Gmail API (lecture seule)</h3>
              <p className="text-xs text-gray-400">
                {gmailConnected ? `Connecté : ${gmailEmail}` : 'Non connecté'}
              </p>
            </div>
            {gmailConnected && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
                <Icon.Check size={14} />
                Gmail connecté
              </span>
            )}
          </div>

          {!gmailConnected && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
              <p className="text-sm text-blue-700 leading-relaxed">
                MedApply accède uniquement en lecture pour détecter les réponses. Aucun email ne sera envoyé via cette connexion.
              </p>
            </div>
          )}

          {gmailMessage && (
            <div className={`mb-5 p-3 rounded-xl text-sm flex items-center gap-2 ${
              gmailMessage.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-100'
                : 'bg-red-50 text-red-700 border border-red-100'
            }`}>
              {gmailMessage.type === 'success' ? <Icon.Check size={16} /> : <Icon.X size={16} />}
              {gmailMessage.text}
            </div>
          )}

          {gmailConnected ? (
            <Button
              variant="secondary"
              onClick={handleDisconnectGmail}
              disabled={gmailLoading}
              icon={<Icon.X size={16} />}
            >
              {gmailLoading ? 'Déconnexion...' : 'Déconnecter Gmail'}
            </Button>
          ) : (
            <Button
              onClick={handleConnectGmail}
              disabled={gmailLoading}
              icon={<Icon.Mail size={16} />}
            >
              {gmailLoading ? 'Redirection...' : 'Connecter Gmail'}
            </Button>
          )}
        </Card>
      </div>

      {/* Canton Preferences */}
      <div className="mt-8">
        <h2 className="text-xl font-bold tracking-tight mb-2">Cantons préférés</h2>
        <p className="text-gray-500 text-[15px] mb-5">
          Sélectionnez les cantons où vous souhaitez postuler pour améliorer votre score de compatibilité.
        </p>

        <Card>
          <div className="space-y-5">
            {CANTON_LANGUAGE_GROUPS.map((group, gi) => {
              const codes = group.cantons.map(c => c.code);
              const allSelected = codes.every(code => preferredCantons.includes(code));
              const someSelected = codes.some(code => preferredCantons.includes(code));
              return (
                <div key={group.id} className={gi > 0 ? 'pt-5 border-t border-gray-100' : ''}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <span>{group.emoji}</span>
                      {group.label}
                      <span className="text-xs font-normal text-gray-400">({group.cantons.length})</span>
                    </h4>
                    <button
                      onClick={() => toggleGroupCantons(group.cantons)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                        allSelected
                          ? 'text-red-600 bg-red-50 hover:bg-red-100'
                          : 'text-primary bg-primary/5 hover:bg-primary/10'
                      }`}
                    >
                      {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {group.cantons.map(({ code, name }) => {
                      const selected = preferredCantons.includes(code);
                      return (
                        <button
                          key={`${group.id}-${code}`}
                          onClick={() => toggleCanton(code)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] font-medium text-left transition-all cursor-pointer ${
                            selected
                              ? 'bg-primary text-white'
                              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                            selected ? 'border-white bg-white/20' : 'border-gray-300'
                          }`}>
                            {selected && <Icon.Check size={10} />}
                          </span>
                          <span className="truncate">{code} — {name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {preferredCantons.length > 0 && (
            <div className="mt-5 text-[13px] text-gray-500">
              {preferredCantons.length} canton{preferredCantons.length > 1 ? 's' : ''} sélectionné{preferredCantons.length > 1 ? 's' : ''}
            </div>
          )}

          {cantonsMessage && (
            <div className={`mt-4 p-3 rounded-xl text-sm flex items-center gap-2 ${
              cantonsMessage.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-100'
                : 'bg-red-50 text-red-700 border border-red-100'
            }`}>
              {cantonsMessage.type === 'success' ? <Icon.Check size={16} /> : <Icon.X size={16} />}
              {cantonsMessage.text}
            </div>
          )}

          <div className="mt-5">
            <Button
              onClick={saveCantons}
              disabled={cantonsSaving}
              icon={<Icon.Save size={16} />}
            >
              {cantonsSaving ? 'Sauvegarde...' : 'Sauvegarder les cantons'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Specialty Preferences */}
      <div className="mt-8">
        <h2 className="text-xl font-bold tracking-tight mb-2">Spécialités préférées</h2>
        <p className="text-gray-500 text-[15px] mb-5">
          Sélectionnez les spécialités qui vous intéressent pour filtrer rapidement dans la recherche.
        </p>

        <Card>
          <div className="mb-4">
            <div className="relative">
              <Icon.Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={specSearch}
                onChange={(e) => setSpecSearch(e.target.value)}
                placeholder="Rechercher une spécialité..."
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-primary transition-colors"
              />
              {specSearch && (
                <button
                  onClick={() => setSpecSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <Icon.X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[360px] overflow-y-auto">
            {filteredSpecialties.map((spec) => {
              const selected = preferredSpecialties.includes(spec.name);
              const isMain = authProfile?.specialty === spec.name;
              return (
                <button
                  key={spec.id}
                  onClick={() => togglePreferredSpecialty(spec.name)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] font-medium text-left transition-all cursor-pointer ${
                    selected
                      ? 'bg-primary text-white'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                    selected ? 'border-white bg-white/20' : 'border-gray-300'
                  }`}>
                    {selected && <Icon.Check size={10} />}
                  </span>
                  <span className="truncate">{spec.name}</span>
                  {isMain && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                      selected ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                    }`}>
                      principale
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {preferredSpecialties.length > 0 && (
            <div className="mt-5 text-[13px] text-gray-500">
              {preferredSpecialties.length} spécialité{preferredSpecialties.length > 1 ? 's' : ''} sélectionnée{preferredSpecialties.length > 1 ? 's' : ''}
            </div>
          )}

          {specialtiesMessage && (
            <div className={`mt-4 p-3 rounded-xl text-sm flex items-center gap-2 ${
              specialtiesMessage.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-100'
                : 'bg-red-50 text-red-700 border border-red-100'
            }`}>
              {specialtiesMessage.type === 'success' ? <Icon.Check size={16} /> : <Icon.X size={16} />}
              {specialtiesMessage.text}
            </div>
          )}

          <div className="mt-5">
            <Button
              onClick={saveSpecialties}
              disabled={specialtiesSaving}
              icon={<Icon.Save size={16} />}
            >
              {specialtiesSaving ? 'Sauvegarde...' : 'Sauvegarder les spécialités'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
