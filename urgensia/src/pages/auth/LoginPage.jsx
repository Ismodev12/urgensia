import { useState } from 'react';
import doctorImg from '../../assets/images/african-doctor-desk-glasses-his-hand-male-south-africa-smiling-camera-34018714.webp';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Eye, EyeOff, LogIn, AlertCircle, ArrowLeft, ShieldCheck, Mail, Lock, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember]         = useState(true);
  const [showReset, setShowReset]       = useState(false);
  const [loading, setLoading]           = useState(false);
  const [apiError, setApiError]         = useState(null);
  const navigate = useNavigate();
  const { login } = useAuth();

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async ({ email, password }) => {
    setLoading(true);
    setApiError(null);
    try {
      const user = await login(email, password);
      // Redirection selon le rôle retourné par l'API
      if (user.role === 'medecin') navigate('/medecin');
      else if (user.role === 'admin') navigate('/admin');
      else navigate('/agent');
    } catch (err) {
      const msg = err.response?.data?.error ?? 'Erreur de connexion. Vérifiez votre réseau.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    'w-full pl-11 pr-4 py-4 rounded-2xl text-sm text-white placeholder-white/40 ' +
    'focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all';
  const inputState = (hasError) => hasError
    ? 'border border-red-400/60 bg-red-500/10'
    : 'border border-white/15 bg-white/10 hover:bg-white/15 focus:bg-white/15';

  return (
    <div className="min-h-screen flex">

      {/* ══ LEFT PANEL ═══════════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src={doctorImg}
          alt="Médecin africain URGENSIA"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-teal-900/85 via-teal-800/70 to-slate-900/85" />

        <div className="absolute inset-0 flex flex-col justify-between p-12">
          <Link to="/" className="flex items-center gap-2.5 w-fit">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black text-white tracking-wide">URGENSIA</span>
          </Link>

          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <h1 className="text-4xl xl:text-5xl font-black text-white mb-4 leading-tight">
                Chaque seconde
                <br />
                <span className="text-teal-300">compte.</span>
              </h1>
              <p className="text-teal-100/90 text-lg leading-relaxed mb-8 max-w-md">
                Connectez-vous pour accéder au système de pré-triage médical le plus avancé du Bénin.
              </p>

              <div className="grid grid-cols-3 gap-4 max-w-md">
                {[
                  { value: '+5000',   label: 'Patients/mois' },
                  { value: '4.2 min', label: 'Triage moyen' },
                  { value: '98.5%',   label: 'Précision' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                    <p className="text-2xl font-black text-white">{stat.value}</p>
                    <p className="text-xs text-teal-200 mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex -space-x-2.5">
              {[
                'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=36&h=36&fit=crop&crop=face',
                'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=36&h=36&fit=crop&crop=face',
                'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=36&h=36&fit=crop&crop=face',
              ].map((src, i) => (
                <img key={i} src={src} alt="" className="w-9 h-9 rounded-full border-2 border-teal-900 object-cover" />
              ))}
            </div>
            <p className="text-teal-200 text-sm">+120 professionnels nous font confiance</p>
          </div>
        </div>
      </div>

      {/* ══ RIGHT PANEL ══════════════════════════════════════════════════ */}
      <div
        className="flex-1 relative flex items-center justify-center p-6 sm:p-10 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0F766E 0%, #134E4A 40%, #0F172A 100%)' }}
      >
        {/* Halos décoratifs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full bg-teal-400/20 blur-3xl" />
          <div className="absolute -bottom-16 -left-20 w-72 h-72 rounded-full bg-cyan-400/10 blur-3xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 w-full max-w-md"
        >
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-2.5 mb-8 lg:hidden w-fit">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-xl text-white tracking-wide">URGENSIA</span>
          </Link>

          {/* Carte glassmorphism */}
          <div
            className="rounded-3xl px-8 py-10 border"
            style={{
              background: 'rgba(255, 255, 255, 0.10)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderColor: 'rgba(255, 255, 255, 0.18)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
          >
            <div className="mb-8">
              <h2 className="text-3xl font-black text-white mb-1.5">Bon retour</h2>
              <p className="text-teal-100/80 text-sm">Connectez-vous à votre espace professionnel.</p>
            </div>

            {/* Erreur API */}
            <AnimatePresence>
              {apiError && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  role="alert"
                  className="flex items-center gap-2 bg-red-500/20 border border-red-400/40 rounded-2xl px-4 py-3 mb-5"
                >
                  <AlertCircle className="w-4 h-4 text-red-300 flex-shrink-0" />
                  <p className="text-red-200 text-sm">{apiError}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-white/90 mb-2">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" aria-hidden />
                  <input
                    id="email"
                    type="email"
                    placeholder="votre.email@urgensia.bj"
                    autoComplete="email"
                    {...register('email', {
                      required: 'Email requis',
                      pattern: { value: /^\S+@\S+$/, message: 'Email invalide' },
                    })}
                    className={`${inputBase} ${inputState(errors.email)}`}
                  />
                </div>
                {errors.email && <p className="text-red-300 text-xs mt-1.5">{errors.email.message}</p>}
              </div>

              {/* Mot de passe */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-white/90 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" aria-hidden />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    {...register('password', {
                      required: 'Mot de passe requis',
                      minLength: { value: 6, message: 'Min. 6 caractères' },
                    })}
                    className={`${inputBase} pr-12 ${inputState(errors.password)}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-300 text-xs mt-1.5">{errors.password.message}</p>}
              </div>

              {/* Options : se souvenir / mot de passe oublié */}
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setRemember(v => !v)}
                  aria-pressed={remember}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    remember ? 'bg-teal-500 border-teal-500' : 'border-white/30 group-hover:border-white/50'
                  }`}>
                    {remember && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </span>
                  <span className="text-sm text-white/80">Se souvenir de moi</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowReset(v => !v)}
                  className="text-sm font-medium text-teal-300 hover:text-teal-200 transition-colors cursor-pointer"
                >
                  Mot de passe oublié ?
                </button>
              </div>

              <AnimatePresence>
                {showReset && (
                  <motion.p
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex items-start gap-2 text-xs text-white/70 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5"
                  >
                    <AlertCircle className="w-3.5 h-3.5 text-teal-300 flex-shrink-0 mt-0.5" />
                    <span>La réinitialisation en ligne n'est pas encore disponible. Contactez votre administrateur pour réinitialiser votre mot de passe.</span>
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Bouton */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.97 }}
                className="w-full flex items-center justify-center gap-2 py-4 font-bold text-white rounded-2xl transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer text-sm"
                style={{
                  background: 'linear-gradient(135deg, #0F766E, #14B8A6)',
                  boxShadow: '0 4px 20px rgba(15,118,110,0.45)',
                }}
              >
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Connexion en cours…
                    </motion.span>
                  ) : (
                    <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-2">
                      <LogIn className="w-4 h-4" />
                      Se connecter
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </form>

            {/* Accès sécurisé */}
            <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-center gap-2 text-white/45 text-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              Accès sécurisé réservé au personnel autorisé
            </div>
          </div>

          {/* Retour */}
          <div className="mt-5 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour à l'accueil
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
