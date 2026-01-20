"use client";

import { CardTitle } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { propertiesApi } from "@/lib/api/properties";
import { tenantsApi } from "@/lib/api/tenants";
import { marketListingsApi } from "@/lib/api/market-listings";
import type {
  PropertyResponse,
  MarketListingWithPreferenceResponse,
  ExpectedRentResponse,
} from "@/lib/api/types";
import {
  calculateInvestmentMetrics,
  estimateMonthlyPropertyTax,
  estimateMonthlyInsurance,
  meets2PercentRule,
  meets50PercentRule,
  calculatePriceToRentRatio,
  calculateCapRate,
  calculateDSCR,
  calculateBreakEvenRatio,
  calculateOperatingExpenseRatio,
  type FinancingStrategy,
} from "@/lib/investment-calculations";
import { isListingStale, formatTimeAgo } from "@/lib/listing-utils";
import {
  formatCurrencyInput,
  ensureDecimalPadding,
  parseCurrencyToNumber,
  formatPercentageInput,
  ensurePercentagePadding,
  parsePercentageToNumber,
} from "@/lib/currency-utils";
import {
  calculatePortfolioMetrics,
  calculatePortfolioTotals,
  createEmptyProperty,
  recalculateProperty,
  type PropertyData,
} from "@/lib/services/portfolio-calculations";
import { useAppSelector } from "@/store/hooks";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Info,
  Lock,
  Plus,
  RotateCcw,
  Star,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

const formatCompactCurrency = (value: number) => {
  const safeValue = value ?? 0;
  if (Math.abs(safeValue) >= 1000000) {
    return `$${(safeValue / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(safeValue) >= 100000) {
    return `$${(safeValue / 1000).toFixed(1)}K`;
  }
  return `$${safeValue.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};

const formatCompactPercent = (value: number) => {
  const safeValue = value ?? 0;
  return `${safeValue.toFixed(1)}%`;
};

const getValueColor = (value: number) => {
  const safeValue = value ?? 0;
  if (safeValue > 0) return "text-green-500";
  if (safeValue < 0) return "text-red-500";
  return "text-muted-foreground";
};

const getExpenseColor = () => {
  return "text-red-600 dark:text-red-400";
};

// Helper functions for formatting and colors (from market-listings)
const formatCurrency = (value?: number) => {
  if (!value) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const getCashflowColor = (cashflow?: number) => {
  if (cashflow === undefined)
    return { variant: "secondary" as const, className: "" };
  if (cashflow >= 200)
    return {
      variant: "default" as const,
      className: "bg-green-600 hover:bg-green-700",
    };
  if (cashflow >= 0)
    return {
      variant: "default" as const,
      className: "bg-yellow-600 hover:bg-yellow-700",
    };
  return {
    variant: "default" as const,
    className: "bg-red-600 hover:bg-red-700",
  };
};

const getCapRateColor = (capRate?: number) => {
  if (capRate === undefined)
    return { variant: "secondary" as const, className: "" };
  if (capRate >= 8)
    return {
      variant: "default" as const,
      className: "bg-green-600 hover:bg-green-700",
    };
  if (capRate >= 5)
    return {
      variant: "default" as const,
      className: "bg-yellow-600 hover:bg-yellow-700",
    };
  return {
    variant: "default" as const,
    className: "bg-red-600 hover:bg-red-700",
  };
};

const getCocColor = (coc?: number) => {
  if (coc === undefined)
    return { variant: "secondary" as const, className: "" };
  if (coc >= 8)
    return {
      variant: "default" as const,
      className: "bg-green-600 hover:bg-green-700",
    };
  if (coc >= 5)
    return {
      variant: "default" as const,
      className: "bg-yellow-600 hover:bg-yellow-700",
    };
  return {
    variant: "default" as const,
    className: "bg-red-600 hover:bg-red-700",
  };
};

const getPriceToRentColor = (ratio?: number) => {
  if (ratio === undefined)
    return { variant: "secondary" as const, className: "" };
  if (ratio <= 15)
    return {
      variant: "default" as const,
      className: "bg-green-600 hover:bg-green-700",
    };
  if (ratio <= 20)
    return {
      variant: "default" as const,
      className: "bg-yellow-600 hover:bg-yellow-700",
    };
  return {
    variant: "default" as const,
    className: "bg-red-600 hover:bg-red-700",
  };
};

const getSourceColor = (source: string) => {
  const sourceLower = source.toLowerCase();
  if (sourceLower.includes("redfin")) return "bg-red-500 hover:bg-red-600";
  if (sourceLower.includes("zillow")) return "bg-blue-500 hover:bg-blue-600";
  if (sourceLower.includes("realtor"))
    return "bg-purple-500 hover:bg-purple-600";
  if (sourceLower.includes("trulia"))
    return "bg-orange-500 hover:bg-orange-600";
  return "bg-gray-500 hover:bg-gray-600";
};

const getDSCRColor = (dscr?: number) => {
  if (dscr === undefined)
    return { variant: "secondary" as const, className: "" };
  if (dscr >= 1.25)
    return {
      variant: "default" as const,
      className: "bg-green-600 hover:bg-green-700",
    };
  if (dscr >= 1.0)
    return {
      variant: "default" as const,
      className: "bg-yellow-600 hover:bg-yellow-700",
    };
  return {
    variant: "default" as const,
    className: "bg-red-600 hover:bg-red-700",
  };
};

const getBreakEvenColor = (ratio?: number) => {
  if (ratio === undefined)
    return { variant: "secondary" as const, className: "" };
  if (ratio < 85)
    return {
      variant: "default" as const,
      className: "bg-green-600 hover:bg-green-700",
    };
  if (ratio < 100)
    return {
      variant: "default" as const,
      className: "bg-yellow-600 hover:bg-yellow-700",
    };
  return {
    variant: "default" as const,
    className: "bg-red-600 hover:bg-red-700",
  };
};

const getOERColor = (oer?: number) => {
  if (oer === undefined)
    return { variant: "secondary" as const, className: "" };
  if (oer <= 40)
    return {
      variant: "default" as const,
      className: "bg-green-600 hover:bg-green-700",
    };
  if (oer <= 50)
    return {
      variant: "default" as const,
      className: "bg-yellow-600 hover:bg-yellow-700",
    };
  return {
    variant: "default" as const,
    className: "bg-red-600 hover:bg-red-700",
  };
};

export default function PortfolioPage() {
  const { toast } = useToast();
  const { refreshKey, activePortfolioId } = useAppSelector(
    (state) => state.portfolio,
  );
  const STORAGE_KEY = `portfolio-modified-properties-${activePortfolioId}`;
  const FILTERS_STORAGE_KEY = `portfolio-filters-${activePortfolioId}`;

  // Helper function to load saved filters from localStorage
  const loadSavedFilters = () => {
    try {
      const savedFilters = localStorage.getItem(FILTERS_STORAGE_KEY);
      if (savedFilters) {
        return JSON.parse(savedFilters);
      }
    } catch (error) {
      console.error("Error reading filters from localStorage:", error);
    }
    return null;
  };

  const savedFilters = loadSavedFilters();

  const [originalProperties, setOriginalProperties] = useState<PropertyData[]>(
    [],
  );
  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [isModified, setIsModified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [includeVacant, setIncludeVacant] = useState(
    savedFilters?.includeVacant ?? true,
  );
  const [selectedStates, setSelectedStates] = useState<string[]>(
    savedFilters?.selectedStates ?? [],
  );
  const [cashFlowFilter, setCashFlowFilter] = useState<string>(
    savedFilters?.cashFlowFilter ?? "all",
  );
  const [debtFilter, setDebtFilter] = useState<string>(
    savedFilters?.debtFilter ?? "all",
  );
  const [minMarketValue, setMinMarketValue] = useState<number>(
    savedFilters?.minMarketValue ?? 0,
  );
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);

  // Interested listings state
  const [showInterestedDialog, setShowInterestedDialog] = useState(false);
  const [interestedListings, setInterestedListings] = useState<
    MarketListingWithPreferenceResponse[]
  >([]);
  const [loadingInterestedListings, setLoadingInterestedListings] =
    useState(false);
  const [temporaryProperties, setTemporaryProperties] = useState<
    PropertyData[]
  >([]);
  const [financingStrategy, setFinancingStrategy] = useState<FinancingStrategy>(
    {
      downPaymentType: "percent",
      downPaymentPercent: 20,
      downPaymentAmount: 100000,
      interestRate: 6.5,
      loanTermYears: 30,
    },
  );
  // Local state for input values to avoid update lag
  const [downPaymentPercentInput, setDownPaymentPercentInput] = useState("20");
  const [downPaymentAmountInput, setDownPaymentAmountInput] =
    useState("$100,000.00");
  const [interestRateInput, setInterestRateInput] = useState("6.5%");

  // Calculate max market value for slider
  const maxMarketValue = Math.max(
    ...properties.map((p) => p.marketValue ?? 0),
    500000,
  );

  // Check if any filters are active
  const hasActiveFilters =
    !includeVacant ||
    selectedStates.length > 0 ||
    cashFlowFilter !== "all" ||
    debtFilter !== "all" ||
    minMarketValue > 0;

  // Load interested listings when dialog opens
  useEffect(() => {
    if (showInterestedDialog && interestedListings.length === 0) {
      loadInterestedListings();
    }
  }, [showInterestedDialog]);

  // Recalculate listings when financing strategy changes
  useEffect(() => {
    if (showInterestedDialog && interestedListings.length > 0) {
      loadInterestedListings();
    }
  }, [
    financingStrategy.downPaymentType,
    financingStrategy.downPaymentPercent,
    financingStrategy.downPaymentAmount,
    financingStrategy.interestRate,
    financingStrategy.loanTermYears,
  ]);

  const loadInterestedListings = async () => {
    setLoadingInterestedListings(true);
    try {
      // Keep existing listings during recalculation for seamless update
      const listings =
        interestedListings.length > 0
          ? interestedListings
          : await marketListingsApi.getInterested();

      // Enrich with expected rent calculations
      const enrichedListings = await Promise.all(
        listings.map(async (listing) => {
          if (!listing.zipCode || !listing.bedrooms) return listing;

          try {
            const rentData = await marketListingsApi.getExpectedRent(
              listing.zipCode,
            );
            if (rentData) {
              const expectedRentData = rentData.find(
                (data) => data.bedrooms === listing.bedrooms,
              );
              if (expectedRentData && listing.price) {
                const expectedRent = expectedRentData.expectedRent;
                const metrics = calculateInvestmentMetrics(
                  listing.price,
                  expectedRent,
                  financingStrategy,
                  listing.hoaFee || 0,
                  estimateMonthlyPropertyTax(listing.price, listing.state),
                  estimateMonthlyInsurance(listing.price),
                );

                // Calculate additional rules of thumb
                const meets2Percent = meets2PercentRule(
                  expectedRent,
                  listing.price,
                );
                const meets50Percent = meets50PercentRule(
                  expectedRent,
                  metrics.monthlyMortgagePayment,
                );
                const priceToRent = calculatePriceToRentRatio(
                  listing.price,
                  expectedRent,
                );
                const capRate = calculateCapRate(listing.price, expectedRent);
                const dscr = calculateDSCR(
                  expectedRent,
                  metrics.monthlyMortgagePayment,
                );
                const breakEvenRatio = calculateBreakEvenRatio(
                  expectedRent,
                  metrics.monthlyMortgagePayment,
                );
                const oer = calculateOperatingExpenseRatio(expectedRent);

                return {
                  ...listing,
                  calculatedExpectedRent: expectedRent,
                  calculatedMonthlyPayment: metrics.monthlyMortgagePayment,
                  calculatedCashOnCash: metrics.cashOnCashReturn,
                  calculatedMeets1Percent: metrics.meets1PercentRule,
                  calculatedMeets2Percent: meets2Percent,
                  calculatedMeets50Percent: meets50Percent,
                  calculatedPriceToRent: priceToRent,
                  calculatedCapRate: capRate,
                  calculatedMonthlyCashflow: metrics.monthlyNetIncome,
                  calculatedTotalMonthlyExpenses: metrics.totalMonthlyExpenses,
                  calculatedMonthlyPropertyTax: metrics.monthlyPropertyTax,
                  calculatedMonthlyInsurance: metrics.monthlyInsurance,
                  calculatedDSCR: dscr,
                  calculatedBreakEvenRatio: breakEvenRatio,
                  calculatedOER: oer,
                };
              }
            }
          } catch (error) {
            console.warn(
              `Failed to calculate metrics for listing ${listing.id}`,
            );
          }
          return listing;
        }),
      );

      setInterestedListings(enrichedListings);
    } catch (error) {
      console.error("Failed to load interested listings:", error);
      toast({
        title: "Error",
        description: "Failed to load interested listings.",
        variant: "destructive",
      });
    } finally {
      setLoadingInterestedListings(false);
    }
  };

  const addListingToPortfolio = (
    listing: MarketListingWithPreferenceResponse,
  ) => {
    if (!listing.price || !listing.calculatedExpectedRent) {
      toast({
        title: "Cannot Add Listing",
        description: "This listing is missing required price or rent data.",
        variant: "destructive",
      });
      return;
    }

    const downPayment =
      financingStrategy.downPaymentType === "percent"
        ? listing.price * (financingStrategy.downPaymentPercent / 100)
        : financingStrategy.downPaymentAmount || 0;

    const debt = listing.price - downPayment;
    const equity = downPayment;

    const monthlyPropertyTax = estimateMonthlyPropertyTax(
      listing.price,
      listing.state,
    );
    const monthlyInsurance = estimateMonthlyInsurance(listing.price);

    const newProperty: PropertyData = {
      address: listing.address1 || listing.address || "Interested Listing",
      state: listing.state,
      marketValue: listing.price,
      equity,
      debt,
      equityPercent: (equity / listing.price) * 100,
      rent: listing.calculatedExpectedRent,
      hoa: listing.hoaFee || 0,
      reTax: monthlyPropertyTax,
      insurance: monthlyInsurance,
      otherExpenses: 0,
      interestRate: financingStrategy.interestRate,
      debtService: 0,
      noiMonthly: 0,
      noiYearly: 0,
      cashflow: 0,
      returnPercent: 0,
      isNew: true, // Mark as temporary
    };

    const recalculatedProperty = recalculateProperty(newProperty);
    setTemporaryProperties([...temporaryProperties, recalculatedProperty]);

    toast({
      title: "Listing Added",
      description: `${newProperty.address} has been temporarily added to your portfolio.`,
    });
  };

  const removeTemporaryProperty = (index: number) => {
    setTemporaryProperties(temporaryProperties.filter((_, i) => i !== index));
  };

  const resetTemporaryProperties = () => {
    setTemporaryProperties([]);
    toast({
      title: "Temporary Listings Cleared",
      description:
        "All temporary listings have been removed from the portfolio view.",
    });
  };

  const removeInterestedListing = async (id: string) => {
    try {
      await marketListingsApi.toggleInterested(id);
      setInterestedListings((prev) => prev.filter((l) => l.id !== id));
      toast({
        title: "Removed from Interested",
        description: "This listing has been removed from your interested list.",
      });
    } catch (error) {
      console.error("Failed to remove interested listing:", error);
      toast({
        title: "Error",
        description: "Failed to remove listing from interested.",
        variant: "destructive",
      });
    }
  };

  // Helper function to calculate down payment amount and percentage
  const getDownPaymentInfo = (price: number) => {
    if (
      financingStrategy.downPaymentType === "amount" &&
      financingStrategy.downPaymentAmount !== undefined
    ) {
      const amount = financingStrategy.downPaymentAmount;
      const percent = (amount / price) * 100;
      return { amount, percent };
    } else {
      const percent = financingStrategy.downPaymentPercent;
      const amount = price * (percent / 100);
      return { amount, percent };
    }
  };

  const resetFilters = () => {
    setIncludeVacant(true);
    setSelectedStates([]);
    setCashFlowFilter("all");
    setDebtFilter("all");
    setMinMarketValue(0);
    // Clear filters from localStorage
    try {
      localStorage.removeItem(FILTERS_STORAGE_KEY);
    } catch (storageError) {
      console.error("Error clearing filters from localStorage:", storageError);
    }
  };

  // Load saved changes from localStorage on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const props = await propertiesApi.getAll();

        const activeProps = props.filter((p: PropertyResponse) => !p.archived);

        const propertiesWithRent = await Promise.all(
          activeProps.map(async (p: PropertyResponse) => {
            const tenants = await tenantsApi.getAll({
              propertyId: p.id,
              activeOnly: true,
            });
            const totalRent = tenants.reduce(
              (sum, tenant) => sum + (tenant.monthlyRent ?? 0),
              0,
            );

            const propertyData: PropertyData = {
              address: `${p.address1}${p.address2 ? ` ${p.address2}` : ""}`,
              state: p.state,
              marketValue: p.marketValue ?? 0,
              equity: 0,
              debt: p.debt ?? 0,
              equityPercent: 0,
              rent: totalRent,
              hoa: p.monthlyHoa ?? 0,
              reTax: p.monthlyPropertyTax ?? 0,
              insurance: p.monthlyInsurance ?? 0,
              otherExpenses: 0,
              interestRate: p.interestRate ?? 0,
              debtService: 0,
              noiMonthly: 0,
              noiYearly: 0,
              cashflow: 0,
              returnPercent: 0,
            };
            return recalculateProperty(propertyData);
          }),
        );

        setOriginalProperties(propertiesWithRent);

        // Check for saved changes in localStorage
        try {
          const savedData = localStorage.getItem(STORAGE_KEY);
          if (savedData) {
            const savedProperties = JSON.parse(savedData) as PropertyData[];
            setProperties(savedProperties);
            setIsModified(true);
          } else {
            setProperties(propertiesWithRent);
          }
        } catch (storageError) {
          // If there's an error reading from localStorage, use fresh data
          console.error("Error reading from localStorage:", storageError);
          setProperties(propertiesWithRent);
        }

        setError(null);
      } catch (err) {
        setError("Failed to fetch operational summary data.");
        toast({
          title: "Error",
          description: "Could not load property data. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast, refreshKey, STORAGE_KEY]);

  const updateProperty = (
    index: number,
    field: keyof PropertyData,
    value: number,
  ) => {
    const updatedProperties = [...properties];
    updatedProperties[index] = {
      ...updatedProperties[index],
      [field]: value,
    };
    updatedProperties[index] = recalculateProperty(updatedProperties[index]);
    setProperties(updatedProperties);
    setIsModified(true);
  };

  const addNewProperty = () => {
    const newProperty = createEmptyProperty();
    setProperties([...properties, newProperty]);
    setIsModified(true);
  };

  const removeProperty = (index: number) => {
    const updatedProperties = properties.filter((_, i) => i !== index);
    setProperties(updatedProperties);
    setIsModified(true);
  };

  // Save modified properties to localStorage whenever they change
  useEffect(() => {
    if (isModified && properties.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(properties));
      } catch (storageError) {
        console.error("Error saving to localStorage:", storageError);
      }
    }
  }, [properties, isModified]);

  // Save filter selections to localStorage whenever they change
  useEffect(() => {
    try {
      const filters = {
        includeVacant,
        selectedStates,
        cashFlowFilter,
        debtFilter,
        minMarketValue,
      };
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
    } catch (storageError) {
      console.error("Error saving filters to localStorage:", storageError);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    includeVacant,
    selectedStates,
    cashFlowFilter,
    debtFilter,
    minMarketValue,
  ]);

  const resetToOriginal = () => {
    setProperties(originalProperties);
    setIsModified(false);
    // Clear saved changes from localStorage
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (storageError) {
      console.error("Error clearing localStorage:", storageError);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background px-2 md:px-4 py-3 md:hidden">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold">Portfolio</h1>
        </div>

        <main className="container mx-auto px-2 md:px-4 py-3 space-y-2">
          <div className="hidden md:block">
            <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
          </div>

          {/* Loading skeleton for key metrics */}
          <div className="bg-muted/30 rounded-lg p-3 border">
            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-x-4 gap-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-2 w-12" />
                </div>
              ))}
            </div>
          </div>

          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-96" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background px-2 md:px-4 py-3 md:hidden">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold">Portfolio</h1>
        </div>

        <main className="container mx-auto px-2 md:px-4 py-3 space-y-2">
          <div className="hidden md:block">
            <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-500">{error}</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const filteredProperties = includeVacant
    ? properties
    : properties.filter((p) => (p.rent ?? 0) > 0);
  const filteredOriginalProperties = includeVacant
    ? originalProperties
    : originalProperties.filter((p) => (p.rent ?? 0) > 0);

  // Apply additional filters
  const applyFilters = (props: PropertyData[]) => {
    let filtered = props;

    // State filter
    if (selectedStates.length > 0) {
      filtered = filtered.filter((p) => selectedStates.includes(p.state || ""));
    }

    // Cash flow filter
    if (cashFlowFilter === "positive") {
      filtered = filtered.filter((p) => (p.cashflow ?? 0) > 0);
    } else if (cashFlowFilter === "negative") {
      filtered = filtered.filter((p) => (p.cashflow ?? 0) < 0);
    }

    // Debt filter
    if (debtFilter === "with-debt") {
      filtered = filtered.filter((p) => (p.debt ?? 0) > 0);
    } else if (debtFilter === "no-debt") {
      filtered = filtered.filter((p) => (p.debt ?? 0) === 0);
    }

    // Min market value filter
    if (minMarketValue > 0) {
      filtered = filtered.filter((p) => (p.marketValue ?? 0) >= minMarketValue);
    }

    return filtered;
  };

  const finalFilteredProperties = applyFilters(filteredProperties);
  const finalFilteredOriginalProperties = applyFilters(
    filteredOriginalProperties,
  );

  // Combine actual properties with temporary properties for calculations
  const allProperties = [...finalFilteredProperties, ...temporaryProperties];
  const allOriginalProperties = finalFilteredOriginalProperties;

  const totals = calculatePortfolioTotals(allProperties);
  const baselineTotals = calculatePortfolioTotals(allOriginalProperties);

  const metrics = calculatePortfolioMetrics(allProperties, totals);
  const baselineMetrics = calculatePortfolioMetrics(
    allOriginalProperties,
    baselineTotals,
  );

  const {
    totalRentAnnual,
    totalRentMonthly,
    activeUnits,
    rentPerUnitPerMonth,
    cocReturn,
    leverage,
    dscr,
    leveredCashYield,
    unleveredCashYield,
    capRate,
    grm,
    opexRatio,
    propertyCount,
    avgPropertyValue,
    avgRentPerProperty,
  } = metrics;

  const {
    totalRentAnnual: baselineTotalRentAnnual,
    totalRentMonthly: baselineTotalRentMonthly,
    activeUnits: baselineActiveUnits,
    rentPerUnitPerMonth: baselineRentPerUnitPerMonth,
    cocReturn: baselineCocReturn,
    leverage: baselineLeverage,
    dscr: baselineDscr,
    leveredCashYield: baselineLeveredCashYield,
    unleveredCashYield: baselineUnleveredCashYield,
    capRate: baselineCapRate,
    grm: baselineGrm,
    opexRatio: baselineOpexRatio,
    propertyCount: baselinePropertyCount,
    avgPropertyValue: baselineAvgPropertyValue,
    avgRentPerProperty: baselineAvgRentPerProperty,
  } = baselineMetrics;

  const ChangeIndicator = ({
    current,
    baseline,
    isPercent = false,
    isCount = false,
  }: {
    current: number;
    baseline: number;
    isPercent?: boolean;
    isCount?: boolean;
  }) => {
    const formatValue = (val: number) => {
      if (isCount) return val.toFixed(0);
      if (isPercent) return formatCompactPercent(val);
      return formatCompactCurrency(val);
    };

    const formattedCurrent = formatValue(current);
    const formattedBaseline = formatValue(baseline);

    if (formattedCurrent === formattedBaseline) return null;

    const isIncrease = current > baseline;

    return (
      <div
        className={`flex items-center gap-0.5 whitespace-nowrap ${
          isIncrease
            ? "text-green-600 dark:text-green-400"
            : "text-red-600 dark:text-red-400"
        }`}
      >
        {isIncrease ? (
          <ArrowUp className="h-3 w-3 flex-shrink-0" />
        ) : (
          <ArrowDown className="h-3 w-3 flex-shrink-0" />
        )}
        <span className="text-[10px]">was {formattedBaseline}</span>
      </div>
    );
  };

  const SummaryMetric = ({
    label,
    value,
    baselineValue,
    isPercent = false,
    colorize = false,
    isExpense = false,
    suffix = "",
    tooltip,
    isCount = false,
  }: {
    label: string;
    value: number;
    baselineValue: number;
    isPercent?: boolean;
    colorize?: boolean;
    isExpense?: boolean;
    suffix?: string;
    tooltip?: string;
    isCount?: boolean;
  }) => {
    const safeValue = value ?? 0;
    const safeBaselineValue = baselineValue ?? 0;
    const formatValue = isCount
      ? (v: number) => v.toFixed(0)
      : isPercent
        ? formatCompactPercent
        : formatCompactCurrency;

    const formattedCurrent = suffix
      ? `${safeValue.toFixed(isCount ? 0 : 2)}${suffix}`
      : formatValue(safeValue);
    const formattedBaseline = suffix
      ? `${safeBaselineValue.toFixed(isCount ? 0 : 2)}${suffix}`
      : formatValue(safeBaselineValue);
    const hasChanged = formattedCurrent !== formattedBaseline;

    return (
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-0.5">
          <p className="text-[11px] text-muted-foreground truncate">{label}</p>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground cursor-help flex-shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[250px]">
                <p className="text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <p
            className={`text-sm font-semibold ${
              isExpense
                ? getExpenseColor()
                : colorize
                  ? getValueColor(safeValue)
                  : ""
            }`}
          >
            {formattedCurrent}
          </p>
          {hasChanged && (
            <ChangeIndicator
              current={safeValue}
              baseline={safeBaselineValue}
              isPercent={isPercent}
              isCount={isCount}
            />
          )}
        </div>
      </div>
    );
  };

  const EditableCell = ({
    value,
    index,
    field,
    isPercent = false,
    isExpense = false,
    isIncome = false,
    displayHasChangedOverride = true,
  }: {
    value: number;
    index: number;
    field: keyof PropertyData;
    isPercent?: boolean;
    isExpense?: boolean;
    isIncome?: boolean;
    displayHasChangedOverride?: boolean;
  }) => {
    const [isEditing, setIsEditing] = useState(false);
    const safeValue = value ?? 0;
    const [inputValue, setInputValue] = useState(safeValue.toString());
    const originalProperty = originalProperties[index];
    const baselineValue = originalProperty
      ? ((originalProperty[field] as number) ?? 0)
      : 0;
    const hasChanged = Math.abs(safeValue - baselineValue) >= 0.01;

    const handleBlur = () => {
      const numValue = Number.parseFloat(inputValue) || 0;
      updateProperty(index, field, numValue);
      setIsEditing(false);
    };

    if (isEditing) {
      return (
        <div className="flex justify-end w-full">
          <Input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleBlur();
              if (e.key === "Escape") {
                setInputValue(safeValue.toString());
                setIsEditing(false);
              }
            }}
            className="h-5 w-20 text-right text-xs px-0.5 py-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            autoFocus
          />
        </div>
      );
    }

    return (
      <button
        onClick={() => setIsEditing(true)}
        className="group flex flex-col items-end justify-center gap-0 w-full hover:bg-accent/50 rounded transition-colors min-h-[20px]"
      >
        <div className="flex items-center gap-0.5">
          <span
            className={`${
              isExpense
                ? "text-red-600 dark:text-red-400"
                : isIncome
                  ? "text-green-600 dark:text-green-400"
                  : "text-muted-foreground"
            } font-medium text-xs`}
          >
            {isPercent
              ? formatCompactPercent(safeValue)
              : formatCompactCurrency(safeValue)}
          </span>
          <Edit2
            className={`h-2.5 w-2.5 ${
              isExpense
                ? "text-red-600 dark:text-red-400"
                : isIncome
                  ? "text-green-600 dark:text-green-400"
                  : "text-muted-foreground"
            } opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0`}
          />
        </div>
        {displayHasChangedOverride && hasChanged && (
          <ChangeIndicator
            current={safeValue}
            baseline={baselineValue}
            isPercent={isPercent}
          />
        )}
      </button>
    );
  };

  const ReadOnlyCell = ({
    value,
    baselineValue,
    isPercent = false,
    colorize = false,
    isExpense = false,
    displayHasChangedOverride = true,
  }: {
    value: number;
    baselineValue: number;
    isPercent?: boolean;
    colorize?: boolean;
    isExpense?: boolean;
    displayHasChangedOverride?: boolean;
  }) => {
    const safeValue = value ?? 0;
    const safeBaselineValue = baselineValue ?? 0;
    const hasChanged = Math.abs(safeValue - safeBaselineValue) >= 0.01;

    return (
      <div className="flex flex-col items-end justify-center gap-0 min-h-[20px]">
        <div className="flex items-center gap-0.5">
          <span
            className={`${
              isExpense
                ? getExpenseColor()
                : colorize
                  ? getValueColor(safeValue)
                  : "text-muted-foreground"
            } font-medium text-xs`}
          >
            {isPercent
              ? formatCompactPercent(safeValue)
              : formatCompactCurrency(safeValue)}
          </span>
          <Lock className="h-2.5 w-2.5 text-muted-foreground/50 flex-shrink-0" />
        </div>
        {displayHasChangedOverride && hasChanged && (
          <ChangeIndicator
            current={safeValue}
            baseline={safeBaselineValue}
            isPercent={isPercent}
          />
        )}
      </div>
    );
  };

  const EditableAddressCell = ({
    value,
    state,
    index,
  }: {
    value: string;
    state?: string;
    index: number;
  }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState(value);

    const handleBlur = () => {
      const updatedProperties = [...properties];
      updatedProperties[index] = {
        ...updatedProperties[index],
        address: inputValue,
      };
      setProperties(updatedProperties);
      setIsEditing(false);
      setIsModified(true);
    };

    if (isEditing) {
      return (
        <div className="flex items-center gap-1 w-full">
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleBlur();
              if (e.key === "Escape") {
                setInputValue(value);
                setIsEditing(false);
              }
            }}
            className="h-5 max-w-[200px] text-left text-xs px-0.5 py-0"
            autoFocus
          />
          {state && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1 py-0 h-4 flex-shrink-0"
            >
              {state}
            </Badge>
          )}
        </div>
      );
    }

    return (
      <button
        onClick={() => setIsEditing(true)}
        className="group flex items-center gap-1 w-full hover:bg-accent/50 rounded transition-colors text-left min-h-[20px]"
        title={value}
      >
        <span className="text-blue-600 dark:text-blue-400 font-medium text-xs flex-1 truncate">
          {value}
        </span>
        {state && (
          <Badge
            variant="secondary"
            className="text-[10px] px-1 py-0 h-4 flex-shrink-0"
          >
            {state}
          </Badge>
        )}
        <Edit2 className="h-2.5 w-2.5 text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      </button>
    );
  };

  const hasNewProperties =
    properties.some((p) => p.isNew) || temporaryProperties.length > 0;

  // Get unique states from all properties
  const uniqueStates = Array.from(
    new Set(properties.map((p) => p.state).filter(Boolean)),
  ).sort() as string[];

  const toggleState = (state: string) => {
    setSelectedStates((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state],
    );
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background px-2 md:px-4 py-3 md:hidden flex-shrink-0">
        <SidebarTrigger />
        <h1 className="text-lg font-semibold">Portfolio</h1>
      </div>

      <main className="container mx-auto px-2 md:px-4 py-3 space-y-2 flex-1 flex flex-col overflow-hidden">
        <div className="hidden md:flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowInterestedDialog(true)}
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs px-3 bg-transparent hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent"
            >
              <Star className="h-3.5 w-3.5" />
              Interested Listings
              {temporaryProperties.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1.5">
                  {temporaryProperties.length}
                </Badge>
              )}
            </Button>
            {temporaryProperties.length > 0 && (
              <Button
                onClick={resetTemporaryProperties}
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-xs px-3 hover:bg-destructive hover:text-destructive-foreground"
              >
                <X className="h-3.5 w-3.5" />
                Clear Temporary
              </Button>
            )}
            <Button
              onClick={addNewProperty}
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs px-3 bg-transparent hover:bg-accent hover:text-accent-foreground  dark:hover:bg-accent"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Property
            </Button>
            {hasActiveFilters && (
              <Button
                onClick={resetFilters}
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-xs px-3 hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Filters
              </Button>
            )}
            {isModified && (
              <Button
                onClick={resetToOriginal}
                variant="destructive"
                size="sm"
                className="gap-1.5 h-8 text-xs px-3 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Changes
              </Button>
            )}
          </div>
        </div>

        {/* Key Metrics Section */}
        <div className="bg-muted/30 rounded-lg p-3 border flex-shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-x-4 gap-y-2">
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                NOI (mo)
              </span>
              <span
                className={`text-base font-bold ${
                  totals.noiMonthly > 0
                    ? "text-green-600 dark:text-green-400"
                    : totals.noiMonthly < 0
                      ? "text-red-600 dark:text-red-400"
                      : ""
                }`}
              >
                {formatCompactCurrency(totals.noiMonthly)}
              </span>
              {totals.noiMonthly !== baselineTotals.noiMonthly && (
                <span className="text-[9px] text-muted-foreground">
                  was {formatCompactCurrency(baselineTotals.noiMonthly)}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                NOI (yr)
              </span>
              <span
                className={`text-base font-bold ${
                  totals.noiYearly > 0
                    ? "text-green-600 dark:text-green-400"
                    : totals.noiYearly < 0
                      ? "text-red-600 dark:text-red-400"
                      : ""
                }`}
              >
                {formatCompactCurrency(totals.noiYearly)}
              </span>
              {totals.noiYearly !== baselineTotals.noiYearly && (
                <span className="text-[9px] text-muted-foreground">
                  was {formatCompactCurrency(baselineTotals.noiYearly)}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Debt Service
              </span>
              <span className="text-base font-bold text-red-600 dark:text-red-400">
                {formatCompactCurrency(totals.debtService)}
              </span>
              {totals.debtService !== baselineTotals.debtService && (
                <span className="text-[9px] text-muted-foreground">
                  was {formatCompactCurrency(baselineTotals.debtService)}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                CF (mo)
              </span>
              <span
                className={`text-base font-bold ${
                  totals.cashflowMonthly > 0
                    ? "text-green-600 dark:text-green-400"
                    : totals.cashflowMonthly < 0
                      ? "text-red-600 dark:text-red-400"
                      : ""
                }`}
              >
                {formatCompactCurrency(totals.cashflowMonthly)}
              </span>
              {totals.cashflowMonthly !== baselineTotals.cashflowMonthly && (
                <span className="text-[9px] text-muted-foreground">
                  was {formatCompactCurrency(baselineTotals.cashflowMonthly)}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                CF (yr)
              </span>
              <span
                className={`text-base font-bold ${
                  totals.cashflowYearly > 0
                    ? "text-green-600 dark:text-green-400"
                    : totals.cashflowYearly < 0
                      ? "text-red-600 dark:text-red-400"
                      : ""
                }`}
              >
                {formatCompactCurrency(totals.cashflowYearly)}
              </span>
              {totals.cashflowYearly !== baselineTotals.cashflowYearly && (
                <span className="text-[9px] text-muted-foreground">
                  was {formatCompactCurrency(baselineTotals.cashflowYearly)}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                CoC Return
              </span>
              <span
                className={`text-base font-bold ${
                  cocReturn > 0
                    ? "text-green-600 dark:text-green-400"
                    : cocReturn < 0
                      ? "text-red-600 dark:text-red-400"
                      : ""
                }`}
              >
                {formatCompactPercent(cocReturn)}
              </span>
              {cocReturn.toFixed(1) !== baselineCocReturn.toFixed(1) && (
                <span className="text-[9px] text-muted-foreground">
                  was {formatCompactPercent(baselineCocReturn)}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Total Asset
              </span>
              <span className="text-base font-bold">
                {formatCompactCurrency(totals.totalAssets)}
              </span>
              {totals.totalAssets !== baselineTotals.totalAssets && (
                <span className="text-[9px] text-muted-foreground">
                  was {formatCompactCurrency(baselineTotals.totalAssets)}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Total Debt
              </span>
              <span className="text-base font-bold">
                {formatCompactCurrency(totals.totalDebt)}
              </span>
              {totals.totalDebt !== baselineTotals.totalDebt && (
                <span className="text-[9px] text-muted-foreground">
                  was {formatCompactCurrency(baselineTotals.totalDebt)}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Total Equity
              </span>
              <span className="text-base font-bold text-primary">
                {formatCompactCurrency(totals.totalEquity)}
              </span>
              {totals.totalEquity !== baselineTotals.totalEquity && (
                <span className="text-[9px] text-muted-foreground">
                  was {formatCompactCurrency(baselineTotals.totalEquity)}
                </span>
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                Leverage
              </span>
              <span className="text-base font-bold">
                {formatCompactPercent(leverage)}
              </span>
              {leverage.toFixed(1) !== baselineLeverage.toFixed(1) && (
                <span className="text-[9px] text-muted-foreground">
                  was {formatCompactPercent(baselineLeverage)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <Collapsible
          open={isFiltersOpen}
          onOpenChange={setIsFiltersOpen}
          className="bg-muted/30 rounded-lg border flex-shrink-0"
        >
          <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 hover:bg-muted/50 transition-colors">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Filters
            </h2>
            <ChevronRight
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                isFiltersOpen ? "rotate-90" : ""
              }`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-3">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-4">
                {/* Include Vacant Properties */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="include-vacant"
                    checked={includeVacant}
                    onCheckedChange={(checked) =>
                      setIncludeVacant(checked === true)
                    }
                  />
                  <Label
                    htmlFor="include-vacant"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Include vacant
                  </Label>
                </div>

                {/* Cash Flow Filter */}
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="cashflow-filter"
                    className="text-sm font-normal"
                  >
                    Cash Flow:
                  </Label>
                  <Select
                    value={cashFlowFilter}
                    onValueChange={setCashFlowFilter}
                  >
                    <SelectTrigger
                      id="cashflow-filter"
                      className="h-8 w-[130px] text-xs"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="positive">Positive Only</SelectItem>
                      <SelectItem value="negative">Negative Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Debt Filter */}
                <div className="flex items-center gap-2">
                  <Label htmlFor="debt-filter" className="text-sm font-normal">
                    Debt:
                  </Label>
                  <Select value={debtFilter} onValueChange={setDebtFilter}>
                    <SelectTrigger
                      id="debt-filter"
                      className="h-8 w-[120px] text-xs"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="with-debt">With Debt</SelectItem>
                      <SelectItem value="no-debt">No Debt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* State Filter */}
              {uniqueStates.length > 0 && (
                <div className="flex items-start gap-2">
                  <Label className="text-sm font-normal pt-1">State:</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {uniqueStates.map((state) => (
                      <Badge
                        key={state}
                        variant={
                          selectedStates.includes(state) ? "default" : "outline"
                        }
                        className="cursor-pointer text-xs"
                        onClick={() => toggleState(state)}
                      >
                        {state}
                      </Badge>
                    ))}
                    {selectedStates.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 px-2 text-xs"
                        onClick={() => setSelectedStates([])}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Min Market Value Slider */}
              <div className="flex items-center gap-4">
                <Label
                  htmlFor="min-value"
                  className="text-sm font-normal whitespace-nowrap"
                >
                  Min Value:
                </Label>
                <div className="flex items-center gap-3 max-w-md">
                  <Input
                    id="min-value"
                    type="range"
                    min="0"
                    max={maxMarketValue}
                    step="10000"
                    value={minMarketValue}
                    onChange={(e) => setMinMarketValue(Number(e.target.value))}
                    className="w-64 cursor-pointer"
                  />
                  <span className="text-xs font-medium min-w-[80px] text-right">
                    {minMarketValue > 0
                      ? formatCompactCurrency(minMarketValue)
                      : "$0"}
                  </span>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <TooltipProvider>
          <Card className="flex-1 min-h-0">
            <CardContent className="p-2 h-full">
              <div className="flex flex-col lg:flex-row gap-3 h-full">
                <div
                  className={`lg:flex-shrink-0 lg:border-r lg:pr-2 space-y-2 overflow-y-auto scrollbar-hide max-h-[200px] lg:max-h-none transition-all duration-300 ${
                    isSidebarCollapsed ? "lg:w-[40px]" : "lg:w-[200px]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 pb-1 border-b sticky top-0 bg-background">
                    <h3
                      className={`text-xs font-semibold transition-opacity duration-300 ${
                        isSidebarCollapsed ? "lg:opacity-0 lg:hidden" : ""
                      }`}
                    >
                      Portfolio Metrics
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                      className="h-6 w-6 p-0 hidden lg:flex hover:bg-accent"
                      title={
                        isSidebarCollapsed
                          ? "Expand sidebar"
                          : "Collapse sidebar"
                      }
                    >
                      {isSidebarCollapsed ? (
                        <ChevronRight className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronLeft className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>

                  {!isSidebarCollapsed && (
                    <>
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mt-1">
                          Overview
                        </p>
                        <SummaryMetric
                          label="Properties"
                          value={propertyCount}
                          baselineValue={baselinePropertyCount}
                          suffix=" units"
                          tooltip="Total number of properties in your portfolio"
                          isCount={true}
                        />
                        <SummaryMetric
                          label="Avg Value"
                          value={avgPropertyValue}
                          baselineValue={baselineAvgPropertyValue}
                          tooltip="Average market value per property (Total Assets / Property Count)"
                        />
                        <SummaryMetric
                          label="Avg Rent"
                          value={avgRentPerProperty}
                          baselineValue={baselineAvgRentPerProperty}
                          tooltip="Average monthly rent per property (Total Rent / Property Count)"
                        />
                      </div>

                      <div className="border-t pt-1 mt-1" />

                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          Balance Sheet
                        </p>
                        <SummaryMetric
                          label="Assets"
                          value={totals.totalAssets}
                          baselineValue={baselineTotals.totalAssets}
                          tooltip="Total market value of all properties in your portfolio"
                        />
                        <SummaryMetric
                          label="Debt"
                          value={totals.totalDebt}
                          baselineValue={baselineTotals.totalDebt}
                          tooltip="Total outstanding mortgage debt across all properties"
                        />
                        <SummaryMetric
                          label="Equity"
                          value={totals.totalEquity}
                          baselineValue={baselineTotals.totalEquity}
                          tooltip="Your ownership stake in the properties (Assets - Debt)"
                        />
                        <SummaryMetric
                          label="Leverage"
                          value={leverage}
                          baselineValue={baselineLeverage}
                          isPercent
                          tooltip="Percentage of assets financed by debt (Debt / Assets). Higher leverage amplifies returns and risk."
                        />
                      </div>

                      <div className="border-t pt-1 mt-1" />

                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          Income
                        </p>
                        <SummaryMetric
                          label="Rent/mo"
                          value={totalRentMonthly}
                          baselineValue={baselineTotalRentMonthly}
                          tooltip="Total monthly rental income from all properties"
                        />
                        <SummaryMetric
                          label="Rent/yr"
                          value={totalRentAnnual}
                          baselineValue={baselineTotalRentAnnual}
                          tooltip="Total annual rental income (Monthly Rent × 12)"
                        />
                        <SummaryMetric
                          label="Rent/Unit"
                          value={rentPerUnitPerMonth}
                          baselineValue={baselineRentPerUnitPerMonth}
                          tooltip="Average monthly rent per rented unit (Total Rent / Active Units)"
                        />
                      </div>

                      <div className="border-t pt-1 mt-1" />

                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          Operating Performance
                        </p>
                        <SummaryMetric
                          label="OpEx/mo"
                          value={totals.totalExpensesMonthly}
                          baselineValue={baselineTotals.totalExpensesMonthly}
                          isExpense
                          tooltip="Total monthly operating expenses (HOA + Tax + Insurance + Other)"
                        />
                        <SummaryMetric
                          label="OpEx/yr"
                          value={totals.totalExpensesMonthly * 12}
                          baselineValue={
                            baselineTotals.totalExpensesMonthly * 12
                          }
                          isExpense
                          tooltip="Total annual operating expenses (Monthly OpEx × 12)"
                        />
                        <SummaryMetric
                          label="OpEx Ratio"
                          value={opexRatio}
                          baselineValue={baselineOpexRatio}
                          isPercent
                          isExpense
                          tooltip="Operating expenses as a percentage of gross rent (OpEx / Gross Rent). Lower is better."
                        />
                        <SummaryMetric
                          label="NOI/mo"
                          value={totals.noiMonthly}
                          baselineValue={baselineTotals.noiMonthly}
                          colorize
                          tooltip="Net Operating Income per month (Rent - Operating Expenses). Excludes debt service."
                        />
                        <SummaryMetric
                          label="NOI/yr"
                          value={totals.noiYearly}
                          baselineValue={baselineTotals.noiYearly}
                          colorize
                          tooltip="Net Operating Income per year (Monthly NOI × 12). Key metric for property valuation."
                        />
                      </div>

                      <div className="border-t pt-1 mt-1" />

                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          Debt Service
                        </p>
                        <SummaryMetric
                          label="DS/mo"
                          value={totals.debtService}
                          baselineValue={baselineTotals.debtService}
                          isExpense
                          tooltip="Total monthly mortgage payments across all properties"
                        />
                        <SummaryMetric
                          label="DS/yr"
                          value={totals.debtService * 12}
                          baselineValue={baselineTotals.debtService * 12}
                          isExpense
                          tooltip="Total annual mortgage payments (Monthly DS × 12)"
                        />
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-0.5">
                            <p className="text-[11px] text-muted-foreground">
                              DSCR
                            </p>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground cursor-help flex-shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent
                                side="right"
                                className="max-w-[250px]"
                              >
                                <p className="text-xs">
                                  Debt Service Coverage Ratio (NOI / Debt
                                  Service). Measures ability to cover debt
                                  payments. 1.25+ is healthy, below 1.0 means
                                  negative cash flow.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <div className="flex flex-col items-end gap-0.5">
                            <p
                              className={`text-sm font-semibold ${
                                dscr >= 1.25
                                  ? "text-green-500"
                                  : dscr >= 1.0
                                    ? "text-yellow-500"
                                    : "text-red-500"
                              }`}
                            >
                              {dscr > 0 ? `${dscr.toFixed(2)}x` : "N/A"}
                            </p>
                            {dscr > 0 &&
                              baselineDscr > 0 &&
                              dscr.toFixed(2) !== baselineDscr.toFixed(2) && (
                                <div
                                  className={`flex items-center gap-0.5 whitespace-nowrap ${
                                    dscr > baselineDscr
                                      ? "text-green-600 dark:text-green-400"
                                      : "text-red-600 dark:text-red-400"
                                  }`}
                                >
                                  {dscr > baselineDscr ? (
                                    <ArrowUp className="h-3 w-3 flex-shrink-0" />
                                  ) : (
                                    <ArrowDown className="h-3 w-3 flex-shrink-0" />
                                  )}
                                  <span className="text-[10px]">
                                    was {baselineDscr.toFixed(2)}x
                                  </span>
                                </div>
                              )}
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-1 mt-1" />

                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                          Cash Flow & Returns
                        </p>
                        <SummaryMetric
                          label="CF/mo"
                          value={totals.cashflowMonthly}
                          baselineValue={baselineTotals.cashflowMonthly}
                          colorize
                          tooltip="Monthly cash flow after all expenses and debt service (NOI - Debt Service)"
                        />
                        <SummaryMetric
                          label="CF/yr"
                          value={totals.cashflowYearly}
                          baselineValue={baselineTotals.cashflowYearly}
                          colorize
                          tooltip="Annual cash flow after all expenses and debt service (Monthly CF × 12)"
                        />
                        <SummaryMetric
                          label="CoC Ret"
                          value={cocReturn}
                          baselineValue={baselineCocReturn}
                          isPercent
                          colorize
                          tooltip="Cash-on-Cash Return: Annual cash flow as a percentage of equity invested (CF / Equity). Measures levered return."
                        />
                        <SummaryMetric
                          label="Cap Rate"
                          value={capRate}
                          baselineValue={baselineCapRate}
                          isPercent
                          colorize
                          tooltip="Capitalization Rate: NOI as a percentage of property value (NOI / Market Value). Measures unlevered return."
                        />
                        <SummaryMetric
                          label="Lev Yield"
                          value={leveredCashYield}
                          baselineValue={baselineLeveredCashYield}
                          isPercent
                          colorize
                          tooltip="Levered Cash Yield: Annual cash flow as a percentage of equity (CF / Equity). Same as CoC Return."
                        />
                        <SummaryMetric
                          label="Unlev Yield"
                          value={unleveredCashYield}
                          baselineValue={baselineUnleveredCashYield}
                          isPercent
                          colorize
                          tooltip="Unlevered Cash Yield: NOI as a percentage of total assets (NOI / Assets). Return without debt."
                        />
                        <SummaryMetric
                          label="GRM"
                          value={grm}
                          baselineValue={baselineGrm}
                          suffix="x"
                          tooltip="Gross Rent Multiplier: Property value divided by annual rent (Market Value / Annual Rent). Lower is better for investors."
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground pb-2 border-b mb-2 flex-shrink-0">
                    <div className="flex items-center gap-0.5">
                      <Edit2 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      <span>Editable</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Lock className="h-3 w-3" />
                      <span>Calculated</span>
                    </div>
                    {temporaryProperties.length > 0 && (
                      <div className="flex items-center gap-0.5 ml-auto">
                        <Star className="h-3 w-3 text-yellow-500" />
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">
                          {temporaryProperties.length} Temporary Listing
                          {temporaryProperties.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-h-0 overflow-auto">
                    <div className="min-w-fit">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-background z-10">
                          <tr className="border-b border-border">
                            {hasNewProperties && (
                              <th className="py-0 px-0"></th>
                            )}
                            <th className="text-left py-0 px-0.5 font-semibold text-foreground whitespace-nowrap">
                              <Tooltip>
                                <TooltipTrigger>Address</TooltipTrigger>
                                <TooltipContent>
                                  Property Address
                                </TooltipContent>
                              </Tooltip>
                            </th>
                            <th className="text-right py-0 px-0.5 font-semibold text-foreground whitespace-nowrap">
                              <Tooltip>
                                <TooltipTrigger className="w-full flex items-center justify-end gap-0.5">
                                  Market{" "}
                                  <Edit2 className="h-2 w-2 text-blue-600 dark:text-blue-400" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  Market Value (Editable)
                                </TooltipContent>
                              </Tooltip>
                            </th>
                            <th className="text-right py-0 px-0.5 font-semibold text-foreground whitespace-nowrap">
                              <Tooltip>
                                <TooltipTrigger className="w-full flex items-center justify-end gap-0.5">
                                  Equity <Lock className="h-2 w-2" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  Equity (Calculated)
                                </TooltipContent>
                              </Tooltip>
                            </th>
                            <th className="text-right py-0 px-0.5 font-semibold text-foreground whitespace-nowrap">
                              <Tooltip>
                                <TooltipTrigger className="w-full flex items-center justify-end gap-0.5">
                                  Debt{" "}
                                  <Edit2 className="h-2 w-2 text-blue-600 dark:text-blue-400" />
                                </TooltipTrigger>
                                <TooltipContent>Debt (Editable)</TooltipContent>
                              </Tooltip>
                            </th>
                            <th className="text-right py-0 px-0.5 font-semibold text-foreground whitespace-nowrap">
                              <Tooltip>
                                <TooltipTrigger className="w-full flex items-center justify-end gap-0.5">
                                  Eq% <Lock className="h-2 w-2" />
                                </TooltipTrigger>
                                <TooltipContent>Equity %</TooltipContent>
                              </Tooltip>
                            </th>
                            <th className="text-right py-0 px-0.5 font-semibold text-foreground whitespace-nowrap">
                              <Tooltip>
                                <TooltipTrigger className="w-full flex items-center justify-end gap-0.5">
                                  Rent{" "}
                                  <Edit2 className="h-2 w-2 text-blue-600 dark:text-blue-400" />
                                </TooltipTrigger>
                                <TooltipContent>Rent (Editable)</TooltipContent>
                              </Tooltip>
                            </th>
                            <th className="text-right py-0 px-0.5 font-semibold text-foreground whitespace-nowrap">
                              <Tooltip>
                                <TooltipTrigger className="w-full flex items-center justify-end gap-0.5">
                                  HOA{" "}
                                  <Edit2 className="h-2 w-2 text-blue-600 dark:text-blue-400" />
                                </TooltipTrigger>
                                <TooltipContent>HOA (Editable)</TooltipContent>
                              </Tooltip>
                            </th>
                            <th className="text-right py-0 px-0.5 font-semibold text-foreground whitespace-nowrap">
                              <Tooltip>
                                <TooltipTrigger className="w-full flex items-center justify-end gap-0.5">
                                  Tax{" "}
                                  <Edit2 className="h-2 w-2 text-blue-600 dark:text-blue-400" />
                                </TooltipTrigger>
                                <TooltipContent>Tax (Editable)</TooltipContent>
                              </Tooltip>
                            </th>
                            <th className="text-right py-0 px-0.5 font-semibold text-foreground whitespace-nowrap">
                              <Tooltip>
                                <TooltipTrigger className="w-full flex items-center justify-end gap-0.5">
                                  Ins{" "}
                                  <Edit2 className="h-2 w-2 text-blue-600 dark:text-blue-400" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  Insurance (Editable)
                                </TooltipContent>
                              </Tooltip>
                            </th>
                            <th className="text-right py-0 px-0.5 font-semibold text-foreground whitespace-nowrap">
                              <Tooltip>
                                <TooltipTrigger className="w-full flex items-center justify-end gap-0.5">
                                  Other{" "}
                                  <Edit2 className="h-2 w-2 text-blue-600 dark:text-blue-400" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  Other Expenses (Editable)
                                </TooltipContent>
                              </Tooltip>
                            </th>
                            <th className="text-right py-0 px-0.5 font-semibold text-foreground whitespace-nowrap">
                              <Tooltip>
                                <TooltipTrigger className="w-full flex items-center justify-end gap-0.5">
                                  Rate{" "}
                                  <Edit2 className="h-2 w-2 text-blue-600 dark:text-blue-400" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  Interest Rate % (Editable)
                                </TooltipContent>
                              </Tooltip>
                            </th>
                            <th className="text-right py-0 px-0.5 font-semibold text-foreground whitespace-nowrap">
                              <Tooltip>
                                <TooltipTrigger className="w-full flex items-center justify-end gap-0.5">
                                  Debt Svc <Lock className="h-2 w-2" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  Debt Service (Calculated)
                                </TooltipContent>
                              </Tooltip>
                            </th>
                            <th className="text-right py-0 px-0.5 font-semibold text-foreground whitespace-nowrap">
                              <Tooltip>
                                <TooltipTrigger className="w-full flex items-center justify-end gap-0.5">
                                  NOI <Lock className="h-2 w-2" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  NOI Monthly (Calculated)
                                </TooltipContent>
                              </Tooltip>
                            </th>
                            <th className="text-right py-0 px-0.5 font-semibold text-foreground whitespace-nowrap">
                              <Tooltip>
                                <TooltipTrigger className="w-full flex items-center justify-end gap-0.5">
                                  Cash Flow <Lock className="h-2 w-2" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  Monthly Cash Flow (Calculated)
                                </TooltipContent>
                              </Tooltip>
                            </th>
                            <th className="text-right py-0 px-0.5 font-semibold text-foreground whitespace-nowrap">
                              <Tooltip>
                                <TooltipTrigger className="w-full flex items-center justify-end gap-0.5">
                                  Return <Lock className="h-2 w-2" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  Return % (Calculated)
                                </TooltipContent>
                              </Tooltip>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {finalFilteredProperties.map((property, index) => {
                            const originalIndex = properties.indexOf(property);
                            const originalProperty =
                              originalProperties[originalIndex];
                            return (
                              <tr
                                key={index}
                                className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                              >
                                {hasNewProperties && (
                                  <td className="py-0 px-0">
                                    {property.isNew && (
                                      <Button
                                        onClick={() =>
                                          removeProperty(originalIndex)
                                        }
                                        variant="ghost"
                                        size="sm"
                                        className="h-4 w-4 p-0 hover:bg-destructive/10 hover:text-destructive"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </td>
                                )}
                                <td className="py-0 px-0.5 font-medium text-xs">
                                  {property.isNew ? (
                                    <EditableAddressCell
                                      value={property.address}
                                      state={property.state}
                                      index={originalIndex}
                                    />
                                  ) : (
                                    <div className="flex items-center gap-1 min-w-[150px] max-w-[250px]">
                                      <span
                                        className="truncate flex-1"
                                        title={property.address}
                                      >
                                        {property.address}
                                      </span>
                                      {property.state && (
                                        <Badge
                                          variant="secondary"
                                          className="text-[10px] px-1 py-0 h-4 flex-shrink-0"
                                        >
                                          {property.state}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="text-right py-0 px-0.5 whitespace-nowrap">
                                  <EditableCell
                                    value={property.marketValue}
                                    index={originalIndex}
                                    field="marketValue"
                                  />
                                </td>
                                <td className="text-right py-0 px-0.5 whitespace-nowrap">
                                  <ReadOnlyCell
                                    value={property.equity}
                                    baselineValue={
                                      originalProperty?.equity ?? 0
                                    }
                                  />
                                </td>
                                <td className="text-right py-0 px-0.5 whitespace-nowrap">
                                  <EditableCell
                                    value={property.debt}
                                    index={originalIndex}
                                    field="debt"
                                    isExpense
                                  />
                                </td>
                                <td className="text-right py-0 px-0.5 whitespace-nowrap">
                                  <ReadOnlyCell
                                    value={property.equityPercent}
                                    baselineValue={
                                      originalProperty?.equityPercent ?? 0
                                    }
                                    isPercent
                                  />
                                </td>
                                <td className="text-right py-0 px-0.5 whitespace-nowrap">
                                  <EditableCell
                                    value={property.rent}
                                    index={originalIndex}
                                    field="rent"
                                    isIncome
                                  />
                                </td>
                                <td className="text-right py-0 px-0.5 whitespace-nowrap">
                                  <EditableCell
                                    value={property.hoa}
                                    index={originalIndex}
                                    field="hoa"
                                    isExpense
                                  />
                                </td>
                                <td className="text-right py-0 px-0.5 whitespace-nowrap">
                                  <EditableCell
                                    value={property.reTax}
                                    index={originalIndex}
                                    field="reTax"
                                    isExpense
                                  />
                                </td>
                                <td className="text-right py-0 px-0.5 whitespace-nowrap">
                                  <EditableCell
                                    value={property.insurance}
                                    index={originalIndex}
                                    field="insurance"
                                    isExpense
                                  />
                                </td>
                                <td className="text-right py-0 px-0.5 whitespace-nowrap">
                                  <EditableCell
                                    value={property.otherExpenses}
                                    index={originalIndex}
                                    field="otherExpenses"
                                    isExpense
                                  />
                                </td>
                                <td className="text-right py-0 px-0.5 whitespace-nowrap">
                                  <EditableCell
                                    value={property.interestRate}
                                    index={originalIndex}
                                    field="interestRate"
                                    isPercent
                                  />
                                </td>
                                <td className="text-right py-0 px-0.5 whitespace-nowrap">
                                  <ReadOnlyCell
                                    value={property.debtService}
                                    baselineValue={
                                      originalProperty?.debtService ?? 0
                                    }
                                    isExpense
                                  />
                                </td>
                                <td className="text-right py-0 px-0.5 whitespace-nowrap">
                                  <ReadOnlyCell
                                    value={property.noiMonthly}
                                    baselineValue={
                                      originalProperty?.noiMonthly ?? 0
                                    }
                                    colorize
                                  />
                                </td>
                                <td className="text-right py-0 px-0.5 whitespace-nowrap">
                                  <ReadOnlyCell
                                    value={property.cashflow}
                                    baselineValue={
                                      originalProperty?.cashflow ?? 0
                                    }
                                    colorize
                                  />
                                </td>
                                <td className="text-right py-0 px-0.5 whitespace-nowrap">
                                  <ReadOnlyCell
                                    value={property.returnPercent}
                                    baselineValue={
                                      originalProperty?.returnPercent ?? 0
                                    }
                                    isPercent
                                    colorize
                                  />
                                </td>
                              </tr>
                            );
                          })}

                          {/* Temporary Properties from Interested Listings */}
                          {temporaryProperties.map((property, tempIndex) => {
                            return (
                              <tr
                                key={`temp-${tempIndex}`}
                                className="border-b border-border/50 hover:bg-muted/30 transition-colors bg-blue-50 dark:bg-blue-950/20"
                              >
                                {hasNewProperties && (
                                  <td className="py-0 px-0">
                                    <Button
                                      onClick={() =>
                                        removeTemporaryProperty(tempIndex)
                                      }
                                      variant="ghost"
                                      size="sm"
                                      className="h-4 w-4 p-0 hover:bg-destructive/10 hover:text-destructive"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </td>
                                )}
                                <td className="py-0 px-0.5 font-medium text-xs">
                                  <div className="flex items-center gap-1 min-w-[150px] max-w-[250px]">
                                    <span
                                      className="truncate flex-1"
                                      title={property.address}
                                    >
                                      {property.address}
                                    </span>
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] px-1 py-0 h-4 flex-shrink-0 bg-blue-500 text-white"
                                    >
                                      TEMP
                                    </Badge>
                                    {property.state && (
                                      <Badge
                                        variant="secondary"
                                        className="text-[10px] px-1 py-0 h-4 flex-shrink-0"
                                      >
                                        {property.state}
                                      </Badge>
                                    )}
                                  </div>
                                </td>
                                <td className="text-right py-0 px-0.5 whitespace-nowrap">
                                  <ReadOnlyCell
                                    value={property.marketValue}
                                    baselineValue={0}
                                    displayHasChangedOverride={false}
                                  />
                                </td>
                                <td className="text-right py-0 px-0.5 whitespace-nowrap">
                                  <ReadOnlyCell
                                    value={property.equity}
                                    baselineValue={0}
                                    displayHasChangedOverride={false}
                                  />
                                </td>
                                <td className="text-right py-0 px-0.5 whitespace-nowrap">
                                  <ReadOnlyCell
                                    value={property.debt}
                                    baselineValue={0}
                                    displayHasChangedOverride={false}
                                  />
                                </td>
                                <td className="text-right py-0 px-0.5 whitespace-nowrap">
                                  <ReadOnlyCell
                                    value={property.equityPercent}
                                    baselineValue={0}
                                    isPercent
                                    displayHasChangedOverride={false}
                                  />
                                </td>
                                <td className="text-right py-0 px-0.5 whitespace-nowrap">
                                  <ReadOnlyCell
                                    value={property.rent}
                                    baselineValue={0}
                                    displayHasChangedOverride={false}
                                  />
                                </td>
                                <td className="text-right py-0 px-0.5 whitespace-nowrap">
                                  <ReadOnlyCell
                                    value={property.hoa}
                                    baselineValue={0}
                                    isExpense
                                    displayHasChangedOverride={false}
                                  />
                                </td>
                                <td className="text-right py-0 px-0.5 whitespace-nowrap">
                                  <ReadOnlyCell
                                    value={property.reTax}
                                    baselineValue={0}
                                    isExpense
                                    displayHasChangedOverride={false}
                                  />
                                </td>
                                <td className="text-right py-0 px-0.5 whitespace-nowrap">
                                  <ReadOnlyCell
                                    value={property.insurance}
                                    baselineValue={0}
                                    isExpense
                                    displayHasChangedOverride={false}
                                  />
                                </td>
                                <td className="text-right py-0 px-0.5 whitespace-nowrap">
                                  <ReadOnlyCell
                                    value={property.otherExpenses}
                                    baselineValue={0}
                                    isExpense
                                    displayHasChangedOverride={false}
                                  />
                                </td>
                                <td className="text-right py-0 px-0.5 whitespace-nowrap">
                                  <ReadOnlyCell
                                    value={property.interestRate}
                                    baselineValue={0}
                                    isPercent
                                    displayHasChangedOverride={false}
                                  />
                                </td>
                                <td className="text-right py-0 px-0.5 whitespace-nowrap">
                                  <ReadOnlyCell
                                    value={property.debtService}
                                    baselineValue={0}
                                    isExpense
                                    displayHasChangedOverride={false}
                                  />
                                </td>
                                <td className="text-right py-0 px-0.5 whitespace-nowrap">
                                  <ReadOnlyCell
                                    value={property.noiMonthly}
                                    baselineValue={0}
                                    colorize
                                    displayHasChangedOverride={false}
                                  />
                                </td>
                                <td className="text-right py-0 px-0.5 whitespace-nowrap">
                                  <ReadOnlyCell
                                    value={property.cashflow}
                                    baselineValue={0}
                                    colorize
                                    displayHasChangedOverride={false}
                                  />
                                </td>
                                <td className="text-right py-0 px-0.5 whitespace-nowrap">
                                  <ReadOnlyCell
                                    value={property.returnPercent}
                                    baselineValue={0}
                                    isPercent
                                    colorize
                                    displayHasChangedOverride={false}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TooltipProvider>
      </main>

      {/* Interested Listings Dialog */}
      <Dialog
        open={showInterestedDialog}
        onOpenChange={setShowInterestedDialog}
      >
        <DialogContent className="max-w-[98vw] lg:max-w-[95vw] xl:max-w-[92vw] h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Add Interested Listings to Portfolio</DialogTitle>
            <DialogDescription>
              Select listings to temporarily add to your portfolio and see how
              they affect your metrics. These will not be saved to your actual
              portfolio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-y-auto min-h-0">
            {/* Financing Strategy Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Financing Strategy (30-Year Fixed)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Down Payment Type</Label>
                    <Select
                      value={financingStrategy.downPaymentType}
                      onValueChange={(value: "percent" | "amount") => {
                        setFinancingStrategy({
                          ...financingStrategy,
                          downPaymentType: value,
                        });
                        // Sync input values when switching modes
                        if (value === "percent") {
                          setDownPaymentPercentInput(
                            financingStrategy.downPaymentPercent.toString(),
                          );
                        } else {
                          // Format the amount as currency when switching to amount mode
                          const amount =
                            financingStrategy.downPaymentAmount || 100000;
                          setDownPaymentAmountInput(
                            ensureDecimalPadding(amount.toString()),
                          );
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">Percentage</SelectItem>
                        <SelectItem value="amount">Cash Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {financingStrategy.downPaymentType === "percent" ? (
                    <div className="space-y-2">
                      <Label>Down Payment %</Label>
                      <Input
                        type="number"
                        value={downPaymentPercentInput}
                        onChange={(e) =>
                          setDownPaymentPercentInput(e.target.value)
                        }
                        onBlur={(e) =>
                          setFinancingStrategy({
                            ...financingStrategy,
                            downPaymentPercent: parseFloat(e.target.value) || 0,
                          })
                        }
                        min={0}
                        max={100}
                        step={0.5}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Down Payment Amount</Label>
                      <Input
                        type="text"
                        value={downPaymentAmountInput}
                        onChange={(e) =>
                          setDownPaymentAmountInput(
                            formatCurrencyInput(e.target.value),
                          )
                        }
                        onBlur={(e) => {
                          const formatted = ensureDecimalPadding(
                            e.target.value,
                          );
                          setDownPaymentAmountInput(formatted);
                          setFinancingStrategy({
                            ...financingStrategy,
                            downPaymentAmount:
                              parseCurrencyToNumber(formatted) || 0,
                          });
                        }}
                        placeholder="$200,000.00"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Interest Rate</Label>
                    <Input
                      type="text"
                      value={interestRateInput}
                      onChange={(e) =>
                        setInterestRateInput(
                          formatPercentageInput(e.target.value),
                        )
                      }
                      onBlur={(e) => {
                        const formatted = ensurePercentagePadding(
                          e.target.value,
                        );
                        setInterestRateInput(formatted);
                        setFinancingStrategy({
                          ...financingStrategy,
                          interestRate: parsePercentageToNumber(formatted) || 0,
                        });
                      }}
                      placeholder="6.125%"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Listings List */}
            {interestedListings.length === 0 && !loadingInterestedListings ? (
              <div className="text-center py-8">
                <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No interested listings found. Mark listings as interested in
                  the Market Listings page.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {loadingInterestedListings &&
                  interestedListings.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        Loading interested listings...
                      </p>
                    </div>
                  )}
                {interestedListings.length > 0 && (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-muted-foreground">
                        {interestedListings.length} Interested Listing
                        {interestedListings.length !== 1 ? "s" : ""}
                      </h3>
                      {loadingInterestedListings && (
                        <span className="text-[10px] text-muted-foreground animate-pulse">
                          Recalculating...
                        </span>
                      )}
                    </div>
                    <Card>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-8 p-2"></TableHead>
                                <TableHead className="p-2 min-w-[140px]">
                                  Address / Location
                                </TableHead>
                                <TableHead className="text-right p-2">
                                  <div className="text-xs">Price</div>
                                </TableHead>
                                <TableHead className="text-right p-2 w-24">
                                  <div className="text-xs">Down / %</div>
                                </TableHead>
                                <TableHead className="text-center p-2 w-12">
                                  <div className="text-xs">Bd/Ba</div>
                                </TableHead>
                                <TableHead className="text-right p-2 w-16">
                                  <div className="text-xs">Sqft</div>
                                </TableHead>
                                <TableHead className="text-center p-2 w-12">
                                  <div className="text-xs">DOM</div>
                                </TableHead>
                                {/* Analysis Sections */}
                                <TableHead className="text-right p-2 w-20 bg-blue-50 dark:bg-blue-950/20">
                                  <div className="text-xs">Rent</div>
                                </TableHead>
                                <TableHead className="text-center p-2 w-12 bg-purple-50 dark:bg-purple-950/20">
                                  <div className="text-xs">1%</div>
                                </TableHead>
                                <TableHead className="text-center p-2 w-12 bg-purple-50 dark:bg-purple-950/20">
                                  <div className="text-xs">2%</div>
                                </TableHead>
                                <TableHead className="text-center p-2 w-12 bg-purple-50 dark:bg-purple-950/20">
                                  <div className="text-xs">50%</div>
                                </TableHead>
                                <TableHead className="text-right p-2 w-20 bg-green-50 dark:bg-green-950/20">
                                  <div className="text-xs">CF/mo</div>
                                </TableHead>
                                <TableHead className="text-right p-2 w-16 bg-green-50 dark:bg-green-950/20">
                                  <div className="text-xs">Cap%</div>
                                </TableHead>
                                <TableHead className="text-right p-2 w-16 bg-green-50 dark:bg-green-950/20">
                                  <div className="text-xs">CoC%</div>
                                </TableHead>
                                <TableHead className="text-right p-2 w-16 bg-green-50 dark:bg-green-950/20">
                                  <div className="text-xs">P/R</div>
                                </TableHead>
                                <TableHead className="text-right p-2 w-16 bg-green-50 dark:bg-green-950/20">
                                  <div className="text-xs">DSCR</div>
                                </TableHead>
                                <TableHead className="text-right p-2 w-16 bg-green-50 dark:bg-green-950/20">
                                  <div className="text-xs">BER%</div>
                                </TableHead>
                                <TableHead className="text-right p-2 w-16 bg-green-50 dark:bg-green-950/20">
                                  <div className="text-xs">OER%</div>
                                </TableHead>
                                <TableHead className="p-2 w-32 text-center">
                                  <div className="text-xs">Actions</div>
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {interestedListings.map((listing) => {
                                const isAdded = temporaryProperties.some(
                                  (p) =>
                                    p.address ===
                                    (listing.address1 || listing.address),
                                );

                                return (
                                  <TableRow
                                    key={listing.id}
                                    className={
                                      isAdded
                                        ? "bg-green-50 dark:bg-green-950/20"
                                        : ""
                                    }
                                  >
                                    <TableCell className="p-2">
                                      {isAdded && (
                                        <Badge
                                          variant="secondary"
                                          className="text-[10px] h-4 px-1.5"
                                        >
                                          ✓
                                        </Badge>
                                      )}
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <div className="flex items-center gap-2 mb-0.5">
                                        {listing.sourceUrl && (
                                          <Badge
                                            className={`${getSourceColor(
                                              listing.source,
                                            )} text-white text-[10px] h-4 px-1.5 cursor-pointer shrink-0`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              window.open(
                                                listing.sourceUrl,
                                                "_blank",
                                              );
                                            }}
                                          >
                                            {listing.source}
                                          </Badge>
                                        )}
                                        {listing.propertyType && (
                                          <Badge
                                            variant="outline"
                                            className="text-[10px] h-4 px-1.5 shrink-0"
                                          >
                                            {listing.propertyType}
                                          </Badge>
                                        )}
                                        <div className="text-xs font-medium leading-tight truncate">
                                          {listing.address1 || listing.address}
                                        </div>
                                      </div>
                                      <div className="text-xs text-muted-foreground leading-tight">
                                        {listing.city}, {listing.state}{" "}
                                        {listing.zipCode}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground/70 leading-tight mt-0.5 flex items-center gap-1">
                                        {isListingStale(listing.updatedAt) && (
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <AlertTriangle className="h-3 w-3 text-amber-500" />
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <p>
                                                  This listing is older than 1
                                                  day and may have changed
                                                  status
                                                </p>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        )}
                                        Updated{" "}
                                        {formatTimeAgo(listing.updatedAt)}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right p-2">
                                      <div className="text-xs font-semibold">
                                        {formatCurrency(listing.price)}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right p-2">
                                      <div className="text-xs text-muted-foreground">
                                        {(() => {
                                          const { amount, percent } =
                                            getDownPaymentInfo(
                                              listing.price || 0,
                                            );
                                          return (
                                            <>
                                              <div className="font-medium">
                                                {formatCurrency(amount)}
                                              </div>
                                              <div className="text-[10px]">
                                                ({percent.toFixed(1)}%)
                                              </div>
                                            </>
                                          );
                                        })()}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center p-2">
                                      <div className="text-xs">
                                        {listing.bedrooms || "-"}/
                                        {listing.bathrooms || "-"}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right p-2">
                                      <div className="text-xs">
                                        {listing.squareFeet
                                          ? listing.squareFeet.toLocaleString()
                                          : "-"}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-center p-2">
                                      <div className="text-xs">
                                        {listing.daysOnMarket !== undefined
                                          ? listing.daysOnMarket
                                          : "-"}
                                      </div>
                                    </TableCell>

                                    {/* Rental Income Analysis */}
                                    <TableCell className="text-right p-2 bg-blue-50 dark:bg-blue-950/20">
                                      {listing.calculatedExpectedRent ? (
                                        <div className="text-xs font-medium">
                                          {formatCurrency(
                                            listing.calculatedExpectedRent,
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-muted-foreground text-xs">
                                          -
                                        </span>
                                      )}
                                    </TableCell>

                                    {/* Investment Rules Analysis */}
                                    <TableCell className="text-center p-2 bg-purple-50 dark:bg-purple-950/20">
                                      {listing.calculatedMeets1Percent !==
                                      undefined ? (
                                        <Badge
                                          className={
                                            listing.calculatedMeets1Percent
                                              ? "bg-green-600 hover:bg-green-700 text-xs h-5 px-2"
                                              : "bg-red-600 hover:bg-red-700 text-xs h-5 px-2"
                                          }
                                        >
                                          {listing.calculatedMeets1Percent
                                            ? "✓"
                                            : "✗"}
                                        </Badge>
                                      ) : (
                                        <span className="text-muted-foreground text-xs">
                                          -
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-center p-2 bg-purple-50 dark:bg-purple-950/20">
                                      {listing.calculatedMeets2Percent !==
                                      undefined ? (
                                        <Badge
                                          className={
                                            listing.calculatedMeets2Percent
                                              ? "bg-green-600 hover:bg-green-700 text-xs h-5 px-2"
                                              : "bg-red-600 hover:bg-red-700 text-xs h-5 px-2"
                                          }
                                        >
                                          {listing.calculatedMeets2Percent
                                            ? "✓"
                                            : "✗"}
                                        </Badge>
                                      ) : (
                                        <span className="text-muted-foreground text-xs">
                                          -
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-center p-2 bg-purple-50 dark:bg-purple-950/20">
                                      {listing.calculatedMeets50Percent !==
                                      undefined ? (
                                        <Badge
                                          className={
                                            listing.calculatedMeets50Percent
                                              ? "bg-green-600 hover:bg-green-700 text-xs h-5 px-2"
                                              : "bg-red-600 hover:bg-red-700 text-xs h-5 px-2"
                                          }
                                        >
                                          {listing.calculatedMeets50Percent
                                            ? "✓"
                                            : "✗"}
                                        </Badge>
                                      ) : (
                                        <span className="text-muted-foreground text-xs">
                                          -
                                        </span>
                                      )}
                                    </TableCell>

                                    {/* Returns Analysis */}
                                    <TableCell className="text-right p-2 bg-green-50 dark:bg-green-950/20">
                                      {listing.calculatedMonthlyCashflow !==
                                      undefined ? (
                                        <Badge
                                          className={`${
                                            getCashflowColor(
                                              listing.calculatedMonthlyCashflow,
                                            ).className
                                          } text-xs h-5 px-1.5`}
                                        >
                                          {listing.calculatedMonthlyCashflow >=
                                          0
                                            ? "+"
                                            : "-"}
                                          $
                                          {Math.abs(
                                            listing.calculatedMonthlyCashflow,
                                          ).toFixed(0)}
                                        </Badge>
                                      ) : (
                                        <span className="text-muted-foreground text-xs">
                                          -
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right p-2 bg-green-50 dark:bg-green-950/20">
                                      {listing.calculatedCapRate !==
                                      undefined ? (
                                        <Badge
                                          className={`${
                                            getCapRateColor(
                                              listing.calculatedCapRate,
                                            ).className
                                          } text-xs h-5 px-1.5`}
                                        >
                                          {listing.calculatedCapRate.toFixed(1)}
                                        </Badge>
                                      ) : (
                                        <span className="text-muted-foreground text-xs">
                                          -
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right p-2 bg-green-50 dark:bg-green-950/20">
                                      {listing.calculatedCashOnCash !==
                                      undefined ? (
                                        <Badge
                                          className={`${
                                            getCocColor(
                                              listing.calculatedCashOnCash,
                                            ).className
                                          } text-xs h-5 px-1.5`}
                                        >
                                          {listing.calculatedCashOnCash.toFixed(
                                            1,
                                          )}
                                        </Badge>
                                      ) : (
                                        <span className="text-muted-foreground text-xs">
                                          -
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right p-2 bg-green-50 dark:bg-green-950/20">
                                      {listing.calculatedPriceToRent !==
                                      undefined ? (
                                        <Badge
                                          className={`${
                                            getPriceToRentColor(
                                              listing.calculatedPriceToRent,
                                            ).className
                                          } text-xs h-5 px-1.5`}
                                        >
                                          {listing.calculatedPriceToRent.toFixed(
                                            0,
                                          )}
                                        </Badge>
                                      ) : (
                                        <span className="text-muted-foreground text-xs">
                                          -
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right p-2 bg-green-50 dark:bg-green-950/20">
                                      {listing.calculatedDSCR !== undefined ? (
                                        <Badge
                                          className={`${
                                            getDSCRColor(listing.calculatedDSCR)
                                              .className
                                          } text-xs h-5 px-1.5`}
                                        >
                                          {listing.calculatedDSCR.toFixed(2)}
                                        </Badge>
                                      ) : (
                                        <span className="text-muted-foreground text-xs">
                                          -
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right p-2 bg-green-50 dark:bg-green-950/20">
                                      {listing.calculatedBreakEvenRatio !==
                                      undefined ? (
                                        <Badge
                                          className={`${
                                            getBreakEvenColor(
                                              listing.calculatedBreakEvenRatio,
                                            ).className
                                          } text-xs h-5 px-1.5`}
                                        >
                                          {listing.calculatedBreakEvenRatio.toFixed(
                                            0,
                                          )}
                                        </Badge>
                                      ) : (
                                        <span className="text-muted-foreground text-xs">
                                          -
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-right p-2 bg-green-50 dark:bg-green-950/20">
                                      {listing.calculatedOER !== undefined ? (
                                        <Badge
                                          className={`${
                                            getOERColor(listing.calculatedOER)
                                              .className
                                          } text-xs h-5 px-1.5`}
                                        >
                                          {listing.calculatedOER.toFixed(0)}
                                        </Badge>
                                      ) : (
                                        <span className="text-muted-foreground text-xs">
                                          -
                                        </span>
                                      )}
                                    </TableCell>
                                    <TableCell className="p-2">
                                      <div className="flex items-center gap-1 justify-center">
                                        <Button
                                          onClick={() =>
                                            addListingToPortfolio(listing)
                                          }
                                          disabled={
                                            isAdded ||
                                            !listing.price ||
                                            !listing.calculatedExpectedRent
                                          }
                                          size="sm"
                                          className="h-6 px-2 text-xs shrink-0"
                                        >
                                          {isAdded ? "Added" : "Add"}
                                        </Button>
                                        <Button
                                          onClick={() =>
                                            removeInterestedListing(listing.id)
                                          }
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 w-6 p-0 text-xs shrink-0 text-muted-foreground hover:text-destructive"
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
