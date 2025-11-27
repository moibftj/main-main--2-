"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Circle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface GenerationTrackerModalProps {
  isOpen: boolean
  isFinished: boolean
}

const STEPS = [
  { title: "Request Submitted", description: "We have received your case details." },
  { title: "AI Analysis", description: "Analyzing your inputs against legal frameworks." },
  { title: "Drafting Content", description: "Structuring your legal arguments." },
  { title: "Finalizing", description: "Polishing the document for review." },
]

export function GenerationTrackerModal({ isOpen, isFinished }: GenerationTrackerModalProps) {
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0)
      return
    }

    if (isFinished) {
      setCurrentStep(STEPS.length)
      return
    }

    // Timeline simulation
    const timers = [
      setTimeout(() => setCurrentStep(1), 1500), // Step 1 after 1.5s
      setTimeout(() => setCurrentStep(2), 4000), // Step 2 after 4s
      setTimeout(() => setCurrentStep(3), 7000), // Step 3 after 7s
    ]

    return () => timers.forEach(clearTimeout)
  }, [isOpen, isFinished])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg animate-in fade-in zoom-in duration-300">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-semibold">Generating Your Letter</h2>
          <p className="text-sm text-muted-foreground">Please wait while we process your request...</p>
        </div>

        <div className="relative ml-4 space-y-8 before:absolute before:left-[11px] before:top-2 before:h-[calc(100%-16px)] before:w-[2px] before:bg-muted">
          {/* Animated Progress Line */}
          <div
            className="absolute left-[11px] top-2 w-[2px] bg-primary transition-all duration-1000 ease-linear"
            style={{
              height: `calc(${Math.min(currentStep, STEPS.length - 1) / (STEPS.length - 1)} * (100% - 16px))`,
            }}
          />

          {STEPS.map((step, index) => {
            const isCompleted = currentStep > index
            const isCurrent = currentStep === index

            return (
              <div key={index} className="relative flex items-start gap-4">
                <div
                  className={cn(
                    "relative z-10 flex h-6 w-6 items-center justify-center rounded-full border bg-background transition-colors duration-300",
                    isCompleted || isCurrent ? "border-primary text-primary" : "border-muted text-muted-foreground",
                    isCurrent && "ring-4 ring-primary/20",
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : isCurrent ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Circle className="h-3 w-3" />
                  )}
                </div>
                <div className="flex-1 pt-0.5">
                  <h3
                    className={cn(
                      "font-medium leading-none transition-colors",
                      isCompleted || isCurrent ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
