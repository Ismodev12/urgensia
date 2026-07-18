import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';

/** Pied de page public (pages citoyen : accès, suivi, orientation). */
export function PublicFooter() {
  return (
    <footer className="bg-night-blue text-slate-300 mt-14">
      <div className="max-w-5xl mx-auto px-4 py-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-white tracking-wide">URGENSIA</span>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
            Système d'aide au pré-triage pour les établissements de santé du Bénin, basé sur le Manchester Triage System.
          </p>
        </div>
        <div>
          <p className="text-white font-semibold text-sm mb-3">Plateforme</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/" className="hover:text-white transition-colors">Accueil</Link></li>
            <li><Link to="/patient" className="hover:text-white transition-colors">Suivi patient</Link></li>
            <li><Link to="/connexion" className="hover:text-white transition-colors">Connexion personnel</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-white font-semibold text-sm mb-3">Contact</p>
          <ul className="space-y-2 text-sm text-slate-400">
            <li>contact@urgensia.bj</li>
            <li>Cotonou, Bénin</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="max-w-5xl mx-auto px-4 py-4 text-xs text-slate-500">
          © {new Date().getFullYear()} URGENSIA. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}

export default PublicFooter;
