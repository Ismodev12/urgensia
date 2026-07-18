import { useState } from 'react';
import { User } from 'lucide-react';
import { getPatientInitials } from '../../utils/helpers';

export function Avatar({ photo, nom, prenom, size = 'md', className = '', ring = false }) {
  const [imgError, setImgError] = useState(false);

  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-20 h-20 text-2xl',
    '3xl': 'w-24 h-24 text-3xl',
  };

  const ringClass = ring ? 'ring-2 ring-teal-500 ring-offset-2' : '';

  const initials = getPatientInitials(nom, prenom);

  if (photo && !imgError) {
    return (
      <div className={`${sizes[size]} rounded-full overflow-hidden flex-shrink-0 shadow-sm ${ringClass} ${className}`}>
        <img
          src={photo}
          alt={`${prenom} ${nom}`}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  if (initials && initials !== '') {
    return (
      <div
        className={`${sizes[size]} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 shadow-sm ${ringClass} ${className}`}
        style={{ background: 'linear-gradient(135deg, #0F766E, #14B8A6)' }}
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center bg-gray-200 text-gray-500 flex-shrink-0 shadow-sm ${ringClass} ${className}`}
    >
      <User className="w-1/2 h-1/2" />
    </div>
  );
}
