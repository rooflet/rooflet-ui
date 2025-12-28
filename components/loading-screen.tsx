"use client"

import { Building2, Home, Key } from "lucide-react"

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        {/* Animated property icons */}
        <div className="relative h-24 w-24">
          {/* Main building icon with pulse animation */}
          <div className="absolute inset-0 flex items-center justify-center animate-pulse">
            <Building2 className="h-16 w-16 text-primary" strokeWidth={1.5} />
          </div>

          {/* Orbiting house icon */}
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: "3s" }}>
            <Home className="absolute top-0 left-1/2 -translate-x-1/2 h-8 w-8 text-accent" strokeWidth={1.5} />
          </div>

          {/* Orbiting key icon */}
          <div
            className="absolute inset-0 animate-spin"
            style={{ animationDuration: "3s", animationDirection: "reverse" }}
          >
            <Key className="absolute bottom-0 left-1/2 -translate-x-1/2 h-6 w-6 text-chart-3" strokeWidth={1.5} />
          </div>
        </div>

        {/* Loading text with gradient */}
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-xl font-semibold bg-gradient-to-r from-primary via-accent to-chart-3 bg-clip-text text-transparent">
            Loading Your Portfolio
          </h2>
          <div className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="h-2 w-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="h-2 w-2 rounded-full bg-chart-3 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    </div>
  )
}
