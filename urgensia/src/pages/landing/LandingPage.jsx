import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Activity, Shield, Clock, BarChart3, Users, CheckCircle,
  Star, ArrowRight, Menu, X, Heart, Zap, Award,
  ChevronRight, Play, TrendingUp, AlertCircle
} from 'lucide-react';



const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-soft border-b border-slate-100' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-500 ${
                scrolled
                  ? 'bg-gradient-to-br from-teal-700 to-teal-500 shadow-teal'
                  : 'bg-white/10 border border-white/20 backdrop-blur-sm'
              }`}>
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className={`font-bold text-xl transition-colors duration-500 ${
                scrolled ? 'text-night-blue' : 'text-white'
              }`}>URGENSIA</span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {[
                { label: 'Accueil', href: '#accueil' },
                { label: 'Fonctionnalités', href: '#fonctionnalites' },
                { label: 'À propos', href: '#apropos' },
                { label: 'Contact', href: '#contact' },
              ].map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors duration-500 ${
                    scrolled
                      ? 'text-soft-gray hover:text-teal-700'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/patient"
                className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-500 ${
                  scrolled
                    ? 'text-teal-700 border border-teal-200 hover:bg-teal-50'
                    : 'text-white/90 border border-white/20 hover:bg-white/10'
                }`}
              >
                Suivi patient
              </Link>
              <Link
                to="/connexion"
                className={`px-4 py-2 text-sm font-semibold text-white rounded-xl transition-all duration-500 ${
                  scrolled
                    ? 'bg-gradient-to-r from-teal-700 to-teal-600 hover:from-teal-800 hover:to-teal-700 shadow-teal'
                    : 'bg-white/15 backdrop-blur-sm border border-white/20 hover:bg-white/25'
                }`}
              >
                Connexion personnel
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-xl transition-colors duration-500 ${
                scrolled ? 'hover:bg-slate-100 text-soft-gray' : 'hover:bg-white/10 text-white/80'
              }`}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-slate-100 px-4 py-4 space-y-3"
          >
            <a href="#accueil" className="block text-sm font-medium text-slate-700 py-2">Accueil</a>
            <a href="#fonctionnalites" className="block text-sm font-medium text-slate-700 py-2">Fonctionnalités</a>
            <a href="#apropos" className="block text-sm font-medium text-slate-700 py-2">À propos</a>
            <a href="#contact" className="block text-sm font-medium text-slate-700 py-2">Contact</a>
            <div className="pt-2 space-y-2 border-t border-slate-100">
              <Link to="/patient" className="block text-center px-4 py-2.5 text-sm font-semibold text-teal-700 border border-teal-200 rounded-xl">
                Suivi patient
              </Link>
              <Link to="/connexion" className="block text-center px-4 py-2.5 text-sm font-semibold text-white bg-teal-700 rounded-xl">
                Connexion personnel
              </Link>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Hero Section */}
      <section
        id="accueil"
        className="relative min-h-screen flex items-center overflow-hidden"
      >
        {/* Full-bleed background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero.png.jpg')" }}
        />

        {/* Gradient overlay — lets the image show through */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(2,27,25,0.45) 0%, rgba(4,47,46,0.35) 40%, rgba(10,61,58,0.50) 80%, rgba(2,27,25,0.75) 100%)' }} />

        {/* Main content — left aligned */}
        <div className="relative z-10 w-full px-6 sm:px-10 lg:px-16 pt-32 pb-28">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="max-w-2xl"
          >
            {/* Animated badge */}
            <motion.div
              variants={fadeUp}
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full mb-8"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
              </span>
              <span className="text-xs font-semibold text-emerald-300 tracking-wide uppercase">Plateforme active — 24/7</span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black leading-[1.08] mb-7"
              style={{ textShadow: '0 2px 30px rgba(0,0,0,0.4)' }}
            >
              <span className="text-white">Priorisez les</span>{' '}
              <span className="hero-gradient-text">urgences.</span>
              <br />
              <span className="text-white">Sauvez du temps.</span>
              <br />
              <span className="hero-gradient-text">Sauvez des vies.</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-base sm:text-lg leading-relaxed mb-10 max-w-2xl" style={{ color: 'rgba(226,232,240,0.95)', textShadow: '0 1px 10px rgba(0,0,0,0.4)' }}>
              URGENSIA est la première plateforme numérique de pré-triage médical adaptée aux établissements de santé du Bénin. Basée sur le{' '}
              <span className="text-teal-300 font-semibold">Système Manchester</span>, elle permet une orientation rapide, précise et standardisée des patients aux urgences.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link
                to="/connexion"
                className="hero-cta-primary inline-flex items-center justify-center gap-2.5 px-8 py-4 text-white font-bold text-base rounded-2xl transition-all hover:scale-105 active:scale-95"
              >
                <Zap className="w-5 h-5" />
                Accéder à la plateforme
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#fonctionnalites"
                className="inline-flex items-center justify-center gap-2.5 px-8 py-4 font-bold text-base rounded-2xl transition-all hover:scale-105"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.25)',
                  color: '#F1F5F9',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <Play className="w-4 h-4" />
                Voir la démo
              </a>
            </motion.div>

            {/* Social proof strip */}
            <motion.div variants={fadeUp} className="flex items-center gap-5 flex-wrap">
              <div className="flex -space-x-3">
                {['https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=40&h=40&fit=crop&crop=face',
                  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=40&h=40&fit=crop&crop=face',
                  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=40&h=40&fit=crop&crop=face',
                  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face',
                ].map((src, i) => (
                  <img key={i} src={src} alt="" className="w-10 h-10 rounded-full object-cover shadow-lg" style={{ border: '2px solid rgba(255,255,255,0.3)' }} />
                ))}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
                  <span className="text-xs font-bold text-amber-400 ml-1">4.9</span>
                </div>
                <p className="text-xs font-medium text-white/60">+120 professionnels de santé nous font confiance</p>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom gradient fade into next section */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {[
              { value: '+15', label: 'Établissements partenaires', icon: Shield, color: 'teal' },
              { value: '40%', label: 'Réduction du temps d\'attente', icon: Clock, color: 'blue' },
              { value: '+5000', label: 'Patients triés par mois', icon: Users, color: 'green' },
              { value: '98.5%', label: 'Précision du triage', icon: Award, color: 'orange' },
            ].map((stat, i) => (
              <motion.div key={i} variants={fadeUp} className="text-center">
                <div className={`w-12 h-12 mx-auto rounded-2xl flex items-center justify-center mb-4 ${
                  stat.color === 'teal' ? 'bg-teal-50' :
                  stat.color === 'blue' ? 'bg-blue-50' :
                  stat.color === 'green' ? 'bg-green-50' : 'bg-orange-50'
                }`}>
                  <stat.icon className={`w-6 h-6 ${
                    stat.color === 'teal' ? 'text-teal-700' :
                    stat.color === 'blue' ? 'text-blue-700' :
                    stat.color === 'green' ? 'text-green-700' : 'text-orange-700'
                  }`} />
                </div>
                <p className="text-4xl font-black text-night-blue mb-1">{stat.value}</p>
                <p className="text-sm text-soft-gray font-medium">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="fonctionnalites" className="py-24 bg-bg-main">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <span className="text-teal-700 font-semibold text-sm uppercase tracking-widest">Fonctionnalités</span>
            <h2 className="text-4xl font-black text-night-blue mt-2 mb-4">
              Tout ce dont vous avez besoin
              <br />
              <span className="gradient-text">en un seul outil</span>
            </h2>
            <p className="text-lg text-soft-gray max-w-2xl mx-auto">
              URGENSIA combine l'intelligence du triage médical avec la simplicité d'utilisation pour les équipes de terrain.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {[
              {
                icon: Zap,
                title: 'Pré-triage intelligent',
                desc: 'Algorithme basé sur le Système Manchester pour une évaluation rapide et précise de la gravité des patients.',
                color: 'teal',
              },
              {
                icon: Clock,
                title: 'Gestion de la file d\'attente',
                desc: 'Tri automatique par niveau de priorité. Les cas critiques sont immédiatement mis en avant.',
                color: 'red',
              },
              {
                icon: BarChart3,
                title: 'Statistiques en temps réel',
                desc: 'Tableaux de bord avec graphiques dynamiques pour suivre l\'activité et optimiser les ressources.',
                color: 'blue',
              },
              {
                icon: Users,
                title: 'Gestion multi-rôles',
                desc: 'Accès différenciés pour infirmiers d\'accueil-triage, médecins et administrateurs avec interfaces dédiées.',
                color: 'purple',
              },
              {
                icon: Shield,
                title: 'Traçabilité complète',
                desc: 'Historique détaillé de chaque patient. Données médicales sécurisées et accessibles.',
                color: 'green',
              },
              {
                icon: Heart,
                title: 'Interface humaine',
                desc: 'Design intuitif pensé pour le stress des urgences. Formation en moins de 2 heures.',
                color: 'orange',
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="bg-white rounded-2xl p-6 border border-slate-100 shadow-soft hover:shadow-medium hover:-translate-y-1 transition-all duration-200 group"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all group-hover:scale-110 ${
                  feature.color === 'teal' ? 'bg-teal-50 text-teal-700' :
                  feature.color === 'red' ? 'bg-red-50 text-red-700' :
                  feature.color === 'blue' ? 'bg-blue-50 text-blue-700' :
                  feature.color === 'purple' ? 'bg-purple-50 text-purple-700' :
                  feature.color === 'green' ? 'bg-green-50 text-green-700' :
                  'bg-orange-50 text-orange-700'
                }`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-night-blue mb-2">{feature.title}</h3>
                <p className="text-sm text-soft-gray leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Manchester Levels Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <span className="text-teal-700 font-semibold text-sm uppercase tracking-widest">Système Manchester</span>
            <h2 className="text-4xl font-black text-night-blue mt-2 mb-4">
              5 niveaux de priorité
              <br />
              <span className="gradient-text">standardisés internationalement</span>
            </h2>
            <p className="text-lg text-soft-gray max-w-2xl mx-auto">
              Le Manchester Triage System est le référentiel mondial pour la classification des urgences médicales.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
            className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4"
          >
            {[
              { level: 1, label: 'Critique',    color: '#DC2626', bgColor: '#FEE2E2', borderColor: '#FECACA', maxDelay: 'Immédiat',    description: 'Urgence vitale immédiate. Prise en charge sans attente.' },
              { level: 2, label: 'Très Urgent', color: '#EA580C', bgColor: '#FFEDD5', borderColor: '#FED7AA', maxDelay: '10 min',      description: 'Situation très grave. Traitement dans les 10 minutes.' },
              { level: 3, label: 'Urgent',      color: '#EAB308', bgColor: '#FEF9C3', borderColor: '#FEF08A', maxDelay: '30 min',      description: 'Cas urgent. Prise en charge dans la demi-heure.' },
              { level: 4, label: 'Standard',    color: '#22C55E', bgColor: '#DCFCE7', borderColor: '#BBF7D0', maxDelay: '60 min',      description: 'Cas non urgent. Consultation dans l’heure.' },
              { level: 5, label: 'Non Urgent',  color: '#3B82F6', bgColor: '#DBEAFE', borderColor: '#BFDBFE', maxDelay: '2 heures',    description: 'Cas mineur. Peut attendre jusqu’à 2 heures.' },
            ].map((level) => (
              <motion.div
                key={level.level}
                variants={fadeUp}
                className="rounded-2xl p-5 border text-center hover:scale-105 transition-transform duration-200"
                style={{ backgroundColor: level.bgColor, borderColor: level.borderColor }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-black mx-auto mb-3 shadow-md"
                  style={{ backgroundColor: level.color }}
                >
                  {level.level}
                </div>
                <h3 className="font-bold text-slate-800 mb-1">{level.label}</h3>
                <p className="text-xs font-semibold mb-2" style={{ color: level.color }}>
                  {level.maxDelay}
                </p>
                <p className="text-xs text-slate-600 leading-snug">{level.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-bg-main">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <span className="text-teal-700 font-semibold text-sm uppercase tracking-widest">Témoignages</span>
            <h2 className="text-4xl font-black text-night-blue mt-2 mb-4">
              Ils nous font confiance
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
            className="grid md:grid-cols-3 gap-6"
          >
            {[
              { id: 1, stars: 5, text: 'URGENSIA a révolutionné notre façon de gérer les urgences. Le temps de triage est passé de 15 minutes à moins de 5 minutes.', name: 'Dr. Adjoua Koffi', role: 'Chef des urgences', hospital: 'CNHU Cotonou', photo: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=40&h=40&fit=crop&crop=face' },
              { id: 2, stars: 5, text: 'Interface intuitive, même en situation de stress. Nos infirmiers d’accueil-triage ont été opérationnels en moins d’une heure.', name: 'M. Codjo Hounsou', role: 'Directeur administratif', hospital: 'Clinique Atinkanmè', photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face' },
              { id: 3, stars: 5, text: 'La classification Manchester automatisée nous permet de concentrer notre énergie sur les patients, pas la paperasse.', name: 'Dr. Rachida Fassinou', role: 'Médecin urgentiste', hospital: 'Hôpital de Zone Ouidah', photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=40&h=40&fit=crop&crop=face' },
            ].map((testimonial) => (
              <motion.div
                key={testimonial.id}
                variants={fadeUp}
                className="bg-white rounded-2xl p-6 border border-slate-100 shadow-soft hover:shadow-medium transition-all"
              >
                <div className="flex items-center gap-1 mb-4">
                  {Array(testimonial.stars).fill(0).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed mb-6 italic">"{testimonial.text}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <img
                    src={testimonial.photo}
                    alt={testimonial.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-teal-100"
                  />
                  <div>
                    <p className="font-semibold text-night-blue text-sm">{testimonial.name}</p>
                    <p className="text-xs text-soft-gray">{testimonial.role}</p>
                    <p className="text-xs text-teal-600 font-medium">{testimonial.hospital}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="py-24 bg-gradient-to-r from-teal-700 to-teal-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2 variants={fadeUp} className="text-4xl sm:text-5xl font-black text-white mb-4">
              Modernisez votre service
              <br />
              d'urgences aujourd'hui
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-teal-100 mb-10 max-w-xl mx-auto">
              Rejoignez les établissements de santé qui ont transformé leur gestion des urgences avec URGENSIA.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/connexion"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-teal-700 font-bold text-base rounded-2xl hover:bg-teal-50 shadow-large transition-all hover:scale-105"
              >
                <Zap className="w-5 h-5" />
                Démarrer maintenant
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="mailto:contact@urgensia.bj"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 text-white font-bold text-base rounded-2xl border border-white/30 hover:bg-white/20 transition-all"
              >
                Nous contacter
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer id="apropos" className="bg-night-blue text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl">URGENSIA</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
                Système numérique d'aide au pré-triage médical pour les hôpitaux, cliniques et centres de santé du Bénin. Basé sur le Manchester Triage System.
              </p>
              <div className="flex items-center gap-2 mt-4">
                <span className="text-xs text-slate-500">Développé avec</span>
                <Heart className="w-3 h-3 text-red-400 fill-red-400" />
                <span className="text-xs text-slate-500">au Bénin 🇧🇯</span>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4 text-slate-300">Plateforme</h4>
              <ul className="space-y-2">
                {[
                  { label: 'Accueil',         href: '#accueil' },
                  { label: 'Fonctionnalités', href: '#fonctionnalites' },
                  { label: 'Contact',         href: '#contact' },
                  { label: 'À propos',        href: '#apropos' },
                ].map(({ label, href }) => (
                  <li key={label}><a href={href} className="text-sm text-slate-400 hover:text-teal-400 transition-colors">{label}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-4 text-slate-300">Contact</h4>
              <ul className="space-y-2">
                <li className="text-sm text-slate-400">contact@urgensia.bj</li>
                <li className="text-sm text-slate-400">+229 21 00 00 00</li>
                <li className="text-sm text-slate-400">Cotonou, Bénin</li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500">© 2026 URGENSIA. Tous droits réservés.</p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-xs text-slate-500 hover:text-teal-400">Confidentialité</a>
              <a href="#" className="text-xs text-slate-500 hover:text-teal-400">Conditions d'utilisation</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
