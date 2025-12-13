import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import sgMail from '@sendgrid/mail'
import { jsPDF } from 'jspdf'

type LetterRecord = {
  id: string
  title: string
  status: string
  final_content: string | null
  ai_draft_content: string | null
  created_at: string
  profiles?: {
    full_name?: string | null
    email?: string | null
  } | null
}

const sendgridApiKey = process.env.SENDGRID_API_KEY
const firmFromEmail = process.env.EMAIL_FROM || process.env.SENDGRID_FROM
const firmFromName = process.env.EMAIL_FROM_NAME || 'Talk-To-My-Lawyer Legal Team'

if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey)
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-z0-9]/gi, '_') || 'letter'
}

function buildLetterPdf(letter: LetterRecord, note?: string) {
  const doc = new jsPDF()
  const margin = 20
  const content = letter.final_content || letter.ai_draft_content || 'No letter content available.'
  const senderName = letter.profiles?.full_name || 'Your attorney'
  const createdDate = new Date(letter.created_at).toLocaleDateString()

  doc.setFontSize(16)
  doc.text(letter.title, margin, 20)
  doc.setFontSize(11)
  doc.text(`Prepared by: ${senderName}`, margin, 30)
  doc.text(`Date: ${createdDate}`, margin, 38)

  const introLines = doc.splitTextToSize(
    note || 'Please find the approved legal letter attached for your records.',
    170
  )
  doc.text(introLines, margin, 50)

  doc.setFontSize(13)
  doc.text('Letter Content', margin, 70)
  doc.setFontSize(11)

  const contentLines = doc.splitTextToSize(content, 170)
  doc.text(contentLines, margin, 80)

  doc.text(
    'This correspondence has been reviewed for clarity and completeness.',
    margin,
    285
  )

  return Buffer.from(doc.output('arraybuffer'))
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { recipientEmail, message } = body

    if (!sendgridApiKey || !firmFromEmail) {
      return NextResponse.json({
        error: 'Email provider is not configured'
      }, { status: 500 })
    }

    const { data: letter, error: letterError } = await supabase
      .from('letters')
      .select('*, profiles(full_name, email)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single<LetterRecord>()

    if (letterError || !letter) {
      return NextResponse.json({ error: 'Letter not found' }, { status: 404 })
    }

    if (letter.status !== 'approved') {
      return NextResponse.json({ error: 'Only approved letters can be sent' }, { status: 400 })
    }

    if (!recipientEmail || typeof recipientEmail !== 'string') {
      return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 })
    }

    const pdfBuffer = buildLetterPdf(letter, message)
    const safeTitle = sanitizeFileName(letter.title)
    const subject = `Reviewed Letter: ${letter.title}`
    const senderEmail = firmFromEmail
    const senderName = firmFromName
    const letterOwner = letter.profiles?.full_name || 'Your legal team'
    const fallbackMessage = message?.toString().trim() || 'Please review the attached approved letter.'

    try {
      await sgMail.send({
        to: recipientEmail,
        from: { email: senderEmail, name: senderName },
        subject,
        text: `${fallbackMessage}\n\nLetter prepared by ${letterOwner}.\nTitle: ${letter.title}`,
        html: `
          <p>${fallbackMessage}</p>
          <p><strong>Letter Title:</strong> ${letter.title}</p>
          <p><strong>Prepared by:</strong> ${letterOwner}</p>
          <p>Date: ${new Date(letter.created_at).toLocaleDateString()}</p>
          <p>The reviewed letter is attached as a PDF for your records.</p>
        `,
        attachments: [
          {
            content: pdfBuffer.toString('base64'),
            filename: `${safeTitle}.pdf`,
            type: 'application/pdf',
            disposition: 'attachment'
          }
        ]
      })
    } catch (providerError: any) {
      const providerMessages = providerError?.response?.body?.errors
        ?.map((err: { message?: string }) => err.message)
        .filter(Boolean)
        .join('; ')

      console.error('[v0] Email provider error:', providerError?.response?.body || providerError)
      return NextResponse.json({
        error: providerMessages || providerError?.message || 'Email provider failed to send message'
      }, { status: 502 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('[v0] Email sending error:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
