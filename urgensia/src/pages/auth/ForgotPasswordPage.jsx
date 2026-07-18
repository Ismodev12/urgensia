import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Mail, ArrowLeft, AlertCircle, CheckCircle2,
  KeyRound, Copy, ExternalLink, Loader,
} from 'lucide-react';
import { forgotPassword } from '../../services/authService';

export default function ForgotPasswordPage() {
  const [loading, setLoading]     = useState(false);
  const [apiError, setApiError]   = useState(null);
  const [result, setResult]       = useState(null);
  const [copied, setCopied]       = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async ({ email }) => {
    setLoading(true);
    setApiError(null);
    setResult(null);
    try {
      const data = await forgotPassword(email);
      setResult(data);
    } catch (err) {
      const msg = err.response?.data?.error ?? 'Erreur réseau. Réessayez plus tard.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    if (result?.resetUrl) {
      navigator.clipboard.writeText(result.resetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #0F766E 0%, #134e4a 40%, #0F172A 100%)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl text-white">URGENSIA</span>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl p-8 border"
          style={{
            background: 'rgba(255, 255, 255, 0.10)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderColor: 'rgba(255, 255, 255, 0.18)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
          }}
        >
          {/* Header */}
          <div className="mb-7">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: 'linear-gradient(135deg, #0F766E, #14B8A6)', boxShadow: '0 4px 20px rgba(15,118,110,0.45)' }}
            >
              <KeyRound className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-black text-white mb-1.5">Mot de passe oublié</h2>
            <p className="text-teal-100/80 text-sm">
              Entrez votre adresse email pour recevoir un lien de réinitialisation
            </p>
          </div>

          {/* Error */}
          <AnimatePresence>
            {apiError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-center gap-2 bg-red-500/20 border border-red-400/40 rounded-2xl px-4 py-3 mb-5"
              >
                <AlertCircle className="w-4 h-4 text-red-300 flex-shrink-0" />
                <p className="text-red-200 text-sm">{apiError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                {/* Success message */}
                <div className="flex items-start gap-3 bg-teal-500/20 border border-teal-400/40 rounded-2xl px-4 py-4">
                  <CheckCircle2 className="w-5 h-5 text-teal-300 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-teal-200 text-sm font-semibold">{result.message}</p>
                    {result.expiresIn && (
                      <p className="text-teal-300/70 text-xs mt-1">
                        Ce lien expire dans {result.expiresIn}.
                      </p>
                    )}
                  </div>
                </div>

                {/* Demo: show reset link */}
                {result.resetUrl && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <p className="text-xs font-bold text-amber-300 mb-2 flex items-center gap-1.5">
                      ⚡ Mode démo — Lien de réinitialisation
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-white/10 border border-white/15 rounded-xl px-3 py-2 overflow-hidden">
                        <p className="text-xs text-teal-200 font-mono truncate">
                          {result.resetUrl}
                        </p>
                      </div>
                      <button
                        onClick={copyToken}
                        className="p-2.5 bg-white/10 border border-white/15 rounded-xl hover:bg-white/20 transition-colors cursor-pointer flex-shrink-0"
                        title="Copier le lien"
                      >
                        {copied
                          ? <CheckCircle2 className="w-4 h-4 text-teal-300" />
                          : <Copy className="w-4 h-4 text-white/70" />
                        }
                      </button>
                    </div>
                    <Link
                      to={`/reset-password/${result.resetToken}`}
                      className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-teal-600/40 border border-teal-500/40 text-teal-200 rounded-xl text-sm font-semibold hover:bg-teal-600/60 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Ouvrir le lien de réinitialisation
                    </Link>
                  </div>
                )}

                {/* Back to login */}
                <Link
                  to="/connexion"
                  className="w-full flex items-center justify-center gap-2 py-3 border border-white/20 text-white/80 rounded-2xl text-sm font-semibold hover:bg-white/5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour à la connexion
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form (hidden when result shown) */}
          {!result && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-white/90 mb-2">
                  Adresse email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    id="forgot-email"
                    type="email"
                    placeholder="votre.email@urgensia.bj"
                    {...register('email', {
                      required: 'Email requis',
                      pattern: { value: /^\S+@\S+$/, message: 'Email invalide' },
                    })}
                    className={`
                      w-full pl-11 pr-4 py-3 rounded-2xl text-sm text-white placeholder-white/40
                      focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all
                      ${errors.email
                        ? 'border border-red-400/60 bg-red-500/10'
                        : 'border border-white/15 bg-white/10 hover:bg-white/15 focus:bg-white/15'
                      }
                    `}
                  />
                </div>
                {errors.email && (
                  <p className="text-red-300 text-xs mt-1.5">{errors.email.message}</p>
                )}
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.97 }}
                className="w-full flex items-center justify-center gap-2 py-3.5 font-bold text-white rounded-2xl transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer text-sm"
                style={{
                  background: 'linear-gradient(135deg, #0F766E, #14B8A6)',
                  boxShadow: '0 4px 20px rgba(15,118,110,0.45)',
                }}
              >
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-2">
                      <Loader className="w-4 h-4 animate-spin" />
                      Envoi en cours…
                    </motion.span>
                  ) : (
                    <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Envoyer le lien de réinitialisation
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* Back to login */}
              <div className="text-center">
                <Link
                  to="/connexion"
                  className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Retour à la connexion
                </Link>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
