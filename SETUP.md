# Talk-To-My-Lawyer Setup Guide

## Prerequisites

1. **Supabase Project**
   - Create a new project at [supabase.com](https://supabase.com)
   - Note your project URL and anon key from Settings > API

2. **Environment Variables**
   - Required variables are listed in `.env.example`

## Step 1: Configure Environment Variables

Add the following environment variables in the **Vars** section of the v0 sidebar:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
\`\`\`

You can find these values in your Supabase dashboard:
- Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
- Select your project
- Navigate to Settings > API
- Copy the "Project URL" and "anon/public" key

## Step 2: Run Database Scripts

Execute the SQL scripts in order to set up your database:

1. `scripts/001_setup_schema.sql` - Creates tables and types
2. `scripts/002_setup_rls.sql` - Sets up Row Level Security policies
3. `scripts/003_seed_data.sql` - Adds initial data (optional)
4. `scripts/004_create_functions.sql` - Creates database functions

You can run these scripts directly in v0 or in your Supabase SQL editor.

## Step 3: Configure Authentication

In your Supabase dashboard:

1. Go to Authentication > Email Templates
2. Customize the confirmation email template if needed
3. Set up email provider (or use Supabase's default)

## Step 4: Test the Application

1. Visit the homepage
2. Click "Get Started" to create an account
3. Choose your role (Subscriber or Employee)
4. Complete signup and verify your email

## User Roles

### Subscriber
- Create and manage legal letters
- View letter status and history
- Manage subscriptions
- Access: `/dashboard/letters`

### Employee
- View commission earnings
- Track coupon redemptions
- Share referral codes
- Access: `/dashboard/commissions`
- **Cannot access**: Letter content (blocked by RLS)

### Admin
- Review and approve letters
- Manage users and subscriptions
- Process commission payouts
- Access: `/dashboard/admin/*`

## Troubleshooting

### Error: "Missing Supabase environment variables"

Make sure you've added both:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

These must be added in the Vars section of v0, not in a .env file.

### RLS Policy Issues

If users can't access their data:
1. Check that the user's profile exists in the `profiles` table
2. Verify the `role` field is set correctly
3. Check the `user_roles` table for proper role assignment

### Authentication Issues

1. Verify email confirmation is working
2. Check Supabase Auth logs in the dashboard
3. Ensure `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` is set for development

## Security Notes

- Employees are **completely blocked** from accessing letter content via RLS policies
- All sensitive operations require authentication
- Role checks happen at both middleware and database levels
- Service role key should never be exposed to the client
