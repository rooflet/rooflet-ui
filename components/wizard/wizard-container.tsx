"use client"

import type { ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

type WizardContainerProps = {
  title: string
  description: string
  currentStep: number
  totalSteps: number
  children: ReactNode
}

export function WizardContainer({ title, description, currentStep, totalSteps, children }: WizardContainerProps) {
  const progress = (currentStep / totalSteps) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl shadow-lg">
        <CardHeader className="space-y-4 pb-6">
          <div>
            <CardTitle className="text-3xl font-bold tracking-tight">{title}</CardTitle>
            <CardDescription className="text-base mt-2">{description}</CardDescription>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-muted-foreground">
                Step {currentStep} of {totalSteps}
              </span>
              <span className="text-primary">{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2.5" />
          </div>
        </CardHeader>
        <CardContent className="pb-8">{children}</CardContent>
      </Card>
    </div>
  )
}
