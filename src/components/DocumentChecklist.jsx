import { useRef } from 'react';
import { Icon } from './Icons';

const STATUS_CONFIG = {
  todo: { label: 'A fournir', bg: 'bg-gray-100', text: 'text-gray-500', icon: null },
  uploaded: { label: 'Uploade', bg: 'bg-blue-50', text: 'text-blue-600', icon: Icon.Upload },
  validated: { label: 'Valide', bg: 'bg-install-bg', text: 'text-install', icon: Icon.Check },
};

export default function DocumentChecklist({ documents, onStatusChange, onFileUpload }) {
  const total = documents.length;
  const done = documents.filter(d => d.status === 'uploaded' || d.status === 'validated').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-600">Documents fournis</span>
        <span className="text-sm font-bold text-install">{done}/{total}</span>
      </div>
      <div className="h-2 bg-install-bg rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-install rounded-full transition-all duration-500"
          style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
        />
      </div>
      <div className="flex flex-col gap-3">
        {documents.map((doc) => (
          <DocumentItem
            key={doc.id}
            doc={doc}
            onStatusChange={onStatusChange}
            onFileUpload={onFileUpload}
          />
        ))}
      </div>
    </div>
  );
}

function DocumentItem({ doc, onStatusChange, onFileUpload }) {
  const inputRef = useRef(null);
  const config = STATUS_CONFIG[doc.status] || STATUS_CONFIG.todo;
  const StatusIcon = config.icon;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload?.(doc.id, file);
      e.target.value = '';
    }
  };

  const cycleStatus = () => {
    const order = ['todo', 'uploaded', 'validated'];
    const next = order[(order.indexOf(doc.status) + 1) % order.length];
    onStatusChange?.(doc.id, next);
  };

  return (
    <div className="flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all">
      <button
        onClick={cycleStatus}
        className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${config.bg} ${config.text}`}
        title="Changer le statut"
      >
        {StatusIcon ? <StatusIcon size={16} /> : <Icon.Square size={16} />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-800">{doc.name}</div>
        {doc.description && <div className="text-xs text-gray-400 mt-0.5">{doc.description}</div>}
        {doc.tip && (
          <div className="flex items-start gap-1.5 mt-2 text-xs text-install bg-install-bg/40 p-2 rounded-lg">
            <Icon.Info size={12} className="mt-0.5 flex-shrink-0" />
            <span>{doc.tip}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${config.bg} ${config.text}`}>
          {config.label}
        </span>
        <button
          onClick={() => inputRef.current?.click()}
          className="p-2 rounded-lg text-gray-400 hover:text-install hover:bg-install-bg transition-all cursor-pointer"
          title="Uploader"
        >
          <Icon.Upload size={16} />
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
