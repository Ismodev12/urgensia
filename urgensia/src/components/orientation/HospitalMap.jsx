import { useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

export default function HospitalMap({ serviceNom, couleurMTS = '#0F766E' }) {
  const [zoom, setZoom]       = useState(1);
  const [fullscreen, setFullscreen] = useState(false);

  const zoomIn  = () => setZoom(z => Math.min(z + 0.25, 2.5));
  const zoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));

  return (
    <>
      {/* Map card */}
      <div className="w-full relative">
        {/* Legend */}
        {serviceNom && (
          <div className="flex items-center gap-2 mb-3 text-xs">
            <span className="inline-block w-3 h-3 rounded-sm shadow-sm"
              style={{ backgroundColor: couleurMTS }} />
            <span className="font-semibold" style={{ color: couleurMTS }}>
              Destination : {serviceNom}
            </span>
          </div>
        )}

        {/* Image container */}
        <div className="relative w-full overflow-hidden rounded-xl border border-slate-200 shadow-inner bg-slate-100"
          style={{ minHeight: '280px' }}>

          {/* Zoom controls */}
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
            <button onClick={zoomIn}
              aria-label="Zoom avant"
              className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400">
              <ZoomIn className="w-3.5 h-3.5 text-slate-600" />
            </button>
            <button onClick={zoomOut}
              aria-label="Zoom arrière"
              className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400">
              <ZoomOut className="w-3.5 h-3.5 text-slate-600" />
            </button>
            <button onClick={() => setFullscreen(true)}
              aria-label="Plein écran"
              className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors duration-150 cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400">
              <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>

          {/* Zoom level badge */}
          <div className="absolute bottom-3 left-3 z-10 px-2 py-0.5 bg-black/50 text-white text-xs rounded-md font-mono">
            {Math.round(zoom * 100)}%
          </div>

          {/* Scrollable image area */}
          <div className="w-full overflow-auto" style={{ maxHeight: '420px' }}>
            <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left',
              transition: 'transform 0.2s ease',
              width: `${100 / zoom}%` }}>
              <img
                src="/hospital-plan.jpg"
                alt="Plan du rez-de-chaussée de l'hôpital URGENSIA"
                className="w-full h-auto block"
                draggable={false}
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-2 text-center">
          Plan du rez-de-chaussée · Utilisez le zoom pour agrandir
        </p>
      </div>

      {/* Fullscreen overlay */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setFullscreen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Plan de l'hôpital en plein écran">
          <div className="relative max-w-5xl w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setFullscreen(false)}
              aria-label="Fermer le plein écran"
              className="absolute -top-10 right-0 text-white/80 hover:text-white text-sm font-semibold cursor-pointer transition-colors duration-150">
              Fermer ✕
            </button>
            <img
              src="/hospital-plan.jpg"
              alt="Plan de l'hôpital URGENSIA — plein écran"
              className="w-full h-auto rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}
