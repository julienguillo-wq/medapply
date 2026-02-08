import { useState, useEffect } from 'react';
import { cvData as defaultCvData } from '../data/mockData';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { Icon } from '../components/Icons';

const LS_KEY = 'medpost_cv';

function loadCV() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveCV(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

const inputClass = 'px-3 py-2.5 border border-gray-200 rounded-lg text-base md:text-sm outline-none focus:border-primary transition-colors w-full bg-white';
const textareaClass = inputClass + ' resize-none';

function SectionHeader({ title, editing, onAdd, addLabel }) {
  return (
    <div className="flex justify-between items-center mb-5">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{title}</h3>
      {editing && onAdd && (
        <button onClick={onAdd} className="flex items-center gap-1.5 text-primary text-xs font-semibold hover:text-primary-dark transition-colors cursor-pointer">
          <Icon.Plus size={14} />
          {addLabel || 'Ajouter'}
        </button>
      )}
    </div>
  );
}

function RemoveButton({ onClick }) {
  return (
    <button onClick={onClick} className="p-1.5 rounded-lg text-gray-300 hover:text-error hover:bg-error-bg transition-all cursor-pointer flex-shrink-0">
      <Icon.Trash size={14} />
    </button>
  );
}

export default function CVPage() {
  const [cv, setCv] = useState(() => loadCV() || defaultCvData);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);

  useEffect(() => { saveCV(cv); }, [cv]);

  const startEdit = () => {
    setDraft(JSON.parse(JSON.stringify(cv)));
    setEditing(true);
  };

  const cancelEdit = () => { setDraft(null); setEditing(false); };

  const saveEdit = () => {
    setCv(draft);
    setDraft(null);
    setEditing(false);
  };

  const d = editing ? draft : cv;

  // Draft update helpers
  const set = (path, value) => {
    setDraft(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const setArrayItem = (arrayPath, index, field, value) => {
    setDraft(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = arrayPath.split('.');
      let arr = next;
      for (const k of keys) arr = arr[k];
      arr[index][field] = value;
      return next;
    });
  };

  const addArrayItem = (arrayPath, item) => {
    setDraft(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = arrayPath.split('.');
      let arr = next;
      for (const k of keys) arr = arr[k];
      arr.push(item);
      return next;
    });
  };

  const removeArrayItem = (arrayPath, index) => {
    setDraft(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = arrayPath.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]].splice(index, 1);
      return next;
    });
  };

  const initials = d.name ? d.name.split(' ').filter(w => w.length > 0).map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'CV';

  return (
    <div className="animate-fade">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-[28px] font-bold tracking-tight mb-2">Mon CV</h1>
          <p className="text-gray-500 text-[15px]">Votre curriculum vitae médical complet</p>
        </div>
        <div className="flex gap-3">
          {editing ? (
            <>
              <Button variant="secondary" onClick={cancelEdit} icon={<Icon.X size={18} />}>Annuler</Button>
              <Button onClick={saveEdit} icon={<Icon.Save size={18} />}>Sauvegarder</Button>
            </>
          ) : (
            <>
              <Button variant="secondary" icon={<Icon.Edit size={18} />} onClick={startEdit}>Éditer</Button>
              <Button icon={<Icon.Download size={18} />} className="hidden sm:inline-flex">Télécharger PDF</Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[340px_1fr] gap-5 md:gap-7">
        {/* Left Column */}
        <div className="flex flex-col gap-5">
          {/* Photo + Identity */}
          <Card>
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 flex items-center justify-center text-white text-2xl font-bold mb-4">
                {initials}
              </div>
              {editing ? (
                <div className="w-full flex flex-col gap-2.5">
                  <input className={inputClass + ' text-center'} value={d.name} onChange={e => set('name', e.target.value)} placeholder="Nom complet" />
                  <input className={inputClass + ' text-center'} value={d.title} onChange={e => set('title', e.target.value)} placeholder="Titre" />
                  <input className={inputClass + ' text-center'} value={d.specialty} onChange={e => set('specialty', e.target.value)} placeholder="Spécialité" />
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-bold mb-1">{d.name}</h2>
                  <p className="text-gray-500 text-sm mb-3">{d.title}</p>
                  <Badge variant="primary">{d.specialty}</Badge>
                </>
              )}
            </div>
          </Card>

          {/* Contact */}
          <Card>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5">Coordonnées</h3>
            {editing ? (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[11px] text-gray-400 uppercase tracking-wide mb-1 block">Email</label>
                  <input className={inputClass} value={d.contact.email} onChange={e => set('contact.email', e.target.value)} />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 uppercase tracking-wide mb-1 block">Téléphone</label>
                  <input className={inputClass} value={d.contact.phone} onChange={e => set('contact.phone', e.target.value)} />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 uppercase tracking-wide mb-1 block">Adresse</label>
                  <input className={inputClass} value={d.contact.address} onChange={e => set('contact.address', e.target.value)} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {[
                  { icon: Icon.Mail, label: 'Email', value: d.contact.email },
                  { icon: Icon.Phone, label: 'Téléphone', value: d.contact.phone },
                  { icon: Icon.MapPin, label: 'Adresse', value: d.contact.address },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary-bg flex items-center justify-center text-primary">
                      <item.icon size={16} />
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-400 uppercase tracking-wide">{item.label}</div>
                      <div className="text-sm font-medium">{item.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Languages */}
          <Card>
            <SectionHeader
              title="Langues"
              editing={editing}
              onAdd={() => addArrayItem('langues', { name: '', level: '' })}
              addLabel="Ajouter"
            />
            <div className="flex flex-col gap-3">
              {d.langues.map((lang, i) => (
                editing ? (
                  <div key={i} className="flex items-center gap-2">
                    <input className={inputClass} value={lang.name} onChange={e => setArrayItem('langues', i, 'name', e.target.value)} placeholder="Langue" />
                    <input className={inputClass} value={lang.level} onChange={e => setArrayItem('langues', i, 'level', e.target.value)} placeholder="Niveau" />
                    <RemoveButton onClick={() => removeArrayItem('langues', i)} />
                  </div>
                ) : (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2.5">
                      <Icon.Globe size={16} />
                      <span className="text-sm font-medium">{lang.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">{lang.level}</span>
                  </div>
                )
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-5">
          {/* Formation */}
          <Card>
            <SectionHeader
              title="Formation médicale"
              editing={editing}
              onAdd={() => addArrayItem('formation', { degree: '', institution: '', year: '' })}
              addLabel="Ajouter"
            />
            <div className="flex flex-col gap-5">
              {d.formation.map((f, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-xl bg-primary-bg flex items-center justify-center text-primary flex-shrink-0">
                      <Icon.GraduationCap size={18} />
                    </div>
                    {i < d.formation.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-2" />}
                  </div>
                  {editing ? (
                    <div className="flex-1 pb-4 flex flex-col gap-2">
                      <div className="flex gap-2 items-start">
                        <div className="flex-1 flex flex-col gap-2">
                          <input className={inputClass} value={f.degree} onChange={e => setArrayItem('formation', i, 'degree', e.target.value)} placeholder="Diplôme" />
                          <input className={inputClass} value={f.institution} onChange={e => setArrayItem('formation', i, 'institution', e.target.value)} placeholder="Institution" />
                          <input className={inputClass + ' w-32'} value={f.year} onChange={e => setArrayItem('formation', i, 'year', e.target.value)} placeholder="Année" />
                        </div>
                        <RemoveButton onClick={() => removeArrayItem('formation', i)} />
                      </div>
                    </div>
                  ) : (
                    <div className="pb-5">
                      <div className="text-sm font-semibold mb-0.5">{f.degree}</div>
                      <div className="text-[13px] text-gray-500">{f.institution}</div>
                      <div className="text-xs text-gray-400 mt-1">{f.year}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Experiences */}
          <Card>
            <SectionHeader
              title="Expériences cliniques"
              editing={editing}
              onAdd={() => addArrayItem('experiences', { role: '', hospital: '', location: '', period: '', description: '' })}
              addLabel="Ajouter"
            />
            <div className="flex flex-col gap-5">
              {d.experiences.map((exp, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 flex-shrink-0">
                      <Icon.Briefcase size={18} />
                    </div>
                    {i < d.experiences.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-2" />}
                  </div>
                  {editing ? (
                    <div className="flex-1 pb-4">
                      <div className="flex gap-2 items-start">
                        <div className="flex-1 flex flex-col gap-2">
                          <input className={inputClass} value={exp.role} onChange={e => setArrayItem('experiences', i, 'role', e.target.value)} placeholder="Rôle" />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input className={inputClass} value={exp.hospital} onChange={e => setArrayItem('experiences', i, 'hospital', e.target.value)} placeholder="Hôpital" />
                            <input className={inputClass} value={exp.location} onChange={e => setArrayItem('experiences', i, 'location', e.target.value)} placeholder="Lieu" />
                          </div>
                          <input className={inputClass} value={exp.period} onChange={e => setArrayItem('experiences', i, 'period', e.target.value)} placeholder="Période (ex: Jan. 2024 - Juin 2024)" />
                          <textarea className={textareaClass} rows={2} value={exp.description} onChange={e => setArrayItem('experiences', i, 'description', e.target.value)} placeholder="Description" />
                        </div>
                        <RemoveButton onClick={() => removeArrayItem('experiences', i)} />
                      </div>
                    </div>
                  ) : (
                    <div className="pb-5">
                      <div className="text-sm font-semibold mb-0.5">{exp.role}</div>
                      <div className="text-[13px] text-gray-500">{exp.hospital} — {exp.location}</div>
                      <div className="text-xs text-gray-400 mt-1 mb-2">{exp.period}</div>
                      <p className="text-[13px] text-gray-600 leading-relaxed">{exp.description}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Clinical Skills */}
          <Card>
            <SectionHeader
              title="Compétences cliniques"
              editing={editing}
              onAdd={() => addArrayItem('competences', { name: '', level: 50 })}
              addLabel="Ajouter"
            />
            <div className="flex flex-col gap-4">
              {d.competences.map((comp, i) => (
                editing ? (
                  <div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                    <input className={inputClass + ' flex-1 min-w-0'} value={comp.name} onChange={e => setArrayItem('competences', i, 'name', e.target.value)} placeholder="Compétence" />
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={comp.level}
                        onChange={e => setArrayItem('competences', i, 'level', Number(e.target.value))}
                        className="flex-1 sm:w-28 accent-primary"
                      />
                      <span className="text-xs text-gray-500 w-8 text-right">{comp.level}%</span>
                      <RemoveButton onClick={() => removeArrayItem('competences', i)} />
                    </div>
                  </div>
                ) : (
                  <div key={i}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">{comp.name}</span>
                      <span className="text-xs text-gray-400">{comp.level}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-500"
                        style={{ width: `${comp.level}%` }}
                      />
                    </div>
                  </div>
                )
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
