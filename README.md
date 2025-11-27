# Talk-To-My-Lawyer - Legal Letter Generation Platform

A production-ready SaaS platform for generating legal letters with AI assistance and attorney review. Built with Next.js 16, Supabase, and OpenAI GPT-4.

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL), Next.js API Routes
- **AI**: OpenAI GPT-4 for letter generation and improvement
- **Authentication**: Supabase Auth with role-based access control
- **Database**: PostgreSQL with comprehensive RLS policies
- **Deployment**: Vercel-ready with CI/CD support

### User Roles
1. **Subscriber**: Creates and manages legal letters
2. **Employee**: Manages coupon codes and earns commissions
3. **Admin**: Reviews letters, manages users and commissions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account and project
- OpenAI API key

### Installation

1. **Clone and install dependencies**
```bash
git clone <repository-url>
cd talk-to-my-lawyer
npm install
```

2. **Configure environment variables**
```bash
cp .env.example .env.local
# Fill in your environment variables
```

3. **Set up database**
```bash
# Run SQL scripts in order against your Supabase project
supabase db push scripts/001_setup_schema.sql
supabase db push scripts/002_setup_rls.sql
supabase db push scripts/003_seed_data.sql
supabase db push scripts/004_create_functions.sql
supabase db push scripts/005_letter_allowance_system.sql
supabase db push scripts/006_audit_trail.sql
supabase db push scripts/007_add_missing_letter_statuses.sql
supabase db push scripts/008_employee_coupon_auto_generation.sql
supabase db push scripts/009_add_missing_subscription_fields.sql
supabase db push scripts/010_add_missing_functions.sql
supabase db push scripts/011_security_hardening.sql
```

4. **Start development server**
```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 📋 Environment Variables

Required environment variables (see `.env.example`):

```bash
# Base URLs
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Configuration
OPENAI_API_KEY=your-openai-api-key

# Security
CRON_SECRET=your-cron-secret-key
```

## 💳 Pricing Model

- **Single Letter**: $299 (one-time)
- **Monthly Plan**: $299/month (4 letters)
- **Yearly Plan**: $599/year (8 letters)

## 👥 User Flow

### Subscriber Journey
1. **Free Trial**: First letter is free with AI generation
2. **Subscription Purchase**: Choose plan via Stripe checkout
3. **Letter Creation**: Fill intake form, AI generates draft
4. **Attorney Review**: Admin reviews and improves with AI assistance
5. **Delivery**: Download PDF or send via email

### Employee Journey
1. **Coupon Assignment**: Auto-generated unique coupon code
2. **Sharing**: Distribute 20% discount codes to potential customers
3. **Commission**: Earn 5% on each successful subscription
4. **Tracking**: Monitor usage, earnings, and points

### Admin Journey
1. **Letter Review**: Review and approve/reject subscriber letters
2. **AI Improvement**: Use OpenAI GPT-4 to enhance letter quality
3. **User Management**: Manage subscribers, employees, and roles
4. **Commission Management**: Track and process employee commissions
5. **Analytics**: Monitor platform usage and revenue

## 🔒 Security Features

- **Row Level Security**: Complete data isolation between roles
- **Employee Isolation**: Employees cannot access any letter content
- **Audit Trail**: Complete logging of all letter status changes
- **Input Validation**: Comprehensive data sanitization and validation
- **API Security**: Authentication on all endpoints, proper error handling
- **Environment Security**: Proper secrets management and configuration

## 📊 Key Features

### Core Functionality
- ✅ AI-powered letter generation (OpenAI GPT-4)
- ✅ Professional attorney review and AI improvement
- ✅ PDF generation and email delivery
- ✅ Complete audit trail and logging
- ✅ Role-based dashboards and access control

### Business Features
- ✅ Free trial system
- ✅ Subscription management with Stripe
- ✅ Employee coupon and commission system
- ✅ Monthly letter allowance tracking
- ✅ Comprehensive analytics and reporting

### Technical Features
- ✅ TypeScript throughout
- ✅ Responsive design with Tailwind CSS
- ✅ Database functions and triggers
- ✅ Security hardening and best practices
- ✅ Production-ready deployment setup

## 🗄️ Database Schema

### Main Tables
- `profiles`: User accounts with roles
- `letters`: Legal letters with status tracking
- `subscriptions`: User subscriptions and credits
- `employee_coupons`: Employee discount codes
- `commissions`: Employee earnings tracking
- `letter_audit_trail`: Complete audit logging

### Key Functions
- `deduct_letter_allowance`: Manage letter credits
- `add_letter_allowances`: Add credits on subscription
- `reset_monthly_allowances`: Monthly credit reset
- `log_letter_audit`: Audit trail logging
- `validate_coupon`: Coupon validation

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. **Connect to Vercel**
```bash
npm i -g vercel
vercel
```

2. **Configure Environment Variables**
Add all required environment variables to Vercel dashboard

3. **Deploy**
```bash
vercel --prod
```

### Manual Deployment

1. **Build application**
```bash
npm run build
```

2. **Start production server**
```bash
npm start
```

## 🔄 Cron Jobs

Set up monthly subscription reset:

```bash
# Add to your cron tab (runs 1st of each month at midnight UTC)
0 0 1 * * curl -X POST https://your-domain.com/api/subscriptions/reset-monthly \
  -H "Authorization: Bearer $CRON_SECRET"
```

## 📈 Monitoring & Analytics

- **User Analytics**: Track registration, subscription, and usage metrics
- **Revenue Analytics**: Monitor subscription revenue and commission payouts
- **Letter Analytics**: Track letter generation, approval rates, and types
- **Security Monitoring**: Comprehensive audit trail and security event logging

## 🛠️ Development

### Database Migrations
All database changes are managed through SQL scripts in the `scripts/` directory. Scripts must be run in numerical order.

### Adding New Features
1. Follow the established patterns in existing components
2. Ensure proper RLS policies for any new tables
3. Add comprehensive error handling and logging
4. Update audit trails for any status changes
5. Test with all user roles (subscriber, employee, admin)

### Code Quality
- TypeScript for type safety
- Comprehensive error handling
- Security-first development approach
- Responsive design principles
- Performance optimization

## 🤝 Support

For technical support or questions:
- Review the comprehensive documentation in the `/docs` directory
- Check the security checklist for security-related questions
- Monitor audit logs for troubleshooting user issues

---

**Built with ❤️ for democratizing access to professional legal services.**