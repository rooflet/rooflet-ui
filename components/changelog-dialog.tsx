"use client"

import { useState } from "react"
import { FileText } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { changelog, APP_VERSION } from "@/lib/changelog"

export function ChangelogDialog() {
  const [open, setOpen] = useState(false)

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "feature":
        return "default"
      case "improvement":
        return "secondary"
      case "bugfix":
        return "outline"
      default:
        return "outline"
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-xs text-muted-foreground hover:text-foreground">
          <FileText className="size-3" />
          <span>v{APP_VERSION}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Rooflet</DialogTitle>
          <DialogDescription>See what's new in Rooflet</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6">
            {changelog.map((entry) => (
              <div key={entry.version} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Version {entry.version}</h3>
                  <span className="text-sm text-muted-foreground">{entry.date}</span>
                  {entry.featured && <Badge variant="default">Latest</Badge>}
                </div>
                <ul className="space-y-2">
                  {entry.changes.map((change, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Badge variant={getTypeBadgeVariant(change.type)} className="mt-0.5 capitalize">
                        {change.type}
                      </Badge>
                      <span className="text-sm flex-1">{change.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
