import { useState, useEffect, useRef } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';
import { Icon } from '../components/Icons';

const questions = [
  { key: 'name', q: "Quel est votre nom complet ?" },
  { key: 'email', q: "Votre email professionnel ?" },
  { key: 'phone', q: "Votre numéro de téléphone ?" },
  { key: 'specialty', q: "Quelle spécialité visez-vous ?" },
  { key: 'currentPosition', q: "Votre poste actuel ?" },
  { key: 'experience', q: "Décrivez brièvement votre parcours." },
];

export default function ProfilePage() {
  const [profile, setProfile] = useState({});
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Bonjour ! Je vais vous aider à créer votre profil médical. Quel est votre nom complet ?" }
  ]);
  const [input, setInput] = useState('');
  const [step, setStep] = useState(0);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    setMessages(prev => [...prev, { role: 'user', content: input }]);

    if (step < questions.length) {
      setProfile(prev => ({ ...prev, [questions[step].key]: input }));
    }

    setTimeout(() => {
      if (step < questions.length - 1) {
        setMessages(prev => [...prev, { role: 'assistant', content: questions[step + 1].q }]);
        setStep(step + 1);
      } else if (step === questions.length - 1) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "Parfait ! Votre profil est complet. Vous pouvez maintenant ajouter vos documents."
        }]);
        setStep(step + 1);
      }
    }, 400);

    setInput('');
  };

  const progress = Math.round((step / questions.length) * 100);

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
              placeholder="Tapez votre réponse..."
              className="flex-1 px-[18px] py-3.5 border border-gray-200 rounded-xl text-base md:text-sm outline-none focus:border-primary transition-colors"
            />
            <Button onClick={handleSend} icon={<Icon.Send size={18} />}>
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
    </div>
  );
}
