"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ensureDecimalPadding,
  formatCurrencyInput,
  parseCurrencyToNumber,
} from "@/lib/currency-utils";
import { getTodayLocalDate, toLocalDateString } from "@/lib/date-validation";
import { AlertTriangle, DollarSign } from "lucide-react";
import { useState } from "react";

export interface RentPeriod {
  id: string;
  startDate: string;
  endDate: string;
  monthlyRent: number;
}

export interface ValidationWarning {
  type: "overlap" | "gap" | "future" | "past-lease-end";
  message: string;
  periodIndices: number[];
}

interface RentPeriodsManagerProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  periods: RentPeriod[];
  onPeriodsChange: (periods: RentPeriod[]) => void;
  leaseStartDate?: string;
  leaseEndDate?: string;
  defaultRentAmount: number;
}

// Export utility functions for use elsewhere
export function formatDateWithMonth(dateString: string): string {
  const date = new Date(dateString + "T00:00:00");
  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}, ${year}`;
}

export function calculateMonths(startDate: string, endDate: string): number {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const yearsDiff = end.getFullYear() - start.getFullYear();
  const monthsDiff = end.getMonth() - start.getMonth();
  return Math.max(0, yearsDiff * 12 + monthsDiff + 1);
}

export function RentPeriodsManager({
  enabled,
  onEnabledChange,
  periods,
  onPeriodsChange,
  leaseStartDate,
  leaseEndDate,
  defaultRentAmount,
}: RentPeriodsManagerProps) {
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);

  // Validate rent periods and return warnings
  const validateRentPeriods = (periods: RentPeriod[]): ValidationWarning[] => {
    if (periods.length === 0) return [];

    const warnings: ValidationWarning[] = [];
    const sortedPeriods = [...periods].sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );

    // Check for overlaps
    for (let i = 0; i < sortedPeriods.length - 1; i++) {
      const currentEnd = new Date(sortedPeriods[i].endDate + "T00:00:00");
      const nextStart = new Date(sortedPeriods[i + 1].startDate + "T00:00:00");

      if (currentEnd >= nextStart) {
        warnings.push({
          type: "overlap",
          message: `Period ${i + 1} overlaps with Period ${i + 2}`,
          periodIndices: [i, i + 1],
        });
      }
    }

    // Check for gaps (more than 1 day)
    for (let i = 0; i < sortedPeriods.length - 1; i++) {
      const currentEnd = new Date(sortedPeriods[i].endDate + "T00:00:00");
      const nextStart = new Date(sortedPeriods[i + 1].startDate + "T00:00:00");
      const daysDiff = Math.floor(
        (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysDiff > 1) {
        warnings.push({
          type: "gap",
          message: `Gap of ${daysDiff - 1} days between Period ${i + 1} and Period ${i + 2}`,
          periodIndices: [i, i + 1],
        });
      }
    }

    // Check for future dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    sortedPeriods.forEach((period, index) => {
      const endDate = new Date(period.endDate + "T00:00:00");
      if (endDate > today) {
        warnings.push({
          type: "future",
          message: `Period ${index + 1} extends into the future`,
          periodIndices: [index],
        });
      }
    });

    // Check if any period extends past the lease end date
    if (leaseEndDate) {
      const leaseEnd = new Date(leaseEndDate + "T00:00:00");
      sortedPeriods.forEach((period, index) => {
        const periodEnd = new Date(period.endDate + "T00:00:00");
        if (periodEnd > leaseEnd) {
          warnings.push({
            type: "past-lease-end",
            message: `Period ${index + 1} extends past the lease end date`,
            periodIndices: [index],
          });
        }
      });
    }

    return warnings;
  };

  const handleEnabledChange = (checked: boolean) => {
    onEnabledChange(checked);
    if (checked && periods.length === 0) {
      const today = getTodayLocalDate();
      const maxEndDate = leaseEndDate || today;
      onPeriodsChange([
        {
          id: crypto.randomUUID(),
          startDate: leaseStartDate || today,
          endDate: maxEndDate < today ? maxEndDate : today,
          monthlyRent: defaultRentAmount,
        },
      ]);
    }
  };

  const addPeriod = () => {
    const lastPeriod = periods[periods.length - 1];
    const today = getTodayLocalDate();
    const nextStartDate = lastPeriod
      ? (() => {
          const lastEnd = new Date(lastPeriod.endDate);
          lastEnd.setDate(lastEnd.getDate() + 1);
          return toLocalDateString(lastEnd);
        })()
      : leaseStartDate || today;

    // Calculate max end date (cannot exceed lease end or today)
    let maxEndDate = today;
    if (leaseEndDate) {
      const leaseEnd = new Date(leaseEndDate + "T00:00:00");
      const todayDate = new Date(today + "T00:00:00");
      maxEndDate = leaseEnd < todayDate ? leaseEndDate : today;
    }

    onPeriodsChange([
      ...periods,
      {
        id: crypto.randomUUID(),
        startDate: nextStartDate,
        endDate: maxEndDate,
        monthlyRent: defaultRentAmount,
      },
    ]);
  };

  const removePeriod = (id: string) => {
    onPeriodsChange(periods.filter((p) => p.id !== id));
  };

  const updatePeriod = (id: string, updates: Partial<RentPeriod>) => {
    onPeriodsChange(
      periods.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    );
  };

  if (!enabled) {
    return (
      <div className="pt-4 border-t space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="createRentPeriods"
            checked={false}
            onCheckedChange={(checked) => handleEnabledChange(checked === true)}
          />
          <Label
            htmlFor="createRentPeriods"
            className="font-semibold cursor-pointer text-sm"
          >
            Create rent payment history automatically
          </Label>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 border-t space-y-4">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="createRentPeriods"
          checked={true}
          onCheckedChange={(checked) => handleEnabledChange(checked === true)}
        />
        <Label
          htmlFor="createRentPeriods"
          className="font-semibold cursor-pointer text-sm"
        >
          Create rent payment history automatically
        </Label>
      </div>

      <div className="space-y-3 pl-6 border-l-2 border-primary/20">
        <Alert className="items-start">
          <AlertTriangle className="size-4" />
          <AlertDescription className="text-xs">
            Define rent periods to track rent history. This will create fully
            paid rent records. Periods cannot extend past the lease end date
            {leaseEndDate && ` (${formatDateWithMonth(leaseEndDate)})`}.
          </AlertDescription>
        </Alert>

        {/* Existing Rent Periods */}
        <div className="space-y-2">
          {periods.map((period, index) => {
            const warnings = validateRentPeriods(periods);
            const periodWarnings = warnings.filter((w) =>
              w.periodIndices.includes(index),
            );

            return (
              <Card
                key={period.id}
                className={`border-primary/20 ${
                  periodWarnings.length > 0 ? "ring-2 ring-amber-500/30" : ""
                }`}
              >
                <CardContent className="pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-xs">
                      Period {index + 1}
                    </h4>
                    <div className="flex gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingPeriodId(period.id)}
                        className="h-6 text-xs border-primary/30"
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removePeriod(period.id)}
                        className="h-6 text-xs border-destructive/30 text-destructive"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>

                  {editingPeriodId === period.id ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Start Date</Label>
                          <Input
                            type="date"
                            value={period.startDate}
                            min={leaseStartDate || undefined}
                            max={period.endDate}
                            onChange={(e) => {
                              updatePeriod(period.id, {
                                startDate: e.target.value,
                              });
                            }}
                            className="h-7 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">End Date</Label>
                          <Input
                            type="date"
                            value={period.endDate}
                            min={period.startDate}
                            max={leaseEndDate || undefined}
                            onChange={(e) => {
                              updatePeriod(period.id, {
                                endDate: e.target.value,
                              });
                            }}
                            className="h-7 text-xs"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Monthly Rent</Label>
                        <Input
                          type="text"
                          value={
                            period.monthlyRent
                              ? formatCurrencyInput(
                                  period.monthlyRent.toString(),
                                )
                              : ""
                          }
                          onChange={(e) => {
                            const formatted = formatCurrencyInput(
                              e.target.value,
                            );
                            const value = parseCurrencyToNumber(formatted);
                            updatePeriod(period.id, { monthlyRent: value });
                          }}
                          onBlur={(e) => {
                            const padded = ensureDecimalPadding(e.target.value);
                            const value = parseCurrencyToNumber(padded);
                            updatePeriod(period.id, { monthlyRent: value });
                          }}
                          placeholder="$2,000.00"
                          className="h-7 text-xs"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingPeriodId(null)}
                        className="h-6 w-full text-xs"
                      >
                        Done
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration</span>
                        <span className="font-medium">
                          {formatDateWithMonth(period.startDate)} →{" "}
                          {formatDateWithMonth(period.endDate)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Rent</span>
                        <span className="font-semibold text-primary">
                          $
                          {period.monthlyRent.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration</span>
                        <span>
                          {calculateMonths(period.startDate, period.endDate)}{" "}
                          months
                        </span>
                      </div>

                      {periodWarnings.length > 0 && (
                        <div className="space-y-1 pt-1 border-t border-amber-500/20">
                          {periodWarnings.map((warning, wIdx) => (
                            <div
                              key={wIdx}
                              className="flex items-start gap-1 text-xs text-amber-700 dark:text-amber-400"
                            >
                              <AlertTriangle className="size-3 mt-0.5" />
                              <span>{warning.message}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addPeriod}
          className="w-full h-7 text-xs"
        >
          + Add Another Period
        </Button>

        {/* Summary */}
        {periods.length > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-primary">
              <DollarSign className="size-4" />
              <h4 className="font-semibold text-xs">Summary</h4>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total periods:</span>
                <span className="font-semibold">{periods.length}</span>
              </div>
              {(() => {
                let totalMonths = 0;
                let totalAmount = 0;
                periods.forEach((period) => {
                  const monthsCount = calculateMonths(
                    period.startDate,
                    period.endDate,
                  );
                  totalMonths += monthsCount;
                  totalAmount += monthsCount * period.monthlyRent;
                });
                return (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Total months:
                      </span>
                      <span className="font-semibold">{totalMonths}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-primary/20">
                      <span className="font-semibold">Total tracked:</span>
                      <span className="font-bold text-primary">
                        $
                        {totalAmount.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
