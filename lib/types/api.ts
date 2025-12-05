import { NextRequest } from 'next/server'
import { Database } from '@/lib/database.types'

// Common API Response Types
export interface ApiResponse<T = unknown> {
  success?: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Database Types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Letter = Database['public']['Tables']['letters']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type EmployeeCoupon = Database['public']['Tables']['employee_coupons']['Row']
export type Commission = Database['public']['Tables']['commissions']['Row']
export type LetterAuditTrail = Database['public']['Tables']['letter_audit_trail']['Row']

// Letter Status Types
export type LetterStatus = Letter['status']
export const LETTER_STATUSES = [
  'draft',
  'generating',
  'pending_review',
  'under_review',
  'approved',
  'completed',
  'rejected',
  'failed'
] as const satisfies LetterStatus[]

// User Role Types
export type UserRole = Profile['role']
export const USER_ROLES = ['subscriber', 'employee', 'admin'] as const satisfies UserRole[]

// API Route Handler Types
export interface RouteContext<TParams = Record<string, string>> {
  params: Promise<TParams>
}

// Letter Generation Types
export interface LetterGenerationRequest {
  recipientName: string
  recipientAddress: string
  subject: string
  tone: 'formal' | 'friendly' | 'urgent'
  content: string
  additionalDetails?: string
}

export interface LetterGenerationResponse {
  letterId: string
  status: LetterStatus
  aiDraft: string
}

// Admin Review Types
export interface AdminReviewRequest {
  adminContent?: string
  notes?: string
  action: 'approve' | 'reject' | 'improve'
}

export interface AdminReviewResponse {
  letterId: string
  status: LetterStatus
  adminContent?: string
  notes?: string
}

// Auth Types
export interface AuthUser {
  id: string
  email?: string
  role?: UserRole
  isSuperUser?: boolean
}

export interface AdminSession {
  email: string
  expiresAt: number
}

// Payment Types
export interface CheckoutRequest {
  planId: string
  couponCode?: string
}

export interface CheckoutResponse {
  checkoutUrl: string
  sessionId: string
}

// Rate Limiting Types
export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  message?: string
}

export interface RateLimitResult {
  limited: boolean
  resetTime?: number
  remaining?: number
}

// Supabase Query Result Types
export type SupabaseResult<T> = {
  data: T | null
  error: Error | null
}

export type SupabaseSuccessResult<T> = {
  data: T
  error: null
}

export type SupabaseErrorResult = {
  data: null
  error: Error
}

// Type Guards
export function isSupabaseError<T>(result: SupabaseResult<T>): result is SupabaseErrorResult {
  return result.error !== null
}

export function isSupabaseSuccess<T>(result: SupabaseResult<T>): result is SupabaseSuccessResult<T> {
  return result.error === null && result.data !== null
}

// Environment Variable Types
export interface EnvConfig {
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  SUPABASE_SERVICE_ROLE_KEY: string
  OPENAI_API_KEY: string
  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  ADMIN_EMAIL: string
  ADMIN_PASSWORD: string
  ADMIN_PORTAL_KEY: string
  NEXT_PUBLIC_APP_URL?: string
}

// API Handler Types
export type ApiHandler<TRequest = unknown, TResponse = unknown> = (
  request: NextRequest,
  context?: RouteContext
) => Promise<NextResponse<ApiResponse<TResponse>>>

// Validation Types
export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult<T = unknown> {
  isValid: boolean
  data?: T
  errors?: ValidationError[]
}