import { motion } from 'framer-motion';
import {
  Clock, CheckCircle2, TrendingUp, AlarmClock, Activity, Building2,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Card } from '../common/Card';

const fadeUp  = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.06 } } };

const ACCENTS = {
  teal: { stroke: '#0F766E', soft: 'bg-teal-50',  text: 'text-teal-700',  ring: 'text-teal-600'  },
  blue: { stroke: '#1D4ED8', soft: 'bg-blue-50',  text: 'text-blue-700',  ring: 'text-blue-600'  },
};

/** Formate des minutes en « 12 min » ou « 1h05 ». */
function fmtMin(min) {
  if (min == null || Number.isNaN(min)) return '—';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m > 0 ? String(m).padStart(2, '0') : ''}`;
}

/** Couleur d'une barre d'occupation selon le taux. */
function tauxColor(taux) {
  if (taux >= 90) return '#DC2626';
  if (taux >= 70) return '#EA580C';
  return '#22C55E';
}

function MiniKPI({ icon: Icon, label, value, sub, tone = 'slate' }) {
  const tones = {
    slate:  { bg: 'bg-slate-50',  text: 'text-slate-600',  icon: 'text-slate-500'  },
    teal:   { bg: 'bg-teal-50',   text: 'text-teal-700',   icon: 'text-teal-600'   },
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   icon: 'text-blue-600'   },
    green:  { bg: 'bg-green-50',  text: 'text-green-700',  icon: 'text-green-600'  },
    amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  icon: 'text-amber-600'  },
  };
  const t = tones[tone] ?? tones.slate;
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs text-soft-gray font-medium mb-1 truncate">{label}</p>
          <p className="text-2xl font-black text-night-blue leading-none">{value}</p>
          {sub && <p className="text-[11px] text-soft-gray mt-1 truncate">{sub}</p>}
        </div>
        <div className={`${t.bg} rounded-2xl p-2.5 flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${t.icon}`} />
        </div>
      </div>
    </Card>
  );
}

/**
 * Bloc de statistiques détaillées partagé par les dashboards infirmier & médecin.
 * Alimenté par GET /stats/analytics (analytics) et GET /stats/services (services).
 */
export function AnalyticsSection({ analytics, services = [], accent = 'teal', showOccupation = true }) {
  const a = ACCENTS[accent] ?? ACCENTS.teal;
  if (!analytics) return null;

  const {
    attenteParNiveau = [],
    debitParHeure    = [],
    picAffluence     = null,
    reevaluations    = { signales: 0, delaiDepasse: 0 },
    global           = { aujourdHui: 0, traitesAujourdHui: 0, attenteMoyenneMin: 0 },
  } = analytics;

  const maxAttente = Math.max(1, ...attenteParNiveau.map(n => n.attenteMin || 0));
  const gradId     = `aff-${accent}`;

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-6">
      {/* En-tête de section */}
      <motion.div variants={fadeUp} className="flex items-center gap-2">
        <div className={`${a.soft} rounded-xl p-2`}>
          <TrendingUp className={`w-4 h-4 ${a.ring}`} />
        </div>
        <div>
          <h3 className="font-bold text-night-blue">Statistiques détaillées</h3>
          <p className="text-xs text-soft-gray">Indicateurs temps réel · dernières 24&nbsp;h</p>
        </div>
      </motion.div>

      {/* KPIs analytiques */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniKPI
          icon={Clock}
          label="Attente moyenne"
          value={fmtMin(global.attenteMoyenneMin)}
          sub="Arrivée → prise en charge"
          tone={accent}
        />
        <MiniKPI
          icon={CheckCircle2}
          label="Traités aujourd'hui"
          value={`${global.traitesAujourdHui}/${global.aujourdHui}`}
          sub={global.aujourdHui > 0
            ? `${Math.round((global.traitesAujourdHui / global.aujourdHui) * 100)}% des arrivées`
            : 'Aucune arrivée'}
          tone="green"
        />
        <MiniKPI
          icon={Activity}
          label="Pic d'affluence"
          value={picAffluence?.heure ?? '—'}
          sub={picAffluence ? `${picAffluence.patients} patient${picAffluence.patients > 1 ? 's' : ''}` : "Pas encore d'arrivées"}
          tone={accent}
        />
        <MiniKPI
          icon={AlarmClock}
          label="Réévaluations dues"
          value={reevaluations.delaiDepasse}
          sub={`${reevaluations.signales} signalée${reevaluations.signales > 1 ? 's' : ''}`}
          tone={reevaluations.delaiDepasse > 0 ? 'amber' : 'slate'}
        />
      </motion.div>

      {/* Attente par niveau + Affluence horaire */}
      <motion.div variants={fadeUp} className="grid lg:grid-cols-2 gap-6">
        {/* Temps d'attente moyen par niveau */}
        <Card>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-night-blue">Attente moyenne par niveau</h3>
              <p className="text-xs text-soft-gray">Priorité Manchester · 24&nbsp;h</p>
            </div>
            <Clock className="w-4 h-4 text-soft-gray" />
          </div>
          {attenteParNiveau.length === 0 ? (
            <div className="py-10 text-center text-sm text-soft-gray">Aucune donnée sur les dernières 24&nbsp;h</div>
          ) : (
            <div className="space-y-3.5">
              {attenteParNiveau.map((n) => (
                <div key={n.niveau}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: n.couleur }} />
                      <span className="text-soft-gray truncate">N{n.niveau} · {n.label}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-400">{n.total} pt{n.total > 1 ? 's' : ''}</span>
                    </div>
                    <span className="font-bold text-night-blue flex-shrink-0">{fmtMin(n.attenteMin)}</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.round((n.attenteMin / maxAttente) * 100)}%`, backgroundColor: n.couleur }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Affluence par heure */}
        <Card>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-night-blue">Affluence par heure</h3>
              <p className="text-xs text-soft-gray">Arrivées aujourd'hui</p>
            </div>
            {picAffluence && (
              <span className={`text-xs ${a.soft} ${a.text} px-3 py-1.5 rounded-full font-medium`}>
                Pic à {picAffluence.heure}
              </span>
            )}
          </div>
          {debitParHeure.length === 0 ? (
            <div className="py-10 text-center text-sm text-soft-gray">Aucune arrivée enregistrée aujourd'hui</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={debitParHeure} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={a.stroke} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={a.stroke} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  labelStyle={{ color: '#0F172A', fontWeight: 600 }}
                  formatter={(value, name) => [value, name === 'critiques' ? 'Critiques' : 'Patients']}
                />
                <Area type="monotone" dataKey="patients"  stroke={a.stroke} strokeWidth={2.5} fill={`url(#${gradId})`} dot={{ fill: a.stroke, r: 2.5 }} />
                <Area type="monotone" dataKey="critiques" stroke="#DC2626" strokeWidth={2} fill="#DC262615" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      </motion.div>

      {/* Occupation des services — visible médecin/admin, masquée côté infirmier */}
      {showOccupation && (
      <motion.div variants={fadeUp}>
        <Card>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-soft-gray" />
              <div>
                <h3 className="font-semibold text-night-blue">Occupation des services</h3>
                <p className="text-xs text-soft-gray">Lits occupés et patients actifs</p>
              </div>
            </div>
          </div>
          {services.length === 0 ? (
            <div className="py-10 text-center text-sm text-soft-gray">Aucun service disponible</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
              {services.map((s) => {
                const taux  = Number(s.taux_occupation) || 0;
                const color = tauxColor(taux);
                return (
                  <div key={s.id}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-night-blue truncate">{s.nom}</span>
                      <span className="text-soft-gray flex-shrink-0">
                        <strong className="text-night-blue">{s.lits_occupes ?? 0}</strong>/{s.capacite_lits ?? 0} lits
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 mb-1">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(taux, 100)}%`, backgroundColor: color }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-soft-gray">
                      <span>{s.patients_actifs ?? 0} patient{(s.patients_actifs ?? 0) > 1 ? 's' : ''} actif{(s.patients_actifs ?? 0) > 1 ? 's' : ''}</span>
                      <span className="font-semibold" style={{ color }}>{taux}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </motion.div>
      )}
    </motion.div>
  );
}

export default AnalyticsSection;
