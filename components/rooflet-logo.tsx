import { cn } from "@/lib/utils"

interface RoofletLogoProps {
  className?: string
  showBackground?: boolean
}

export function RoofletLogo({ className, showBackground = true }: RoofletLogoProps) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center shrink-0",
        showBackground && "rounded-full bg-gradient-to-br from-purple-600 via-primary to-purple-400",
        className,
      )}
    >
      <svg
        viewBox="0 0 32 32"
        className={cn("w-full h-full", showBackground ? "p-1.5" : "")}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* House body - simplified and more geometric */}
        <path
          d="M8 14 L8 25 C8 25.5 8.5 26 9 26 L23 26 C23.5 26 24 25.5 24 25 L24 14"
          className="fill-white/95 dark:fill-white/90"
          strokeWidth="1"
          stroke="currentColor"
          strokeLinejoin="round"
        />

        {/* Roof - more elegant triangular design */}
        <path
          d="M3 14 L16 4 L29 14"
          className="stroke-white dark:stroke-white/95"
          strokeWidth="2.8"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Roof accent line for depth */}
        <path
          d="M5 13.5 L16 5.5 L27 13.5"
          className="stroke-white/60 dark:stroke-white/50"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Door - more refined with rounded top */}
        <path
          d="M13 26 L13 20 C13 19.5 13.5 19 14 19 L18 19 C18.5 19 19 19.5 19 20 L19 26"
          className="fill-primary/80 dark:fill-primary/70"
          strokeWidth="0.8"
          stroke="currentColor"
        />

        {/* Door knob */}
        <circle cx="17" cy="23" r="0.6" className="fill-purple-300 dark:fill-purple-200" />

        {/* Window left - rounded corners for softer look */}
        <rect x="9.5" y="16" width="3" height="3" className="fill-purple-400/70 dark:fill-purple-300/60" rx="0.8" />

        {/* Window left pane divider */}
        <line x1="11" y1="16" x2="11" y2="19" className="stroke-white/40" strokeWidth="0.5" />
        <line x1="9.5" y1="17.5" x2="12.5" y2="17.5" className="stroke-white/40" strokeWidth="0.5" />

        {/* Window right - rounded corners for softer look */}
        <rect x="19.5" y="16" width="3" height="3" className="fill-purple-400/70 dark:fill-purple-300/60" rx="0.8" />

        {/* Window right pane divider */}
        <line x1="21" y1="16" x2="21" y2="19" className="stroke-white/40" strokeWidth="0.5" />
        <line x1="19.5" y1="17.5" x2="22.5" y2="17.5" className="stroke-white/40" strokeWidth="0.5" />
      </svg>
    </div>
  )
}
