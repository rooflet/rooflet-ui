"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

interface CompactStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  link?: string;
  className?: string;
  valueColorClass?: string;
  helpText?: string;
}

export function CompactStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  link,
  className,
  valueColorClass,
  helpText,
}: CompactStatCardProps) {
  const content = (
    <Card
      className={`overflow-hidden transition-all hover:scale-[1.02] ${
        link
          ? "cursor-pointer hover:shadow-lg hover:shadow-primary/20 hover:border-primary/60"
          : ""
      } ${className || ""} rounded-xl border-border/60`}
      role={link ? "link" : undefined}
      tabIndex={link ? 0 : undefined}
      aria-label={link ? `Navigate to ${title}` : undefined}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3 px-4 bg-gradient-to-br from-primary/8 to-transparent">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {title}
          </CardTitle>
          {helpText && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="size-3 text-muted-foreground/70 cursor-help hover:text-muted-foreground transition-colors" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-sm">{helpText}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="rounded-lg bg-primary/15 p-1.5" aria-hidden="true">
          <Icon className="size-3.5 text-primary flex-shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 flex flex-col justify-center">
        <div
          className={`text-2xl md:text-3xl font-bold font-mono leading-none tracking-tight ${
            valueColorClass || "text-foreground"
          }`}
        >
          {value}
        </div>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground leading-tight mt-1 font-medium">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );

  if (link) {
    return (
      <Link
        href={link}
        className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-xl"
      >
        {content}
      </Link>
    );
  }

  return content;
}
