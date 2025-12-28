"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin } from "lucide-react"

type Property = {
  id: string
  address: string
  city: string
  state: string
  zipCode: string
  lat: number
  lng: number
  price: number
  recommendation: "go" | "no-go" | "maybe"
}

type PropertyMapProps = {
  properties: Property[]
  centerLat: number
  centerLng: number
  radius: number
  hoveredPropertyId?: string | null
  onPropertyHover?: (id: string | null) => void
}

export function PropertyMap({
  properties,
  centerLat,
  centerLng,
  radius,
  hoveredPropertyId,
  onPropertyHover,
}: PropertyMapProps) {
  // Calculate map bounds based on radius
  const latDelta = radius / 69 // Roughly 69 miles per degree of latitude
  const lngDelta = radius / (69 * Math.cos((centerLat * Math.PI) / 180))

  const minLat = centerLat - latDelta
  const maxLat = centerLat + latDelta
  const minLng = centerLng - lngDelta
  const maxLng = centerLng + lngDelta

  // Normalize coordinates to fit in the map container
  const normalizeCoord = (lat: number, lng: number) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * 100
    const y = ((maxLat - lat) / (maxLat - minLat)) * 100
    return { x, y }
  }

  const getMarkerColor = (recommendation: string) => {
    switch (recommendation) {
      case "go":
        return "bg-green-500"
      case "maybe":
        return "bg-yellow-500"
      default:
        return "bg-red-500"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="size-5" />
          Property Locations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full h-[500px] bg-muted rounded-lg overflow-hidden border">
          {/* Map Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50 dark:from-blue-950 dark:to-green-950">
            {/* Grid lines for visual effect */}
            <svg className="w-full h-full opacity-20">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          {/* Center marker (search location) */}
          <div
            className="absolute w-4 h-4 -ml-2 -mt-2 rounded-full bg-primary border-2 border-background shadow-lg z-10"
            style={{
              left: "50%",
              top: "50%",
            }}
          >
            <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-75" />
          </div>

          {/* Radius circle */}
          <div
            className="absolute border-2 border-primary/30 rounded-full pointer-events-none"
            style={{
              left: "50%",
              top: "50%",
              width: "60%",
              height: "60%",
              transform: "translate(-50%, -50%)",
            }}
          />

          {/* Property markers */}
          {properties.map((property) => {
            const { x, y } = normalizeCoord(property.lat, property.lng)
            const isHovered = hoveredPropertyId === property.id
            return (
              <div
                key={property.id}
                className="absolute group cursor-pointer z-20"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: "translate(-50%, -50%)",
                }}
                onMouseEnter={() => onPropertyHover?.(property.id)}
                onMouseLeave={() => onPropertyHover?.(null)}
              >
                {/* Marker */}
                <div
                  className={`w-6 h-6 rounded-full ${getMarkerColor(property.recommendation)} border-2 border-background shadow-lg transition-all ${
                    isHovered ? "scale-150 ring-4 ring-primary/50" : "hover:scale-125"
                  }`}
                >
                  <div className="absolute inset-0 rounded-full bg-current opacity-50 animate-pulse" />
                </div>

                {/* Tooltip on hover */}
                <div
                  className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 ${isHovered || "hidden group-hover:block"}`}
                >
                  <div className="bg-background border shadow-lg rounded-lg p-3 min-w-[200px]">
                    <p className="font-semibold text-sm mb-1">{property.address}</p>
                    <p className="text-xs text-muted-foreground mb-2">
                      {property.city}, {property.state}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="font-mono font-semibold">${(property.price / 1000).toFixed(0)}K</p>
                      <Badge
                        className={
                          property.recommendation === "go"
                            ? "bg-green-500"
                            : property.recommendation === "maybe"
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        }
                      >
                        {property.recommendation === "go"
                          ? "Strong Buy"
                          : property.recommendation === "maybe"
                            ? "Consider"
                            : "Pass"}
                      </Badge>
                    </div>
                  </div>
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                    <div className="border-8 border-transparent border-t-background" />
                  </div>
                </div>
              </div>
            )
          })}

          {/* Legend */}
          <div className="absolute bottom-4 right-4 bg-background/95 border rounded-lg p-3 shadow-lg">
            <p className="text-xs font-semibold mb-2">Legend</p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs">Strong Buy</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-xs">Consider</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs">Pass</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-xs">Search Center</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
