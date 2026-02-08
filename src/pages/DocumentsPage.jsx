import { useState, useRef, useCallback } from 'react';
import Card from '../components/Card';
import { Icon } from '../components/Icons';

const docTypes = [
  { id: 'cv', name: 'Curriculum Vitae', required: true },
  { id: 'diploma', name: 'Diplôme de médecin', required: true },
  { id: 'mebeko', name: 'Attestation MEBEKO', required: true },
  { id: 'recommendations', name: 'Lettres de recommandation', required: false },
  { id: 'certificates', name: 'Certificats de travail', required: false },
];

const iconMap = {
  cv: Icon.FileText,
  diploma: Icon.Award,
  mebeko: Icon.Briefcase,
  recommendations: Icon.Star,
  certificates: Icon.File,
};

function FileUpload({ docType, document, onUpload, onRemove }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef(null);

  const handleDrag = useCallback((e) => { e.preventDefault(); e.stopPropagation(); }, []);
  const handleDragIn = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
  const handleDragOut = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);

  const simulateUpload = (file) => {
    setIsUploading(true);
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          onUpload(docType.id, file);
          return 100;
        }
        return prev + 10;
      });
    }, 100);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    if (e.dataTransfer.files?.[0]) simulateUpload(e.dataTransfer.files[0]);
  }, []);

  const DocIcon = iconMap[docType.id] || Icon.File;

  if (document) {
    return (
      <div className="animate-scale bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 bg-success-bg rounded-xl flex items-center justify-center text-success">
          <Icon.Check size={24} />
        </div>
        <div className="flex-1">
          <div className="font-medium text-sm mb-0.5">{docType.name}</div>
          <div className="text-[13px] text-gray-500">{document.name} &bull; {document.date}</div>
        </div>
        <button
          onClick={() => onRemove(docType.id)}
          className="p-2 rounded-lg text-gray-400 hover:text-error transition-colors cursor-pointer"
        >
          <Icon.Trash size={18} />
        </button>
      </div>
    );
  }

  return (
    <div
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => !isUploading && inputRef.current?.click()}
      className={`border-2 border-dashed rounded-2xl py-8 px-6 text-center transition-all duration-200 ${
        isDragging ? 'bg-primary-bg border-primary scale-[1.01]' : 'bg-white border-gray-200'
      } ${isUploading ? '' : 'cursor-pointer'}`}
    >
      <input ref={inputRef} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && simulateUpload(e.target.files[0])} accept=".pdf,.doc,.docx" />

      {isUploading ? (
        <div>
          <div className="w-14 h-14 bg-primary-bg rounded-2xl flex items-center justify-center text-primary mx-auto mb-4">
            <Icon.Cloud size={28} />
          </div>
          <div className="font-medium mb-3">Téléchargement en cours...</div>
          <div className="w-[200px] h-1 bg-gray-100 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-[width] duration-100" style={{ width: `${uploadProgress}%` }} />
          </div>
          <div className="text-[13px] text-gray-500 mt-2">{uploadProgress}%</div>
        </div>
      ) : (
        <>
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all ${
            isDragging ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'
          } ${!isDragging ? 'animate-float' : ''}`}>
            <DocIcon size={26} />
          </div>
          <div className="mb-1">
            <span className="font-semibold text-primary">{docType.name}</span>
            {docType.required && (
              <span className="ml-2 text-[11px] font-semibold text-error uppercase">Requis</span>
            )}
          </div>
          <div className="text-[13px] text-gray-500">
            {isDragging ? 'Déposez le fichier ici' : 'Glissez-déposez ou cliquez pour sélectionner'}
          </div>
          <div className="text-xs text-gray-400 mt-2">PDF, DOC, DOCX &bull; Max 10MB</div>
        </>
      )}
    </div>
  );
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState({});

  const handleUpload = (docId, file) => {
    setDocuments(prev => ({
      ...prev,
      [docId]: { name: file.name, date: new Date().toLocaleDateString('fr-CH') }
    }));
  };

  const handleRemove = (docId) => {
    setDocuments(prev => {
      const copy = { ...prev };
      delete copy[docId];
      return copy;
    });
  };

  const uploadedCount = Object.keys(documents).length;
  const requiredCount = docTypes.filter(d => d.required).length;
  const requiredUploaded = docTypes.filter(d => d.required && documents[d.id]).length;

  return (
    <div className="animate-fade">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold tracking-tight mb-2">Documents</h1>
        <p className="text-gray-500 text-[15px]">Ajoutez vos documents pour les joindre automatiquement</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
        {[
          { label: 'Documents', value: uploadedCount, color: 'text-primary' },
          { label: 'Requis complétés', value: `${requiredUploaded}/${requiredCount}`, color: requiredUploaded === requiredCount ? 'text-success' : 'text-warning' },
          { label: 'Statut', value: requiredUploaded === requiredCount ? 'Complet' : 'Incomplet', color: requiredUploaded === requiredCount ? 'text-success' : 'text-gray-500' },
        ].map((stat, i) => (
          <Card key={i} className={`animate-slide delay-${i + 1}`}>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">{stat.label}</div>
            <div className={`text-[28px] font-bold ${stat.color}`}>{stat.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {docTypes.map((doc, i) => (
          <div key={doc.id} className={`animate-slide delay-${i + 1}`}>
            <FileUpload
              docType={doc}
              document={documents[doc.id]}
              onUpload={handleUpload}
              onRemove={handleRemove}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
