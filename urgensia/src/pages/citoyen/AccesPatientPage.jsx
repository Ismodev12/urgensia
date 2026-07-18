import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Activity, QrCode, AlertTriangle, Loader,
  ChevronRight, HeartPulse, ShieldCheck,
} from 'lucide-react';

// ─── Page d'accès patient ─────────────────────────────────────────────────────
// Le patient saisit le code unique (format PAT-XXXXXX) communiqué par l'infirmier,
// ou scanne le QR code affiché après le triage.

const LEN = 6; // nombre de caractères après le préfixe « PAT- »

export default function AccesPatientPage() {
  const [chars, setChars]   = useState(Array(LEN).fill(''));
  const [error, setError]   = useState(null);
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef([]);
  const navigate = useNavigate();

  const code  = `PAT-${chars.join('')}`;
  const ready = chars.every((c) => c !== '');

  const focusBox = (i) => inputsRef.current[i]?.focus();

  const setChar = (i, value) => {
    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setError(null);
    setChars((prev) => {
      const next = [...prev];
      next[i] = clean ? clean[clean.length - 1] : '';
      return next;
    });
    if (clean && i < LEN - 1) focusBox(i + 1);
  };

  const onKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !chars[i] && i > 0) focusBox(i - 1);
    else if (e.key === 'ArrowLeft' && i > 0) focusBox(i - 1);
    else if (e.key === 'ArrowRight' && i < LEN - 1) focusBox(i + 1);
  };

  const onPaste = (e) => {
    e.preventDefault();
    let text = (e.clipboardData.getData('text') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (text.startsWith('PAT')) text = text.slice(3); // colle « PAT-A2MB7K » → garde A2MB7K
    const list = text.slice(0, LEN).split('');
    setError(null);
    setChars(Array.from({ length: LEN }, (_, idx) => list[idx] || ''));
    focusBox(Math.min(list.length, LEN - 1));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!ready) { setError('Saisissez les 6 caractères de votre code.'); return; }
    setLoading(true);
    try {
      navigate(`/patient/suivi/${code}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen flex flex-col overflow-hidden font-sans"
      style={{ background: 'linear-gradient(135deg, #F0FDFA 0%, #F8FAFC 50%, #EFF6FF 100%)' }}
    >
      {/* Décor doux (charte URGENSIA) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-100/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-100/40 rounded-full blur-3xl" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 px-4 py-5 flex items-center justify-between max-w-lg mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-700 to-teal-500 flex items-center justify-center shadow-teal">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-night-blue tracking-wide text-lg">URGENSIA</span>
        </div>
        <Link
          to="/"
          className="text-soft-gray hover:text-teal-700 text-sm font-medium transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded-lg px-1"
        >
          ← Accueil
        </Link>
      </nav>

      {/* Contenu */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Carte-ticket */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-large overflow-hidden">

            {/* En-tête coloré */}
            <div
              className="relative px-7 pt-8 pb-7 text-center overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 55%, #06B6D4 100%)' }}
            >
              <div aria-hidden className="absolute -top-10 -right-8 w-32 h-32 bg-white/10 rounded-full" />
              <div aria-hidden className="absolute -bottom-12 -left-6 w-28 h-28 bg-white/10 rounded-full" />
              <motion.div
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 mb-3"
              >
                <HeartPulse className="w-8 h-8 text-white" />
              </motion.div>
              <h1 className="relative text-2xl font-black text-white leading-tight">
                Suivi de votre prise en charge
              </h1>
              <p className="relative text-teal-50/90 text-sm mt-1.5 max-w-xs mx-auto">
                Entrez le code remis par l'infirmier après votre triage.
              </p>
            </div>

            {/* Corps */}
            <div className="px-4 sm:px-7 py-7">
              <form onSubmit={handleSubmit}>
                <label className="block text-center text-xs font-bold text-teal-700 uppercase tracking-widest mb-1">
                  Votre code de suivi
                </label>
                <p className="text-center text-xs text-soft-gray mb-4">
                  Il commence par <span className="font-mono font-bold text-slate-500">PAT-</span>
                </p>

                {/* Saisie segmentée */}
                <div
                  className="flex items-center justify-center gap-1.5 sm:gap-2.5"
                  role="group"
                  aria-label="Code de suivi, 6 caractères"
                >
                  {chars.map((c, i) => (
                    <input
                      key={i}
                      ref={(el) => { inputsRef.current[i] = el; }}
                      type="text"
                      value={c}
                      onChange={(e) => setChar(i, e.target.value)}
                      onKeyDown={(e) => onKeyDown(i, e)}
                      onPaste={onPaste}
                      onFocus={(e) => e.target.select()}
                      inputMode="text"
                      autoCapitalize="characters"
                      autoComplete="off"
                      spellCheck={false}
                      maxLength={1}
                      aria-label={`Caractère ${i + 1} sur ${LEN}`}
                      className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black uppercase rounded-xl border-2 border-slate-200 bg-slate-50 text-night-blue caret-teal-600 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 focus:bg-white"
                    />
                  ))}
                </div>

                {/* Erreur */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    role="alert"
                    className="mt-4 flex items-center justify-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5"
                  >
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <p className="text-red-700 text-sm">{error}</p>
                  </motion.div>
                )}

                {/* CTA */}
                <button
                  type="submit"
                  disabled={loading || !ready}
                  className={`mt-6 w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-black text-base transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 ${
                    ready
                      ? 'bg-gradient-to-r from-teal-700 to-teal-600 text-white shadow-teal hover:from-teal-800 hover:to-teal-700'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {loading ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Accéder à mon suivi
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              {/* Séparateur */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-xs text-soft-gray font-medium">ou</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {/* Aide QR code */}
              <div className="flex items-center gap-3 rounded-2xl bg-teal-50/70 border border-teal-100 p-4">
                <div className="w-11 h-11 rounded-xl bg-white border border-teal-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <QrCode className="w-5 h-5 text-teal-600" />
                </div>
                <p className="text-xs text-soft-gray leading-relaxed">
                  <span className="font-bold text-night-blue">Vous avez un QR code ?</span> Scannez celui que
                  l'infirmier affiche sur son écran avec l'appareil photo de votre téléphone.
                </p>
              </div>
            </div>
          </div>

          {/* Note sécurité */}
          <p className="mt-5 flex items-center justify-center gap-1.5 text-soft-gray text-xs text-center px-4">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
            Vos données sont accessibles uniquement avec votre code unique.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
