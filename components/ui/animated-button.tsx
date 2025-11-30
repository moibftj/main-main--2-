import React, { useRef, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'blue-border'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  magnetic?: boolean
}

export default function AnimatedButton({
  children,
  variant = 'primary',
  size = 'md',
  className,
  magnetic = false,
  ...props
}: AnimatedButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const button = buttonRef.current
    if (!button || !magnetic) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = button.getBoundingClientRect()
      const x = e.clientX - rect.left - rect.width / 2
      const y = e.clientY - rect.top - rect.height / 2

      setMousePosition({ x, y })
    }

    const handleMouseLeave = () => {
      setMousePosition({ x: 0, y: 0 })
    }

    button.addEventListener('mousemove', handleMouseMove)
    button.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      button.removeEventListener('mousemove', handleMouseMove)
      button.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [magnetic])

  const sizeClasses = {
    sm: 'px-6 py-2.5 text-sm',
    md: 'px-8 py-3 text-base',
    lg: 'px-12 py-4 text-lg'
  }

  const magneticTransform = magnetic ? {
    x: mousePosition.x * 0.1,
    y: mousePosition.y * 0.1
  } : {}

  const renderButton = () => {
    switch (variant) {
      case 'blue-border':
        return (
          <motion.button
            ref={buttonRef}
            className={cn(
              "relative overflow-hidden rounded-xl font-semibold transition-all duration-300",
              "text-white shadow-lg hover:shadow-2xl",
              "bg-gradient-to-r from-blue-600 to-purple-600",
              "hover:scale-105 active:scale-98",
              sizeClasses[size],
              className
            )}
            style={magneticTransform}
            whileHover={{ scale: magnetic ? 1.05 : 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            {...props}
          >
            {/* Rotating Border Effect */}
            <div className="absolute inset-0 rounded-xl">
              <div className="absolute inset-0 rounded-xl p-[2px]">
                <motion.div
                  className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: 'conic-gradient(from 0deg at 50% 50%, #3b82f6, #2563eb, #1d4ed8, #3b82f6, #60a5fa, #93c5fd, #3b82f6)'
                  }}
                  animate={{
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />
              </div>
              <div className="absolute inset-[2px] rounded-xl bg-gradient-to-r from-blue-600 to-purple-600" />
            </div>

            {/* Shimmer Effect */}
            <div className="absolute inset-0 rounded-xl overflow-hidden">
              <motion.div
                className="absolute inset-0 opacity-0 hover:opacity-20 transition-opacity duration-300"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                  backgroundSize: '200% 100%'
                }}
                animate={{
                  backgroundPosition: ['-200% center', '200% center']
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            </div>

            {/* Content */}
            <span className="relative z-10 flex items-center justify-center">
              {children}
            </span>
          </motion.button>
        )

      case 'secondary':
        return (
          <motion.button
            ref={buttonRef}
            className={cn(
              "relative overflow-hidden rounded-xl font-semibold transition-all duration-300",
              "text-blue-600 bg-white border-2 border-blue-200",
              "hover:bg-blue-50 hover:border-blue-300 hover:shadow-xl",
              "active:scale-98",
              sizeClasses[size],
              className
            )}
            style={magneticTransform}
            whileHover={{ scale: magnetic ? 1.05 : 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            {...props}
          >
            {/* Hover Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />

            {/* Content */}
            <span className="relative z-10 flex items-center justify-center">
              {children}
            </span>
          </motion.button>
        )

      default: // primary
        return (
          <motion.button
            ref={buttonRef}
            className={cn(
              "relative overflow-hidden rounded-xl font-semibold transition-all duration-300",
              "text-white shadow-lg hover:shadow-2xl",
              "bg-gradient-to-r from-blue-600 to-blue-700",
              "hover:bg-gradient-to-r hover:from-blue-700 hover:to-blue-800",
              "hover:scale-105 active:scale-98",
              sizeClasses[size],
              className
            )}
            style={magneticTransform}
            whileHover={{ scale: magnetic ? 1.05 : 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            {...props}
          >
            {/* Subtle Glow Effect */}
            <div className="absolute inset-0 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-purple-400 blur-lg opacity-30" />
            </div>

            {/* Content */}
            <span className="relative z-10 flex items-center justify-center">
              {children}
            </span>
          </motion.button>
        )
    }
  }

  return (
    <div className="group">
      {renderButton()}
    </div>
  )
}