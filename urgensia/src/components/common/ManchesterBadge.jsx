import { getManchesterInfo } from '../../utils/helpers';

export function ManchesterBadge({ level, showLabel = true, size = 'sm' }) {
  const info = getManchesterInfo(level);

  const circleSizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  return (
    <span className="inline-flex items-center gap-2 flex-shrink-0">
      {/* Cercle coloré */}
      <span
        className={`${circleSizes[size]} rounded-full flex items-center justify-center font-black text-white shadow-sm flex-shrink-0`}
        style={{ backgroundColor: info.color }}
        title={`Niveau ${level} - ${info.label}`}
      >
        {level}
      </span>

      {/* Label optionnel */}
      {showLabel && (
        <span
          className="text-xs font-semibold"
          style={{ color: info.color }}
        >
          {info.label}
        </span>
      )}
    </span>
  );
}

export function ManchesterDot({ level, size = 'md' }) {
  const info = getManchesterInfo(level);
  const sizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={`${sizes[size]} rounded-full inline-block flex-shrink-0`}
      style={{ backgroundColor: info.color }}
      title={`Niveau ${level} - ${info.label}`}
    />
  );
}
