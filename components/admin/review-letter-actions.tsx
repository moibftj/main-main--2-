"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle, Edit3, Sparkles } from "lucide-react"
import { toast } from "sonner"

interface ReviewLetterActionsProps {
  letter: {
    id: string
    ai_draft_content: string | null
    final_content: string | null
    status: string
  }
}

export default function ReviewLetterActions({ letter }: ReviewLetterActionsProps) {
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [action, setAction] = useState<"approve" | "reject" | null>(null)
  const [reviewNotes, setReviewNotes] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")
  const [editedContent, setEditedContent] = useState(letter.final_content || letter.ai_draft_content || "")

  const handleApprove = async () => {
    if (!reviewNotes.trim()) {
      toast.error("Please provide review notes before approving")
      return
    }

    setIsSubmitting(true)
    try {
      // Update letter status and content
      const { error } = await supabase
        .from("letters")
        .update({
          status: "approved",
          final_content: editedContent,
          review_notes: reviewNotes,
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq("id", letter.id)

      if (error) throw error

      // Log audit trail
      await supabase.rpc("log_letter_audit", {
        p_letter_id: letter.id,
        p_action: "approved",
        p_old_status: letter.status,
        p_new_status: "approved",
        p_notes: reviewNotes
      })

      toast.success("Letter approved successfully!")
      window.location.reload()
    } catch (error) {
      console.error("Error approving letter:", error)
      toast.error("Failed to approve letter")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason")
      return
    }

    setIsSubmitting(true)
    try {
      // Update letter status
      const { error } = await supabase
        .from("letters")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason,
          review_notes: reviewNotes,
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq("id", letter.id)

      if (error) throw error

      // Log audit trail
      await supabase.rpc("log_letter_audit", {
        p_letter_id: letter.id,
        p_action: "rejected",
        p_old_status: letter.status,
        p_new_status: "rejected",
        p_notes: `Rejected: ${rejectionReason}. ${reviewNotes}`
      })

      toast.success("Letter rejected")
      window.location.href = "/admin/letters"
    } catch (error) {
      console.error("Error rejecting letter:", error)
      toast.error("Failed to reject letter")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImproveWithAI = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/letters/" + letter.id + "/improve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content: editedContent,
          instructions: "Please improve this letter for clarity, professionalism, and legal effectiveness."
        })
      })

      if (!response.ok) throw new Error("Failed to improve letter")

      const data = await response.json()
      setEditedContent(data.improvedContent)
      toast.success("Letter improved with AI suggestions")
    } catch (error) {
      console.error("Error improving letter:", error)
      toast.error("Failed to improve letter")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Actions</CardTitle>
        <CardDescription>
          Review and approve or reject this letter submission
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div>
          <Label>Current Status</Label>
          <Badge variant="secondary" className="ml-2">
            {letter.status.replace(/_/g, " ")}
          </Badge>
        </div>

        {/* Edit Content */}
        <div>
          <Label htmlFor="content">Letter Content</Label>
          <Textarea
            id="content"
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="mt-2 min-h-[200px]"
            placeholder="Edit the letter content here..."
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleImproveWithAI}
            disabled={isSubmitting}
            className="mt-2"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Improve with AI
          </Button>
        </div>

        {/* Review Notes */}
        <div>
          <Label htmlFor="notes">Review Notes</Label>
          <Textarea
            id="notes"
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            className="mt-2"
            placeholder="Add your review notes here..."
            rows={3}
          />
        </div>

        {/* Action Selection */}
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setAction("approve")}
            className={`flex-1 ${
              action === "approve"
                ? "bg-green-50 border-green-200 text-green-700"
                : ""
            }`}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Approve
          </Button>
          <Button
            variant="outline"
            onClick={() => setAction("reject")}
            className={`flex-1 ${
              action === "reject"
                ? "bg-red-50 border-red-200 text-red-700"
                : ""
            }`}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Reject
          </Button>
        </div>

        {/* Rejection Reason (shown only when reject is selected) */}
        {action === "reject" && (
          <div>
            <Label htmlFor="rejection">Rejection Reason</Label>
            <Textarea
              id="rejection"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-2"
              placeholder="Please explain why this letter is being rejected..."
              rows={2}
            />
          </div>
        )}

        {/* Confirm Actions */}
        {action && (
          <Alert>
            <AlertDescription>
              {action === "approve" ? (
                <span>Approving this letter will send it to the user as final.</span>
              ) : (
                <span>Rejecting this letter will notify the user of the rejection.</span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Submit Buttons */}
        {action && (
          <div className="flex space-x-2">
            {action === "approve" ? (
              <Button
                onClick={handleApprove}
                disabled={isSubmitting || !reviewNotes.trim()}
                className="flex-1"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Approve Letter
              </Button>
            ) : (
              <Button
                onClick={handleReject}
                disabled={isSubmitting || !rejectionReason.trim()}
                variant="destructive"
                className="flex-1"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="mr-2 h-4 w-4" />
                )}
                Reject Letter
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setAction(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}