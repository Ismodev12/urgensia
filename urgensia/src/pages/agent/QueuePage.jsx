import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Clock, CheckCircle, AlertTriangle, Users, RefreshCw, AlarmClock } from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/common/Card';
import { ManchesterBadge } from '../../components/common/ManchesterBadge';
import { Avatar } from '../../components/common/Avatar';
import { RetriageModal } from '../../components/agent/RetriageModal';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { sortPatientsByPriority, getWaitingTime, formatTime } from '../../utils/helpers';
import { getPatients, scanReevaluations } from '../../services/patientService';
import { onSocketEvent } from '../../services/socketService';
import { normalizePatient, toApiStatut } from '../../utils/normalizeApi';

export default function QueuePage() {
  const { patients, setPatients } = useApp();
  const { user } = useAuth();
  const [search,       setSearch]       = useState('');
  const [filterLevel,  setFilterLevel]  = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showTermines, setShowTermines] = useState(false); // masquer par défaut
  const [loading,      setLoading]      = useState(true);
  const [retriageTarget, setRetriageTarget] = useState(null); // patient en cours de re-triage
  const [, forceTick] = useState(0); // force le recalcul périodique des temps d'attente

  const levelColors = ['', '#DC2626', '#EA580C', '#EAB308', '#22C55E', '#3B82F6'];
  const levelLabels = ['', 'Critique', 'Très Urgent', 'Urgent', 'Standard', 'Non Urgent'];

  // ── Chargement ────────────────────────────────────────────────────────────
  const loadPatients = useCallback(async () => {
    try {
      // Vérification au chargement de la file : signaler les délais de
      // réévaluation dépassés (best-effort, ne bloque pas l'affichage).
      try { await scanReevaluations(); } catch (_) { /* sans incidence */ }
      const data = await getPatients();
      setPatients(data);
    } catch (err) {
      console.error('Erreur chargement patients:', err);
    } finally {
      setLoading(false);
    }
  }, [setPatients]);

  useEffect(() => {
    loadPatients();

    // ── WebSocket temps réel ──────────────────────────────────────────────
    const offNew = onSocketEvent('patient:new', (data) => {
      setPatients(prev => {
        if (prev.find(p => p.id === data.id)) return prev;
        return [normalizePatient(data), ...prev];
      });
    });

    const offStatus = onSocketEvent('patient:status_changed', ({ patientId, nouveauStatut }) => {
      setPatients(prev => prev.map(p =>
        p.id === patientId
          ? { ...p, statut: nouveauStatut === 'en_attente' ? 'En attente' : nouveauStatut === 'en_cours' ? 'En cours' : nouveauStatut === 'pris_en_charge' ? 'Pris en charge' : nouveauStatut }
          : p
      ));
    });

    // Délai de réévaluation dépassé → marquer le patient « à réévaluer »
    const offReeval = onSocketEvent('patient:reevaluation', ({ patientId }) => {
      setPatients(prev => prev.map(p =>
        p.id === patientId ? { ...p, aReevaluer: true } : p
      ));
    });

    // Re-triage effectué → nouveau niveau + marqueur nettoyé (la file se réordonne)
    const offRetriaged = onSocketEvent('patient:retriaged', ({ patientId, manchesterNiveau }) => {
      setPatients(prev => prev.map(p =>
        p.id === patientId
          ? { ...p, aReevaluer: false, manchesterLevel: manchesterNiveau ?? p.manchesterLevel }
          : p
      ));
    });

    return () => { offNew(); offStatus(); offReeval(); offRetriaged(); };
  }, [loadPatients, setPatients]);

  // ── Rafraîchissement périodique (60 s) ────────────────────────────────────
  // Fait « monter » les temps d'attente tout seuls et relance la détection des
  // réévaluations dues → les badges « À réévaluer » apparaissent sans action.
  useEffect(() => {
    const id = setInterval(() => {
      forceTick(t => t + 1); // garantit le recalcul des minuteurs même si le réseau échoue
      loadPatients();        // re-scan des réévaluations + recharge la file
    }, 60000);
    return () => clearInterval(id);
  }, [loadPatients]);

  // ── Filtres ──────────────────────────────────────────────────
  // Statuts actifs = patients encore dans la file
  const STATUTS_ACTIFS = ['en_attente', 'En attente', 'en_cours', 'En cours'];
  const STATUTS_TERMINES = ['pris_en_charge', 'Pris en charge', 'sorti', 'Sorti'];

  const activePatients = patients.filter(p => STATUTS_ACTIFS.includes(p.statut));

  const sorted   = sortPatientsByPriority(showTermines ? patients : activePatients);
  // Normalise le statut pour la comparaison (snake_case = snake_case)
  const normalizeStatut = (s) => (s ?? '').toLowerCase().replace(/ /g, '_');
  const filtered = sorted.filter(p => {
    const matchSearch = `${p.prenom} ${p.nom} ${p.id}`.toLowerCase().includes(search.toLowerCase());
    const matchLevel  = filterLevel  === 'all' || p.manchesterLevel === parseInt(filterLevel);
    const matchStatus = filterStatus === 'all' || normalizeStatut(p.statut) === normalizeStatut(filterStatus);
    return matchSearch && matchLevel && matchStatus;
  });

  const waiting    = activePatients.filter(p => p.statut === 'En attente' || p.statut === 'en_attente').length;
  const inProgress = activePatients.filter(p => p.statut === 'En cours'   || p.statut === 'en_cours').length;
  const critical   = activePatients.filter(p => p.manchesterLevel <= 2).length;
  const termines   = patients.filter(p => STATUTS_TERMINES.includes(p.statut)).length;

  return (
    <DashboardLayout role="agent" user={user} title="File d'attente">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'File active',  value: activePatients.length, icon: Users,         color: 'teal',   bg: 'bg-teal-50',   text: 'text-teal-700'   },
            { label: 'En attente',   value: waiting,               icon: Clock,         color: 'orange', bg: 'bg-orange-50', text: 'text-orange-700' },
            { label: 'En cours',     value: inProgress,            icon: RefreshCw,     color: 'blue',   bg: 'bg-blue-50',   text: 'text-blue-700'   },
            { label: 'Critiques',    value: critical,              icon: AlertTriangle, color: 'red',    bg: 'bg-red-50',    text: 'text-red-700'    },
          ].map((stat, i) => (
            <Card key={i}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-soft-gray font-medium mb-1">{stat.label}</p>
                  <p className="text-2xl font-black text-night-blue">{stat.value}</p>
                </div>
                <div className={`${stat.bg} rounded-2xl p-2.5`}>
                  <stat.icon className={`w-5 h-5 ${stat.text}`} />
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Priority Legend + toggle terminés */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-soft-gray font-medium">Priorité :</span>
          {[1, 2, 3, 4, 5].map(level => (
            <button
              key={level}
              onClick={() => setFilterLevel(filterLevel === String(level) ? 'all' : String(level))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                filterLevel === String(level) ? 'shadow-md scale-105' : 'opacity-70 hover:opacity-100'
              }`}
              style={{
                backgroundColor: filterLevel === String(level) ? levelColors[level] : `${levelColors[level]}20`,
                color: filterLevel === String(level) ? 'white' : levelColors[level],
                borderColor: `${levelColors[level]}40`,
              }}
            >
              <span className="w-2 h-2 rounded-full bg-current" />
              N{level} - {levelLabels[level]}
            </button>
          ))}

          {/* Toggle patients terminés */}
          <button
            onClick={() => setShowTermines(v => !v)}
            className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              showTermines
                ? 'bg-slate-600 text-white border-slate-600'
                : 'bg-slate-100 text-slate-500 border-slate-200 hover:border-slate-400'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            {showTermines ? 'Masquer terminés' : `Voir terminés (${termines})`}
          </button>
        </div>

        {/* Search + Filter Bar */}
        <Card padding={false}>
          <div className="p-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-soft-gray" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un patient (nom, ID)..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50"
              />
            </div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50 min-w-36"
            >
              <option value="all">Tous les statuts</option>
              <option value="en_attente">En attente</option>
              <option value="en_cours">En cours</option>
              {showTermines && <option value="pris_en_charge">Pris en charge</option>}
              {showTermines && <option value="sorti">Sorti</option>}
            </select>
            <button
              onClick={loadPatients}
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-soft-gray hover:text-teal-700 hover:border-teal-300 transition-all bg-slate-50"
            >
              <RefreshCw className="w-4 h-4" />
              Actualiser
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <svg className="animate-spin w-8 h-8 text-teal-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-t border-slate-100 bg-slate-50/50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-soft-gray uppercase tracking-wide">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-soft-gray uppercase tracking-wide">Niveau</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-soft-gray uppercase tracking-wide hidden sm:table-cell">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-soft-gray uppercase tracking-wide hidden md:table-cell">Arrivée</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-soft-gray uppercase tracking-wide">Attente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-soft-gray uppercase tracking-wide">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-soft-gray uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((patient, i) => {
                    const statNorm = (patient.statut ?? '').toLowerCase().replace(/ /g, '_');
                    const isTermine = statNorm === 'pris_en_charge' || statNorm === 'sorti';
                    return (
                    <motion.tr
                      key={patient.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`transition-colors ${
                        isTermine ? 'bg-slate-50/70 opacity-60' : 'hover:bg-slate-50/50'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar photo={patient.photo} nom={patient.nom} prenom={patient.prenom} size="sm" />
                            {patient.manchesterLevel <= 2 && (
                              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-white animate-pulse" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-night-blue text-sm">{patient.prenom} {patient.nom}</p>
                            <p className="text-xs text-soft-gray">{patient.id} · {patient.age} ans</p>
                            {patient.aReevaluer && (
                              <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 animate-pulse">
                                <AlarmClock className="w-3 h-3" />
                                À réévaluer
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4"><ManchesterBadge level={patient.manchesterLevel} /></td>
                      <td className="px-4 py-4 hidden sm:table-cell"><span className="text-sm text-slate-600">{patient.service}</span></td>
                      <td className="px-4 py-4 hidden md:table-cell"><span className="text-sm text-slate-600">{formatTime(patient.dateArrivee)}</span></td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-soft-gray" />
                          <span className={`text-sm font-semibold ${
                            patient.manchesterLevel <= 1 ? 'text-red-600' :
                            patient.manchesterLevel <= 2 ? 'text-orange-600' : 'text-slate-600'
                          }`}>
                            {getWaitingTime(patient.dateArrivee)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-semibold ${
                          statNorm === 'en_cours'        ? 'bg-blue-50  text-blue-700'  :
                          statNorm === 'pris_en_charge'  ? 'bg-green-50 text-green-700' :
                          statNorm === 'sorti'           ? 'bg-slate-100 text-slate-500' :
                          'bg-orange-50 text-orange-700'
                        }`}>
                          {statNorm === 'en_attente'    ? 'En attente'     :
                           statNorm === 'en_cours'      ? 'En cours'       :
                           statNorm === 'pris_en_charge'? 'Pris en charge' :
                           statNorm === 'sorti'         ? 'Sorti'          : patient.statut}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {/* Re-triage : réservé à l'agent d'accueil (infirmier de triage).
                              La prise en charge (en cours / pris en charge) relève du médecin. */}
                          {!isTermine && (
                            <button
                              onClick={() => setRetriageTarget(patient)}
                              title="Réévaluer le niveau de priorité"
                              className={`flex items-center gap-1 text-xs font-medium hover:underline cursor-pointer ${
                                patient.aReevaluer
                                  ? 'text-amber-600 hover:text-amber-800 font-bold'
                                  : 'text-slate-500 hover:text-teal-700'
                              }`}
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              Réévaluer
                            </button>
                          )}
                          {isTermine && (
                            <span className="text-xs text-slate-400 italic">Terminé</span>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {!loading && filtered.length === 0 && (
              <div className="text-center py-16">
                <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-soft-gray font-medium">Aucun patient trouvé</p>
                <p className="text-xs text-slate-400">Modifiez votre recherche ou vos filtres</p>
              </div>
            )}
          </div>

          <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-soft-gray">{filtered.length} patient(s) affiché(s)</p>
            <p className="text-xs text-soft-gray">Trié par priorité Manchester</p>
          </div>
        </Card>
      </motion.div>

      {/* Modal de re-triage (réévaluation MTS) */}
      {retriageTarget && (
        <RetriageModal
          patient={retriageTarget}
          onClose={() => setRetriageTarget(null)}
          onSuccess={(res) => {
            setPatients(prev => prev.map(p =>
              p.id === retriageTarget.id
                ? { ...p, manchesterLevel: res.nouveauNiveau, aReevaluer: false }
                : p
            ));
          }}
        />
      )}
    </DashboardLayout>
  );
}
