'use client';

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { useState, useEffect } from 'react'
import { ArrowRight, Sparkles, Scale, FileText, Shield, Zap, Users, CheckCircle, Star, ChevronRight, SparklesIcon } from 'lucide-react'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const configError = params?.error === 'config'

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pro-landing">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute left-1/4 top-0 h-96 w-96 animate-pulse rounded-full bg-primary/20 blur-3xl" style={{ animationDuration: '8s' }} />
        <div className="absolute right-1/4 top-1/4 h-96 w-96 animate-pulse rounded-full bg-blue-500/20 blur-3xl" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 animate-pulse rounded-full bg-purple-500/20 blur-3xl" style={{ animationDuration: '12s', animationDelay: '4s' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-background/90" />

      {/* Navigation */}
      <nav className="relative border-b border-slate-200/60 bg-white/80 backdrop-blur-xl sticky top-0 z-50 pro-nav shadow-sm shadow-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                <Scale className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">Talk-To-My-Lawyer</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/auth/login">
                <Button variant="ghost" className="hover:bg-primary/10 hover:text-primary transition-all duration-300">Sign In</Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105">
                  <span className="relative z-10 flex items-center gap-2">
                    Get Started
                    <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                  <div className="absolute inset-0 bg-white opacity-0 transition-opacity duration-300 group-hover:opacity-20" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Configuration Error Alert */}
      {configError && (
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 z-20">
          <Alert variant="destructive" className="backdrop-blur-sm">
            <AlertTitle>Configuration Required</AlertTitle>
            <AlertDescription>
              <p className="mb-2">
                Missing Supabase environment variables. Please add the following to your project:
              </p>
              <ul className="list-disc list-inside space-y-1 mb-2">
                <li><code className="text-sm">NEXT_PUBLIC_SUPABASE_URL</code></li>
                <li><code className="text-sm">NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
              </ul>
              <p className="text-sm">
                Find these values in your Supabase project settings at{' '}
                <a
                  href="https://supabase.com/dashboard/project/_/settings/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  https://supabase.com/dashboard/project/_/settings/api
                </a>
              </p>
              <p className="text-sm mt-2">
                Add them in the <strong>Vars</strong> section of the v0 sidebar.
              </p>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 z-10 pro-hero">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-gradient-to-r from-primary/10 to-purple-500/10 px-4 py-2 text-sm font-medium text-primary backdrop-blur-sm mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Legal Letter Generation</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-br from-slate-900 via-blue-800 to-purple-800 bg-clip-text text-transparent animate-fade-in-up">
            Professional Legal Letters in Minutes
          </h1>

          <p className="text-xl md:text-2xl text-slate-600 mb-10 animate-fade-in-up animation-delay-200">
            Generate expertly drafted legal letters with attorney review.
            <span className="block text-lg mt-2 text-slate-500">Transform hours of work into minutes with AI-powered precision.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animation-delay-400">
            <Link href="/auth/signup">
              <Button size="lg" className="group relative overflow-hidden text-lg px-8 py-6 h-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform transition-all duration-300 hover:scale-105 shadow-xl hover:shadow-2xl hover:shadow-blue-500/25">
                <span className="relative z-10 flex items-center gap-2">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-20" />
              </Button>
            </Link>
            <Link href="#pricing">
              <Button size="lg" variant="outline" className="group relative overflow-hidden text-lg px-8 py-6 h-auto border-2 bg-white/80 backdrop-blur-sm hover:bg-white hover:border-primary/50 transform transition-all duration-300 hover:scale-105">
                <span className="relative z-10">View Pricing</span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-purple-500/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mt-24 pro-features">
          <FeatureCard
            icon={<Zap className="w-6 h-6" />}
            title="Lightning Fast"
            description="Generate professional legal letters in minutes, not hours. Our AI-powered system works at the speed of your business."
            delay={0}
          />
          <FeatureCard
            icon={<Users className="w-6 h-6" />}
            title="Attorney Reviewed"
            description="Every letter is reviewed and approved by qualified legal professionals to ensure accuracy and compliance."
            delay={200}
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6" />}
            title="Secure & Confidential"
            description="Bank-level encryption and security. Your sensitive legal information is always protected."
            delay={400}
          />
        </div>

        {/* Stats Section */}
        <div className="stats-grid grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 mb-20">
          {[
            { number: "10,000+", label: "Letters Generated" },
            { number: "98%", label: "Client Satisfaction" },
            { number: "24-48h", label: "Average Turnaround" },
            { number: "50+", label: "Legal Templates" }
          ].map((stat, index) => (
            <div key={index} className="text-center group">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">
                {stat.number}
              </div>
              <div className="text-sm text-slate-600 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Enhanced Pricing Section */}
        <div id="pricing" className="mt-24 pro-pricing">
          <h2 className="text-4xl font-bold text-center mb-4 bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
            Simple, Transparent Pricing
          </h2>
          <p className="text-center text-slate-600 mb-12 text-lg">Choose the plan that fits your legal needs</p>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              title="Single Letter"
              price="$299"
              description="Perfect for one-time legal needs"
              features={["1 Professional Letter", "Attorney Review", "PDF Download", "Email Support"]}
              buttonText="Get Started"
              variant="default"
            />
            <PricingCard
              title="Monthly Plan"
              price="$299"
              period="/mo"
              description="4 letters per month, best value"
              features={["4 Letters Monthly", "Attorney Review", "Priority Support", "Cancel Anytime", "Custom Templates"]}
              buttonText="Get Started"
              variant="popular"
              badge="Most Popular"
            />
            <PricingCard
              title="Annual Plan"
              price="$599"
              period="/yr"
              description="8 letters per year, save 50%"
              features={["8 Letters Annually", "Attorney Review", "Priority Support", "Custom Branding", "API Access"]}
              buttonText="Get Started"
              variant="default"
            />
          </div>
        </div>

        {/* Testimonials */}
        <div className="mt-24 text-center pro-testimonials">
          <h2 className="text-3xl font-bold mb-12 bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
            Trusted by Professionals
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { name: "Sarah Johnson", role: "Attorney", content: "This platform has revolutionized how I handle client communications. Time-saving and professional.", rating: 5 },
              { name: "Michael Chen", role: "Small Business Owner", content: "Professional legal letters without the high attorney fees. Absolutely worth every penny.", rating: 5 },
              { name: "Emily Davis", role: "Legal Consultant", content: "The AI-powered drafting combined with attorney review gives me peace of mind.", rating: 5 }
            ].map((testimonial, index) => (
              <Card key={index} className="group hover:scale-105 transition-all duration-300 bg-white/80 backdrop-blur-sm border border-slate-200 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-3 justify-center">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-slate-600 mb-4 text-sm italic">"{testimonial.content}"</p>
                  <div className="font-semibold text-slate-900">{testimonial.name}</div>
                  <div className="text-sm text-slate-500">{testimonial.role}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative border-t border-slate-200/60 bg-white/80 backdrop-blur-xl mt-24 pro-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center text-slate-600">
            <p>&copy; 2024 Talk-To-My-Lawyer. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// Feature Card Component
function FeatureCard({ icon, title, description, delay }: {
  icon: React.ReactNode
  title: string
  description: string
  delay: number
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Card
      className="group relative overflow-hidden bg-white/80 backdrop-blur-sm border border-slate-200 hover:border-primary/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-primary/20"
      style={{ animationDelay: `${delay}ms` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-8">
        <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-primary/10 to-purple-500/10 text-primary transition-all duration-500 ${isHovered ? 'scale-110 rotate-6' : ''}`}>
          {icon}
        </div>
        <h3 className="text-xl font-semibold mb-2 text-slate-900">{title}</h3>
        <p className="text-slate-600">{description}</p>
        <div className={`absolute -bottom-4 -right-4 h-32 w-32 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 blur-2xl transition-all duration-500 ${isHovered ? 'scale-150 opacity-100' : 'scale-100 opacity-0'}`} />
      </CardContent>
    </Card>
  )
}

// Pricing Card Component
function PricingCard({
  title,
  price,
  period,
  description,
  features,
  buttonText,
  variant,
  badge
}: {
  title: string
  price: string
  period?: string
  description: string
  features: string[]
  buttonText: string
  variant: "default" | "popular"
  badge?: string
}) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <Card
      className={`group relative overflow-hidden transition-all duration-500 hover:scale-105 ${
        variant === "popular"
          ? "border-2 border-primary/50 bg-gradient-to-br from-primary/5 to-purple-500/5 hover:border-primary hover:shadow-2xl hover:shadow-primary/20"
          : "bg-white/80 backdrop-blur-sm border border-slate-200 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold z-10">
          {badge}
        </div>
      )}
      <CardContent className="p-8">
        <h3 className={`text-xl font-semibold mb-2 ${variant === "popular" ? "text-primary" : "text-slate-900"}`}>
          {title}
        </h3>
        <div className="mb-4">
          <span className={`text-4xl font-bold ${variant === "popular" ? "text-primary" : "text-slate-900"}`}>
            {price}
          </span>
          {period && <span className="text-lg text-slate-600">{period}</span>}
        </div>
        <p className="text-slate-600 mb-6">{description}</p>
        <ul className="space-y-3 mb-8">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-slate-700">{feature}</span>
            </li>
          ))}
        </ul>
        <Link href="/auth/signup">
          <Button
            className={`w-full group relative overflow-hidden transform transition-all duration-300 hover:scale-105 ${
              variant === "popular"
                ? "bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white shadow-lg shadow-primary/25"
                : "border-2 border-slate-200 hover:border-primary hover:bg-primary hover:text-white"
            }`}
          >
            <span className="relative z-10">{buttonText}</span>
            {variant === "popular" && (
              <div className="absolute inset-0 bg-white opacity-0 transition-opacity duration-300 group-hover:opacity-20" />
            )}
          </Button>
        </Link>
      </CardContent>
      <div className={`absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-500/5 opacity-0 transition-opacity duration-500 ${isHovered ? "opacity-100" : ""}`} />
    </Card>
  )
}