import { useState, useEffect, useRef } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import { Icon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';
import { getEmailConfig, saveEmailConfig, testSmtpConnection } from '../services/emailConfigService';

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
    </div>
  );
}
