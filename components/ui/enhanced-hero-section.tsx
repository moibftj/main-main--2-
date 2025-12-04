'use client'

import { motion, useScroll, useTransform, useInView } from 'motion/react'
import { useRef, useEffect, useState, useMemo } from 'react'
import { Sparkles, ArrowRight, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

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

  // Memoize float values to avoid recreating on each render
  const floatValues = useMemo(() => 
    Array.from({ length: 6 }, (_, i) => ({
      yOffset: Math.sin(i) * 30 + 20,
      rotateOffset: Math.cos(i) * 15 + 10,
    })), []
  )

  const features = [
    'AI-Powered Legal Letters',
    'Attorney Reviewed',
    'Fast Turnaround',
  ]

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
            x: [0, -80, 40, 0],
            y: [0, 60, -40, 0],
            scale: [1, 0.9, 1.1, 1],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Floating Particles */}
        {mounted && particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full bg-gradient-to-r from-cyan-400 to-teal-400 opacity-40"
            style={{
              width: particle.size,
              height: particle.size,
              left: `${particle.x}%`,
              top: `${particle.y}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.4, 0.8, 0.4],
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-100 to-teal-100 border border-cyan-200 mb-8"
        >
          <Sparkles className="w-4 h-4 text-cyan-600" />
          <span className="text-sm font-medium text-cyan-700">
            AI-Powered Legal Assistance
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1
          style={{ y: titleY, opacity: titleOpacity }}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 mb-6"
        >
          Professional Legal Letters
          <br />
          <span className="bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">
            Made Simple
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-8"
        >
          Get professionally crafted legal letters reviewed by real attorneys. 
          Fast, affordable, and tailored to your specific situation.
        </motion.p>

        {/* Features List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex flex-wrap justify-center gap-4 mb-10"
        >
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-center gap-2 text-gray-700"
            >
              <CheckCircle className="w-5 h-5 text-teal-500" />
              <span className="text-sm font-medium">{feature}</span>
            </div>
          ))}
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          style={{ y: buttonY, opacity: buttonOpacity }}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button
            onClick={onGetStarted}
            size="lg"
            className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Get Started Free
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <Button
            onClick={onLearnMore}
            variant="outline"
            size="lg"
            className="border-2 border-gray-300 hover:border-cyan-500 px-8 py-6 text-lg font-semibold rounded-xl transition-all duration-300"
          >
            Learn More
          </Button>
        </motion.div>

        {/* Trust Indicator */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-8 text-sm text-gray-500"
        >
          Trusted by thousands of clients • First letter free
        </motion.p>
      </div>
    </section>
  )
}
