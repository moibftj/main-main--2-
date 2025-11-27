'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  User,
  Users,
  Shield,
  PenTool,
  Gift,
  LogOut,
  FileText,
  Scale,
  CheckCircle,
  Download,
  Send,
  Home,
  AlertCircle,
  Sparkles,
  Briefcase,
  ArrowRight,
  Play,
  ChevronRight,
  Building,
  Star,
  Phone,
  Mail,
  Zap,
  Clock,
} from 'lucide-react'
import jsPDF from 'jspdf'
import Link from 'next/link'
import PricingSection from '@/components/ui/pricing-section'

const LETTER_TYPES = [
  { value: 'demand_letter', label: 'Demand Letter', price: 299 },
  { value: 'cease_desist', label: 'Cease & Desist', price: 299 },
  { value: 'contract_breach', label: 'Contract Breach Notice', price: 299 },
  { value: 'eviction_notice', label: 'Eviction Notice', price: 299 },
  { value: 'employment_dispute', label: 'Employment Dispute', price: 299 },
  { value: 'consumer_complaint', label: 'Consumer Complaint', price: 299 },
]

const SUBSCRIPTION_PLANS = [
  { letters: 1, price: 299, planType: 'one_time', popular: false, name: 'Single Letter' },
  { letters: 4, price: 299, planType: 'standard_4_month', popular: true, name: 'Monthly Plan' },
  { letters: 8, price: 599, planType: 'premium_8_month', popular: false, name: 'Yearly Plan' },
]

type Profile = {
  id: string
  full_name: string | null
  role: string
  email: string
}

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view')
        }
      })
    }, observerOptions)

    const revealElements = document.querySelectorAll('.scroll-reveal')
    revealElements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [user])

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile) {
        setUser(user)
        setProfile(profile as Profile)
      }
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    toast.success('Logged out successfully')
    router.push('/')
  }

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-cyan-50 to-teal-50 text-gray-900 grid-pattern">
        {/* Navigation Header */}
        <nav
          className={`glass-card backdrop-blur-lg border-b border-blue-200 sticky top-0 z-50 transition-all duration-300 ${
            isScrolled ? 'bg-white/95 shadow-lg' : 'bg-white/80'
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3 animate-fade-in">
                <div className="animate-pulse-scale">
                  <Scale className="h-8 w-8 text-blue-500" />
                </div>
                <span className="text-xl font-bold text-gradient-animated">Talk-To-My-Lawyer</span>
              </div>
              <div className="hidden md:flex items-center space-x-4">
                <Button
                  variant="ghost"
                  onClick={() => scrollToSection('features')}
                  className="nav-item text-gray-700 hover:text-blue-600 transition-colors duration-200"
                >
                  Features
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => scrollToSection('pricing')}
                  className="nav-item text-gray-700 hover:text-blue-600 transition-colors duration-200"
                >
                  Pricing
                </Button>
                <Link href="/auth/login">
                  <Button variant="ghost" className="text-gray-700 hover:text-blue-600">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button className="btn-netlify btn-enhanced text-white">
                    Get Started
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="pt-20 pb-32 px-4 sm:px-6 lg:px-8 parallax-bg">
          <div className="max-w-7xl mx-auto text-center">
            <div className="text-center mb-16 scroll-reveal">
              <h1 className="text-5xl md:text-7xl font-bold mb-6 text-gradient-animated">
                Need a Lawyer&apos;s <span className="text-gray-900">Voice</span>
                <br />
                <span className="text-gray-900">Without the Legal Bill?</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed animate-fade-in stagger-2">
                Get professional, lawyer-drafted letters for tenant disputes, debt collection, HR
                issues, and more. Resolve conflicts quickly and affordably with the power of legal
                communication.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 scroll-reveal">
              <Link href="/auth/signup">
                <Button className="btn-netlify btn-enhanced text-white px-8 py-4 text-lg font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 group">
                  <Play className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
                  Get Started Now
                  <Sparkles className="h-4 w-4 ml-2 animate-bounce-gentle" />
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => scrollToSection('letter-types')}
                className="border-blue-300 text-blue-600 hover:bg-blue-50 px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-300 btn-enhanced group"
              >
                <FileText className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform duration-200" />
                View Letter Types
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-600 scroll-reveal stagger-3">
              <div className="flex items-center gap-2 animate-slide-up stagger-1">
                <CheckCircle className="h-5 w-5 text-green-500 animate-pulse-scale" />
                No Legal Fees
              </div>
              <div className="flex items-center gap-2 animate-slide-up stagger-2">
                <CheckCircle className="h-5 w-5 text-green-500 animate-pulse-scale" />
                24-48 Hour Delivery
              </div>
              <div className="flex items-center gap-2 animate-slide-up stagger-3">
                <CheckCircle className="h-5 w-5 text-green-500 animate-pulse-scale" />
                Lawyer Reviewed
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-gradient-to-r from-cyan-900 to-teal-900 text-white overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div className="scroll-reveal stagger-1 counter-animate">
                <div className="text-4xl font-bold mb-2 text-gradient-animated animate-pulse-scale">
                  10,000+
                </div>
                <div className="text-blue-200 transition-colors duration-200 hover:text-white">
                  Letters Delivered
                </div>
              </div>
              <div className="scroll-reveal stagger-2 counter-animate">
                <div className="text-4xl font-bold mb-2 text-gradient-animated animate-pulse-scale">
                  95%
                </div>
                <div className="text-blue-200 transition-colors duration-200 hover:text-white">
                  Success Rate
                </div>
              </div>
              <div className="scroll-reveal stagger-3 counter-animate">
                <div className="text-4xl font-bold mb-2 text-gradient-animated animate-pulse-scale">
                  50+
                </div>
                <div className="text-blue-200 transition-colors duration-200 hover:text-white">
                  Licensed Attorneys
                </div>
              </div>
              <div className="scroll-reveal stagger-4 counter-animate">
                <div className="text-4xl font-bold mb-2 text-gradient-animated animate-pulse-scale">
                  24 Hours
                </div>
                <div className="text-blue-200 transition-colors duration-200 hover:text-white">
                  Average Delivery
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Letter Types Section */}
        <section id="letter-types" className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <Badge className="bg-blue-100 text-blue-600 mb-4">Most Popular</Badge>
              <h2 className="text-4xl font-bold mb-4 shiny-text">Professional Legal Letters</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Choose from our comprehensive library of lawyer-drafted letter templates. Each
                letter is customized for your specific situation and reviewed by licensed attorneys.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  icon: Home,
                  title: 'Tenant Disputes',
                  desc: 'Security deposits, lease violations, habitability issues, and more',
                  price: '$299',
                  color: 'blue',
                },
                {
                  icon: Briefcase,
                  title: 'HR & Employment',
                  desc: 'Workplace harassment, wrongful termination, wage disputes',
                  price: '$299',
                  color: 'green',
                },
                {
                  icon: AlertCircle,
                  title: 'Debt Collection',
                  desc: 'Collect money owed to you from clients, customers, or businesses',
                  price: '$299',
                  color: 'red',
                },
                {
                  icon: Users,
                  title: 'Personal Disputes',
                  desc: 'Neighbor disputes, contract breaches, personal injury claims',
                  price: '$299',
                  color: 'purple',
                },
                {
                  icon: Building,
                  title: 'Property Issues',
                  desc: 'Property damage, boundary disputes, easement issues',
                  price: '$299',
                  color: 'indigo',
                },
                {
                  icon: Shield,
                  title: 'Cease & Desist',
                  desc: 'Stop harassment, defamation, copyright infringement, and more',
                  price: '$299',
                  color: 'orange',
                },
              ].map((type, index) => (
                <Card
                  key={type.title}
                  className={`glass-card card-enhanced laser-border-blue hover:shadow-xl transition-all duration-300 animate-slide-up group scroll-reveal stagger-${
                    (index % 6) + 1
                  }`}
                >
                  <CardHeader className="relative z-10">
                    <div
                      className={`w-12 h-12 rounded-lg bg-${type.color}-100 flex items-center justify-center mb-4 card-icon transition-all duration-300`}
                    >
                      <type.icon className={`h-6 w-6 text-${type.color}-600`} />
                    </div>
                    <CardTitle className="text-xl font-semibold mb-2 text-gradient-animated">
                      {type.title}
                    </CardTitle>
                    <CardDescription className="text-gray-600 mb-4">{type.desc}</CardDescription>
                    <div className="text-2xl font-bold text-blue-600 glow-text animate-bounce-gentle">
                      Starting at {type.price}
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <Link href="/auth/signup">
                      <Button className="w-full btn-netlify btn-enhanced text-white transition-all duration-300 group">
                        Select This Type
                        <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <PricingSection />

        {/* Features Section */}
        <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: Zap,
                  title: 'Lightning Fast',
                  desc: 'Generate professional legal letters in minutes, not hours',
                },
                {
                  icon: Users,
                  title: 'Attorney Reviewed',
                  desc: 'Every letter is reviewed by qualified legal professionals',
                },
                {
                  icon: Shield,
                  title: 'Secure & Confidential',
                  desc: 'Bank-level encryption protects your information',
                },
              ].map((feature, index) => (
                <Card
                  key={feature.title}
                  className="glass-card card-enhanced laser-border-blue hover:shadow-xl scroll-reveal"
                >
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4 card-icon">
                      <feature.icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-xl font-semibold mb-2 text-gradient-animated">
                      {feature.title}
                    </CardTitle>
                    <CardDescription className="text-gray-600">{feature.desc}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gradient-to-r from-cyan-900 to-teal-900 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <Scale className="h-10 w-10 text-cyan-400" />
                  <span className="text-2xl font-bold text-white">Talk-To-My-Lawyer</span>
                </div>
                <p className="text-cyan-200 mb-4">
                  Professional legal assistance without the legal bill.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-4 glow-text">Services</h3>
                <ul className="space-y-2 text-blue-200">
                  <li>Tenant Disputes</li>
                  <li>HR Issues</li>
                  <li>Debt Collection</li>
                  <li>Cease & Desist</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-4 glow-text">Company</h3>
                <ul className="space-y-2 text-blue-200">
                  <li>About Us</li>
                  <li>Legal Blog</li>
                  <li>Careers</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-4 glow-text">Contact</h3>
                <div className="space-y-2 text-blue-200">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    support@legalletters.com
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    1-800-LETTERS
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-blue-700 mt-12 pt-8 text-center text-blue-200">
              <p>&copy; 2025 Talk-To-My-Lawyer. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    )
  }

  // Authenticated user view - redirect to dashboard
  if (profile?.role === 'subscriber') {
    router.push('/dashboard')
    return null
  }

  if (profile?.role === 'admin') {
    router.push('/dashboard/admin')
    return null
  }

  if (profile?.role === 'employee') {
    router.push('/dashboard/commissions')
    return null
  }

  return null
}
