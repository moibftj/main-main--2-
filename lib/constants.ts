export const LETTER_TYPES = [
  { 
    value: 'demand_letter', 
    label: 'Demand Letter', 
    description: 'Formal demand for payment or action' 
  },
  { 
    value: 'cease_desist', 
    label: 'Cease and Desist', 
    description: 'Stop harmful or illegal activity' 
  },
  { 
    value: 'contract_breach', 
    label: 'Contract Breach Notice', 
    description: 'Notify of contract violation' 
  },
  { 
    value: 'eviction_notice', 
    label: 'Eviction Notice', 
    description: 'Legal notice to vacate property' 
  },
  { 
    value: 'employment_dispute', 
    label: 'Employment Dispute', 
    description: 'Workplace issue resolution' 
  },
  { 
    value: 'consumer_complaint', 
    label: 'Consumer Complaint', 
    description: 'Product or service complaint' 
  }
]

export const SUBSCRIPTION_PLANS = {
  single: {
    name: 'Single Letter',
    price: 299,
    description: 'One-time purchase',
    features: [
      '1 Professional Letter',
      'AI-Powered Generation',
      'Attorney Review',
      'PDF Download'
    ]
  },
  monthly: {
    name: 'Monthly Plan',
    price: 299,
    description: '4 letters per month',
    features: [
      '4 Letters Monthly',
      'AI-Powered Generation',
      'Attorney Review',
      'Priority Support',
      'Email Delivery',
      'Cancel Anytime'
    ]
  },
  annual: {
    name: 'Annual Plan',
    price: 599,
    description: '8 letters per year',
    features: [
      '8 Letters Annually',
      'AI-Powered Generation',
      'Attorney Review',
      'Priority Support',
      'Email Delivery',
      'Best Value'
    ]
  }
}

export const LETTER_STATUS_COLORS = {
  draft: 'bg-slate-100 text-slate-800',
  submitted: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800'
}

export const COMMISSION_RATE = 0.05 // 5%
export const EMPLOYEE_DISCOUNT = 20 // 20%
