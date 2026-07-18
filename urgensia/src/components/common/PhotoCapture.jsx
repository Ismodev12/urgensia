import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Upload, X, RefreshCw, Check,
  User, ImagePlus, Maximize2,
} from 'lucide-react';

/**
 * PhotoCapture — Widget de capture/upload de photo patient.
 *
 * Props :
 *  - value       {File|string|null}  fichier sélectionné ou URL existante
 *  - onChange    {(file: File|null) => void}
 *  - label       {string}  texte du libellé (optionnel)
 *  - size        {'sm'|'md'|'lg'}   taille de l'avatar préview (défaut: 'md')
 *  - disabled    {boolean}
 */
export function PhotoCapture({
  value     = null,
  onChange,
  label     = 'Photo du patient',
  size      = 'md',
  disabled  = false,
}) {
  const [mode,        setMode]        = useState('idle');   // 'idle'|'camera'|'preview'
  const [preview,     setPreview]     = useState(null);     // URL blob pour prévisualisation
  const [camError,    setCamError]    = useState(null);
  const [streaming,   setStreaming]   = useState(false);

  const fileRef   = useRef(null);
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const sizeMap = {
    sm: { avatar: 'w-16 h-16', text: 'text-xs' },
    md: { avatar: 'w-24 h-24', text: 'text-sm' },
    lg: { avatar: 'w-32 h-32', text: 'text-sm' },
  };
  const s = sizeMap[size] || sizeMap.md;

  // ─── Affichage courant ────────────────────────────────────────────────────
  // Priorité : blob local > valeur existante (URL)
  const displaySrc = preview || (typeof value === 'string' ? value : null);

  // ─── Fichier picker ───────────────────────────────────────────────────────
  const handleFilePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setMode('preview');
    onChange?.(file);
    e.target.value = '';
  };

  // ─── Webcam : démarrer ────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCamError(null);
    setMode('camera');
    setStreaming(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreaming(true);
      }
    } catch (err) {
      setCamError('Caméra non disponible. Utilisez le bouton "Choisir un fichier".');
    }
  }, []);

  // ─── Webcam : arrêter ─────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setStreaming(false);
    setMode('idle');
  }, []);

  // ─── Webcam : capturer ────────────────────────────────────────────────────
  const capturePhoto = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const url  = URL.createObjectURL(blob);
      setPreview(url);
      setMode('preview');
      stopCamera();
      onChange?.(file);
    }, 'image/jpeg', 0.92);
  }, [stopCamera, onChange]);

  // ─── Reset ────────────────────────────────────────────────────────────────
  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setMode('idle');
    onChange?.(null);
    stopCamera();
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-3">
      {label && (
        <p className={`font-semibold text-night-blue self-start ${s.text}`}>{label}</p>
      )}

      <AnimatePresence mode="wait">

        {/* ── Mode camera ─────────────────────────────────────────────── */}
        {mode === 'camera' && (
          <motion.div
            key="camera"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full rounded-2xl overflow-hidden border-2 border-teal-300 bg-black relative"
            style={{ aspectRatio: '4/3', maxWidth: 320 }}
          >
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />

            {camError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4">
                <p className="text-white text-xs text-center">{camError}</p>
              </div>
            )}

            {/* Contrôles camera */}
            <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={stopCamera}
                className="w-10 h-10 rounded-full bg-white/20 border border-white/40 text-white flex items-center justify-center hover:bg-white/30 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                disabled={!streaming}
                className="w-14 h-14 rounded-full bg-white border-4 border-teal-500 flex items-center justify-center shadow-lg hover:bg-teal-50 transition disabled:opacity-40 cursor-pointer"
              >
                <Camera className="w-6 h-6 text-teal-700" />
              </button>
            </div>

            {/* Indicateur streaming */}
            {streaming && (
              <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-red-600/90 text-white text-xs px-2 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                EN DIRECT
              </div>
            )}
          </motion.div>
        )}

        {/* ── Prévisualisation ────────────────────────────────────────── */}
        {mode !== 'camera' && (
          <motion.div
            key="display"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3 w-full"
          >
            {/* Avatar / placeholder */}
            <div className="relative group">
              <div
                className={`${s.avatar} rounded-2xl overflow-hidden border-2 flex items-center justify-center shadow-sm
                  ${displaySrc ? 'border-teal-300' : 'border-dashed border-slate-300 bg-slate-50'}`}
              >
                {displaySrc ? (
                  <img
                    src={displaySrc}
                    alt="Aperçu"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-slate-400">
                    <User className="w-8 h-8" />
                    <span className="text-[10px] font-medium">Aucune photo</span>
                  </div>
                )}
              </div>

              {/* Badge check si photo chargée */}
              {displaySrc && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center border-2 border-white shadow">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </div>

            {/* Boutons d'action */}
            {!disabled && (
              <div className="flex flex-wrap gap-2 justify-center">
                {/* Choisir fichier */}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 transition-all cursor-pointer"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  {displaySrc ? 'Changer' : 'Fichier'}
                </button>

                {/* Webcam */}
                <button
                  type="button"
                  onClick={startCamera}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 transition-all cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Webcam
                </button>

                {/* Supprimer si photo présente */}
                {displaySrc && (
                  <button
                    type="button"
                    onClick={reset}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-xs font-semibold text-red-500 hover:bg-red-50 transition-all cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    Retirer
                  </button>
                )}
              </div>
            )}

            <p className="text-[10px] text-slate-400 text-center">
              Facultatif · JPEG / PNG / WebP · max 5 Mo
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input fichier caché */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={handleFilePick}
      />
    </div>
  );
}
