# Manual QA Testing Script

## 🧪 Complete End-to-End Testing Guide

### Setup Requirements
- [x] Environment variables configured
- [x] Database scripts executed in order
- [x] Development server running
- [x] Test user accounts ready

---

## 📋 Test Case 1: New User Registration & Free Trial

### Steps:
1. **Navigate to signup page**
   - Go to `/auth/signup`
   - Verify page loads correctly
   - Check all form fields are present

2. **Create new subscriber account**
   - Fill in email, password, full name
   - Submit form
   - Verify successful registration
   - Check email verification flow

3. **Login and verify dashboard**
   - Login with new credentials
   - Verify redirect to `/dashboard/letters`
   - Check welcome message displays correctly
   - Verify "Create New Letter" CTA is present

4. **Create first letter (free trial)**
   - Click "Create New Letter"
   - Fill intake form with valid data
   - Submit form
   - Verify AI generation starts
   - Check status changes: `draft → generating → pending_review`

5. **Verify pricing overlay**
   - Navigate back to letters list
   - Check that free trial letter shows with "Free Trial" badge
   - Verify pricing overlay is displayed for subsequent letters
   - Check "Upgrade Plan" CTA functionality

### Expected Results:
- ✅ Free trial letter generated successfully
- ✅ User prompted to upgrade for additional letters
- ✅ Dashboard shows correct status and messaging

---

## 📋 Test Case 2: Subscription Purchase & Letter Generation

### Steps:
1. **Navigate to subscription page**
   - From dashboard, go to `/dashboard/subscription`
   - Verify subscription plans display correctly
   - Check pricing: $299, $299, $599

2. **Test coupon code functionality**
   - Enter test employee coupon code
   - Verify 20% discount applied
   - Check final price calculation

3. **Complete subscription purchase**
   - Select "4 Letters Bundle" plan
   - Proceed through checkout flow
   - Verify subscription activation (simulate success)

4. **Generate additional letters**
   - Navigate to letter creation
   - Create second letter using allowance
   - Verify letter credits decrease from 4 to 3
   - Check unlimited access for TALK3 users

5. **Test letter management**
   - View all letters in dashboard
   - Check status badges and formatting
   - Verify PDF download works for approved letters
   - Test email sending functionality

### Expected Results:
- ✅ Subscription activated successfully
- ✅ Letter allowance tracking works correctly
- ✅ PDF generation and email delivery functional

---

## 📋 Test Case 3: Admin Review Workflow

### Steps:
1. **Create admin account**
   - Register new user
   - Promote to admin via database: `UPDATE profiles SET role = 'admin' WHERE email = 'admin@test.com'`
   - Login as admin

2. **Access admin dashboard**
   - Verify redirect to `/dashboard/admin`
   - Check all admin navigation options
   - Verify analytics display correctly

3. **Review pending letters**
   - Navigate to `/dashboard/admin/letters`
   - Check review queue displays pending letters
   - Verify letter details and user information

4. **Test AI improvement feature**
   - Open review modal for a pending letter
   - Click "Improve with AI"
   - Enter improvement instruction
   - Verify AI enhancement works correctly
   - Apply improvement to letter

5. **Approve/reject workflow**
   - Test approval: Set status to approved, add notes
   - Test rejection: Provide rejection reason
   - Verify audit trail logging
   - Check email notifications (simulated)

6. **Verify user experience**
   - Login as subscriber
   - Check letter status updates
   - Verify approved letters available for download
   - Test rejected letters show appropriate messaging

### Expected Results:
- ✅ Admin review workflow fully functional
- ✅ AI improvement enhances letter quality
- ✅ Audit trail captures all changes
- ✅ Users receive timely status updates

---

## 📋 Test Case 4: Employee Coupon & Commission System

### Steps:
1. **Create employee account**
   - Register new user
   - Promote to employee: `UPDATE profiles SET role = 'employee' WHERE email = 'employee@test.com'`
   - Login as employee

2. **Verify coupon auto-generation**
   - Navigate to `/dashboard/coupons`
   - Check unique coupon code (EMP-XXXXXX format)
   - Verify 20% discount display
   - Test copy code and referral link functionality

3. **Test coupon sharing and usage**
   - Share employee coupon code with subscriber
   - Use code during subscription purchase
   - Verify discount applied correctly
   - Check commission tracking

4. **Monitor commissions dashboard**
   - Navigate to `/dashboard/commissions`
   - Verify commission amount (5% of subscription)
   - Check points earned (1 per use)
   - Verify usage statistics

5. **Test admin commission management**
   - Login as admin
   - Navigate to `/dashboard/admin/commissions`
   - Verify all commissions listed
   - Test "Mark Paid" functionality
   - Check commission analytics

### Expected Results:
- ✅ Employee coupons auto-generated
- ✅ Commission tracking accurate (5% + 1 point)
- ✅ Admin payout management functional
- ✅ Usage statistics properly calculated

---

## 📋 Test Case 5: Security & Access Control

### Steps:
1. **Test role-based access control**
   - Try accessing admin routes as subscriber
   - Try accessing employee routes as subscriber
   - Try accessing letter content as employee
   - Verify all unauthorized access attempts are blocked

2. **Test data isolation**
   - Verify subscribers can only see their own letters
   - Check employees can only see their own commissions
   - Test admin access to all data
   - Verify RLS policies working correctly

3. **Test authentication security**
   - Test session management
   - Verify password requirements
   - Check email verification flow
   - Test logout and session expiration

4. **Test input validation**
   - Try submitting invalid form data
   - Test SQL injection protection
   - Verify XSS prevention
   - Check file upload restrictions

### Expected Results:
- ✅ Role-based access control working
- ✅ Data isolation properly enforced
- ✅ Authentication and authorization secure
- ✅ Input validation and sanitization effective

---

## 📋 Test Case 6: Error Handling & Edge Cases

### Steps:
1. **Test network failures**
   - Disconnect network during letter generation
   - Verify graceful error handling
   - Check retry mechanisms

2. **Test AI service failures**
   - Mock Gemini API failure
   - Verify error message display
   - Check fallback behavior

3. **Test database constraints**
   - Try creating duplicate coupons
   - Test invalid subscription data
   - Verify constraint violations handled

4. **Test edge cases**
   - Very long letter content
   - Special characters in forms
   - Concurrent user operations
   - Rate limiting effectiveness

### Expected Results:
- ✅ All errors handled gracefully
- ✅ User-friendly error messages
- ✅ System stability maintained
- ✅ No data corruption or loss

---

## 📋 Test Case 7: Performance & Scalability

### Steps:
1. **Test page load performance**
   - Measure dashboard load times
   - Check PDF generation speed
   - Test API response times

2. **Test concurrent usage**
   - Simulate multiple users generating letters
   - Test admin review queue performance
   - Check database query efficiency

3. **Test resource limits**
   - Test large letter content handling
   - Check file upload size limits
   - Verify database connection pooling

### Expected Results:
- ✅ Acceptable page load times (<3 seconds)
- ✅ Efficient database queries
- ✅ No memory leaks or performance degradation
- ✅ Scales under moderate load

---

## ✅ Final Acceptance Criteria

### Must Pass:
- [ ] All user registration flows working
- [ ] Free trial system functional
- [ ] Subscription purchase and management working
- [ ] AI letter generation and admin review complete
- [ ] Employee coupon and commission system functional
- [ ] Security and access control properly implemented
- [ ] Error handling comprehensive and user-friendly
- [ ] Performance meets acceptable standards

### Nice to Have:
- [ ] Mobile responsive design tested
- [ ] Accessibility standards met
- [ ] Browser compatibility verified
- [ ] Analytics and reporting accurate

---

## 🚨 Known Issues & Limitations

1. **Email Service**: Currently simulated - requires real SMTP configuration
2. **Rate Limiting**: Application-level rate limiting needs implementation
3. **Payment Processing**: Stripe integration requires production configuration
4. **File Storage**: PDF storage strategy needs production decision
5. **Monitoring**: Additional monitoring tools recommended for production

---

## 📝 Test Results Summary

| Test Case | Status | Notes |
|-----------|--------|-------|
| User Registration & Free Trial | [ ] | |
| Subscription Purchase | [ ] | |
| Admin Review Workflow | [ ] | |
| Employee Commission System | [ ] | |
| Security & Access Control | [ ] | |
| Error Handling | [ ] | |
| Performance | [ ] | |

---

**Last Updated**: [Date]
**Tester**: [Name]
**Environment**: [Development/Staging/Production]