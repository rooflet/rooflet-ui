"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight } from "lucide-react"

type WizardNavigationProps = {
  onBack?: () => void
  onNext?: () => void
  onSkip?: () => void
  backLabel?: string
  nextLabel?: string
  skipLabel?: string
  isNextDisabled?: boolean
  isBackDisabled?: boolean
  showSkip?: boolean
}

export function WizardNavigation({
  onBack,
  onNext,
  onSkip,
  backLabel = "Back",
  nextLabel = "Next",
  skipLabel = "Skip",
  isNextDisabled = false,
  isBackDisabled = false,
  showSkip = false,
}: WizardNavigationProps) {
  return (
    <div className="flex items-center justify-between pt-6 mt-6 border-t border-border">
      <div>
        {onBack && (
          <Button variant="outline" onClick={onBack} disabled={isBackDisabled} className="h-10 px-6 bg-transparent">
            <ArrowLeft className="mr-2 size-4" />
            {backLabel}
          </Button>
        )}
      </div>
      <div className="flex gap-2">
        {showSkip && onSkip && (
          <Button variant="ghost" onClick={onSkip} className="h-10 px-6">
            {skipLabel}
          </Button>
        )}
        {onNext && (
          <Button onClick={onNext} disabled={isNextDisabled} className="h-10 px-6 font-semibold">
            {nextLabel}
            <ArrowRight className="ml-2 size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
