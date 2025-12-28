"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { LucideIcon } from "lucide-react";
import { Info, TrendingDown, TrendingUp } from "lucide-react";

interface LargeStatCardProps {
  title: string;
  value: string | number;
  previousValue?: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  className?: string;
  valueColorClass?: string;
  helpText?: string;
  showChange?: boolean;
}

export function LargeStatCard({
  title,
  value,
  previousValue,
  subtitle,
  icon: Icon,
  className,
  valueColorClass,
  helpText,
  showChange = true,
}: LargeStatCardProps) {
  const hasChanged = previousValue !== undefined && value !== previousValue;
  const isIncrease = hasChanged && Number(value) > Number(previousValue);
  const isDecrease = hasChanged && Number(value) < Number(previousValue);

  return (
    <Card
      className={`overflow-hidden transition-all hover:shadow-md border-border/60 ${
        className || ""
      }`}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-2 px-3 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-center gap-1 flex-1">
          <CardTitle className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            {title}
          </CardTitle>
          {helpText && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-2.5 w-2.5 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[300px]">
                  <p className="text-xs">{helpText}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {Icon && (
          <div className="p-1 bg-primary/10 rounded">
            <Icon className="h-3 w-3 text-primary" />
          </div>
        )}
      </CardHeader>
      <CardContent className="px-3 pb-2 pt-1">
        <div className="flex flex-col gap-0.5">
          <div
            className={`text-xl font-bold tracking-tight ${
              valueColorClass || "text-foreground"
            }`}
          >
            {value}
          </div>
          {showChange && hasChanged && (
            <div className="flex items-center gap-1 text-sm">
              <span
                className={`flex items-center gap-0.5 ${
                  isIncrease
                    ? "text-green-600 dark:text-green-400"
                    : isDecrease
                    ? "text-red-600 dark:text-red-400"
                    : "text-muted-foreground"
                }`}
              >
                {isIncrease && <TrendingUp className="h-2.5 w-2.5" />}
                {isDecrease && <TrendingDown className="h-2.5 w-2.5" />}
                <span className="text-[10px] font-medium">
                  was {previousValue}
                </span>
              </span>
            </div>
          )}
          {subtitle && (
            <p className="text-[10px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
