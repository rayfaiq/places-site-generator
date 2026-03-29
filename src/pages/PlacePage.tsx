import { useRef } from 'react'
import { motion } from 'framer-motion'
import {
  MapPin, Phone, Globe, Clock, Star, ArrowLeft,
  ExternalLink, ChevronDown, DollarSign, Heart,
} from 'lucide-react'
import { type PlaceData } from '../App'
import StarRating from '../components/StarRating'

interface Props {
  data: PlaceData
  onBack: () => void
}

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' as const } },
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
}

function getPriceDots(level?: string) {
  if (!level) return null
  const map: Record<string, string> = {
    FREE: 'Free',
    INEXPENSIVE: '$',
    MODERATE: '$$',
    EXPENSIVE: '$$$',
    VERY_EXPENSIVE: '$$$$',
  }
  return map[level] ?? level
}

function getTodayIndex() {
  const day = new Date().getDay()
  // Google Places hours: index 0 = Monday ... 6 = Sunday
  return day === 0 ? 6 : day - 1
}

export default function PlacePage({ data, onBack }: Props) {
  const { place, copy } = data
  const heroRef = useRef<HTMLDivElement>(null)

  const hasPhotos = place.photos && place.photos.length > 0
  const heroPhoto = hasPhotos ? place.photos![0] : null
  const galleryPhotos = hasPhotos && place.photos!.length > 1 ? place.photos!.slice(1, 4) : []
  const todayIndex = getTodayIndex()

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen" style={{ fontFamily: 'var(--font-sans)', background: 'hsl(var(--background))' }}>

      {/* ── STICKY NAVBAR ─────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 md:px-8 h-16"
        style={{
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          background: 'rgba(255,255,255,0.82)',
          borderBottom: '1px solid rgba(255,255,255,0.3)',
          boxShadow: '0 1px 0 0 hsl(var(--border))',
        }}
      >
        {/* Back / Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-medium transition-colors"
            style={{ color: 'hsl(var(--muted-foreground))' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'hsl(var(--primary))')}
            onMouseLeave={e => (e.currentTarget.style.color = 'hsl(var(--muted-foreground))')}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Generate Another</span>
          </button>
          <span
            className="hidden sm:block w-px h-5"
            style={{ background: 'hsl(var(--border))' }}
          />
          <span
            className="font-semibold text-sm md:text-base truncate max-w-[180px] md:max-w-none"
            style={{ color: 'hsl(var(--foreground))' }}
          >
            {place.name}
          </span>
        </div>

        {/* Nav links (desktop) */}
        <div className="hidden md:flex items-center gap-6">
          {['about', 'hours', 'reviews', 'contact'].map(section => (
            <button
              key={section}
              onClick={() => scrollToSection(section)}
              className="text-sm font-medium capitalize transition-colors"
              style={{ color: 'hsl(var(--muted-foreground))' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'hsl(var(--primary))')}
              onMouseLeave={e => (e.currentTarget.style.color = 'hsl(var(--muted-foreground))')}
            >
              {section}
            </button>
          ))}
        </div>

        {/* CTA */}
        {place.googleMapsUri && (
          <a
            href={place.googleMapsUri}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
            style={{
              background: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))',
              boxShadow: '0 2px 8px hsl(var(--primary) / 0.3)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 4px 16px hsl(var(--primary) / 0.4)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 2px 8px hsl(var(--primary) / 0.3)'
            }}
          >
            <MapPin className="w-4 h-4" />
            Get Directions
          </a>
        )}
      </nav>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-16"
        style={{
          background: heroPhoto
            ? `url(${heroPhoto}) center center / cover no-repeat`
            : 'linear-gradient(135deg, hsl(25 80% 30%), hsl(14 89% 40%), hsl(25 95% 53%))',
        }}
      >
        {/* Dark overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.58) 0%, rgba(0,0,0,0.28) 50%, rgba(0,0,0,0.72) 100%)',
          }}
        />

        <div className="relative z-10 max-w-3xl mx-auto">
          {/* Rating badge */}
          {(place.rating || place.type) && (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-sm font-medium text-white"
              style={{
                background: 'rgba(255,255,255,0.18)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.25)',
              }}
            >
              {place.rating && (
                <span className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5" fill="hsl(var(--primary))" stroke="hsl(var(--primary))" />
                  <strong style={{ color: 'hsl(var(--primary))' }}>{place.rating}</strong>
                </span>
              )}
              {place.rating && place.totalRatings && (
                <span className="opacity-70">·</span>
              )}
              {place.totalRatings && (
                <span className="opacity-80">{place.totalRatings.toLocaleString()} reviews</span>
              )}
              {place.type && (
                <>
                  <span className="opacity-70">·</span>
                  <span className="opacity-80 capitalize">{place.type.replace(/_/g, ' ').toLowerCase()}</span>
                </>
              )}
            </motion.div>
          )}

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.2 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-4 leading-tight"
            style={{ fontFamily: 'var(--font-serif)', textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}
          >
            {copy.headline}
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="text-lg sm:text-xl text-white/80 mb-10 max-w-xl mx-auto leading-relaxed"
          >
            {copy.tagline}
          </motion.p>

          {/* Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            {place.googleMapsUri && (
              <a
                href={place.googleMapsUri}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3.5 rounded-xl font-semibold text-base transition-all duration-200"
                style={{
                  background: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))',
                  boxShadow: '0 4px 20px hsl(var(--primary) / 0.5)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 30px hsl(var(--primary) / 0.6)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 20px hsl(var(--primary) / 0.5)'
                }}
              >
                {copy.callToAction}
              </a>
            )}
            <button
              onClick={() => scrollToSection('reviews')}
              className="px-8 py-3.5 rounded-xl font-semibold text-base text-white transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.3)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.25)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.15)'
              }}
            >
              See Reviews
            </button>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-white/60" />
        </div>
      </section>

      {/* ── ABOUT ─────────────────────────────────────────── */}
      <section id="about" className="py-20 px-6" style={{ background: 'hsl(var(--secondary))' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="grid md:grid-cols-2 gap-12 items-start"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
          >
            {/* Left: description */}
            <motion.div variants={fadeUp}>
              <p
                className="text-xs font-semibold uppercase tracking-widest mb-3"
                style={{ color: 'hsl(var(--primary))' }}
              >
                About
              </p>
              <h2
                className="text-3xl md:text-4xl font-bold mb-6"
                style={{ fontFamily: 'var(--font-serif)', color: 'hsl(var(--foreground))' }}
              >
                {place.name}
              </h2>
              <p
                className="text-base leading-relaxed mb-4"
                style={{ color: 'hsl(var(--muted-foreground))' }}
              >
                {copy.description}
              </p>
              {place.editorialSummary && (
                <p
                  className="text-sm italic leading-relaxed"
                  style={{
                    color: 'hsl(var(--muted-foreground))',
                    borderLeft: '3px solid hsl(var(--primary))',
                    paddingLeft: '1rem',
                  }}
                >
                  {place.editorialSummary}
                </p>
              )}
              {copy.ambiance && (
                <div className="mt-5 flex items-center gap-2">
                  <Heart className="w-4 h-4" style={{ color: 'hsl(var(--accent))' }} />
                  <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                    Vibe: <span style={{ color: 'hsl(var(--muted-foreground))' }}>{copy.ambiance}</span>
                  </span>
                </div>
              )}
              {copy.bestFor && (
                <div className="mt-2 flex items-center gap-2">
                  <Star className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />
                  <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                    Best for: <span style={{ color: 'hsl(var(--muted-foreground))' }}>{copy.bestFor}</span>
                  </span>
                </div>
              )}
            </motion.div>

            {/* Right: info cards */}
            <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Address */}
              {place.address && (
                <InfoCard icon={<MapPin className="w-4 h-4" />} label="Address">
                  {place.address}
                </InfoCard>
              )}

              {/* Phone */}
              {place.phone && (
                <InfoCard icon={<Phone className="w-4 h-4" />} label="Phone">
                  <a
                    href={`tel:${place.phone}`}
                    className="hover:underline"
                    style={{ color: 'hsl(var(--primary))' }}
                  >
                    {place.phone}
                  </a>
                </InfoCard>
              )}

              {/* Website */}
              {place.website && (
                <InfoCard icon={<Globe className="w-4 h-4" />} label="Website">
                  <a
                    href={place.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline flex items-center gap-1"
                    style={{ color: 'hsl(var(--primary))' }}
                  >
                    Visit site <ExternalLink className="w-3 h-3" />
                  </a>
                </InfoCard>
              )}

              {/* Price level */}
              {place.priceLevel && (
                <InfoCard icon={<DollarSign className="w-4 h-4" />} label="Price">
                  {getPriceDots(place.priceLevel)}
                </InfoCard>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── HOURS ─────────────────────────────────────────── */}
      {place.hours?.weekdayDescriptions && place.hours.weekdayDescriptions.length > 0 && (
        <section id="hours" className="py-20 px-6" style={{ background: 'hsl(var(--card))' }}>
          <div className="max-w-2xl mx-auto">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
            >
              <motion.div variants={fadeUp} className="text-center mb-10">
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-2"
                  style={{ color: 'hsl(var(--primary))' }}
                >
                  <Clock className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
                  Hours
                </p>
                <h2
                  className="text-3xl font-bold"
                  style={{ fontFamily: 'var(--font-serif)', color: 'hsl(var(--foreground))' }}
                >
                  Opening Hours
                </h2>
              </motion.div>

              <motion.div
                variants={fadeUp}
                className="rounded-2xl overflow-hidden"
                style={{
                  border: '1px solid hsl(var(--border))',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                }}
              >
                {place.hours!.weekdayDescriptions!.map((hourLine, i) => {
                  const isToday = i === todayIndex
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between px-6 py-4"
                      style={{
                        background: isToday ? 'hsl(var(--primary) / 0.07)' : i % 2 === 0 ? 'hsl(var(--card))' : 'hsl(var(--secondary) / 0.5)',
                        borderBottom: i < place.hours!.weekdayDescriptions!.length - 1 ? '1px solid hsl(var(--border))' : 'none',
                      }}
                    >
                      <span
                        className="text-sm font-medium"
                        style={{ color: isToday ? 'hsl(var(--primary))' : 'hsl(var(--foreground))' }}
                      >
                        {hourLine.split(':')[0]}
                        {isToday && (
                          <span
                            className="ml-2 text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{
                              background: 'hsl(var(--primary))',
                              color: 'hsl(var(--primary-foreground))',
                            }}
                          >
                            Today
                          </span>
                        )}
                      </span>
                      <span
                        className="text-sm"
                        style={{ color: isToday ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}
                      >
                        {hourLine.includes(':') ? hourLine.split(/:(.*)/s).slice(1).join(':').trim() : ''}
                      </span>
                    </div>
                  )
                })}
              </motion.div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ── HIGHLIGHTS ───────────────────────────────────── */}
      {copy.highlights && copy.highlights.length > 0 && (
        <section
          className="py-20 px-6"
          style={{ background: 'hsl(var(--foreground))' }}
        >
          <div className="max-w-5xl mx-auto">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
            >
              <motion.div variants={fadeUp} className="text-center mb-12">
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-2"
                  style={{ color: 'hsl(var(--primary))' }}
                >
                  Why visit
                </p>
                <h2
                  className="text-3xl font-bold text-white"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  What Makes It Special
                </h2>
              </motion.div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {copy.highlights.slice(0, 4).map((h, i) => (
                  <motion.div
                    key={i}
                    variants={fadeUp}
                    className="text-center p-6 rounded-2xl"
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <div
                      className="text-3xl md:text-4xl font-bold mb-3"
                      style={{ fontFamily: 'var(--font-serif)', color: 'hsl(var(--primary))' }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <p className="text-sm text-white/70 leading-snug">{h}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ── REVIEWS ──────────────────────────────────────── */}
      {place.reviews && place.reviews.length > 0 && (
        <section id="reviews" className="py-20 px-6" style={{ background: 'hsl(var(--secondary))' }}>
          <div className="max-w-5xl mx-auto">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
            >
              <motion.div variants={fadeUp} className="text-center mb-12">
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-2"
                  style={{ color: 'hsl(var(--primary))' }}
                >
                  Reviews
                </p>
                <h2
                  className="text-3xl font-bold mb-3"
                  style={{ fontFamily: 'var(--font-serif)', color: 'hsl(var(--foreground))' }}
                >
                  What Visitors Say
                </h2>
                {place.rating && (
                  <div className="flex items-center justify-center gap-2">
                    <StarRating rating={place.rating} size="lg" />
                    <span className="text-lg font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                      {place.rating}
                    </span>
                    {place.totalRatings && (
                      <span className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>
                        ({place.totalRatings.toLocaleString()})
                      </span>
                    )}
                  </div>
                )}
              </motion.div>

              <div className="grid md:grid-cols-3 gap-6">
                {place.reviews.slice(0, 3).map((review, i) => (
                  <motion.div
                    key={i}
                    variants={fadeUp}
                    className="p-6 rounded-2xl"
                    style={{
                      background: 'rgba(255,255,255,0.75)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid hsl(var(--border))',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      {review.profilePhoto ? (
                        <img
                          src={review.profilePhoto}
                          alt={review.author}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                          style={{ background: 'hsl(var(--primary))' }}
                        >
                          {review.author.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'hsl(var(--foreground))' }}>
                          {review.author}
                        </p>
                        <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                          {review.relativeTime}
                        </p>
                      </div>
                    </div>
                    <StarRating rating={review.rating} size="sm" />
                    <p
                      className="mt-3 text-sm leading-relaxed line-clamp-5"
                      style={{ color: 'hsl(var(--muted-foreground))' }}
                    >
                      {review.text}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ── PHOTO GALLERY ────────────────────────────────── */}
      {galleryPhotos.length > 0 && (
        <section className="py-20 px-6" style={{ background: 'hsl(var(--card))' }}>
          <div className="max-w-5xl mx-auto">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
            >
              <motion.div variants={fadeUp} className="text-center mb-10">
                <p
                  className="text-xs font-semibold uppercase tracking-widest mb-2"
                  style={{ color: 'hsl(var(--primary))' }}
                >
                  Gallery
                </p>
                <h2
                  className="text-3xl font-bold"
                  style={{ fontFamily: 'var(--font-serif)', color: 'hsl(var(--foreground))' }}
                >
                  In Pictures
                </h2>
              </motion.div>

              <motion.div
                variants={fadeUp}
                className="grid grid-cols-2 md:grid-cols-3 gap-4"
              >
                {galleryPhotos.map((url, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-2xl overflow-hidden"
                    style={{
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    }}
                  >
                    <img
                      src={url}
                      alt={`${place.name} photo ${i + 2}`}
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ── FOOTER / CONTACT ─────────────────────────────── */}
      <footer
        id="contact"
        className="py-16 px-6"
        style={{ background: 'hsl(var(--foreground))' }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div>
              <h3
                className="text-2xl font-bold text-white mb-2"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                {place.name}
              </h3>
              {place.address && (
                <p className="text-sm text-white/60 flex items-center gap-2">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  {place.address}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-4">
              {place.googleMapsUri && (
                <FooterLink href={place.googleMapsUri} icon={<MapPin className="w-4 h-4" />}>
                  Google Maps
                </FooterLink>
              )}
              {place.phone && (
                <FooterLink href={`tel:${place.phone}`} icon={<Phone className="w-4 h-4" />}>
                  {place.phone}
                </FooterLink>
              )}
              {place.website && (
                <FooterLink href={place.website} icon={<Globe className="w-4 h-4" />}>
                  Website
                </FooterLink>
              )}
            </div>
          </div>

          <div
            className="mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
          >
            <p className="text-xs text-white/30">
              © {new Date().getFullYear()} {place.name}. All rights reserved.
            </p>
            <p className="text-xs text-white/30">
              Built with{' '}
              <a
                href="https://blink.new"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white/60 transition-colors"
                style={{ color: 'hsl(var(--primary))' }}
              >
                PlaceGen
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ── Sub-components ─────────────────────────────────────── */

function InfoCard({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div
      className="p-4 rounded-xl"
      style={{
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
      }}
    >
      <div className="flex items-center gap-2 mb-2" style={{ color: 'hsl(var(--primary))' }}>
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>
          {label}
        </span>
      </div>
      <div className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
        {children}
      </div>
    </div>
  )
}

function FooterLink({
  href,
  icon,
  children,
}: {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-white/70"
      style={{
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.14)'
        e.currentTarget.style.color = 'white'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
        e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
      }}
    >
      {icon}
      {children}
    </a>
  )
}
