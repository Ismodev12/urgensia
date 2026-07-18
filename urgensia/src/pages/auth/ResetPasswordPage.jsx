import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Lock, Eye, EyeOff, ArrowLeft, AlertCircle,
  CheckCircle2, ShieldCheck, Loader, LogIn,
} from 'lucide-react';
import { resetPassword } from '../../services/authService';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [showPassword, setShowPassword]   = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [loading, setLoading]             = useState(false);
  const [apiError, setApiError]           = useState(null);
  const [success, setSuccess]             = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const watchPassword = watch('newPassword');

  const onSubmit = async ({ newPassword }) => {
    setLoading(true);
    setApiError(null);
    try {
      await resetPassword(token, newPassword);
      setSuccess(true);
    } catch (err) {
      const msg = err.response?.data?.error ?? 'Erreur réseau. Réessayez plus tard.';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Indicateur de force du mot de passe
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { level: 1, label: 'Faible', color: '#DC2626' };
    if (score <= 2) return { level: 2, label: 'Moyen', color: '#EAB308' };
    if (score <= 3) return { level: 3, label: 'Bon', color: '#22C55E' };
    return { level: 4, label: 'Excellent', color: '#0F766E' };
  };

  const strength = getPasswordStrength(watchPassword);

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
          {/* Success state */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5"
                  style={{ background: 'linear-gradient(135deg, #059669, #10B981)', boxShadow: '0 8px 30px rgba(5,150,105,0.4)' }}
                >
                  <ShieldCheck className="w-10 h-10 text-white" />
                </motion.div>
                <h2 className="text-2xl font-black text-white mb-2">Mot de passe modifié !</h2>
                <p className="text-teal-100/80 text-sm mb-6">
                  Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
                </p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate('/connexion')}
                  className="w-full flex items-center justify-center gap-2 py-3.5 font-bold text-white rounded-2xl cursor-pointer text-sm"
                  style={{
                    background: 'linear-gradient(135deg, #0F766E, #14B8A6)',
                    boxShadow: '0 4px 20px rgba(15,118,110,0.45)',
                  }}
                >
                  <LogIn className="w-4 h-4" />
                  Se connecter
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form state */}
          {!success && (
            <>
              {/* Header */}
              <div className="mb-7">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'linear-gradient(135deg, #0F766E, #14B8A6)', boxShadow: '0 4px 20px rgba(15,118,110,0.45)' }}
                >
                  <Lock className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-black text-white mb-1.5">Nouveau mot de passe</h2>
                <p className="text-teal-100/80 text-sm">
                  Choisissez un nouveau mot de passe sécurisé pour votre compte
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

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* New password */}
                <div>
                  <label className="block text-sm font-semibold text-white/90 mb-2">
                    Nouveau mot de passe
                  </label>
                  <div className="relative">
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...register('newPassword', {
                        required: 'Mot de passe requis',
                        minLength: { value: 6, message: 'Min. 6 caractères' },
                      })}
                      className={`
                        w-full px-4 py-3 pr-12 rounded-2xl text-sm text-white placeholder-white/40
                        focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all
                        ${errors.newPassword
                          ? 'border border-red-400/60 bg-red-500/10'
                          : 'border border-white/15 bg-white/10 hover:bg-white/15 focus:bg-white/15'
                        }
                      `}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <p className="text-red-300 text-xs mt-1.5">{errors.newPassword.message}</p>
                  )}

                  {/* Password strength indicator */}
                  {watchPassword && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-2.5"
                    >
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4].map(i => (
                          <div
                            key={i}
                            className="flex-1 h-1 rounded-full transition-colors duration-300"
                            style={{
                              backgroundColor: i <= strength.level ? strength.color : 'rgba(255,255,255,0.1)',
                            }}
                          />
                        ))}
                      </div>
                      <p className="text-xs font-medium" style={{ color: strength.color }}>
                        Force : {strength.label}
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-sm font-semibold text-white/90 mb-2">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative">
                    <input
                      id="confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="••••••••"
                      {...register('confirmPassword', {
                        required: 'Confirmation requise',
                        validate: value =>
                          value === watchPassword || 'Les mots de passe ne correspondent pas',
                      })}
                      className={`
                        w-full px-4 py-3 pr-12 rounded-2xl text-sm text-white placeholder-white/40
                        focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all
                        ${errors.confirmPassword
                          ? 'border border-red-400/60 bg-red-500/10'
                          : 'border border-white/15 bg-white/10 hover:bg-white/15 focus:bg-white/15'
                        }
                      `}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-red-300 text-xs mt-1.5">{errors.confirmPassword.message}</p>
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
                        Réinitialisation…
                      </motion.span>
                    ) : (
                      <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        Réinitialiser le mot de passe
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>

                {/* Back */}
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
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
