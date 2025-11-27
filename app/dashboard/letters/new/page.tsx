"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SubscriptionModal } from "@/components/subscription-modal"
import { GenerateButton } from "@/components/generate-button"
import { createClient } from "@/lib/supabase/client"

const LETTER_TYPES = [
  {
    value: "demand_letter",
    label: "Demand Letter",
    description: "Formal demand for payment or action",
    icon: (
      <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 9V5H4V9H20ZM20 11H4V19H20V11ZM3 3H21C21.5523 3 22 3.44772 22 4V20C22 20.5523 21.5523 21 21 21H3C2.44772 21 2 20.5523 2 20V4C2 3.44772 2.44772 3 3 3ZM5 12H8V17H5V12ZM5 6H7V8H5V6ZM9 6H11V8H9V6Z"/>
      </svg>
    )
  },
  {
    value: "cease_desist",
    label: "Cease and Desist",
    description: "Stop harmful or illegal activity",
    icon: (
      <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    )
  },
  {
    value: "contract_breach",
    label: "Contract Breach Notice",
    description: "Notify of contract violation",
    icon: (
      <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 14H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
      </svg>
    )
  },
  {
    value: "eviction_notice",
    label: "Eviction Notice",
    description: "Legal notice to vacate property",
    icon: (
      <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
      </svg>
    )
  },
  {
    value: "employment_dispute",
    label: "Employment Dispute",
    description: "Workplace issue resolution",
    icon: (
      <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
      </svg>
    )
  },
  {
    value: "consumer_complaint",
    label: "Consumer Complaint",
    description: "Product or service complaint",
    icon: (
      <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
      </svg>
    )
  },
]

export default function NewLetterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedType, setSelectedType] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [aiDraft, setAiDraft] = useState("")
  const [letterId, setLetterId] = useState<string | null>(null)
  const [isFreeTrial, setIsFreeTrial] = useState(false)
  const [showPricingOverlay, setShowPricingOverlay] = useState(false)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [hasSubscription, setHasSubscription] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [formData, setFormData] = useState({
    senderName: "",
    senderAddress: "",
    recipientName: "",
    recipientAddress: "",
    issueDescription: "",
    desiredOutcome: "",
    amountDemanded: "",
    supportingDocuments: "",
  })

  useEffect(() => {
    checkSubscription()
  }, [])

  const checkSubscription = async () => {
    setIsChecking(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setIsChecking(false)
        return
      }

      // Check for active subscription with credits
      const { data: subscriptions, error } = await supabase
        .from('subscriptions')
        .select('credits_remaining, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) {
        console.error('Error fetching subscription:', error)
        setHasSubscription(false)
        return
      }

      const subscription = subscriptions?.[0]
      setHasSubscription(!!(subscription && subscription.credits_remaining > 0))
    } catch (error) {
      console.error('Error checking subscription:', error)
      setHasSubscription(false)
    } finally {
      setIsChecking(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Check if user has subscription before generating
    if (!hasSubscription) {
      setShowSubscriptionModal(true)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/generate-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          letterType: selectedType,
          intakeData: formData,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.needsSubscription) {
          router.push("/dashboard/subscription")
          return
        }
        throw new Error(errorData.error || "Failed to generate letter")
      }

      const { letterId: newLetterId, aiDraft: draft, isFreeTrial: freeTrialFlag } = await response.json()
      setLetterId(newLetterId)
      setAiDraft(draft || "")
      setIsFreeTrial(!!freeTrialFlag)
      setShowPricingOverlay(!!freeTrialFlag)

      // Automatically take the user to the letter status page (now queued for admin review)
      router.push(`/dashboard/letters/${newLetterId}?submitted=1`)
    } catch (err: any) {
      console.error("[v0] Letter creation error:", err)
      setError(err.message || "Failed to create letter")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <SubscriptionModal
        show={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        message="To generate and submit attorney drafts, please choose a subscription plan:"
      />
      <h1 className="text-3xl font-bold text-foreground mb-8">Create New Letter</h1>
      {!selectedType ? (
        <div className="bg-card rounded-lg shadow-sm border p-6">
          <h2 className="text-2xl font-bold mb-8 text-center text-slate-900">Select Letter Type</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {LETTER_TYPES.map((type) => {
              const cardClass = type.value.includes('demand') ? 'demand' :
                               type.value.includes('cease') ? 'cease' :
                               type.value.includes('contract') ? 'contract' :
                               type.value.includes('eviction') ? 'eviction' :
                               type.value.includes('employment') ? 'employment' :
                               'consumer';

              return (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`letter-card ${cardClass}`}
                >
                  <div className="content">
                    {type.icon}
                    <p className="para">{type.label}</p>
                    <p className="description">{type.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">{LETTER_TYPES.find((t) => t.value === selectedType)?.label}</h2>
              <button
                type="button"
                onClick={() => setSelectedType("")}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Change type
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="senderName">Your Full Name</Label>
                  <Input
                    id="senderName"
                    value={formData.senderName}
                    onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="recipientName">Recipient Name</Label>
                  <Input
                    id="recipientName"
                    value={formData.recipientName}
                    onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="senderAddress">Your Address</Label>
                <Textarea
                  id="senderAddress"
                  rows={3}
                  value={formData.senderAddress}
                  onChange={(e) => setFormData({ ...formData, senderAddress: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="recipientAddress">Recipient Address</Label>
                <Textarea
                  id="recipientAddress"
                  rows={3}
                  value={formData.recipientAddress}
                  onChange={(e) => setFormData({ ...formData, recipientAddress: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="issueDescription">Issue Description</Label>
                <Textarea
                  id="issueDescription"
                  rows={6}
                  placeholder="Describe the issue in detail. Include relevant dates, events, and any supporting information..."
                  value={formData.issueDescription}
                  onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })}
                  required
                />
              </div>

              {selectedType === "demand_letter" && (
                <div>
                  <Label htmlFor="amountDemanded">Amount Demanded ($)</Label>
                  <Input
                    id="amountDemanded"
                    type="number"
                    step="0.01"
                    value={formData.amountDemanded}
                    onChange={(e) => setFormData({ ...formData, amountDemanded: e.target.value })}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="desiredOutcome">Desired Outcome</Label>
                <Textarea
                  id="desiredOutcome"
                  rows={3}
                  placeholder="What resolution are you seeking?"
                  value={formData.desiredOutcome}
                  onChange={(e) => setFormData({ ...formData, desiredOutcome: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="supportingDocuments">Supporting Documents (Optional)</Label>
                <Textarea
                  id="supportingDocuments"
                  rows={2}
                  placeholder="List any contracts, invoices, emails, or other documents that support your case"
                  value={formData.supportingDocuments}
                  onChange={(e) => setFormData({ ...formData, supportingDocuments: e.target.value })}
                />
              </div>
            </div>

            {error && <div className="mt-4 p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>}

            <div className="mt-6 flex items-center justify-center gap-6">
              <GenerateButton
                type="submit"
                loading={loading}
                disabled={loading || isChecking}
                hasSubscription={hasSubscription}
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={() => router.push("/dashboard/letters")}>
                Cancel
              </Button>
            </div>
            {!hasSubscription && !isChecking && (
              <p className="mt-2 text-sm text-muted-foreground text-center">
                A subscription is required to generate and submit attorney drafts
              </p>
            )}
          </div>
        </form>
      )}

      {aiDraft && (
        <div className="mt-10 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-tight">Draft Ready</p>
              <h2 className="text-2xl font-semibold text-foreground">Attorney-generated draft</h2>
              <p className="text-sm text-muted-foreground">
                Review the draft below. You can submit for attorney review after subscribing.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {letterId && (
                <Button variant="outline" onClick={() => router.push(`/dashboard/letters/${letterId}`)}>
                  Open Letter Page
                </Button>
              )}
              <Button variant="outline" onClick={() => router.push("/dashboard/subscription")}>
                Manage Subscription
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className={`bg-card border rounded-lg p-4 whitespace-pre-wrap leading-relaxed ${showPricingOverlay ? "blur-sm pointer-events-none select-none" : ""}`}>
              {aiDraft}
            </div>

            {showPricingOverlay && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white border shadow-xl rounded-lg p-6 max-w-xl w-full space-y-4">
                  <h3 className="text-xl font-semibold">Unlock attorney review</h3>
                  <p className="text-sm text-muted-foreground">
                    Your first draft is free to preview. Subscribe to submit this letter for attorney review and delivery.
                  </p>
                  <div className="grid gap-3">
                    <div className="border rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <div className="font-semibold">Single Letter</div>
                        <div className="text-sm text-muted-foreground">One-time review</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">$299</div>
                        <Button size="sm" className="mt-2" onClick={() => router.push("/dashboard/subscription")}>
                          Choose
                        </Button>
                      </div>
                    </div>
                    <div className="border rounded-lg p-3 flex items-center justify-between bg-primary/5">
                      <div>
                        <div className="font-semibold">Monthly</div>
                        <div className="text-sm text-muted-foreground">4 letters per month</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">$299/mo</div>
                        <Button size="sm" className="mt-2" onClick={() => router.push("/dashboard/subscription")}>
                          Choose
                        </Button>
                      </div>
                    </div>
                    <div className="border rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <div className="font-semibold">Yearly</div>
                        <div className="text-sm text-muted-foreground">8 letters per year</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">$599/yr</div>
                        <Button size="sm" className="mt-2" onClick={() => router.push("/dashboard/subscription")}>
                          Choose
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Button variant="secondary" onClick={() => setShowPricingOverlay(false)}>
                      Preview letter draft
                    </Button>
                    <div className="text-sm text-muted-foreground">
                      Subscription required to submit for attorney review
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!isFreeTrial && (
            <div className="flex items-center justify-between bg-muted/50 border rounded-lg p-4">
              <div>
                <p className="font-medium text-foreground">Ready to submit?</p>
                <p className="text-sm text-muted-foreground">Send this draft to our attorneys for review and approval.</p>
              </div>
              {letterId && (
                <Button onClick={() => router.push(`/dashboard/letters/${letterId}`)}>
                  Submit for Attorney Review
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
