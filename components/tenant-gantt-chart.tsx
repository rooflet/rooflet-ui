"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { rentCollectionsApi } from "@/lib/api/rent-collections";
import type { RentCollectionResponse } from "@/lib/api/types";
import { ROUTES, buildRoute } from "@/lib/constants/routes";
import { toLocalDateString } from "@/lib/date-validation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface MonthlyRent {
  monthIndex: number;
  amount: number;
  paymentCount: number;
  tenants: string[];
  expectedAmount: number;
  paidAmount: number;
  remainingBalance: number;
  isOverdue: boolean;
}

interface PropertyRentData {
  propertyAddress: string;
  monthlyRents: MonthlyRent[];
  totalRent: number;
}

// Chart start date is 1 year ago from current date to show last 3 years
const chartStartDate = new Date(new Date().getFullYear() - 1, 0, 1);
const totalYears = 2;
const totalMonths = totalYears * 12;
const years = Array.from(
  { length: totalYears },
  (_, i) => chartStartDate.getFullYear() + i
);
const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function processRentData(
  collections: RentCollectionResponse[]
): PropertyRentData[] {
  // Store collections with metadata for each property and month
  const propertiesMap = new Map<
    string,
    Map<
      number,
      {
        amount: number;
        date: Date;
        paymentCount: number;
        tenants: Set<string>;
        expectedAmount: number;
        paidAmount: number;
        remainingBalance: number;
      }
    >
  >();

  const calculateMonthIndex = (date: Date) => {
    return (
      (date.getFullYear() - chartStartDate.getFullYear()) * 12 + date.getMonth()
    );
  };

  collections.forEach((collection) => {
    if (!collection.propertyAddress) {
      return;
    }

    // Use paymentDate if available and paid, otherwise use createdAt as fallback
    let dateToUse: string | undefined;
    let amountToUse = 0;

    if (collection.paymentDate && collection.paidAmount > 0) {
      dateToUse = collection.paymentDate;
      amountToUse = collection.paidAmount;
    } else if (collection.createdAt && collection.expectedAmount > 0) {
      // Fallback to showing expected amounts based on creation date
      dateToUse = collection.createdAt;
      amountToUse = collection.expectedAmount;
    }

    if (!dateToUse || amountToUse <= 0) {
      return;
    }

    // Parse date carefully to avoid timezone issues
    let collectionDate: Date;
    if (dateToUse.includes("T")) {
      // Date already has time component
      collectionDate = new Date(dateToUse);
    } else {
      // ISO date without time - parse components to avoid timezone issues
      const [year, month, day] = dateToUse.split("-").map(Number);
      collectionDate = new Date(year, month - 1, day); // month is 0-based in Date constructor
    }
    const monthIndex = calculateMonthIndex(collectionDate);

    if (monthIndex < 0 || monthIndex >= totalMonths) {
      return;
    }

    if (!propertiesMap.has(collection.propertyAddress)) {
      propertiesMap.set(collection.propertyAddress, new Map());
    }

    const monthMap = propertiesMap.get(collection.propertyAddress)!;
    const existing = monthMap.get(monthIndex); // Sum up multiple payments for the same month and property
    if (existing) {
      existing.tenants.add(collection.tenantName);
      monthMap.set(monthIndex, {
        amount: existing.amount + amountToUse,
        date:
          collectionDate.getTime() > existing.date.getTime()
            ? collectionDate
            : existing.date, // Keep the most recent date
        paymentCount: existing.paymentCount + 1,
        tenants: existing.tenants,
        // For expected amount, take the maximum since it represents the total expected for the month
        expectedAmount: Math.max(
          existing.expectedAmount,
          collection.expectedAmount
        ),
        paidAmount: existing.paidAmount + collection.paidAmount,
        // For remaining balance, also take the maximum to avoid inflating from duplicate records
        remainingBalance:
          Math.max(existing.expectedAmount, collection.expectedAmount) -
          (existing.paidAmount + collection.paidAmount),
      });
    } else {
      const tenants = new Set<string>();
      tenants.add(collection.tenantName);
      monthMap.set(monthIndex, {
        amount: amountToUse,
        date: collectionDate,
        paymentCount: 1,
        tenants,
        expectedAmount: collection.expectedAmount,
        paidAmount: collection.paidAmount,
        remainingBalance: collection.expectedAmount - collection.paidAmount,
      });
    }
  });

  return Array.from(propertiesMap.entries()).map(
    ([propertyAddress, monthMap]) => {
      const monthlyRents: MonthlyRent[] = Array.from(monthMap.entries()).map(
        ([monthIndex, data]) => ({
          monthIndex,
          amount: data.amount,
          paymentCount: data.paymentCount,
          tenants: Array.from(data.tenants),
          expectedAmount: data.expectedAmount,
          paidAmount: data.paidAmount,
          remainingBalance: data.remainingBalance,
          isOverdue: false, // This will be determined by backend data
        })
      );
      const totalRent = monthlyRents.reduce(
        (sum, rent) => sum + rent.amount,
        0
      );

      return {
        propertyAddress,
        monthlyRents: monthlyRents.sort((a, b) => a.monthIndex - b.monthIndex),
        totalRent,
      };
    }
  );
}

export function TenantGanttChart() {
  const [rentData, setRentData] = useState<PropertyRentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const startPeriod = toLocalDateString(chartStartDate);
      const endPeriod = toLocalDateString(
        new Date(chartStartDate.getFullYear() + totalYears, 0, 1)
      );

      const collections = await rentCollectionsApi.getAll({
        startPeriod,
        endPeriod,
      });
      const processedData = processRentData(collections);
      setRentData(processedData);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to load rent collection data";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMonthClick = (monthIndex: number) => {
    const year = chartStartDate.getFullYear() + Math.floor(monthIndex / 12);
    const month = (monthIndex % 12) + 1; // Convert to 1-based month
    router.push(buildRoute(ROUTES.OPERATIONS.RENT_COLLECTION, { year, month }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Monthly Rent Collection
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Spinner className="size-8 mx-auto mb-4" />
            <p className="text-muted-foreground">Loading chart data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Monthly Rent Collection
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center max-w-md">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={fetchData}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">
          Monthly Rent Collection
        </CardTitle>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Monthly rent collection overview for the last {totalYears} years.
            Dollar amounts are shown directly on each cell. Hover for detailed
            payment information. Click on a month to view/edit in Rent
            Collection.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="overflow-x-auto">
            <div className="min-w-[1200px]">
              {/* Timeline Header */}
              <div className="flex mb-4">
                <div className="w-48 flex-shrink-0 font-semibold text-sm">
                  Property
                </div>
                <div className="flex-1 flex">
                  {years.map((year, yearIndex) => (
                    <div key={yearIndex} className="flex-1">
                      <div className="text-center font-bold text-sm mb-2 border-b border-border pb-1">
                        {year}
                      </div>
                      <div className="flex">
                        {months.map((month, monthIndex) => (
                          <div
                            key={monthIndex}
                            className="flex-1 text-center text-xs text-muted-foreground"
                            style={{ minWidth: "40px" }}
                          >
                            {month}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Gantt Rows */}
              <div className="space-y-3 relative">
                {/* {isTodayInRange && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-orange-500 z-10"
                    style={{ left: `calc(${todayPosition}% + 192px)` }}
                  >
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap">
                      Today
                    </div>
                  </div>
                )} */}

                {rentData.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <div className="text-center">
                      <p>
                        No rent collection data found for the selected period.
                      </p>
                      <p className="text-sm mt-1">
                        Period: {chartStartDate.getFullYear()} -{" "}
                        {chartStartDate.getFullYear() + totalYears}
                      </p>
                    </div>
                  </div>
                ) : (
                  rentData.map((propertyData, propertyIndex) => (
                    <div key={propertyIndex} className="flex items-center">
                      <div className="w-48 flex-shrink-0 font-medium text-sm pr-4 truncate">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>{propertyData.propertyAddress}</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{propertyData.propertyAddress}</p>
                            <p className="font-bold">
                              Total: ${propertyData.totalRent.toLocaleString()}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="flex-1 relative h-10">
                        {/* Background grid */}
                        <div className="absolute inset-0 flex">
                          {Array.from({ length: totalMonths }).map((_, i) => (
                            <div
                              key={i}
                              className="flex-1 border-r border-border/30"
                              style={{ minWidth: "40px" }}
                            />
                          ))}
                        </div>

                        {/* Rent collection data points - only shows paid amounts */}
                        <div className="absolute inset-0">
                          {propertyData.monthlyRents.map((rent, rentIndex) => {
                            const left = (rent.monthIndex / totalMonths) * 100;
                            const width = (1 / totalMonths) * 100;
                            const intensity = Math.min(rent.amount / 5000, 1); // Max intensity at $5000

                            // Color coding based on payment status
                            let color = `rgba(34, 197, 94, ${
                              intensity * 0.8 + 0.2
                            })`; // Green for fully paid
                            if (rent.isOverdue) {
                              color = `rgba(239, 68, 68, ${
                                intensity * 0.8 + 0.2
                              })`; // Red for overdue
                            }

                            // Format amount for display
                            const displayAmount =
                              rent.amount >= 1000
                                ? `$${(rent.amount / 1000).toFixed(1)}k`
                                : `$${rent.amount}`;

                            return (
                              <Tooltip key={rentIndex}>
                                <TooltipTrigger asChild>
                                  <div
                                    className="absolute top-0 h-10 flex items-center justify-center cursor-pointer border border-white/20 hover:border-white/60 hover:brightness-110 transition-all hover:z-10"
                                    style={{
                                      left: `${left}%`,
                                      width: `${width}%`,
                                      backgroundColor: color,
                                    }}
                                    onClick={() =>
                                      handleMonthClick(rent.monthIndex)
                                    }
                                  >
                                    <span className="text-xs font-semibold text-white drop-shadow-sm text-center px-1 truncate">
                                      {displayAmount}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <div className="space-y-1">
                                    <p className="font-bold text-sm">
                                      {months[rent.monthIndex % 12]}{" "}
                                      {years[Math.floor(rent.monthIndex / 12)]}
                                    </p>
                                    <div className="space-y-0.5 text-xs">
                                      <p>
                                        <span className="font-medium">
                                          Payments:
                                        </span>{" "}
                                        {rent.paymentCount}
                                      </p>
                                      <p>
                                        <span className="font-medium">
                                          Total Amount:
                                        </span>{" "}
                                        ${rent.amount.toLocaleString()}
                                      </p>
                                      <p>
                                        <span className="font-medium">
                                          Expected:
                                        </span>{" "}
                                        ${rent.expectedAmount.toLocaleString()}
                                      </p>
                                      <p>
                                        <span className="font-medium">
                                          Paid:
                                        </span>{" "}
                                        ${rent.paidAmount.toLocaleString()}
                                      </p>
                                      {rent.remainingBalance > 0 && (
                                        <p>
                                          <span className="font-medium">
                                            Outstanding:
                                          </span>{" "}
                                          $
                                          {rent.remainingBalance.toLocaleString()}
                                        </p>
                                      )}
                                      {rent.tenants.length > 0 && (
                                        <p>
                                          <span className="font-medium">
                                            Tenant(s):
                                          </span>{" "}
                                          {rent.tenants.join(", ")}
                                        </p>
                                      )}
                                      {rent.isOverdue && (
                                        <p className="text-red-400 font-medium">
                                          ⚠ Overdue payments
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
