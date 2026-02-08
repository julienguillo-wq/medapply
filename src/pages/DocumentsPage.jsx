import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  uploadDocument,
  getDocuments,
  deleteDocument,
  getSignedUrl,
} from '../services/documentsService';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import { Icon } from '../components/Icons';

// --- Catégories ---
const CATEGORIES = [
  { id: 'diplome', label: 'Diplômes', icon: Icon.GraduationCap, color: 'text-primary', bg: 'bg-primary-bg' },
  { id: 'certification', label: 'Certifications', icon: Icon.Award, color: 'text-amber-700', bg: 'bg-warning-bg' },
  { id: 'lettre_recommandation', label: 'Lettres de recommandation', icon: Icon.Star, color: 'text-purple-700', bg: 'bg-purple-50' },
  { id: 'cv', label: 'CV', icon: Icon.FileText, color: 'text-emerald-700', bg: 'bg-success-bg' },
  { id: 'attestation', label: 'Attestations', icon: Icon.Briefcase, color: 'text-blue-700', bg: 'bg-blue-50' },
  { id: 'autre', label: 'Autres', icon: Icon.File, color: 'text-gray-600', bg: 'bg-gray-100' },
];

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ACCEPTED_EXT = '.pdf,.jpg,.jpeg,.png';
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

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

// --- Composant DropZone par catégorie ---
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

  const CatIcon = category.icon;

  return (
    <div
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-2 border-dashed rounded-xl py-5 px-4 text-center transition-all duration-200 cursor-pointer ${
        isDragging ? 'bg-primary-bg border-primary scale-[1.01]' : 'bg-gray-50/50 border-gray-200 hover:border-gray-300'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={ACCEPTED_EXT}
        multiple
        onChange={handleInputChange}
      />
      <div className={`w-10 h-10 rounded-xl ${isDragging ? 'bg-primary text-white' : category.bg + ' ' + category.color} flex items-center justify-center mx-auto mb-2 transition-all`}>
        <CatIcon size={20} />
      </div>
      <div className="text-sm text-gray-600">
        {isDragging ? 'Déposez ici' : 'Glissez-déposez ou cliquez'}
      </div>
      <div className="text-xs text-gray-400 mt-1">PDF, JPG, PNG — Max 10 Mo</div>
    </div>
  );
}

// --- Composant barre de progression ---
function UploadProgress({ fileName, progress }) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 bg-primary-bg/50 rounded-lg animate-fade">
      <div className="w-8 h-8 rounded-lg bg-primary-bg flex items-center justify-center text-primary flex-shrink-0">
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
      <span className="text-xs text-primary font-semibold flex-shrink-0">{progress}%</span>
    </div>
  );
}

// --- Composant ligne de fichier ---
function FileRow({ doc, onDelete, onDownload }) {
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const isPdf = doc.mime_type === 'application/pdf';
  const isImage = doc.mime_type?.startsWith('image/');

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(doc.id, doc.file_path);
    setDeleting(false);
  };

  const handleDownload = async () => {
    setDownloading(true);
    await onDownload(doc.file_path, doc.file_name);
    setDownloading(false);
  };

  return (
    <div className="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-gray-50 transition-colors group">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isPdf ? 'bg-red-50 text-red-600' : isImage ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
      }`}>
        {isPdf ? <Icon.FileText size={18} /> : isImage ? <Icon.Eye size={18} /> : <Icon.File size={18} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{doc.name}</div>
        <div className="text-xs text-gray-400">
          {formatFileSize(doc.file_size)} — {formatDate(doc.uploaded_at)}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-bg transition-all cursor-pointer disabled:opacity-50"
          title="Télécharger"
        >
          <Icon.Download size={16} />
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-2 rounded-lg text-gray-400 hover:text-error hover:bg-error-bg transition-all cursor-pointer disabled:opacity-50"
          title="Supprimer"
        >
          <Icon.Trash size={16} />
        </button>
      </div>
    </div>
  );
}

// --- Page principale ---
export default function DocumentsPage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState({}); // { [tempId]: { fileName, progress, category } }
  const [errors, setErrors] = useState([]);

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

  // Validation fichier
  const validateFile = (file) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `"${file.name}" : format non accepté (PDF, JPG, PNG uniquement)`;
    }
    if (file.size > MAX_SIZE) {
      return `"${file.name}" : taille trop grande (max 10 Mo)`;
    }
    return null;
  };

  // Upload de fichiers pour une catégorie
  const handleFilesSelected = useCallback(async (categoryId, files) => {
    if (!user) return;

    // Valider tous les fichiers
    const newErrors = [];
    const validFiles = [];
    for (const file of files) {
      const err = validateFile(file);
      if (err) newErrors.push(err);
      else validFiles.push(file);
    }

    if (newErrors.length > 0) {
      setErrors(prev => [...prev, ...newErrors]);
      setTimeout(() => setErrors([]), 5000);
    }

    // Uploader chaque fichier valide
    for (const file of validFiles) {
      const tempId = `upload_${Date.now()}_${Math.random()}`;

      // Afficher la progression simulée
      setUploads(prev => ({ ...prev, [tempId]: { fileName: file.name, progress: 0, category: categoryId } }));

      // Simuler la progression (Supabase Storage n'a pas de callback de progression)
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress = Math.min(progress + Math.random() * 20 + 5, 90);
        setUploads(prev => prev[tempId] ? { ...prev, [tempId]: { ...prev[tempId], progress: Math.round(progress) } } : prev);
      }, 200);

      const { data, error } = await uploadDocument(user.id, categoryId, file, file.name);

      clearInterval(progressInterval);

      if (error) {
        setUploads(prev => {
          const next = { ...prev };
          delete next[tempId];
          return next;
        });
        setErrors(prev => [...prev, `Erreur upload "${file.name}" : ${error.message}`]);
        setTimeout(() => setErrors([]), 5000);
      } else {
        // 100% puis retirer
        setUploads(prev => prev[tempId] ? { ...prev, [tempId]: { ...prev[tempId], progress: 100 } } : prev);
        setTimeout(() => {
          setUploads(prev => {
            const next = { ...prev };
            delete next[tempId];
            return next;
          });
        }, 500);

        // Ajouter le document à la liste
        setDocuments(prev => [data, ...prev]);
      }
    }
  }, [user]);

  // Supprimer un document
  const handleDelete = async (docId, filePath) => {
    const { error } = await deleteDocument(docId, filePath);
    if (!error) {
      setDocuments(prev => prev.filter(d => d.id !== docId));
    }
  };

  // Télécharger un document
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

  // Compteurs par catégorie
  const countByCategory = {};
  for (const doc of documents) {
    countByCategory[doc.category] = (countByCategory[doc.category] || 0) + 1;
  }

  const totalCount = documents.length;
  const categoryCount = Object.keys(countByCategory).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-400">
          <Icon.Clock size={20} className="animate-spin" />
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
            <div key={i} className="flex items-center gap-3 px-4 py-3 bg-error-bg text-red-700 rounded-xl text-sm animate-fade">
              <Icon.X size={16} />
              {err}
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 mb-8">
        {[
          { label: 'Documents', value: totalCount, color: 'text-primary', bg: 'bg-primary-bg' },
          { label: 'Catégories utilisées', value: `${categoryCount}/${CATEGORIES.length}`, color: 'text-emerald-700', bg: 'bg-success-bg' },
          { label: 'Statut', value: totalCount > 0 ? 'Actif' : 'Vide', color: totalCount > 0 ? 'text-success' : 'text-gray-500', bg: totalCount > 0 ? 'bg-success-bg' : 'bg-gray-100' },
        ].map((stat, i) => (
          <Card key={i} className={`animate-slide delay-${i + 1}`}>
            <div className={`w-11 h-11 ${stat.bg} rounded-xl mb-3`} />
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{stat.label}</div>
            <div className={`text-[28px] font-bold ${stat.color}`}>{stat.value}</div>
          </Card>
        ))}
      </div>

      {/* Sections par catégorie */}
      <div className="flex flex-col gap-6">
        {CATEGORIES.map((cat) => {
          const catDocs = documents.filter(d => d.category === cat.id);
          const catUploads = Object.entries(uploads).filter(([, u]) => u.category === cat.id);
          const CatIcon = cat.icon;

          return (
            <Card key={cat.id}>
              {/* En-tête catégorie */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${cat.bg} ${cat.color} flex items-center justify-center`}>
                    <CatIcon size={20} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold">{cat.label}</h3>
                    <span className="text-xs text-gray-400">
                      {catDocs.length === 0
                        ? 'Aucun document'
                        : `${catDocs.length} document${catDocs.length > 1 ? 's' : ''}`}
                    </span>
                  </div>
                </div>
                {catDocs.length > 0 && (
                  <Badge variant={cat.id === 'diplome' ? 'primary' : cat.id === 'certification' ? 'warning' : 'default'}>
                    {catDocs.length}
                  </Badge>
                )}
              </div>

              {/* Uploads en cours */}
              {catUploads.length > 0 && (
                <div className="flex flex-col gap-2 mb-3">
                  {catUploads.map(([id, u]) => (
                    <UploadProgress key={id} fileName={u.fileName} progress={u.progress} />
                  ))}
                </div>
              )}

              {/* Liste des fichiers */}
              {catDocs.length > 0 && (
                <div className="flex flex-col mb-4 divide-y divide-gray-100">
                  {catDocs.map(doc => (
                    <FileRow
                      key={doc.id}
                      doc={doc}
                      onDelete={handleDelete}
                      onDownload={handleDownload}
                    />
                  ))}
                </div>
              )}

              {/* Drop zone */}
              <CategoryDropZone
                category={cat}
                onFilesSelected={(files) => handleFilesSelected(cat.id, files)}
              />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
