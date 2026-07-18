import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Shield, Save, Check, AlertCircle, Lock } from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { PhotoCapture } from '../common/PhotoCapture';
import { useAuth } from '../../context/AuthContext';
import {
  updateProfil, changePassword, uploadProfilePhoto, deleteProfilePhoto,
} from '../../services/profilService';

// Classes statiques par accent (évite la purge Tailwind des classes dynamiques)
const ACCENTS = {
  teal:  { text: 'text-teal-700',  bg: 'bg-teal-50',  ring: 'focus:ring-teal-500',  btn: 'bg-teal-700 hover:bg-teal-800',   toggle: 'bg-teal-600'  },
  blue:  { text: 'text-blue-700',  bg: 'bg-blue-50',  ring: 'focus:ring-blue-500',  btn: 'bg-blue-600 hover:bg-blue-700',   toggle: 'bg-blue-600'  },
  slate: { text: 'text-slate-700', bg: 'bg-slate-100', ring: 'focus:ring-slate-500', btn: 'bg-slate-800 hover:bg-slate-900', toggle: 'bg-slate-700' },
};

// Petit bandeau de retour (succès / erreur)
function Feedback({ msg }) {
  if (!msg) return null;
  const ok = msg.type === 'ok';
  return (
    <div className={`mt-3 flex items-center gap-2 text-xs rounded-xl px-3 py-2 border ${
      ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
    }`}>
      {ok ? <Check className="w-3.5 h-3.5 flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
      {msg.text}
    </div>
  );
}

/**
 * Bloc de paramètres self-service réutilisable (agent / médecin / admin).
 * Gère réellement : photo de profil, infos personnelles, mot de passe,
 * préférences de notifications (persistées localement).
 *
 * @param {'teal'|'blue'|'slate'} accent - couleur d'accent du rôle
 */
export function ProfileSettings({ accent = 'teal' }) {
  const a = ACCENTS[accent] || ACCENTS.teal;
  const { user, updateUser } = useAuth();

  // ── Infos personnelles ──────────────────────────────────────────────────
  const [form, setForm] = useState({ nom: '', prenom: '', email: '', telephone: '' });
  const [savingProfil, setSavingProfil] = useState(false);
  const [profilMsg,    setProfilMsg]    = useState(null);

  useEffect(() => {
    if (user) setForm({
      nom:       user.nom       ?? '',
      prenom:    user.prenom    ?? '',
      email:     user.email     ?? '',
      telephone: user.telephone ?? '',
    });
  }, [user]);

  const handleSaveProfil = async () => {
    setProfilMsg(null);
    setSavingProfil(true);
    try {
      const updated = await updateProfil(form);
      updateUser({
        nom:       updated.nom,
        prenom:    updated.prenom,
        email:     updated.email,
        telephone: updated.telephone,
      });
      setProfilMsg({ type: 'ok', text: 'Profil mis à jour avec succès.' });
    } catch (err) {
      setProfilMsg({ type: 'err', text: err.response?.data?.error ?? 'Échec de la mise à jour du profil.' });
    } finally {
      setSavingProfil(false);
    }
  };

  // ── Photo de profil ─────────────────────────────────────────────────────
  const [photoMsg, setPhotoMsg] = useState(null);

  const handlePhotoChange = useCallback(async (file) => {
    setPhotoMsg(null);
    try {
      if (file) {
        const { photoUrl } = await uploadProfilePhoto(file);
        updateUser({ photo: photoUrl });
        setPhotoMsg({ type: 'ok', text: 'Photo de profil mise à jour.' });
      } else {
        await deleteProfilePhoto();
        updateUser({ photo: null });
        setPhotoMsg({ type: 'ok', text: 'Photo de profil supprimée.' });
      }
    } catch (err) {
      setPhotoMsg({ type: 'err', text: err.response?.data?.error ?? 'Échec de la mise à jour de la photo.' });
    }
  }, [updateUser]);

  // ── Mot de passe ────────────────────────────────────────────────────────
  const [pwd, setPwd]         = useState({ actuel: '', nouveau: '', confirme: '' });
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMsg, setPwdMsg]   = useState(null);

  const handleChangePwd = async () => {
    setPwdMsg(null);
    if (!pwd.actuel || !pwd.nouveau) {
      setPwdMsg({ type: 'err', text: 'Renseignez le mot de passe actuel et le nouveau.' });
      return;
    }
    if (pwd.nouveau.length < 6) {
      setPwdMsg({ type: 'err', text: 'Le nouveau mot de passe doit comporter au moins 6 caractères.' });
      return;
    }
    if (pwd.nouveau !== pwd.confirme) {
      setPwdMsg({ type: 'err', text: 'La confirmation ne correspond pas au nouveau mot de passe.' });
      return;
    }
    setSavingPwd(true);
    try {
      await changePassword(pwd.actuel, pwd.nouveau);
      setPwd({ actuel: '', nouveau: '', confirme: '' });
      setPwdMsg({ type: 'ok', text: 'Mot de passe modifié avec succès.' });
    } catch (err) {
      setPwdMsg({ type: 'err', text: err.response?.data?.error ?? 'Échec du changement de mot de passe.' });
    } finally {
      setSavingPwd(false);
    }
  };

  // ── Préférences de notifications (persistées localement) ──────────────────
  const NOTIF_KEY = `urgensia_notif_prefs_${user?.id || 'anon'}`;
  const [notifs, setNotifs] = useState({ alerts: true, patients: true, reevaluation: true, daily: false });

  useEffect(() => {
    const saved = localStorage.getItem(NOTIF_KEY);
    if (saved) { try { setNotifs(JSON.parse(saved)); } catch { /* ignore */ } }
  }, [NOTIF_KEY]);

  const toggleNotif = (key) => setNotifs(prev => {
    const next = { ...prev, [key]: !prev[key] };
    localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
    return next;
  });

  const inputCls = `w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 ${a.ring}`;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">

      {/* ── Profil + photo ── */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 ${a.bg} rounded-2xl flex items-center justify-center`}>
            <User className={`w-5 h-5 ${a.text}`} />
          </div>
          <div>
            <h2 className="font-bold text-night-blue">Profil utilisateur</h2>
            <p className="text-xs text-soft-gray">Photo et informations personnelles</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-6 items-start mb-6">
          <PhotoCapture
            value={user?.photo}
            onChange={handlePhotoChange}
            label="Photo de profil"
            size="lg"
          />
          <div className="flex-1 grid sm:grid-cols-2 gap-4 w-full">
            <div>
              <label className="block text-sm font-semibold text-night-blue mb-1.5">Prénom</label>
              <input value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-night-blue mb-1.5">Nom</label>
              <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-night-blue mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-night-blue mb-1.5">Téléphone</label>
              <input value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} className={inputCls} />
            </div>
          </div>
        </div>

        <Feedback msg={photoMsg} />

        <button
          onClick={handleSaveProfil}
          disabled={savingProfil}
          className={`mt-5 flex items-center gap-2 px-5 py-2.5 ${a.btn} text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 cursor-pointer`}
        >
          <Save className="w-4 h-4" />
          {savingProfil ? 'Enregistrement…' : 'Enregistrer les modifications'}
        </button>
        <Feedback msg={profilMsg} />
      </Card>

      {/* ── Sécurité : mot de passe ── */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-red-50 rounded-2xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-red-700" />
          </div>
          <div>
            <h2 className="font-bold text-night-blue">Sécurité</h2>
            <p className="text-xs text-soft-gray">Changer votre mot de passe</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-soft-gray mb-1.5">Mot de passe actuel</label>
            <input type="password" autoComplete="current-password" value={pwd.actuel}
              onChange={e => setPwd(p => ({ ...p, actuel: e.target.value }))} placeholder="••••••••" className={inputCls} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-soft-gray mb-1.5">Nouveau mot de passe</label>
              <input type="password" autoComplete="new-password" value={pwd.nouveau}
                onChange={e => setPwd(p => ({ ...p, nouveau: e.target.value }))} placeholder="6 caractères min." className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-soft-gray mb-1.5">Confirmer</label>
              <input type="password" autoComplete="new-password" value={pwd.confirme}
                onChange={e => setPwd(p => ({ ...p, confirme: e.target.value }))} placeholder="••••••••" className={inputCls} />
            </div>
          </div>
        </div>

        <Button variant="primary" icon={Lock} onClick={handleChangePwd} loading={savingPwd} className="mt-4">
          {savingPwd ? 'Modification…' : 'Modifier le mot de passe'}
        </Button>
        <Feedback msg={pwdMsg} />
      </Card>

      {/* ── Notifications (préférences locales) ── */}
      <Card>
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 ${a.bg} rounded-2xl flex items-center justify-center`}>
            <Bell className={`w-5 h-5 ${a.text}`} />
          </div>
          <div>
            <h2 className="font-bold text-night-blue">Notifications</h2>
            <p className="text-xs text-soft-gray">Préférences enregistrées sur cet appareil</p>
          </div>
        </div>
        <div className="space-y-1">
          {[
            { key: 'alerts',       label: 'Alertes critiques (Niveau 1-2)', desc: 'Cas critiques nécessitant une action immédiate' },
            { key: 'patients',     label: 'Nouveaux patients',              desc: 'Notification à chaque enregistrement' },
            { key: 'reevaluation', label: 'Réévaluation requise',           desc: 'Délai cible dépassé pour un patient en attente' },
            { key: 'daily',        label: 'Résumé journalier',              desc: 'Rapport automatique en fin de journée' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
              <div>
                <p className="text-sm font-medium text-night-blue">{label}</p>
                <p className="text-xs text-soft-gray">{desc}</p>
              </div>
              <button
                onClick={() => toggleNotif(key)}
                aria-pressed={notifs[key]}
                className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${notifs[key] ? a.toggle : 'bg-slate-200'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${notifs[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
