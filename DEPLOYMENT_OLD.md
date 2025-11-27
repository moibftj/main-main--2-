# Deployment Guide

## Prerequisites

1. Supabase account and project
2. Vercel account (recommended) or any Next.js hosting provider

## Step 1: Database Setup

1. Create a new Supabase project at https://supabase.com
2. Go to the SQL Editor in your Supabase dashboard
3. Run the following scripts in order:
   - `scripts/001_setup_schema.sql`
   - `scripts/002_setup_rls.sql`
   - `scripts/003_seed_data.sql` (optional, for dev data)

## Step 2: Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

\`\`\`bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000
\`\`\`

Get these values from your Supabase project settings.

## Step 3: Local Development

\`\`\`bash
npm install
npm run dev
\`\`\`

Visit http://localhost:3000

## Step 4: Create First Admin User

1. Sign up through the UI with your admin email
2. Go to your Supabase SQL Editor
3. Run this query (replace with your email):

\`\`\`sql
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your-admin-email@example.com';
\`\`\`

## Step 5: Deploy to Vercel

1. Push your code to GitHub
2. Import project to Vercel
3. Add environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL=https://talk-to-my-lawyer.com`
   - `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000`
   - `GEMINI_API_KEY`
4. Deploy

## Step 6: Configure Supabase Auth

In your Supabase project:

1. Go to Authentication > URL Configuration
2. Add `https://talk-to-my-lawyer.com` to Site URL
3. Add redirect URLs:
   - `https://talk-to-my-lawyer.com/auth/callback`
   - `https://talk-to-my-lawyer.com/dashboard`

## Testing Roles

### Test as Subscriber
1. Sign up with a new email
2. Choose "Subscriber" as account type
3. Confirm email
4. Access: /dashboard/letters

### Test as Employee
1. Sign up with a different email
2. Choose "Employee" as account type
3. Confirm email
4. Access: /dashboard/commissions
5. Note: Should NOT be able to access /dashboard/letters

### Test as Admin
1. Update a user to admin role via SQL
2. Access: /dashboard/admin/letters

## Security Verification

Run these checks to ensure security is working:

1. **Employee Isolation**: Log in as employee, try to access /dashboard/letters - should redirect
2. **RLS Check**: Employee should not see any letters in database queries
3. **Commission Access**: Employees should only see their own commissions
4. **Admin Access**: Only admins should access /dashboard/admin routes

## Troubleshooting

### Email Confirmation Issues
- Check Supabase email settings
- Verify redirect URLs are configured
- Check spam folder for confirmation emails

### RLS Policy Errors
- Ensure all policies were applied correctly
- Check that `auth.get_user_role()` function exists
- Verify user has confirmed their email

### Middleware Not Working
- Clear cookies and try again
- Check middleware.ts is in root directory
- Verify Supabase client is properly configured

## Production Checklist

- [ ] Database migrations run successfully
- [ ] RLS policies enabled on all tables
- [ ] Admin user created
- [ ] Environment variables set in production
- [ ] Auth redirect URLs configured
- [ ] Email templates customized (optional)
- [ ] Test all three user roles
- [ ] Verify employee cannot access letters
- [ ] Test subscription flow with coupon codes
- [ ] Test commission tracking
- [ ] Test letter review workflow

## Monitoring

Monitor your application using:
- Supabase Dashboard: Database logs, auth events
- Vercel Analytics: Performance and usage metrics
- Check `/dashboard/admin/users` for user statistics

## Support

For issues:
1. Check the logs in Vercel and Supabase dashboards
2. Verify environment variables are set correctly
3. Ensure database migrations completed successfully
4. Review the README.md for feature documentation
