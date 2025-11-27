export type UserRole = 'subscriber' | 'employee' | 'admin'
export type LetterStatus =
  | 'draft'
  | 'generating'
  | 'pending_review'
  | 'under_review'
  | 'approved'
  | 'completed'
  | 'rejected'
  | 'failed'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due'
export type CommissionStatus = 'pending' | 'paid'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  is_super_user: boolean
  phone: string | null
  company_name: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

export interface Letter {
  id: string
  user_id: string
  title: string
  letter_type: string
  status: LetterStatus
  recipient_name: string | null
  recipient_address: string | null
  subject: string | null
  content: string | null
  intake_data: Record<string, any>
  ai_draft_content: string | null
  final_content: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  review_notes: string | null
  rejection_reason: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
  sent_at: string | null
  notes: string | null
}

export interface Subscription {
  id: string
  user_id: string
  plan: string
  status: SubscriptionStatus
  price: number
  discount: number
  coupon_code: string | null
  employee_id: string | null
  created_at: string
  updated_at: string
  expires_at: string | null
}

export interface EmployeeCoupon {
  id: string
  employee_id: string
  code: string
  discount_percent: number
  is_active: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

export interface Commission {
  id: string
  user_id: string
  employee_id: string
  subscription_id: string
  subscription_amount: number
  commission_rate: number
  commission_amount: number
  status: CommissionStatus
  created_at: string
  updated_at: string
  paid_at: string | null
}

export interface LetterAuditTrail {
  id: string
  letter_id: string
  performed_by: string
  action: string
  old_status: string | null
  new_status: string | null
  notes: string | null
  created_at: string
}

export interface SecurityAuditLog {
  id: string
  user_id: string | null
  action: string
  details: Record<string, any> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface SecurityConfig {
  id: string
  key: string
  value: string | null
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CouponUsage {
  id: string
  coupon_id: string
  user_id: string
  subscription_id: string
  discount_amount: number
  created_at: string
}
