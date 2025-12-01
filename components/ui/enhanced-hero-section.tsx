import { motion, useScroll, useTransform, useInView } from 'motion/react'
import { useRef, useEffect, useState } from 'react'
import { Sparkles, ArrowRight, Play, CheckCircle } from 'lucide-react'

interface Particle {
  id: number
  x: number
  y: number
  size: number
  duration: number
  delay: number
}

interface HeroSectionProps {
  onGetStarted: () => void
  onLearnMore: () => void
}

export default function HeroSection({ onGetStarted, onLearnMore }: HeroSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  })

  const titleY = useTransform(scrollYProgress, [0, 1], [0, -50])
  const titleOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const buttonY = useTransform(scrollYProgress, [0, 0.5], [0, 30])
  const buttonOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0])

  const isInView = useInView(containerRef, { once: true, margin: '-100px' })
  const [particles, setParticles] = useState<Particle[]>([])
  const [mounted, setMounted] = useState(false)

  // Generate random particles on mount
  useEffect(() => {
    setMounted(true)
    const newParticles: Particle[] = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 5,
    }))
    setParticles(newParticles)
  }, [])

  // Floating animation values
  const floatValues = Array.from({ length: 6 }, (_, i) => ({
    y: useTransform(scrollYProgress, [0, 1], [0, Math.sin(i) * 30 + Math.random() * 20]),
    rotate: useTransform(scrollYProgress, [0, 1], [0, Math.cos(i) * 15 + Math.random() * 10]),
  }))

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-white via-cyan-50/30 to-teal-50/30"
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Gradient Orbs */}
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)',
            left: '10%',
            top: '20%',
          }}
          animate={{
            x: [0, 100, -50, 0],
            y: [0, -80, 60, 0],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)',
            right: '15%',
            bottom: '20%',
          }}
          animate={{
            x: [0, -120, 80, 0],
            y: [0, 100, -60, 0],
            scale: [1, 0.8, 1.1, 1],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)',
            left: '50%',
            top: '60%',
            translateX: '-50%',
          }}
          animate={{
            x: [0, 80, -80, 0],
            y: [0, -120, 120, 0],
          }}
          transition={{
            duration: 35,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Particles */}
        {mounted &&
          particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute rounded-full bg-blue-400/30"
              style={{
                width: particle.size,
                height: particle.size,
                left: `${particle.x}%`,
                top: `${particle.y}%`,
              }}
              animate={{
                y: [0, -30, 0],
                x: [0, 20, -20, 0],
                opacity: [0.3, 0.8, 0.3],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: particle.duration,
                repeat: Infinity,
                delay: particle.delay,
                ease: 'easeInOut',
              }}
            />
          ))}

        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='%23e2e8f0' stroke-width='0.5'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)' /%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 mb-8 text-sm font-medium"
        >
          <Sparkles className="w-4 h-4" />
          Trusted by 10,000+ users
        </motion.div>

        {/* Main Heading */}
        <motion.h1
          style={{ y: titleY, opacity: titleOpacity }}
          className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 leading-tight"
        >
          <motion.span
            className="block"
            initial={{ opacity: 0, y: 50, filter: 'blur(20px)' }}
            animate={isInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            Need a Lawyer&apos;s
          </motion.span>
          <motion.span
            className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-teal-600"
            initial={{ opacity: 0, y: 50, filter: 'blur(20px)' }}
            animate={isInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            Voice Without the
          </motion.span>
          <motion.span
            className="block text-gray-900"
            initial={{ opacity: 0, y: 50, filter: 'blur(20px)' }}
            animate={isInView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
            transition={{ duration: 0.8, delay: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            Legal Bill?
          </motion.span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="text-xl md:text-2xl text-gray-600 max-w-4xl mx-auto mb-12 leading-relaxed"
        >
          Get professional, lawyer-drafted letters for tenant disputes, debt collection, HR issues, and more. Resolve
          conflicts quickly and affordably with the power of legal communication.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          style={{ y: buttonY, opacity: buttonOpacity }}
          className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{
              type: 'spring',
              stiffness: 100,
              damping: 12,
              delay: 1.1,
            }}
            whileHover={{
              scale: 1.05,
              transition: { duration: 0.2 },
            }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.button
              onClick={onGetStarted}
              className="relative group px-12 py-5 text-lg font-semibold text-white rounded-xl shadow-2xl overflow-hidden transition-all duration-300 hover:shadow-3xl"
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              }}
              whileHover={{
                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              }}
            >
              {/* Running Border Effect */}
              <div className="absolute inset-0 rounded-xl">
                <div className="absolute inset-0 rounded-xl p-[3px]">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 via-purple-400 to-teal-400 opacity-75 group-hover:opacity-100 transition-opacity duration-300" />
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 via-purple-400 to-teal-400 opacity-75"
                    animate={{
                      backgroundPosition: ['0% 50%', '200% 50%'],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                    style={{
                      backgroundSize: '200% 200%',
                    }}
                  />
                </div>
                <div className="absolute inset-[3px] rounded-xl bg-gradient-to-r from-blue-600 to-purple-600" />
              </div>

              {/* Content */}
              <div className="relative z-10 flex items-center">
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <Play className="w-5 h-5 mr-3" />
                </motion.div>
                Get Started Now
                <motion.div
                  className="ml-3"
                  animate={{ x: [0, 5, 0] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 0.5,
                  }}
                >
                  <ArrowRight className="w-5 h-5" />
                </motion.div>
              </div>
            </motion.button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{
              type: 'spring',
              stiffness: 100,
              damping: 12,
              delay: 1.3,
            }}
            whileHover={{
              scale: 1.05,
              transition: { duration: 0.2 },
            }}
            whileTap={{ scale: 0.98 }}
          >
            <button
              onClick={onLearnMore}
              className="px-12 py-5 text-lg font-semibold text-blue-600 bg-white border-2 border-blue-200 rounded-xl shadow-lg hover:shadow-xl hover:bg-blue-50 transition-all duration-300 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10 flex items-center">
                View Letter Types
                <ArrowRight className="w-5 h-5 ml-3 group-hover:translate-x-1 transition-transform duration-300" />
              </div>
            </button>
          </motion.div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 1.5 }}
        >
          {[
            { text: 'No Legal Fees', delay: 1.7 },
            { text: '24-48 Hour Delivery', delay: 1.9 },
            { text: 'Lawyer Reviewed', delay: 2.1 },
          ].map((feature, index) => (
            <motion.div
              key={feature.text}
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{
                duration: 0.6,
                delay: feature.delay,
                type: 'spring',
                stiffness: 100,
              }}
              whileHover={{
                y: -5,
                transition: { duration: 0.2 },
              }}
              className="flex items-center justify-center gap-3 text-gray-700 bg-white/80 backdrop-blur-sm px-6 py-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: index * 0.2,
                  ease: 'easeInOut',
                }}
              >
                <CheckCircle className="w-6 h-6 text-green-500" />
              </motion.div>
              <span className="font-medium">{feature.text}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6, delay: 2.3 }}
      >
        <motion.div
          className="w-6 h-10 border-2 border-blue-300 rounded-full flex justify-center"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <motion.div
            className="w-1 h-3 bg-blue-400 rounded-full mt-2"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
      </motion.div>
    </section>
  )
}
