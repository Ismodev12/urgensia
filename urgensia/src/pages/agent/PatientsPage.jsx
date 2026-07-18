import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, Phone, MapPin, Calendar, User,
  Activity, Heart, Thermometer, ChevronRight, FileText,
  Clock, ArrowLeft,
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Card } from '../../components/common/Card';
import { ManchesterBadge } from '../../components/common/ManchesterBadge';
import { Avatar } from '../../components/common/Avatar';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { sortPatientsByPriority, formatDate, formatTime, getWaitingTime } from '../../utils/helpers';

export default function PatientsPage() {
  const { patients } = useApp();
  const { user } = useAuth();
  const [search,          setSearch]          = useState('');
  const [filterLevel,     setFilterLevel]     = useState('all');
  const [filterSexe,      setFilterSexe]      = useState('all');
  const [selectedPatient, setSelectedPatient] = useState(null);

  const sorted = sortPatientsByPriority(patients);
  const filtered = sorted.filter(p => {
    const matchSearch = `${p.prenom} ${p.nom} ${p.id} ${p.telephone || ''}`.toLowerCase().includes(search.toLowerCase());
    const matchLevel = filterLevel === 'all' || p.manchesterLevel === parseInt(filterLevel);
    const matchSexe = filterSexe === 'all' || p.sexe === filterSexe;
    return matchSearch && matchLevel && matchSexe;
  });

  return (
    <DashboardLayout role="agent" user={user} title="Patients">
      <div className="flex gap-4 lg:gap-6 min-h-0">
        {/* Main Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex-1 space-y-4 min-w-0 transition-all duration-300 ${selectedPatient ? 'hidden lg:block' : ''}`}
        >
          {/* Search & Filters */}
          <Card>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-soft-gray" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Nom, prénom, ID, téléphone..."
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50"
                />
              </div>
              <select
                value={filterLevel}
                onChange={e => setFilterLevel(e.target.value)}
                className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50"
              >
                <option value="all">Tous niveaux</option>
                {[1,2,3,4,5].map(l => (
                  <option key={l} value={l}>Niveau {l}</option>
                ))}
              </select>
              <select
                value={filterSexe}
                onChange={e => setFilterSexe(e.target.value)}
                className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50"
              >
                <option value="all">Tous sexes</option>
                <option value="Homme">Homme</option>
                <option value="Femme">Femme</option>
              </select>
            </div>
          </Card>

          {/* Patient Table */}
          <Card padding={false}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <p className="font-semibold text-night-blue">{filtered.length} patient(s)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-soft-gray uppercase tracking-wide">Patient</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-soft-gray uppercase tracking-wide hidden sm:table-cell">Âge / Sexe</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-soft-gray uppercase tracking-wide hidden md:table-cell">Téléphone</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-soft-gray uppercase tracking-wide">Niveau</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-soft-gray uppercase tracking-wide hidden lg:table-cell">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-soft-gray uppercase tracking-wide hidden md:table-cell">Arrivée</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-soft-gray uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((patient, i) => (
                    <motion.tr
                      key={patient.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => setSelectedPatient(patient)}
                      className={`hover:bg-slate-50/70 cursor-pointer transition-colors ${
                        selectedPatient?.id === patient.id ? 'bg-teal-50/40 border-l-2 border-teal-600' : ''
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar photo={patient.photo} nom={patient.nom} prenom={patient.prenom} size="md" />
                          <div>
                            <p className="font-semibold text-night-blue text-sm">{patient.prenom} {patient.nom}</p>
                            <p className="text-xs text-soft-gray">{patient.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <span className="text-sm text-slate-600">{patient.age} ans</span>
                        <span className="text-xs text-soft-gray block">{patient.sexe}</span>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className="text-sm text-slate-600">{patient.telephone || '—'}</span>
                      </td>
                      <td className="px-4 py-4">
                        <ManchesterBadge level={patient.manchesterLevel} />
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <span className="text-sm text-slate-600">{patient.service}</span>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <span className="text-xs text-soft-gray">{formatDate(patient.dateArrivee)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                          {/* Voir la fiche */}
                          <button
                            title="Voir la fiche"
                            onClick={(e) => { e.stopPropagation(); setSelectedPatient(patient); }}
                            className="p-1.5 rounded-lg hover:bg-teal-50 text-soft-gray hover:text-teal-700 transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <div className="text-center py-16">
                  <User className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-soft-gray font-medium">Aucun patient trouvé</p>
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Detail Panel */}
        <AnimatePresence>
          {selectedPatient && (
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              className="w-full lg:w-80 xl:w-96 flex-shrink-0"
            >
              <Card padding={false} className="sticky top-0">
                {/* Panel Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedPatient(null)}
                      className="p-2 rounded-lg hover:bg-slate-100 text-soft-gray transition-colors lg:hidden cursor-pointer"
                      aria-label="Retour à la liste"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <h3 className="font-bold text-night-blue text-sm">Fiche patient</h3>
                  </div>
                  <button
                    onClick={() => setSelectedPatient(null)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-soft-gray transition-colors hidden lg:flex cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Patient Profile */}
                <div className="p-5 text-center border-b border-slate-100">
                  <Avatar photo={selectedPatient.photo} nom={selectedPatient.nom} prenom={selectedPatient.prenom} size="3xl" className="mx-auto mb-3" ring />
                  <p className="font-bold text-night-blue text-lg">{selectedPatient.prenom} {selectedPatient.nom}</p>
                  <p className="text-soft-gray text-sm mb-3">{selectedPatient.age} ans · {selectedPatient.sexe} · {selectedPatient.id}</p>
                  <div className="flex justify-center">
                    <ManchesterBadge level={selectedPatient.manchesterLevel} size="md" />
                  </div>
                </div>

                {/* Info Section */}
                <div className="p-5 space-y-4 overflow-y-auto max-h-96">
                  <div>
                    <p className="text-xs font-semibold text-soft-gray uppercase tracking-wide mb-3">Coordonnées</p>
                    <div className="space-y-2">
                      {selectedPatient.telephone && (
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <Phone className="w-4 h-4 text-soft-gray flex-shrink-0" />
                          {selectedPatient.telephone}
                        </div>
                      )}
                      {selectedPatient.adresse && (
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <MapPin className="w-4 h-4 text-soft-gray flex-shrink-0" />
                          {selectedPatient.adresse}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Calendar className="w-4 h-4 text-soft-gray flex-shrink-0" />
                        {formatDate(selectedPatient.dateArrivee)} à {formatTime(selectedPatient.dateArrivee)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-soft-gray uppercase tracking-wide mb-3">Constantes vitales</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Temp.', value: selectedPatient.temperature ? `${selectedPatient.temperature}°C` : '—', icon: Thermometer, color: 'orange' },
                        { label: 'FC', value: selectedPatient.frequenceCardiaque ? `${selectedPatient.frequenceCardiaque} bpm` : '—', icon: Heart, color: 'red' },
                        { label: 'TA', value: selectedPatient.tensionArterielle || '—', icon: Activity, color: 'blue' },
                        { label: 'SpO2', value: selectedPatient.saturationOxygene ? `${selectedPatient.saturationOxygene}%` : '—', icon: Activity, color: 'teal' },
                      ].map((v, i) => (
                        <div key={i} className="bg-slate-50 rounded-xl p-3">
                          <p className="text-xs text-soft-gray">{v.label}</p>
                          <p className="font-bold text-night-blue text-sm">{v.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedPatient.symptomes && selectedPatient.symptomes.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-soft-gray uppercase tracking-wide mb-3">Symptômes</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedPatient.symptomes.map((s, i) => (
                          <span key={i} className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-soft-gray uppercase tracking-wide mb-3">Service d'orientation</p>
                    <div className="bg-teal-50 rounded-xl p-3 flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 text-teal-600" />
                      <p className="text-teal-700 font-semibold text-sm">{selectedPatient.service}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-soft-gray uppercase tracking-wide mb-2">Attente</p>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-soft-gray" />
                      <span className="font-semibold text-night-blue text-sm">{getWaitingTime(selectedPatient.dateArrivee)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        selectedPatient.statut === 'En cours' ? 'bg-blue-50 text-blue-700' :
                        selectedPatient.statut === 'Pris en charge' ? 'bg-green-50 text-green-700' :
                        'bg-orange-50 text-orange-700'
                      }`}>
                        {selectedPatient.statut}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
