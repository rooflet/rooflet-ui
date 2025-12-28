"use client"

import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} className="size-8 shrink-0">
      {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
