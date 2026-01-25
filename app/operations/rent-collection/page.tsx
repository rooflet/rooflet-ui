"use client";

import { CompactStatCard } from "@/components/compact-stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import type { RentCollectionResponse } from "@/lib/api/types";
import { ROUTES, buildRoute } from "@/lib/constants/routes";
import {
  ensureDecimalPadding,
  formatCurrencyInput,
  parseCurrencyToNumber,
} from "@/lib/currency-utils";
import { getTodayLocalDate, toLocalDateString } from "@/lib/date-validation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  createRentCollection,
  deleteRentCollection,
  fetchRentCollections,
  updateRentCollection,
} from "@/store/slices/rentCollectionsSlice";
import { fetchTenants } from "@/store/slices/tenantsSlice";
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Edit,
  Info,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface TenantWithPayments {
  tenantId: string;
  tenantName: string;
  propertyId: string;
  propertyAddress: string;
  expectedAmount: number;
  totalPaid: number;
  isPaidInFull: boolean;
  payments: RentCollectionResponse[];
}

const getMonthDateRange = (year: number, month: number) => {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  return {
    start: toLocalDateString(startDate),
    end: toLocalDateString(endDate),
  };
};

const formatMonthYear = (year: number, month: number) => {
  const date = new Date(year, month, 1);
  return date.toLocaleString("default", { month: "long", year: "numeric" });
};

export default function RentCollectionPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const now = new Date();

  // Local state for selected period
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  // Get Redux state
  const { rentCollections, isLoading, error } = useAppSelector(
    (state) => state.rentCollections,
  );
  const { tenants: allTenants } = useAppSelector((state) => state.tenants);
  const { activePortfolioId } = useAppSelector((state) => state.portfolio);
  const { toast } = useToast();

  // Dialog state (kept as local state as it's UI-only)
  const [selectedCollection, setSelectedCollection] =
    useState<RentCollectionResponse | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isEditPaymentDialogOpen, setIsEditPaymentDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] =
    useState<RentCollectionResponse | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(getTodayLocalDate());
  const [paymentNotes, setPaymentNotes] = useState("");

  const tenantRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Initialize from URL params on mount
  useEffect(() => {
    const urlYear = searchParams.get("year")
      ? parseInt(searchParams.get("year")!)
      : now.getFullYear();
    const urlMonth =
      searchParams.get("month") !== null
        ? parseInt(searchParams.get("month")!) - 1
        : now.getMonth();

    if (urlYear !== selectedYear || urlMonth !== selectedMonth) {
      setSelectedYear(urlYear);
      setSelectedMonth(urlMonth);
    }
  }, []);

  // Fetch data when period changes
  useEffect(() => {
    const dateRange = getMonthDateRange(selectedYear, selectedMonth);
    dispatch(fetchTenants({ activeOnly: true }));
    dispatch(
      fetchRentCollections({
        startPeriod: dateRange.start,
        endPeriod: dateRange.end,
      }),
    );
  }, [selectedYear, selectedMonth, activePortfolioId, dispatch]);

  // Show error toast when error changes
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error]);

  const goToPreviousMonth = () => {
    let newMonth = selectedMonth;
    let newYear = selectedYear;

    if (selectedMonth === 0) {
      newMonth = 11;
      newYear = selectedYear - 1;
    } else {
      newMonth = selectedMonth - 1;
    }

    setSelectedYear(newYear);
    setSelectedMonth(newMonth);
    // Convert 0-based month to 1-based for URL
    router.push(
      `/operations/rent-collection?year=${newYear}&month=${newMonth + 1}`,
    );
  };

  const goToNextMonth = () => {
    let newMonth = selectedMonth;
    let newYear = selectedYear;

    if (selectedMonth === 11) {
      newMonth = 0;
      newYear = selectedYear + 1;
    } else {
      newMonth = selectedMonth + 1;
    }

    setSelectedYear(newYear);
    setSelectedMonth(newMonth);
    // Convert 0-based month to 1-based for URL
    router.push(
      buildRoute(ROUTES.OPERATIONS.RENT_COLLECTION, {
        year: newYear,
        month: newMonth + 1,
      }),
    );
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    const newYear = now.getFullYear();
    const newMonth = now.getMonth();

    setSelectedYear(newYear);
    setSelectedMonth(newMonth);
    // Convert 0-based month to 1-based for URL
    router.push(
      buildRoute(ROUTES.OPERATIONS.RENT_COLLECTION, {
        year: newYear,
        month: newMonth + 1,
      }),
    );
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return (
      selectedYear === now.getFullYear() && selectedMonth === now.getMonth()
    );
  };

  const getCollectedColor = () => {
    if (collectionRate >= 80) return "text-green-600 dark:text-green-400";
    if (collectionRate >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-orange-600 dark:text-orange-400";
  };

  const getOutstandingColor = () => {
    if (outstandingRate <= 20) return "text-green-600 dark:text-green-400";
    if (outstandingRate <= 50) return "text-amber-600 dark:text-amber-400";
    return "text-orange-600 dark:text-orange-400";
  };

  const _getStatusColorClass = (collection: RentCollectionResponse) => {
    const isPaid = collection.paidAmount >= collection.expectedAmount;
    if (isPaid) return "bg-green-500 hover:bg-green-600";
    if (collection.paidAmount > 0) return "bg-yellow-500 hover:bg-yellow-600";
    return "bg-orange-500 hover:bg-orange-600";
  };

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const openPaymentDialog = (collection: RentCollectionResponse) => {
    setSelectedCollection(collection);
    const remaining = collection.expectedAmount - collection.paidAmount;
    setPaymentAmount(formatCurrencyInput(remaining.toString()));
    setPaymentDate(getTodayLocalDate());
    setPaymentNotes(""); // Reset notes for new payment
    setIsPaymentDialogOpen(true);
  };

  const openEditPaymentDialog = (payment: RentCollectionResponse) => {
    setEditingPayment(payment);
    setPaymentNotes(payment.notes || "");
    setIsEditPaymentDialogOpen(true);
  };

  const handleAddPayment = async () => {
    if (!selectedCollection) return;

    try {
      const amount = parseCurrencyToNumber(paymentAmount);

      await dispatch(
        createRentCollection({
          propertyId: selectedCollection.propertyId,
          tenantId: selectedCollection.tenantId,
          expectedAmount: selectedCollection.expectedAmount,
          paidAmount: amount,
          paymentDate: paymentDate,
          notes: paymentNotes,
        }),
      ).unwrap();

      setIsPaymentDialogOpen(false);
      setSelectedCollection(null);
      setPaymentAmount(""); // Clear form
      setPaymentDate(getTodayLocalDate()); // Reset date
      setPaymentNotes(""); // Clear notes

      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to record payment",
        variant: "destructive",
      });
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      await dispatch(deleteRentCollection(paymentId)).unwrap();
      toast({
        title: "Success",
        description: "Payment deleted successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to delete payment",
        variant: "destructive",
      });
    }
  };

  const handleUpdatePaymentNotes = async () => {
    if (!editingPayment) return;

    try {
      await dispatch(
        updateRentCollection({
          id: editingPayment.id,
          data: {
            notes: paymentNotes,
          },
        }),
      ).unwrap();

      setIsEditPaymentDialogOpen(false);
      setEditingPayment(null);
      setPaymentNotes(""); // Clear notes after saving

      toast({
        title: "Success",
        description: "Payment notes updated successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to update payment notes",
        variant: "destructive",
      });
    }
  };

  const handleQuickMarkPaidInFull = async (tenant: TenantWithPayments) => {
    try {
      const remaining = tenant.expectedAmount - tenant.totalPaid;
      if (remaining <= 0) return;

      // If the current month and year does not match current date, set paymentDate to the first day of the selected month
      let paymentDate: string;

      if (
        selectedYear !== now.getFullYear() ||
        selectedMonth !== now.getMonth()
      ) {
        const year = selectedYear;
        const month = String(selectedMonth + 1).padStart(2, "0");
        paymentDate = `${year}-${month}-01`;
      } else {
        paymentDate = getTodayLocalDate();
      }

      await dispatch(
        createRentCollection({
          propertyId: tenant.propertyId,
          tenantId: tenant.tenantId,
          expectedAmount: tenant.expectedAmount,
          paidAmount: remaining,
          paymentDate: paymentDate,
          notes: "Marked as paid in full",
        }),
      ).unwrap();

      toast({
        title: "Success",
        description: "Marked as paid in full",
      });
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to update payment",
        variant: "destructive",
      });
    }
  };

  const tenantWithPaymentsMap = new Map<number, TenantWithPayments>();

  // Get the first and last day of the selected month for comparison
  const selectedMonthStart = new Date(selectedYear, selectedMonth, 1);
  const selectedMonthEnd = new Date(selectedYear, selectedMonth + 1, 0);

  // First pass: Process rent collections to get expected amounts and payments
  rentCollections.forEach((collection) => {
    const existing = tenantWithPaymentsMap.get(collection.tenantId);
    if (existing) {
      // Update expected amount if this collection has a higher expected amount
      if (collection.expectedAmount > existing.expectedAmount) {
        existing.expectedAmount = collection.expectedAmount;
      }
      existing.totalPaid += collection.paidAmount;
      existing.payments.push(collection);
      existing.isPaidInFull = existing.totalPaid >= existing.expectedAmount;
    } else {
      // Create new entry from collection
      tenantWithPaymentsMap.set(collection.tenantId, {
        tenantId: collection.tenantId,
        tenantName: collection.tenantName,
        propertyId: collection.propertyId,
        propertyAddress: collection.propertyAddress,
        expectedAmount: collection.expectedAmount,
        totalPaid: collection.paidAmount,
        isPaidInFull: collection.paidAmount >= collection.expectedAmount,
        payments: [collection],
      });
    }
  });

  // Second pass: Add active tenants who haven't paid yet (and whose lease overlaps with selected month)
  allTenants.forEach((tenant) => {
    // Skip tenants whose lease hasn't started yet
    if (tenant.leaseStartDate) {
      const leaseStart = new Date(tenant.leaseStartDate);
      // Only include tenant if their lease starts on or before the last day of the selected month
      if (leaseStart > selectedMonthEnd) {
        return; // Skip this tenant - lease hasn't started
      }
    }

    // Skip tenants whose lease has already ended
    if (tenant.leaseEndDate) {
      const leaseEnd = new Date(tenant.leaseEndDate);
      // Only include tenant if their lease ends on or after the first day of the selected month
      if (leaseEnd < selectedMonthStart) {
        return; // Skip this tenant - lease has ended
      }
    }

    // Only add if not already in map (i.e., tenants with no payment records)
    if (!tenantWithPaymentsMap.has(tenant.id)) {
      tenantWithPaymentsMap.set(tenant.id, {
        tenantId: tenant.id,
        tenantName: `${tenant.name}`,
        propertyId: tenant.propertyId as number,
        propertyAddress: tenant.propertyAddress || "Unknown Property",
        expectedAmount: tenant.monthlyRent || 0,
        totalPaid: 0,
        isPaidInFull: false,
        payments: [],
      });
    }
  });

  const tenantGroupsArray = Array.from(tenantWithPaymentsMap.values());

  const sortedTenants = [...tenantGroupsArray].sort((a, b) => {
    // First, sort by payment status (unpaid first, paid last)
    if (a.isPaidInFull !== b.isPaidInFull) {
      return a.isPaidInFull ? 1 : -1;
    }
    // Then sort alphabetically by name within each group
    return a.tenantName.localeCompare(b.tenantName);
  });

  const stats = {
    totalDue: tenantGroupsArray.reduce(
      (sum, group) => sum + group.expectedAmount,
      0,
    ),
    totalCollected: tenantGroupsArray.reduce(
      (sum, group) => sum + group.totalPaid,
      0,
    ),
    paid: tenantGroupsArray.filter((group) => group.isPaidInFull).length,
    pending: tenantGroupsArray.filter((group) => group.totalPaid === 0).length,
    partial: tenantGroupsArray.filter(
      (group) => group.totalPaid > 0 && !group.isPaidInFull,
    ).length,
  };

  const outstanding = stats.totalDue - stats.totalCollected;
  const collectionRate =
    stats.totalDue > 0 ? (stats.totalCollected / stats.totalDue) * 100 : 0;
  const outstandingRate =
    stats.totalDue > 0 ? (outstanding / stats.totalDue) * 100 : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Spinner className="size-8 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading rent collections...</p>
        </div>
      </div>
    );
  }

  if (error && !isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-destructive mb-4">{error}</p>
          <Button
            onClick={() => {
              const dateRange = getMonthDateRange(selectedYear, selectedMonth);
              dispatch(fetchTenants({ activeOnly: true }));
              dispatch(
                fetchRentCollections({
                  startPeriod: dateRange.start,
                  endPeriod: dateRange.end,
                }),
              );
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background px-2 md:px-4 py-2 md:hidden">
        <SidebarTrigger />
        <h1 className="text-base font-semibold">Rent Collection</h1>
      </div>

      <main className="container mx-auto px-2 md:px-4 py-2 md:py-3">
        <div className="mb-2 md:mb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight mb-0.5">
                Rent Collection
              </h1>
              <p className="text-xs text-muted-foreground">
                Track monthly rent payments and tenant payment status
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {!isCurrentMonth() && (
                <Button
                  size="sm"
                  onClick={goToCurrentMonth}
                  className="h-7 text-xs px-2"
                >
                  Current Month
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousMonth}
                className="h-7 px-2 bg-transparent"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <div className="flex items-center gap-1.5 min-w-[180px] justify-center">
                <Calendar className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold">
                  {formatMonthYear(selectedYear, selectedMonth)}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextMonth}
                className="h-7 px-2 bg-transparent"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-2 grid-cols-2 md:grid-cols-4 mb-2 md:mb-3">
          <CompactStatCard
            title="Total Revenue"
            value={`$${stats.totalDue.toLocaleString()}`}
            icon={DollarSign}
            valueColorClass="text-green-600 dark:text-green-400"
            helpText="Total rent expected for the selected month"
          />
          <CompactStatCard
            title="Collected"
            value={`$${stats.totalCollected.toLocaleString()}`}
            subtitle={`${collectionRate.toFixed(1)}% collection rate`}
            icon={DollarSign}
            valueColorClass={getCollectedColor()}
            helpText="Amount collected so far for the selected month"
          />
          <CompactStatCard
            title="Outstanding"
            value={`$${outstanding.toLocaleString()}`}
            subtitle={`${outstandingRate.toFixed(1)}% remaining`}
            icon={DollarSign}
            valueColorClass={getOutstandingColor()}
            helpText="Amount still owed for the selected month"
          />
          <CompactStatCard
            title="Status"
            value={`${stats.paid} / ${tenantGroupsArray.length}`}
            subtitle={`${stats.partial} partial • ${stats.pending} pending`}
            icon={Calendar}
            helpText="Payment status breakdown for all tenants"
          />
        </div>

        {sortedTenants.length > 0 && (
          <div className="mb-2 md:mb-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <h2 className="text-sm font-semibold">Tenant Overview</h2>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="size-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      Click on a tenant to jump to their payment details
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="w-full overflow-x-auto pb-1">
              <TooltipProvider>
                <div className="flex gap-1">
                  {sortedTenants.map((tenant) => {
                    const remaining = tenant.expectedAmount - tenant.totalPaid;
                    const progress =
                      tenant.expectedAmount > 0
                        ? (tenant.totalPaid / tenant.expectedAmount) * 100
                        : 0;

                    const getStatusColorClass = () => {
                      if (tenant.isPaidInFull)
                        return "bg-green-500 hover:bg-green-600";
                      if (tenant.totalPaid > 0)
                        return "bg-yellow-500 hover:bg-yellow-600";
                      return "bg-orange-500 hover:bg-orange-600";
                    };

                    return (
                      <Tooltip key={tenant.tenantId}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => {
                              const element =
                                tenantRefs.current[tenant.tenantId];
                              if (element) {
                                element.scrollIntoView({
                                  behavior: "smooth",
                                  block: "center",
                                });
                                element.classList.add(
                                  "ring-2",
                                  "ring-primary",
                                  "ring-offset-2",
                                );
                                setTimeout(() => {
                                  element.classList.remove(
                                    "ring-2",
                                    "ring-primary",
                                    "ring-offset-2",
                                  );
                                }, 2000);
                              }
                            }}
                            className={`flex items-center justify-center size-7 rounded-full text-white font-semibold text-xs transition-all cursor-pointer ${getStatusColorClass()}`}
                          >
                            {getInitials(tenant.tenantName)}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <div className="space-y-1">
                            <div className="font-semibold text-sm">
                              {tenant.tenantName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {tenant.propertyAddress}
                            </div>
                            <div className="text-xs pt-1">
                              <div className="flex justify-between gap-4">
                                <span>Status:</span>
                                <span className="font-medium">
                                  {tenant.isPaidInFull
                                    ? "Paid"
                                    : remaining > 0 && tenant.totalPaid > 0
                                      ? "Partial"
                                      : "Pending"}
                                </span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span>Paid:</span>
                                <span className="font-medium">
                                  ${tenant.totalPaid.toLocaleString()} / $
                                  {tenant.expectedAmount.toLocaleString()}
                                </span>
                              </div>
                              {remaining > 0 && (
                                <div className="flex justify-between gap-4">
                                  <span>Remaining:</span>
                                  <span className="font-medium">
                                    ${remaining.toLocaleString()}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between gap-4">
                                <span>Progress:</span>
                                <span className="font-medium">
                                  {progress.toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </TooltipProvider>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {sortedTenants.map((tenant) => {
            const remaining = tenant.expectedAmount - tenant.totalPaid;
            const progress =
              tenant.expectedAmount > 0
                ? (tenant.totalPaid / tenant.expectedAmount) * 100
                : 0;

            return (
              <Card
                key={tenant.tenantId}
                ref={(el) => {
                  tenantRefs.current[tenant.tenantId] = el;
                }}
                className={`transition-all flex flex-col overflow-hidden ${
                  tenant.isPaidInFull
                    ? "border-green-500/50 bg-green-500/5"
                    : ""
                }`}
              >
                <Progress value={progress} className="h-1 rounded-none" />
                <CardHeader className="pb-2 pt-2.5 px-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <CardTitle
                          className={`text-sm md:text-base ${
                            tenant.isPaidInFull
                              ? "text-green-600 dark:text-green-400"
                              : ""
                          }`}
                        >
                          {tenant.tenantName}
                        </CardTitle>
                        {tenant.isPaidInFull && (
                          <Badge
                            variant="outline"
                            className="border-green-500/50 text-green-600 dark:text-green-400 text-xs py-0 h-4"
                          >
                            ✓ Paid
                          </Badge>
                        )}
                        {tenant.totalPaid === 0 && (
                          <Badge
                            variant="outline"
                            className="border-orange-500/50 text-orange-600 dark:text-orange-400 text-xs py-0 h-4"
                          >
                            Pending
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs mt-0.5">
                        {tenant.propertyAddress}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      <span className="text-muted-foreground">
                        ${tenant.totalPaid.toLocaleString()} / $
                        {tenant.expectedAmount.toLocaleString()}
                      </span>
                      {remaining > 0 && (
                        <span className="text-orange-600 dark:text-orange-400 font-semibold">
                          (${remaining.toLocaleString()})
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 px-3 pb-2.5 flex-1 flex flex-col">
                  <div className="flex-1 min-h-0">
                    {tenant.payments.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-xs font-medium text-muted-foreground">
                          {tenant.payments.length} payment
                          {tenant.payments.length !== 1 ? "s" : ""}
                        </div>
                        <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1 scrollbar-hide">
                          {tenant.payments.map((payment) => (
                            <div
                              key={payment.id}
                              className="flex items-center justify-between gap-2 p-1.5 rounded bg-muted/30 border border-border/50"
                            >
                              <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold font-mono">
                                  ${payment.paidAmount.toLocaleString()}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {payment.paymentDate || "No date"}
                                </span>
                                {payment.notes && (
                                  <span className="text-xs text-muted-foreground italic truncate">
                                    {payment.notes}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-0.5 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditPaymentDialog(payment)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Edit className="size-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleDeletePayment(payment.id)
                                  }
                                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="size-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto">
                    <Separator className="mb-3" />

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="default"
                        variant="default"
                        disabled={tenant.isPaidInFull}
                        onClick={() => handleQuickMarkPaidInFull(tenant)}
                        className="h-9 text-sm font-medium bg-green-600 hover:bg-green-700 text-white disabled:bg-green-600/50"
                      >
                        <Check className="mr-1.5 size-4" />
                        {tenant.isPaidInFull ? "Fully Paid" : "Mark Paid"}
                      </Button>
                      <Button
                        size="default"
                        disabled={tenant.isPaidInFull}
                        onClick={() => {
                          // Create a temporary collection object for tenants without payments
                          const tempCollection: RentCollectionResponse = tenant
                            .payments[0] || {
                            id: 0, // Placeholder ID, will be handled by API
                            propertyId: tenant.propertyId,
                            tenantId: tenant.tenantId,
                            tenantName: tenant.tenantName,
                            propertyAddress: tenant.propertyAddress,
                            expectedAmount: tenant.expectedAmount,
                            paidAmount: tenant.totalPaid,
                            paymentDate: null, // Will be set in dialog
                            isPaid: tenant.isPaidInFull,
                            notes: null,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                          };
                          openPaymentDialog(tempCollection);
                        }}
                        className="h-9 text-sm font-medium"
                      >
                        <Plus className="mr-1.5 size-4" />
                        {tenant.isPaidInFull ? "Paid in Full" : "Add Payment"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Dialog
          open={isPaymentDialogOpen}
          onOpenChange={setIsPaymentDialogOpen}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-base">Add Payment</DialogTitle>
              <DialogDescription className="text-xs">
                Record a payment for {selectedCollection?.tenantName}
                <br />
                Remaining balance: $
                {selectedCollection &&
                  (
                    selectedCollection.expectedAmount -
                    selectedCollection.paidAmount
                  ).toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="payment-amount" className="text-xs">
                  Payment Amount
                </Label>
                <Input
                  id="payment-amount"
                  type="text"
                  value={paymentAmount}
                  onChange={(e) =>
                    setPaymentAmount(formatCurrencyInput(e.target.value))
                  }
                  onBlur={(e) =>
                    setPaymentAmount(ensureDecimalPadding(e.target.value))
                  }
                  placeholder="$1,200.00"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payment-date" className="text-xs">
                  Payment Date
                </Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payment-notes" className="text-xs">
                  Notes
                </Label>
                <Textarea
                  id="payment-notes"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Add notes about this payment..."
                  className="min-h-[60px] text-sm"
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-1.5">
              <div className="flex gap-1.5 w-full sm:w-auto sm:ml-auto">
                <Button
                  variant="outline"
                  onClick={() => setIsPaymentDialogOpen(false)}
                  className="flex-1 sm:flex-none h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddPayment}
                  className="flex-1 sm:flex-none h-8 text-xs"
                >
                  Add Payment
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isEditPaymentDialogOpen}
          onOpenChange={setIsEditPaymentDialogOpen}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-base">
                Edit Payment Notes
              </DialogTitle>
              <DialogDescription className="text-xs">
                Update notes for ${editingPayment?.paidAmount.toLocaleString()}{" "}
                payment on{" "}
                {editingPayment &&
                  (() => {
                    const dateStr = editingPayment.paymentDate as string;
                    const [year, month, day] = dateStr.split("-").map(Number);
                    return new Date(year, month - 1, day).toLocaleDateString();
                  })()}
              </DialogDescription>
            </DialogHeader>
            <div className="py-2">
              <Textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Add notes about this payment..."
                className="min-h-[80px] text-sm"
              />
            </div>
            <DialogFooter className="gap-1.5">
              <Button
                variant="outline"
                onClick={() => setIsEditPaymentDialogOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdatePaymentNotes}
                className="h-8 text-xs"
              >
                Save Notes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
