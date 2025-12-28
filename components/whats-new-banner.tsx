"use client"

import { useState, useEffect } from "react"
import { X, TestTube } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { changelog, APP_VERSION } from "@/lib/changelog"

export function WhatsNewBanner() {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    // Check if user has dismissed this version's notification
    const dismissedVersion = localStorage.getItem("dismissedWhatsNew")
    if (dismissedVersion !== APP_VERSION) {
      // Check if there's a featured changelog entry
      const featuredEntry = changelog.find((entry) => entry.featured)
      if (featuredEntry) {
        setDismissed(false)
      }
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem("dismissedWhatsNew", APP_VERSION)
    setDismissed(true)
  }

  if (dismissed) return null

  const featuredEntry = changelog.find((entry) => entry.featured)
  if (!featuredEntry) return null

  const isAlpha = APP_VERSION.includes("alpha")
  const isBeta = APP_VERSION.includes("beta")

  return (
    <Alert className="mb-6 border-primary/50 bg-primary/5">
      <TestTube className="size-4 text-primary" />
      <AlertTitle className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>Welcome to Rooflet v{featuredEntry.version}</span>
          {isAlpha && (
            <Badge variant="secondary" className="text-xs">
              Alpha
            </Badge>
          )}
          {isBeta && (
            <Badge variant="secondary" className="text-xs">
              Beta
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" className="size-6 -mr-2" onClick={handleDismiss}>
          <X className="size-4" />
        </Button>
      </AlertTitle>
      <AlertDescription>
        {isAlpha && (
          <p className="text-sm mb-2 text-muted-foreground">
            This is an early alpha release for testing. Your feedback helps us improve!
          </p>
        )}
        <ul className="mt-2 space-y-1 text-sm">
          {featuredEntry.changes.slice(0, 3).map((change, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>{change.description}</span>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  )
}
