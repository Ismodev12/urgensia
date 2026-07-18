import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Share2, Copy, CheckCircle } from 'lucide-react';

/**
 * Affiche un QR code stylisé pour l'URL d'orientation du patient.
 * @param {string} url - URL complète à encoder dans le QR
 * @param {string} label - Texte sous le QR code
 * @param {string} couleur - Couleur principale (hex) pour le QR
 */
export default function QRCodeDisplay({ url, label = 'Scannez pour ouvrir sur votre téléphone', couleur = '#0F766E' }) {
  const [copied, setCopied] = useState(false);
  const svgRef = useRef(null);

  const copierLien = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback silencieux
    }
  };

  const telechargerQR = () => {
    const svg = svgRef.current?.querySelector('svg');
    if (!svg) return;

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'orientation-urgensia.svg';
    a.click();
    URL.revokeObjectURL(url);
  };

  const partager = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'URGENSIA — Mon orientation', url });
      } catch { /* annulé */ }
    } else {
      copierLien();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* QR Code */}
      <div
        ref={svgRef}
        className="p-4 bg-white rounded-2xl border-2 shadow-lg"
        style={{ borderColor: couleur + '33' }}
      >
        <QRCodeSVG
          value={url}
          size={160}
          fgColor={couleur}
          bgColor="white"
          level="M"
          includeMargin={false}
        />
      </div>

      {/* Label */}
      <p className="text-xs text-center text-slate-500 max-w-[180px] leading-snug">{label}</p>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={copierLien}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          title="Copier le lien"
        >
          {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copié !' : 'Copier'}
        </button>
        <button
          onClick={partager}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          title="Partager"
        >
          <Share2 className="w-3.5 h-3.5" />
          Partager
        </button>
        <button
          onClick={telechargerQR}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          title="Télécharger le QR"
        >
          <Download className="w-3.5 h-3.5" />
          SVG
        </button>
      </div>
    </div>
  );
}
