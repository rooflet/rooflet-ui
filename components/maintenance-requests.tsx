import { Wrench, Droplets, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const requests = [
  {
    id: 1,
    title: "Leaking faucet",
    property: "Sunset Apartments",
    unit: "Unit 12A",
    priority: "high",
    icon: Droplets,
    time: "2 hours ago",
  },
  {
    id: 2,
    title: "Electrical outlet not working",
    property: "Riverside Complex",
    unit: "Unit 5B",
    priority: "urgent",
    icon: Zap,
    time: "4 hours ago",
  },
  {
    id: 3,
    title: "AC maintenance needed",
    property: "Garden View Homes",
    unit: "Unit 3C",
    priority: "medium",
    icon: Wrench,
    time: "1 day ago",
  },
]

const priorityConfig = {
  urgent: {
    className: "bg-destructive/10 text-destructive hover:bg-destructive/20",
    label: "Urgent",
  },
  high: {
    className: "bg-accent/10 text-accent-foreground hover:bg-accent/20",
    label: "High",
  },
  medium: {
    className: "bg-chart-1/10 text-chart-1 hover:bg-chart-1/20",
    label: "Medium",
  },
}

export function MaintenanceRequests() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Maintenance Requests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {requests.map((request) => {
          const Icon = request.icon
          const config = priorityConfig[request.priority as keyof typeof priorityConfig]

          return (
            <div
              key={request.id}
              className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-sm">{request.title}</h3>
                  <Badge className={config.className}>{config.label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  {request.property} • {request.unit}
                </p>
                <p className="text-xs text-muted-foreground">{request.time}</p>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
