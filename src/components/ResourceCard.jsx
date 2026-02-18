import { Icon } from './Icons';

export default function ResourceCard({ name, description, url, iconBg = 'bg-gray-100', iconText = 'text-gray-600', IconComponent }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-install/30 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 group"
    >
      <div className={`w-11 h-11 rounded-xl ${iconBg} ${iconText} flex items-center justify-center flex-shrink-0`}>
        {IconComponent ? <IconComponent size={22} /> : <Icon.Globe size={22} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-gray-800 group-hover:text-install transition-colors">{name}</div>
        {description && <div className="text-xs text-gray-400 mt-0.5 truncate">{description}</div>}
      </div>
      <Icon.ExternalLink size={16} className="text-gray-300 group-hover:text-install transition-colors flex-shrink-0" />
    </a>
  );
}
