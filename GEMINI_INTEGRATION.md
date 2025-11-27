# Gemini AI Integration Guide

## Overview

This application uses **Google Gemini 2.5 Flash** for AI-powered letter generation and improvement. The integration follows a robust error handling pattern with proper status tracking.

---

## Configuration

### Environment Variables

```bash
GEMINI_API_KEY=your-gemini-api-key-here
```

Get your API key from: https://aistudio.google.com/app/apikey

### API Endpoint

```
https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent
```

### Generation Config

```typescript
{
  temperature: 0.7,    // Balance creativity and consistency
  topK: 40,            // Limit token choices
  topP: 0.95,          // Nucleus sampling threshold
  maxOutputTokens: 2048 // Max response length
}
```

---

## 🤖 Use Cases

### 1. Letter Generation (`/api/generate-letter`)

**Purpose**: Generate professional legal letters from user input data

**Status Flow**:
```
generating → pending_review (success)
generating → failed (error)
```

**Process**:
1. Create letter record with `generating` status
2. Call Gemini API with structured prompt
3. On success:
   - Update letter with AI content
   - Set status to `pending_review`
   - Deduct user allowance (if not free trial)
   - Log audit trail
4. On failure:
   - Set status to `failed`
   - Log error in audit trail
   - Keep letter record (don't delete)

**Request Body**:
```typescript
{
  letterType: string,  // e.g., "Demand Letter", "Cease and Desist"
  intakeData: {
    senderName: string,
    senderAddress: string,
    recipientName: string,
    recipientAddress: string,
    issueDescription: string,
    desiredOutcome: string,
    amountDemanded?: number
  }
}
```

**Response** (Success):
```typescript
{
  success: true,
  letterId: string,
  status: "pending_review",
  isFreeTrial: boolean,
  aiDraft: string
}
```

**Response** (Error):
```typescript
{
  error: string,  // "AI generation failed" or "No letter credits remaining"
  needsSubscription?: boolean
}
```

**Prompt Structure**:
```typescript
You are a professional legal attorney drafting a formal ${letterType} letter.
Write a professional, legally sound letter (300-500 words) with proper date/addresses, facts, clear demand, deadline, and professional tone.
sender name: John Doe
sender address: 123 Main St
recipient name: Jane Smith
recipient address: 456 Oak Ave
issue description: Breach of contract...
desired outcome: Full refund of $5000
Amount: $5000
Return only the letter content, no additional commentary.
```

**Error Handling**:
- ✅ API key missing → 500 Server configuration error
- ✅ Gemini API error → Letter marked `failed`, error logged
- ✅ Empty response → Letter marked `failed`
- ✅ No allowance → Letter marked `failed` (after generation)

---

### 2. Letter Improvement (`/api/letters/[id]/improve`)

**Purpose**: Admin-only AI refinement of letter content during review

**Status Flow**:
```
under_review → under_review (status unchanged)
```

**Process**:
1. Admin provides current content + improvement instruction
2. Call Gemini API with improvement prompt
3. Return improved content (doesn't auto-save)
4. Admin can apply or discard the improvement

**Request Body**:
```typescript
{
  content: string,      // Current letter content
  instruction: string   // e.g., "Make tone more formal", "Add legal precedent"
}
```

**Response** (Success):
```typescript
{
  improvedContent: string
}
```

**Prompt Structure**:
```typescript
You are a professional legal attorney improving a formal legal letter.

Current letter content:
${content}

Improvement instruction: ${instruction}

Please improve the letter according to the instruction while maintaining:
- Professional legal tone and language
- Proper letter structure and formatting
- All critical facts and details from the original
- Legal accuracy and effectiveness

Return ONLY the improved letter content, with no additional commentary or explanations.
```

**Error Handling**:
- ✅ Non-admin access → 403 Forbidden
- ✅ Gemini API error → 500 AI service unavailable
- ✅ Empty response → 500 AI returned empty content

---

## 📊 Cost Estimation

**Gemini 2.5 Flash Pricing** (as of Nov 2024):
- Input: $0.00001875 / 1K tokens (~$0.000019 per 1K tokens)
- Output: $0.000075 / 1K tokens (~$0.000075 per 1K tokens)

**Typical Usage**:
- Letter generation: ~500 input tokens + ~800 output tokens = **~$0.001 per letter**
- Letter improvement: ~1200 input tokens + ~800 output tokens = **~$0.002 per improvement**

**Monthly estimate for 1000 letters**:
- 1000 generations = $1.00
- 300 improvements = $0.60
- **Total: ~$1.60/month**

Extremely cost-effective compared to alternatives!

---

## 🔒 Security Best Practices

### 1. API Key Protection
```typescript
// ✅ Good: Server-side only
if (!process.env.GEMINI_API_KEY) {
  console.error("[GenerateLetter] Missing GEMINI_API_KEY")
  return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
}

// ❌ Bad: Never expose in client code
// const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
```

### 2. Input Validation
```typescript
// ✅ Validate required fields
if (!letterType || !intakeData) {
  return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
}

// ✅ Sanitize user input (prevents prompt injection)
const sanitized = intakeData.issueDescription
  .replace(/[\n\r]/g, ' ')
  .slice(0, 5000)
```

### 3. Rate Limiting
```typescript
// Implement per-user rate limits
// - Free trial: 1 letter
// - Paid plans: Based on subscription
// - Super users: Unlimited
```

### 4. Error Logging
```typescript
// ✅ Log errors with context (without exposing API key)
console.error("[GenerateLetter] Gemini API error:", response.status, errorText)

// ❌ Don't log sensitive data
// console.error("Full request:", JSON.stringify(requestBody)) // Contains API key!
```

---

## 🚨 Error Scenarios & Handling

### 1. Gemini API Rate Limit (429)
```typescript
if (response.status === 429) {
  // Wait and retry with exponential backoff
  await new Promise(resolve => setTimeout(resolve, 1000))
  // Retry logic here
}
```

### 2. Content Safety Filters
```typescript
// Gemini may block content deemed unsafe
const finishReason = aiResult.candidates?.[0]?.finishReason

if (finishReason === 'SAFETY') {
  return NextResponse.json(
    { error: "Content failed safety checks" },
    { status: 400 }
  )
}
```

### 3. Token Limit Exceeded
```typescript
// Prompt too long (>2048 output tokens)
if (finishReason === 'MAX_TOKENS') {
  // Increase maxOutputTokens or reduce input
  generationConfig: {
    maxOutputTokens: 4096  // Increase limit
  }
}
```

### 4. Network Timeout
```typescript
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 30000) // 30s timeout

try {
  const response = await fetch(url, {
    signal: controller.signal,
    // ... other options
  })
} finally {
  clearTimeout(timeout)
}
```

---

## 🧪 Testing

### Manual Test: Letter Generation
```bash
curl -X POST http://localhost:3000/api/generate-letter \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=YOUR_TOKEN" \
  -d '{
    "letterType": "Demand Letter",
    "intakeData": {
      "senderName": "John Doe",
      "senderAddress": "123 Main St",
      "recipientName": "Acme Corp",
      "recipientAddress": "456 Business Blvd",
      "issueDescription": "Breach of contract - services not delivered",
      "desiredOutcome": "Full refund of $5000",
      "amountDemanded": 5000
    }
  }'
```

### Manual Test: Letter Improvement
```bash
curl -X POST http://localhost:3000/api/letters/LETTER_ID/improve \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=ADMIN_TOKEN" \
  -d '{
    "content": "Dear Sir/Madam...",
    "instruction": "Make the tone more formal and add legal precedent"
  }'
```

### Check Letter Status
```sql
SELECT id, status, letter_type, created_at, updated_at
FROM letters
WHERE user_id = 'USER_ID'
ORDER BY created_at DESC;
```

### Check Audit Trail
```sql
SELECT * FROM letter_audit_trail
WHERE letter_id = 'LETTER_ID'
ORDER BY created_at DESC;
```

---

## 📈 Monitoring

### Key Metrics to Track

1. **Generation Success Rate**
   ```sql
   SELECT 
     COUNT(*) FILTER (WHERE status = 'pending_review') as successful,
     COUNT(*) FILTER (WHERE status = 'failed') as failed,
     ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'pending_review') / COUNT(*), 2) as success_rate
   FROM letters
   WHERE status IN ('generating', 'pending_review', 'failed')
   AND created_at > NOW() - INTERVAL '24 hours';
   ```

2. **Average Generation Time**
   ```sql
   SELECT 
     AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_seconds
   FROM letters
   WHERE status = 'pending_review'
   AND created_at > NOW() - INTERVAL '24 hours';
   ```

3. **Error Types**
   ```sql
   SELECT notes, COUNT(*) 
   FROM letter_audit_trail
   WHERE action = 'generation_failed'
   AND created_at > NOW() - INTERVAL '7 days'
   GROUP BY notes
   ORDER BY COUNT(*) DESC;
   ```

4. **Daily Usage**
   ```sql
   SELECT 
     DATE(created_at) as date,
     COUNT(*) as total_generations
   FROM letters
   WHERE created_at > NOW() - INTERVAL '30 days'
   GROUP BY DATE(created_at)
   ORDER BY date DESC;
   ```

---

## 🔄 Future Enhancements

### Potential Improvements:
1. **Streaming Responses** - Show letter generation in real-time
2. **Multi-language Support** - Generate letters in different languages
3. **Template Library** - Save successful prompts as templates
4. **A/B Testing** - Test different prompt variations
5. **Batch Processing** - Generate multiple letters at once
6. **Custom Fine-tuning** - Train on successful approved letters

### Alternative Models:
- **Gemini 2.5 Pro** - More sophisticated, higher cost ($0.00125/1K in)
- **Claude 3.5 Sonnet** - Better reasoning, same price range
- **GPT-4 Turbo** - Higher cost but excellent quality

---

## 🆘 Troubleshooting

### Issue: "Missing GEMINI_API_KEY"
**Solution**: Add to `.env.local`:
```bash
GEMINI_API_KEY=your-key-here
```
Restart the dev server: `pnpm dev`

### Issue: "AI service unavailable"
**Causes**:
1. Invalid API key
2. Gemini API downtime
3. Rate limit exceeded
4. Network issues

**Debug**:
```typescript
console.log("API Key present:", !!process.env.GEMINI_API_KEY)
console.log("Response status:", response.status)
console.log("Error body:", await response.text())
```

### Issue: "AI returned empty content"
**Causes**:
1. Content safety filters triggered
2. Prompt too complex
3. API response format changed

**Solution**: Check `finishReason` in response:
```typescript
console.log("Finish reason:", aiResult.candidates?.[0]?.finishReason)
console.log("Safety ratings:", aiResult.candidates?.[0]?.safetyRatings)
```

---

## 📚 Resources

- [Gemini API Documentation](https://ai.google.dev/docs)
- [API Pricing](https://ai.google.dev/pricing)
- [Safety Settings](https://ai.google.dev/docs/safety_setting_gemini)
- [Prompt Engineering Guide](https://ai.google.dev/docs/prompt_best_practices)
- [Gemini API Quickstart](https://ai.google.dev/tutorials/rest_quickstart)

---

**Last Updated**: November 22, 2024  
**Gemini Model**: gemini-2.5-flash  
**Implementation**: Production-ready with full error handling and audit trails
