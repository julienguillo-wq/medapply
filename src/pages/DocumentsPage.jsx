import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  uploadDocument,
  getDocuments,
  deleteDocument,
  renameDocument,
  getSignedUrl,
} from '../services/documentsService';
import Card from '../components/Card';
import { Icon } from '../components/Icons';

// --- Catégories (ordre demandé) ---
const CATEGORIES = [
  {
    id: 'diplome',
    label: 'Diplômes',
    description: 'Diplômes de médecine, spécialisations',
    icon: Icon.GraduationCap,
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-600',
    badgeBg: 'bg-blue-100 text-blue-700',
    accent: 'border-l-blue-500',
    dropActiveBg: 'bg-blue-50',
    dropActiveBorder: 'border-blue-400',
  },
  {
    id: 'attestation',
    label: 'Attestations',
    description: 'Attestations de travail, stages',
    icon: Icon.Briefcase,
    iconBg: 'bg-indigo-100',
    iconText: 'text-indigo-600',
    badgeBg: 'bg-indigo-100 text-indigo-700',
    accent: 'border-l-indigo-500',
    dropActiveBg: 'bg-indigo-50',
    dropActiveBorder: 'border-indigo-400',
  },
  {
    id: 'certification',
    label: 'Certifications',
    description: 'Certifications professionnelles',
    icon: Icon.Award,
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-600',
    badgeBg: 'bg-amber-100 text-amber-700',
    accent: 'border-l-amber-500',
    dropActiveBg: 'bg-amber-50',
    dropActiveBorder: 'border-amber-400',
  },
  {
    id: 'lettre_recommandation',
    label: 'Lettres de recommandation',
    description: 'Lettres de référence, recommandations',
    icon: Icon.Star,
    iconBg: 'bg-purple-100',
    iconText: 'text-purple-600',
    badgeBg: 'bg-purple-100 text-purple-700',
    accent: 'border-l-purple-500',
    dropActiveBg: 'bg-purple-50',
    dropActiveBorder: 'border-purple-400',
  },
  {
    id: 'lettre_motivation',
    label: 'Lettre de motivation',
    description: 'Votre lettre personnelle qui servira de base pour les candidatures IA',
    icon: Icon.Edit,
    iconBg: 'bg-violet-100',
    iconText: 'text-violet-600',
    badgeBg: 'bg-violet-100 text-violet-700',
    accent: 'border-l-violet-500',
    dropActiveBg: 'bg-violet-50',
    dropActiveBorder: 'border-violet-400',
  },
  {
    id: 'cv',
    label: 'CV',
    description: 'Curriculum Vitae',
    icon: Icon.FileText,
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-600',
    badgeBg: 'bg-emerald-100 text-emerald-700',
    accent: 'border-l-emerald-500',
    dropActiveBg: 'bg-emerald-50',
    dropActiveBorder: 'border-emerald-400',
  },
  {
    id: 'autre',
    label: 'Autres',
    description: 'Documents divers',
    icon: Icon.File,
    iconBg: 'bg-gray-200',
    iconText: 'text-gray-600',
    badgeBg: 'bg-gray-200 text-gray-600',
    accent: 'border-l-gray-400',
    dropActiveBg: 'bg-gray-100',
    dropActiveBorder: 'border-gray-400',
  },
];

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const LETTRE_ACCEPTED_TYPES = [
  'application/pdf', 'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const ACCEPTED_EXT = '.pdf,.jpg,.jpeg,.png';
const LETTRE_ACCEPTED_EXT = '.pdf,.txt,.docx';
const MAX_SIZE = 10 * 1024 * 1024;

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('fr-CH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// --- Modale de nommage avant upload ---
function UploadNameForm({ files, category, onConfirm, onCancel }) {
  const [names, setNames] = useState(
    files.map(f => f.name.replace(/\.[^/.]+$/, ''))
  );
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalNames = names.map((n, i) =>
      n.trim() || files[i].name.replace(/\.[^/.]+$/, '')
    );
    onConfirm(finalNames);
  };

  const CatIcon = category.icon;

  return (
    <div
      className="bg-white rounded-2xl border border-gray-200 shadow-2xl p-6 w-full max-w-md animate-scale"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-10 h-10 rounded-xl ${category.iconBg} ${category.iconText} flex items-center justify-center`}>
          <CatIcon size={20} />
        </div>
        <div>
          <div className="text-base font-semibold">
            Nommer {files.length > 1 ? 'les documents' : 'le document'}
          </div>
          <div className="text-xs text-gray-400">{category.label}</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {files.map((file, i) => (
          <div key={i}>
            <label className="text-xs text-gray-500 mb-1.5 block flex items-center gap-1.5">
              <Icon.File size={12} />
              {file.name} ({formatFileSize(file.size)})
            </label>
            <input
              ref={i === 0 ? inputRef : undefined}
              type="text"
              value={names[i]}
              onChange={e => {
                const next = [...names];
                next[i] = e.target.value;
                setNames(next);
              }}
              placeholder="Nom du document"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary-bg outline-none transition-all"
            />
          </div>
        ))}

        <div className="flex items-center gap-2 mt-1">
          <button
            type="submit"
            className="flex-1 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-dark transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <Icon.Upload size={15} />
            Envoyer
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}

// --- Barre de progression ---
function UploadProgress({ fileName, progress }) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 bg-blue-50 rounded-xl animate-fade">
      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
        <Icon.Cloud size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{fileName}</div>
        <div className="h-1.5 bg-white rounded-full overflow-hidden mt-1.5">
          <div
            className="h-full bg-primary rounded-full transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <span className="text-xs text-blue-600 font-semibold flex-shrink-0">{progress}%</span>
    </div>
  );
}

// --- Message de succès ---
function UploadSuccess({ name }) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 bg-emerald-50 text-emerald-700 rounded-xl animate-fade">
      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
        <Icon.Check size={16} />
      </div>
      <div className="text-sm font-medium truncate">&laquo; {name} &raquo; ajouté avec succès</div>
    </div>
  );
}

// --- Confirmation de suppression ---
function DeleteConfirm({ docName, onConfirm, onCancel, deleting }) {
  return (
    <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-lg flex items-center justify-center gap-2 px-3 z-10 animate-fade">
      <span className="text-sm text-gray-700 truncate max-w-[40%]">
        Supprimer &laquo; {docName} &raquo; ?
      </span>
      <button
        onClick={onConfirm}
        disabled={deleting}
        className="px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors cursor-pointer disabled:opacity-50"
      >
        {deleting ? '...' : 'Confirmer'}
      </button>
      <button
        onClick={onCancel}
        className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
      >
        Annuler
      </button>
    </div>
  );
}

// --- Ligne de fichier ---
function FileRow({ doc, onDelete, onDownload, onPreview, onRename }) {
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(doc.name);
  const renameRef = useRef(null);

  const isPdf = doc.mime_type === 'application/pdf';
  const isImage = doc.mime_type?.startsWith('image/');

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(doc.id, doc.file_path);
    setDeleting(false);
    setShowDelete(false);
  };

  const handleDownload = async () => {
    setDownloading(true);
    await onDownload(doc.file_path, doc.name);
    setDownloading(false);
  };

  const handleRenameSubmit = async () => {
    const trimmed = newName.trim();
    if (trimmed && trimmed !== doc.name) {
      await onRename(doc.id, trimmed);
    }
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') handleRenameSubmit();
    if (e.key === 'Escape') {
      setIsRenaming(false);
      setNewName(doc.name);
    }
  };

  useEffect(() => {
    if (isRenaming) {
      renameRef.current?.focus();
      renameRef.current?.select();
    }
  }, [isRenaming]);

  return (
    <div className="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-gray-50/80 transition-colors group relative">
      {showDelete && (
        <DeleteConfirm
          docName={doc.name}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          deleting={deleting}
        />
      )}

      {/* Icône type fichier */}
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isPdf ? 'bg-red-50 text-red-500' : isImage ? 'bg-violet-50 text-violet-500' : 'bg-gray-100 text-gray-400'
      }`}>
        {isPdf ? <Icon.FileText size={18} /> : isImage ? <Icon.Eye size={18} /> : <Icon.File size={18} />}
      </div>

      {/* Infos fichier */}
      <div className="flex-1 min-w-0">
        {isRenaming ? (
          <input
            ref={renameRef}
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={handleRenameKeyDown}
            className="w-full px-2 py-1 text-sm font-medium rounded-lg border border-primary focus:ring-2 focus:ring-primary-bg outline-none"
          />
        ) : (
          <div className="text-sm font-medium truncate">{doc.name}</div>
        )}
        <div className="text-xs text-gray-400 mt-0.5">
          {formatFileSize(doc.file_size)} — {formatDate(doc.uploaded_at)}
        </div>
      </div>

      {/* Actions (visible au hover desktop, toujours visible mobile) */}
      <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onPreview(doc.file_path)}
          className="p-2 rounded-lg text-gray-400 hover:text-violet-600 hover:bg-violet-50 transition-all cursor-pointer"
          title="Prévisualiser"
        >
          <Icon.Eye size={15} />
        </button>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all cursor-pointer disabled:opacity-50"
          title="Télécharger"
        >
          <Icon.Download size={15} />
        </button>
        <button
          onClick={() => { setNewName(doc.name); setIsRenaming(true); }}
          className="p-2 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-all cursor-pointer"
          title="Renommer"
        >
          <Icon.Edit size={15} />
        </button>
        <button
          onClick={() => setShowDelete(true)}
          className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer"
          title="Supprimer"
        >
          <Icon.Trash size={15} />
        </button>
      </div>
    </div>
  );
}

// --- Zone de drop ---
function CategoryDropZone({ category, onFilesSelected }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrag = useCallback((e) => { e.preventDefault(); e.stopPropagation(); }, []);
  const handleDragIn = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
  const handleDragOut = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) onFilesSelected(files);
  }, [onFilesSelected]);

  const handleInputChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) onFilesSelected(files);
    e.target.value = '';
  };

  return (
    <div
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl py-4 px-4 text-center transition-all duration-200 cursor-pointer ${
        isDragging
          ? `${category.dropActiveBg} ${category.dropActiveBorder} scale-[1.02] animate-drop-pulse`
          : 'bg-gray-50/50 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={category.id === 'lettre_motivation' ? LETTRE_ACCEPTED_EXT : ACCEPTED_EXT}
        multiple
        onChange={handleInputChange}
      />
      <div className={`flex items-center justify-center gap-2 text-sm ${isDragging ? category.iconText + ' font-medium' : 'text-gray-500'}`}>
        <Icon.Upload size={16} />
        <span>{isDragging ? 'Déposez ici' : 'Glissez-déposez ou cliquez pour ajouter'}</span>
      </div>
      <div className="text-xs text-gray-400 mt-1">
        {category.id === 'lettre_motivation' ? 'PDF, TXT, DOCX' : 'PDF, JPG, PNG'} — Max 10 Mo
      </div>
    </div>
  );
}

// --- Page principale ---
export default function DocumentsPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState({});
  const [successes, setSuccesses] = useState([]);
  const [errors, setErrors] = useState([]);
  const [pendingFiles, setPendingFiles] = useState(null); // { categoryId, files }

  // Chargement initial
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data } = await getDocuments(user.id);
      if (!cancelled) {
        setDocuments(data);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user]);

  // Validation
  const validateFile = (file, categoryId) => {
    const accepted = categoryId === 'lettre_motivation' ? LETTRE_ACCEPTED_TYPES : ACCEPTED_TYPES;
    const label = categoryId === 'lettre_motivation' ? 'PDF, TXT, DOCX' : 'PDF, JPG, PNG';
    if (!accepted.includes(file.type)) {
      return `"${file.name}" : format non accepté (${label} uniquement)`;
    }
    if (file.size > MAX_SIZE) {
      return `"${file.name}" : taille trop grande (max 10 Mo)`;
    }
    return null;
  };

  // Étape 1 : fichiers sélectionnés → afficher le formulaire de nommage
  const handleFilesSelected = useCallback((categoryId, files) => {
    const newErrors = [];
    const validFiles = [];
    for (const file of files) {
      const err = validateFile(file, categoryId);
      if (err) newErrors.push(err);
      else validFiles.push(file);
    }

    if (newErrors.length > 0) {
      setErrors(prev => [...prev, ...newErrors]);
      setTimeout(() => setErrors([]), 5000);
    }

    if (validFiles.length > 0) {
      setPendingFiles({ categoryId, files: validFiles });
    }
  }, []);

  // Étape 2 : noms confirmés → lancer l'upload
  const handleUploadConfirm = useCallback(async (names) => {
    if (!user || !pendingFiles) return;
    const { categoryId, files } = pendingFiles;
    setPendingFiles(null);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const displayName = names[i];
      const tempId = `upload_${Date.now()}_${Math.random()}`;

      setUploads(prev => ({
        ...prev,
        [tempId]: { fileName: displayName, progress: 0, category: categoryId },
      }));

      let progress = 0;
      const progressInterval = setInterval(() => {
        progress = Math.min(progress + Math.random() * 20 + 5, 90);
        setUploads(prev =>
          prev[tempId]
            ? { ...prev, [tempId]: { ...prev[tempId], progress: Math.round(progress) } }
            : prev
        );
      }, 200);

      const { data, error } = await uploadDocument(user.id, categoryId, file, displayName);

      clearInterval(progressInterval);

      if (error) {
        setUploads(prev => {
          const next = { ...prev };
          delete next[tempId];
          return next;
        });
        setErrors(prev => [...prev, `Erreur upload "${displayName}" : ${error.message}`]);
        setTimeout(() => setErrors([]), 5000);
      } else {
        // 100% puis retirer
        setUploads(prev =>
          prev[tempId]
            ? { ...prev, [tempId]: { ...prev[tempId], progress: 100 } }
            : prev
        );
        setTimeout(() => {
          setUploads(prev => {
            const next = { ...prev };
            delete next[tempId];
            return next;
          });
        }, 500);

        setDocuments(prev => [data, ...prev]);

        // Message de succès temporaire
        const successId = `success_${Date.now()}`;
        setSuccesses(prev => [...prev, { id: successId, name: displayName, category: categoryId }]);
        setTimeout(() => {
          setSuccesses(prev => prev.filter(s => s.id !== successId));
        }, 3000);
      }
    }
  }, [user, pendingFiles]);

  // Supprimer
  const handleDelete = async (docId, filePath) => {
    const { error } = await deleteDocument(docId, filePath);
    if (!error) {
      setDocuments(prev => prev.filter(d => d.id !== docId));
    }
  };

  // Télécharger
  const handleDownload = async (filePath, fileName) => {
    const { url, error } = await getSignedUrl(filePath);
    if (url && !error) {
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Prévisualiser
  const handlePreview = async (filePath) => {
    const { url, error } = await getSignedUrl(filePath);
    if (url && !error) {
      window.open(url, '_blank');
    }
  };

  // Renommer
  const handleRename = async (docId, newName) => {
    const { error } = await renameDocument(docId, newName);
    if (!error) {
      setDocuments(prev => prev.map(d => d.id === docId ? { ...d, name: newName } : d));
    }
  };

  // Compteurs & stats
  const countByCategory = {};
  let totalSize = 0;
  for (const doc of documents) {
    countByCategory[doc.category] = (countByCategory[doc.category] || 0) + 1;
    totalSize += doc.file_size || 0;
  }
  const totalCount = documents.length;
  const categoryCount = Object.keys(countByCategory).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-400">
          <span className="animate-spin inline-flex"><Icon.Clock size={20} /></span>
          <span>Chargement des documents...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-[28px] font-bold tracking-tight mb-2">Documents</h1>
        <p className="text-gray-500 text-[15px]">Gérez vos documents de candidature pour les joindre automatiquement</p>
      </div>

      {/* Erreurs */}
      {errors.length > 0 && (
        <div className="mb-6 flex flex-col gap-2">
          {errors.map((err, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 bg-red-50 text-red-700 rounded-xl text-sm animate-fade">
              <Icon.X size={16} />
              {err}
            </div>
          ))}
        </div>
      )}

      {/* Stats visuelles */}
      <div className="grid grid-cols-3 gap-3 md:gap-4 mb-8">
        <Card className="animate-slide delay-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-11 md:h-11 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 flex-shrink-0">
              <Icon.File size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wide">Documents</div>
              <div className="text-xl md:text-2xl font-bold text-gray-900">{totalCount}</div>
            </div>
          </div>
        </Card>

        <Card className="animate-slide delay-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-11 md:h-11 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 flex-shrink-0">
              <Icon.Grid size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wide">Catégories</div>
              <div className="text-xl md:text-2xl font-bold text-gray-900">
                {categoryCount}<span className="text-sm text-gray-400 font-normal">/{CATEGORIES.length}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="animate-slide delay-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-11 md:h-11 bg-violet-100 rounded-xl flex items-center justify-center text-violet-600 flex-shrink-0">
              <Icon.Cloud size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] md:text-xs text-gray-400 uppercase tracking-wide">Espace</div>
              <div className="text-xl md:text-2xl font-bold text-gray-900">{formatFileSize(totalSize)}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Modale de nommage */}
      {pendingFiles && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade"
          onClick={() => setPendingFiles(null)}
        >
          <UploadNameForm
            files={pendingFiles.files}
            category={CATEGORIES.find(c => c.id === pendingFiles.categoryId)}
            onConfirm={handleUploadConfirm}
            onCancel={() => setPendingFiles(null)}
          />
        </div>
      )}

      {/* Sections par catégorie */}
      <div className="flex flex-col gap-5">
        {CATEGORIES.map((cat) => {
          const catDocs = documents.filter(d => d.category === cat.id);
          const catUploads = Object.entries(uploads).filter(([, u]) => u.category === cat.id);
          const catSuccesses = successes.filter(s => s.category === cat.id);
          const CatIcon = cat.icon;

          return (
            <div
              key={cat.id}
              className={`bg-white rounded-2xl border border-gray-200 border-l-4 ${cat.accent} shadow-sm p-5 transition-all`}
            >
              {/* En-tête catégorie */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${cat.iconBg} ${cat.iconText} flex items-center justify-center`}>
                    <CatIcon size={20} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold">{cat.label}</h3>
                    <span className="text-xs text-gray-400">{cat.description}</span>
                  </div>
                </div>
                <span className={`inline-flex items-center justify-center min-w-[32px] h-8 px-2 rounded-full text-xs font-bold ${cat.badgeBg}`}>
                  {catDocs.length}
                </span>
              </div>

              {/* Uploads en cours */}
              {catUploads.length > 0 && (
                <div className="flex flex-col gap-2 mb-3">
                  {catUploads.map(([id, u]) => (
                    <UploadProgress key={id} fileName={u.fileName} progress={u.progress} />
                  ))}
                </div>
              )}

              {/* Messages de succès */}
              {catSuccesses.length > 0 && (
                <div className="flex flex-col gap-2 mb-3">
                  {catSuccesses.map(s => (
                    <UploadSuccess key={s.id} name={s.name} />
                  ))}
                </div>
              )}

              {/* Liste des fichiers */}
              {catDocs.length > 0 && (
                <div className="flex flex-col mb-3 divide-y divide-gray-100">
                  {catDocs.map(doc => (
                    <FileRow
                      key={doc.id}
                      doc={doc}
                      onDelete={handleDelete}
                      onDownload={handleDownload}
                      onPreview={handlePreview}
                      onRename={handleRename}
                    />
                  ))}
                </div>
              )}

              {/* Zone de drop */}
              <CategoryDropZone
                category={cat}
                onFilesSelected={(files) => handleFilesSelected(cat.id, files)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
