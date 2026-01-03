"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
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
import { marketListingsApi } from "@/lib/api/market-listings";
import type {
  ExpectedRentResponse,
  MarketListingWithPreferenceResponse,
} from "@/lib/api/types";
import {
  calculateInvestmentMetrics,
  estimateMonthlyPropertyTax,
  estimateMonthlyInsurance,
  meets2PercentRule,
  meets50PercentRule,
  calculatePriceToRentRatio,
  calculateCapRate,
  calculatePrincipalAndInterest,
  calculateDSCR,
  calculateBreakEvenRatio,
  calculateOperatingExpenseRatio,
  type FinancingStrategy,
} from "@/lib/investment-calculations";
import { isListingStale, formatTimeAgo } from "@/lib/listing-utils";
import {
  AlertTriangle,
  ArrowUpDown,
  Bath,
  Bed,
  Calendar,
  DollarSign,
  ExternalLink,
  Filter,
  Home,
  MapPin,
  Maximize,
  Star,
  TrendingUp,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

export default function MarketListingsPage() {
  const { toast } = useToast();
  const [listings, setListings] = useState<
    MarketListingWithPreferenceResponse[]
  >([]);
  const [filteredListings, setFilteredListings] = useState<
    MarketListingWithPreferenceResponse[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] =
    useState<MarketListingWithPreferenceResponse | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Filter states
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterPropertyType, setFilterPropertyType] = useState<string>("all");
  const [filterMinPrice, setFilterMinPrice] = useState<string>("");
  const [filterMaxPrice, setFilterMaxPrice] = useState<string>("");
  const [filterMinBeds, setFilterMinBeds] = useState<string>("");
  const [filterMinBaths, setFilterMinBaths] = useState<string>("");
  const [filterCity, setFilterCity] = useState<string>("");
  const [filterState, setFilterState] = useState<string>("");
  const [filterCashflowRange, setFilterCashflowRange] = useState<
    [number, number]
  >([0, 2500]);
  const [showInterestedOnly, setShowInterestedOnly] = useState(false);
  const [hideListingsWithoutCashflow, setHideListingsWithoutCashflow] =
    useState(true);

  // Sort states
  type SortField =
    | "address"
    | "city"
    | "price"
    | "bedrooms"
    | "bathrooms"
    | "squareFeet"
    | "daysOnMarket"
    | "calculatedExpectedRent"
    | "calculatedMonthlyCashflow"
    | "calculatedCapRate"
    | "calculatedCashOnCash"
    | "calculatedPriceToRent"
    | "calculatedDSCR"
    | "calculatedBreakEvenRatio"
    | "calculatedOER";
  const [sortField, setSortField] = useState<SortField | null>(
    "calculatedMonthlyCashflow"
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Financing strategy state
  const [financingStrategy, setFinancingStrategy] = useState<FinancingStrategy>(
    {
      downPaymentType: "percent",
      downPaymentPercent: 20,
      downPaymentAmount: 100000,
      interestRate: 6,
      loanTermYears: 30,
    }
  );
  // Local state for input values to avoid update lag
  const [downPaymentPercentInput, setDownPaymentPercentInput] = useState("20");
  const [downPaymentAmountInput, setDownPaymentAmountInput] =
    useState("100000");
  const [interestRateInput, setInterestRateInput] = useState("6");
  const [loadingExpectedRents, setLoadingExpectedRents] = useState(false);

  useEffect(() => {
    loadListings();
  }, []);

  useEffect(() => {
    if (listings.length > 0) {
      loadExpectedRents(listings);
    }
  }, [financingStrategy]);

  useEffect(() => {
    applyFilters();
  }, [
    listings,
    filterSource,
    filterPropertyType,
    filterMinPrice,
    filterMaxPrice,
    filterMinBeds,
    filterMinBaths,
    filterCity,
    filterState,
    filterCashflowRange,
    showInterestedOnly,
    hideListingsWithoutCashflow,
    searchQuery,
    sortField,
    sortDirection,
  ]);

  const loadListings = async () => {
    try {
      setLoading(true);

      // Fetch all listings and interested listings in parallel
      const [allListings, interestedListings] = await Promise.all([
        marketListingsApi.getAll(),
        marketListingsApi.getInterested(),
      ]);

      // Create a set of interested listing IDs for fast lookup
      const interestedIds = new Set(interestedListings.map((l) => l.id));

      // Merge interested status into all listings
      const listingsWithPreferences: MarketListingWithPreferenceResponse[] =
        allListings.map((listing) => ({
          ...listing,
          isInterested: interestedIds.has(listing.id),
        }));

      setListings(listingsWithPreferences);
      // Load expected rents for all listings
      await loadExpectedRents(listingsWithPreferences);
    } catch (error) {
      console.error("Failed to load market listings:", error);
      toast({
        title: "Error",
        description: "Failed to load market listings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadExpectedRents = async (
    listingsData: MarketListingWithPreferenceResponse[]
  ) => {
    setLoadingExpectedRents(true);

    // Get unique zip codes
    const uniqueZipCodes = Array.from(
      new Set(
        listingsData
          .filter((listing) => listing.zipCode)
          .map((listing) => listing.zipCode!)
      )
    );

    // Fetch expected rent data for each unique zip code once
    const zipCodeDataMap = new Map<string, ExpectedRentResponse[]>();
    await Promise.all(
      uniqueZipCodes.map(async (zipCode) => {
        try {
          const data = await marketListingsApi.getExpectedRent(zipCode);
          if (data) {
            zipCodeDataMap.set(zipCode, data);
          }
        } catch (error) {
          console.warn(`Failed to fetch expected rent for ${zipCode}`);
        }
      })
    );

    // Apply expected rent data to all listings
    const updatedListings = listingsData.map((listing) => {
      if (!listing.zipCode || !listing.bedrooms || !listing.price) {
        return listing;
      }

      const rentDataArray = zipCodeDataMap.get(listing.zipCode);
      if (!rentDataArray) {
        return listing;
      }

      try {
        // Find the expected rent for this specific bedroom count
        const expectedRentData = rentDataArray.find(
          (data) => data.bedrooms === listing.bedrooms
        );

        if (!expectedRentData) {
          return listing;
        }

        const expectedRent = expectedRentData.expectedRent;

        // Calculate investment metrics
        const metrics = calculateInvestmentMetrics(
          listing.price,
          expectedRent,
          financingStrategy,
          listing.hoaFee || 0,
          estimateMonthlyPropertyTax(listing.price, listing.state),
          estimateMonthlyInsurance(listing.price)
        );

        // Calculate additional rules of thumb
        const meets2Percent = meets2PercentRule(expectedRent, listing.price);
        const meets50Percent = meets50PercentRule(
          expectedRent,
          metrics.monthlyMortgagePayment
        );
        const priceToRent = calculatePriceToRentRatio(
          listing.price,
          expectedRent
        );
        const capRate = calculateCapRate(listing.price, expectedRent);
        const dscr = calculateDSCR(
          expectedRent,
          metrics.monthlyMortgagePayment
        );
        const breakEvenRatio = calculateBreakEvenRatio(
          expectedRent,
          metrics.monthlyMortgagePayment
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
      } catch (error) {
        console.error(
          `Failed to calculate metrics for listing ${listing.id}:`,
          error
        );
        return listing;
      }
    });

    setListings(updatedListings);
    setLoadingExpectedRents(false);
  };

  const applyFilters = () => {
    let filtered = [...listings];

    // Source filter
    if (filterSource !== "all") {
      filtered = filtered.filter((l) => l.source === filterSource);
    }

    // Property type filter
    if (filterPropertyType !== "all") {
      filtered = filtered.filter((l) => l.propertyType === filterPropertyType);
    }

    // Price range filter
    if (filterMinPrice) {
      const minPrice = parseFloat(filterMinPrice);
      filtered = filtered.filter((l) => (l.price || 0) >= minPrice);
    }
    if (filterMaxPrice) {
      const maxPrice = parseFloat(filterMaxPrice);
      filtered = filtered.filter((l) => (l.price || 0) <= maxPrice);
    }

    // Bedrooms filter
    if (filterMinBeds) {
      const minBeds = parseInt(filterMinBeds);
      filtered = filtered.filter((l) => (l.bedrooms || 0) >= minBeds);
    }

    // Bathrooms filter
    if (filterMinBaths) {
      const minBaths = parseFloat(filterMinBaths);
      filtered = filtered.filter((l) => (l.bathrooms || 0) >= minBaths);
    }

    // City filter
    if (filterCity) {
      filtered = filtered.filter((l) =>
        l.city?.toLowerCase().includes(filterCity.toLowerCase())
      );
    }

    // State filter
    if (filterState) {
      filtered = filtered.filter((l) =>
        l.state?.toLowerCase().includes(filterState.toLowerCase())
      );
    }

    // Hide listings without calculable cashflow
    if (hideListingsWithoutCashflow) {
      filtered = filtered.filter(
        (l) => l.calculatedMonthlyCashflow !== undefined
      );
    }

    // Cashflow filter
    filtered = filtered.filter((l) => {
      const cashflow = l.calculatedMonthlyCashflow || 0;
      return (
        cashflow >= filterCashflowRange[0] && cashflow <= filterCashflowRange[1]
      );
    });

    // Interested filter
    if (showInterestedOnly) {
      filtered = filtered.filter((l) => l.isInterested);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.address1?.toLowerCase().includes(query) ||
          l.address?.toLowerCase().includes(query) ||
          l.city?.toLowerCase().includes(query) ||
          l.state?.toLowerCase().includes(query) ||
          l.zipCode?.toLowerCase().includes(query) ||
          l.propertyType?.toLowerCase().includes(query) ||
          l.source?.toLowerCase().includes(query)
      );
    }

    // Sorting
    if (sortField) {
      filtered.sort((a, b) => {
        let aVal: any;
        let bVal: any;

        switch (sortField) {
          case "address":
            aVal = (a.address1 || a.address || "").toLowerCase();
            bVal = (b.address1 || b.address || "").toLowerCase();
            break;
          case "city":
            aVal = (a.city || "").toLowerCase();
            bVal = (b.city || "").toLowerCase();
            break;
          case "price":
            aVal = a.price || 0;
            bVal = b.price || 0;
            break;
          case "bedrooms":
            aVal = a.bedrooms || 0;
            bVal = b.bedrooms || 0;
            break;
          case "bathrooms":
            aVal = a.bathrooms || 0;
            bVal = b.bathrooms || 0;
            break;
          case "squareFeet":
            aVal = a.squareFeet || 0;
            bVal = b.squareFeet || 0;
            break;
          case "daysOnMarket":
            aVal = a.daysOnMarket || 0;
            bVal = b.daysOnMarket || 0;
            break;
          case "calculatedExpectedRent":
            aVal = a.calculatedExpectedRent || 0;
            bVal = b.calculatedExpectedRent || 0;
            break;
          case "calculatedMonthlyCashflow":
            aVal = a.calculatedMonthlyCashflow || 0;
            bVal = b.calculatedMonthlyCashflow || 0;
            break;
          case "calculatedCapRate":
            aVal = a.calculatedCapRate || 0;
            bVal = b.calculatedCapRate || 0;
            break;
          case "calculatedCashOnCash":
            aVal = a.calculatedCashOnCash || 0;
            bVal = b.calculatedCashOnCash || 0;
            break;
          case "calculatedPriceToRent":
            aVal = a.calculatedPriceToRent || 0;
            bVal = b.calculatedPriceToRent || 0;
            break;
          case "calculatedDSCR":
            aVal = a.calculatedDSCR || 0;
            bVal = b.calculatedDSCR || 0;
            break;
          case "calculatedBreakEvenRatio":
            aVal = a.calculatedBreakEvenRatio || 0;
            bVal = b.calculatedBreakEvenRatio || 0;
            break;
          case "calculatedOER":
            aVal = a.calculatedOER || 0;
            bVal = b.calculatedOER || 0;
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    setFilteredListings(filtered);
  };

  const clearFilters = () => {
    setFilterSource("all");
    setFilterPropertyType("all");
    setFilterMinPrice("");
    setFilterMaxPrice("");
    setFilterMinBeds("");
    setFilterMinBaths("");
    setFilterCity("");
    setFilterState("");
    setFilterCashflowRange([0, 2500]);
    setShowInterestedOnly(false);
    setHideListingsWithoutCashflow(true);
    setSearchQuery("");
    setSortField(null);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // New field, default to ascending
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUpDown className="ml-2 h-4 w-4 text-primary" />
    ) : (
      <ArrowUpDown className="ml-2 h-4 w-4 text-primary rotate-180" />
    );
  };

  const toggleInterested = async (id: string) => {
    try {
      const updated = await marketListingsApi.toggleInterested(id);
      setListings((prev) =>
        prev.map((l) =>
          l.id === id ? { ...l, isInterested: updated.isInterested } : l
        )
      );
      if (selectedListing?.id === id) {
        setSelectedListing({
          ...selectedListing,
          isInterested: updated.isInterested,
        });
      }
    } catch (error) {
      console.error("Failed to toggle interested:", error);
      toast({
        title: "Error",
        description: "Failed to update interested status.",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
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

  // Helper function to get color-coded badge variant and className
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getUniqueValues = (key: keyof MarketListingWithPreferenceResponse) => {
    const values = new Set(
      listings.map((l) => l[key]).filter((v) => v !== null && v !== undefined)
    );
    return Array.from(values).sort();
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-4">
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Market Listings</h1>
          <p className="text-sm text-muted-foreground">
            Browse and track property listings from various sources
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-64">
            <Input
              placeholder="Search listings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9"
            />
          </div>
          <Button
            variant={showInterestedOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowInterestedOnly(!showInterestedOnly)}
          >
            <Star className="mr-2 h-4 w-4" />
            Interested {showInterestedOnly && `(${filteredListings.length})`}
          </Button>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Consolidated Filters & Financing Strategy */}
        <Card>
          <Accordion type="single" collapsible defaultValue="filters">
            <AccordionItem value="filters" className="border-0">
              <AccordionTrigger className="px-4 py-2 hover:no-underline">
                <div className="flex items-center justify-between w-full pr-2">
                  <div className="flex items-center gap-3">
                    <Filter className="h-4 w-4" />
                    <span className="font-semibold">Filters & Financing</span>
                  </div>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      clearFilters();
                    }}
                    className="h-7 text-xs px-3 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer inline-flex items-center justify-center"
                  >
                    Clear All
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-2">
                <div className="space-y-2">
                  {/* Financing Strategy - Compact */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                      FINANCING STRATEGY
                    </Label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="space-y-0.5 col-span-2">
                        <div className="flex items-center gap-1">
                          <Label
                            htmlFor="downPaymentType"
                            className="text-[11px]"
                          >
                            Down Payment
                          </Label>
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
                                  financingStrategy.downPaymentPercent.toString()
                                );
                              } else {
                                setDownPaymentAmountInput(
                                  financingStrategy.downPaymentAmount?.toString() ||
                                    ""
                                );
                              }
                            }}
                          >
                            <SelectTrigger
                              id="downPaymentType"
                              className="h-5 text-[10px] w-16 ml-auto"
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percent">%</SelectItem>
                              <SelectItem value="amount">$</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {financingStrategy.downPaymentType === "percent" ? (
                          <Input
                            id="downPayment"
                            type="number"
                            min="0"
                            max="100"
                            value={downPaymentPercentInput}
                            onChange={(e) =>
                              setDownPaymentPercentInput(e.target.value)
                            }
                            onBlur={(e) =>
                              setFinancingStrategy({
                                ...financingStrategy,
                                downPaymentPercent:
                                  parseFloat(e.target.value) || 0,
                              })
                            }
                            className="h-7 text-xs"
                            placeholder="%"
                          />
                        ) : (
                          <Input
                            id="downPaymentAmount"
                            type="number"
                            min="0"
                            value={downPaymentAmountInput}
                            onChange={(e) =>
                              setDownPaymentAmountInput(e.target.value)
                            }
                            onBlur={(e) =>
                              setFinancingStrategy({
                                ...financingStrategy,
                                downPaymentAmount:
                                  parseFloat(e.target.value) || undefined,
                              })
                            }
                            className="h-7 text-xs"
                            placeholder="$"
                          />
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <Label htmlFor="loanTerm" className="text-[11px]">
                          Loan Term
                        </Label>
                        <Select
                          value={financingStrategy.loanTermYears.toString()}
                          onValueChange={(value) =>
                            setFinancingStrategy({
                              ...financingStrategy,
                              loanTermYears: parseInt(value),
                            })
                          }
                        >
                          <SelectTrigger id="loanTerm" className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 years</SelectItem>
                            <SelectItem value="20">20 years</SelectItem>
                            <SelectItem value="30">30 years</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <Label htmlFor="interestRate" className="text-[11px]">
                        Interest Rate (%)
                      </Label>
                      <Input
                        id="interestRate"
                        type="number"
                        min="0"
                        max="20"
                        step="0.1"
                        value={interestRateInput}
                        onChange={(e) => setInterestRateInput(e.target.value)}
                        onBlur={(e) =>
                          setFinancingStrategy({
                            ...financingStrategy,
                            interestRate: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>

                  <Separator className="my-1.5" />

                  {/* Analytics Filters */}
                  <div className="space-y-3">
                    <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                      ANALYTICS FILTERS
                    </Label>
                    <div className="space-y-3 w-full lg:w-[400px]">
                      <div className="flex items-center space-x-2 py-2">
                        <input
                          type="checkbox"
                          id="hideWithoutCashflow"
                          checked={hideListingsWithoutCashflow}
                          onChange={(e) =>
                            setHideListingsWithoutCashflow(e.target.checked)
                          }
                          className="h-3.5 w-3.5 rounded border-gray-300"
                        />
                        <Label
                          htmlFor="hideWithoutCashflow"
                          className="text-xs font-normal cursor-pointer"
                        >
                          Hide listings where CF/mo cannot be calculated
                        </Label>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px]">Monthly Cashflow</Label>
                        <div className="text-[11px] text-muted-foreground">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(filterCashflowRange[0])}{" "}
                          -{" "}
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(filterCashflowRange[1])}
                        </div>
                      </div>
                      <Slider
                        min={0}
                        max={2500}
                        step={50}
                        value={filterCashflowRange}
                        onValueChange={(value) =>
                          setFilterCashflowRange(value as [number, number])
                        }
                        className="w-full"
                      />
                    </div>
                  </div>

                  <Separator className="my-1.5" />

                  {/* Property Filters - Sub Accordion */}
                  <Accordion type="single" collapsible>
                    <AccordionItem
                      value="property-filters"
                      className="border-0"
                    >
                      <AccordionTrigger className="py-1 hover:no-underline">
                        <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer">
                          PROPERTY FILTERS
                        </Label>
                      </AccordionTrigger>
                      <AccordionContent className="pt-1">
                        <div className="space-y-1.5">
                          <div className="grid grid-cols-4 gap-1.5">
                            <div className="space-y-0.5">
                              <Label className="text-[11px]">Source</Label>
                              <Select
                                value={filterSource}
                                onValueChange={setFilterSource}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All</SelectItem>
                                  {getUniqueValues("source").map((source) => (
                                    <SelectItem
                                      key={source as string}
                                      value={source as string}
                                    >
                                      {source as string}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-0.5">
                              <Label className="text-[11px]">Type</Label>
                              <Select
                                value={filterPropertyType}
                                onValueChange={setFilterPropertyType}
                              >
                                <SelectTrigger className="h-7 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All</SelectItem>
                                  {getUniqueValues("propertyType").map(
                                    (type) => (
                                      <SelectItem
                                        key={type as string}
                                        value={type as string}
                                      >
                                        {type as string}
                                      </SelectItem>
                                    )
                                  )}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-0.5">
                              <Label className="text-[11px]">City</Label>
                              <Input
                                placeholder="City"
                                value={filterCity}
                                onChange={(e) => setFilterCity(e.target.value)}
                                className="h-7 text-xs"
                              />
                            </div>

                            <div className="space-y-0.5">
                              <Label className="text-[11px]">State</Label>
                              <Input
                                placeholder="State"
                                value={filterState}
                                onChange={(e) => setFilterState(e.target.value)}
                                className="h-7 text-xs"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-1.5">
                            <div className="space-y-0.5">
                              <Label className="text-[11px]">Min Price</Label>
                              <Input
                                type="number"
                                placeholder="Min"
                                value={filterMinPrice}
                                onChange={(e) =>
                                  setFilterMinPrice(e.target.value)
                                }
                                className="h-7 text-xs"
                              />
                            </div>

                            <div className="space-y-0.5">
                              <Label className="text-[11px]">Max Price</Label>
                              <Input
                                type="number"
                                placeholder="Max"
                                value={filterMaxPrice}
                                onChange={(e) =>
                                  setFilterMaxPrice(e.target.value)
                                }
                                className="h-7 text-xs"
                              />
                            </div>

                            <div className="space-y-0.5">
                              <Label className="text-[11px]">Min Beds</Label>
                              <Input
                                type="number"
                                placeholder="Min"
                                value={filterMinBeds}
                                onChange={(e) =>
                                  setFilterMinBeds(e.target.value)
                                }
                                className="h-7 text-xs"
                              />
                            </div>

                            <div className="space-y-0.5">
                              <Label className="text-[11px]">Min Baths</Label>
                              <Input
                                type="number"
                                step="0.5"
                                placeholder="Min"
                                value={filterMinBaths}
                                onChange={(e) =>
                                  setFilterMinBaths(e.target.value)
                                }
                                className="h-7 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>

        {/* Search Results */}
        <div className="flex items-center gap-4 text-sm">
          <div>
            <span className="font-semibold">{filteredListings.length}</span>{" "}
            <span className="text-muted-foreground">
              {filteredListings.length === 1 ? "result" : "results"}
            </span>
            {filteredListings.length !== listings.length && (
              <span className="text-muted-foreground">
                {" "}
                of {listings.length}
              </span>
            )}
          </div>
          {filteredListings.length !== listings.length && (
            <Badge variant="secondary" className="text-xs">
              {listings.length - filteredListings.length} hidden by filters
            </Badge>
          )}
          {listings.filter((l) => l.isInterested).length > 0 && (
            <div className="text-muted-foreground">
              • {listings.filter((l) => l.isInterested).length} interested
            </div>
          )}
        </div>

        {/* Listings Table */}
        {loading ? (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-3">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : filteredListings.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Home className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">
                  No listings found
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Try adjusting your filters or check back later for new
                  listings.
                </p>
                {(filterSource !== "all" ||
                  filterPropertyType !== "all" ||
                  filterMinPrice ||
                  filterMaxPrice ||
                  showInterestedOnly) && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={clearFilters}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
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
                      <TableHead
                        className="text-right p-2 cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort("price")}
                      >
                        <div className="flex items-center justify-end text-xs">
                          Price {getSortIcon("price")}
                        </div>
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
                      <TableHead
                        className="text-right p-2 w-20 bg-blue-50 dark:bg-blue-950/20 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30"
                        onClick={() => handleSort("calculatedExpectedRent")}
                      >
                        <div className="flex items-center justify-end text-xs">
                          Rent {getSortIcon("calculatedExpectedRent")}
                        </div>
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
                      <TableHead
                        className="text-right p-2 w-20 bg-green-50 dark:bg-green-950/20 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30"
                        onClick={() => handleSort("calculatedMonthlyCashflow")}
                      >
                        <div className="flex items-center justify-end text-xs">
                          CF/mo {getSortIcon("calculatedMonthlyCashflow")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-right p-2 w-16 bg-green-50 dark:bg-green-950/20 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30"
                        onClick={() => handleSort("calculatedCapRate")}
                      >
                        <div className="flex items-center justify-end text-xs">
                          Cap% {getSortIcon("calculatedCapRate")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-right p-2 w-16 bg-green-50 dark:bg-green-950/20 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30"
                        onClick={() => handleSort("calculatedCashOnCash")}
                      >
                        <div className="flex items-center justify-end text-xs">
                          CoC% {getSortIcon("calculatedCashOnCash")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-right p-2 w-16 bg-green-50 dark:bg-green-950/20 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30"
                        onClick={() => handleSort("calculatedPriceToRent")}
                      >
                        <div className="flex items-center justify-end text-xs">
                          P/R {getSortIcon("calculatedPriceToRent")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-right p-2 w-16 bg-green-50 dark:bg-green-950/20 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30"
                        onClick={() => handleSort("calculatedDSCR")}
                      >
                        <div className="flex items-center justify-end text-xs">
                          DSCR {getSortIcon("calculatedDSCR")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-right p-2 w-16 bg-green-50 dark:bg-green-950/20 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30"
                        onClick={() => handleSort("calculatedBreakEvenRatio")}
                      >
                        <div className="flex items-center justify-end text-xs">
                          BER% {getSortIcon("calculatedBreakEvenRatio")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-right p-2 w-16 bg-green-50 dark:bg-green-950/20 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30"
                        onClick={() => handleSort("calculatedOER")}
                      >
                        <div className="flex items-center justify-end text-xs">
                          OER% {getSortIcon("calculatedOER")}
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredListings.map((listing) => (
                      <TableRow
                        key={listing.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => {
                          setSelectedListing(listing);
                          setShowDetails(true);
                        }}
                      >
                        <TableCell className="p-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleInterested(listing.id);
                            }}
                          >
                            <Star
                              className={`h-3 w-3 ${
                                listing.isInterested
                                  ? "fill-yellow-500 text-yellow-500"
                                  : ""
                              }`}
                            />
                          </Button>
                        </TableCell>
                        <TableCell className="p-2">
                          <div className="flex items-center gap-2 mb-0.5">
                            {listing.sourceUrl && (
                              <Badge
                                className={`${getSourceColor(
                                  listing.source
                                )} text-white text-[10px] h-4 px-1.5 cursor-pointer shrink-0`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(listing.sourceUrl, "_blank");
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
                            {listing.city}, {listing.state} {listing.zipCode}
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
                                      This listing is older than 1 day and may
                                      have changed status
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            Updated {formatTimeAgo(listing.updatedAt)}
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
                              const { amount, percent } = getDownPaymentInfo(
                                listing.price || 0
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
                            {listing.bedrooms || "-"}/{listing.bathrooms || "-"}
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
                              {formatCurrency(listing.calculatedExpectedRent)}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              -
                            </span>
                          )}
                        </TableCell>

                        {/* Investment Rules Analysis */}
                        <TableCell className="text-center p-2 bg-purple-50 dark:bg-purple-950/20">
                          {listing.calculatedMeets1Percent !== undefined ? (
                            <Badge
                              className={
                                listing.calculatedMeets1Percent
                                  ? "bg-green-600 hover:bg-green-700 text-xs h-5 px-2"
                                  : "bg-red-600 hover:bg-red-700 text-xs h-5 px-2"
                              }
                            >
                              {listing.calculatedMeets1Percent ? "✓" : "✗"}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center p-2 bg-purple-50 dark:bg-purple-950/20">
                          {listing.calculatedMeets2Percent !== undefined ? (
                            <Badge
                              className={
                                listing.calculatedMeets2Percent
                                  ? "bg-green-600 hover:bg-green-700 text-xs h-5 px-2"
                                  : "bg-red-600 hover:bg-red-700 text-xs h-5 px-2"
                              }
                            >
                              {listing.calculatedMeets2Percent ? "✓" : "✗"}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center p-2 bg-purple-50 dark:bg-purple-950/20">
                          {listing.calculatedMeets50Percent !== undefined ? (
                            <Badge
                              className={
                                listing.calculatedMeets50Percent
                                  ? "bg-green-600 hover:bg-green-700 text-xs h-5 px-2"
                                  : "bg-red-600 hover:bg-red-700 text-xs h-5 px-2"
                              }
                            >
                              {listing.calculatedMeets50Percent ? "✓" : "✗"}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              -
                            </span>
                          )}
                        </TableCell>

                        {/* Returns Analysis */}
                        <TableCell className="text-right p-2 bg-green-50 dark:bg-green-950/20">
                          {listing.calculatedMonthlyCashflow !== undefined ? (
                            <Badge
                              className={`${
                                getCashflowColor(
                                  listing.calculatedMonthlyCashflow
                                ).className
                              } text-xs h-5 px-1.5`}
                            >
                              {listing.calculatedMonthlyCashflow >= 0
                                ? "+"
                                : "-"}
                              $
                              {Math.abs(
                                listing.calculatedMonthlyCashflow
                              ).toFixed(0)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right p-2 bg-green-50 dark:bg-green-950/20">
                          {listing.calculatedCapRate !== undefined ? (
                            <Badge
                              className={`${
                                getCapRateColor(listing.calculatedCapRate)
                                  .className
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
                          {listing.calculatedCashOnCash !== undefined ? (
                            <Badge
                              className={`${
                                getCocColor(listing.calculatedCashOnCash)
                                  .className
                              } text-xs h-5 px-1.5`}
                            >
                              {listing.calculatedCashOnCash.toFixed(1)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right p-2 bg-green-50 dark:bg-green-950/20">
                          {listing.calculatedPriceToRent !== undefined ? (
                            <Badge
                              className={`${
                                getPriceToRentColor(
                                  listing.calculatedPriceToRent
                                ).className
                              } text-xs h-5 px-1.5`}
                            >
                              {listing.calculatedPriceToRent.toFixed(0)}
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
                                getDSCRColor(listing.calculatedDSCR).className
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
                          {listing.calculatedBreakEvenRatio !== undefined ? (
                            <Badge
                              className={`${
                                getBreakEvenColor(
                                  listing.calculatedBreakEvenRatio
                                ).className
                              } text-xs h-5 px-1.5`}
                            >
                              {listing.calculatedBreakEvenRatio.toFixed(0)}
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
                                getOERColor(listing.calculatedOER).className
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="min-w-3xl max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedListing && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between pr-8">
                  <div className="flex-1">
                    <DialogTitle className="text-2xl">
                      {selectedListing.address1 || selectedListing.address}
                    </DialogTitle>
                    <DialogDescription className="text-base mt-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {selectedListing.city}, {selectedListing.state}{" "}
                        {selectedListing.zipCode}
                      </div>
                    </DialogDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleInterested(selectedListing.id)}
                    >
                      <Star
                        className={`h-4 w-4 mr-2 ${
                          selectedListing.isInterested
                            ? "fill-yellow-500 text-yellow-500"
                            : ""
                        }`}
                      />
                      {selectedListing.isInterested
                        ? "Not Interested"
                        : "Interested"}
                    </Button>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Price and Status */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <div className="text-3xl font-bold text-primary">
                      {formatCurrency(selectedListing.price)}
                    </div>
                    {selectedListing.pricePerSqft && (
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(selectedListing.pricePerSqft)} per sqft
                      </div>
                    )}
                  </div>
                  {selectedListing.listingStatus && (
                    <Badge
                      variant={
                        selectedListing.listingStatus === "Active"
                          ? "default"
                          : "secondary"
                      }
                      className="text-lg px-4 py-2"
                    >
                      {selectedListing.listingStatus}
                    </Badge>
                  )}
                </div>

                {/* Property Details */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">
                    Property Details
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <Bed className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {selectedListing.bedrooms || "N/A"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Bedrooms
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Bath className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {selectedListing.bathrooms || "N/A"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Bathrooms
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Maximize className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {selectedListing.squareFeet?.toLocaleString() ||
                            "N/A"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Square Feet
                        </div>
                      </div>
                    </div>
                    {selectedListing.propertyType && (
                      <div className="flex items-center gap-2">
                        <Home className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {selectedListing.propertyType}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Property Type
                          </div>
                        </div>
                      </div>
                    )}
                    {selectedListing.yearBuilt && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {selectedListing.yearBuilt}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Year Built
                          </div>
                        </div>
                      </div>
                    )}
                    {selectedListing.lotSize && (
                      <div className="flex items-center gap-2">
                        <Maximize className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {selectedListing.lotSize.toLocaleString()} sqft
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Lot Size
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Details */}
                {(selectedListing.hoaFee ||
                  selectedListing.originalListPrice) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">
                      Financial Details
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedListing.originalListPrice && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {formatCurrency(
                                selectedListing.originalListPrice
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Original Price
                            </div>
                          </div>
                        </div>
                      )}
                      {selectedListing.hoaFee && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {formatCurrency(selectedListing.hoaFee)}/mo
                            </div>
                            <div className="text-sm text-muted-foreground">
                              HOA Fee
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Investment Metrics */}
                {selectedListing.calculatedExpectedRent && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Investment Analysis
                    </h3>

                    {/* Monthly Cashflow Summary */}
                    <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-lg mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">
                            Estimated Monthly Cashflow
                          </div>
                          <div
                            className={`text-3xl font-bold ${
                              (selectedListing.calculatedMonthlyCashflow ||
                                0) >= 200
                                ? "text-green-600"
                                : (selectedListing.calculatedMonthlyCashflow ||
                                    0) >= 0
                                ? "text-yellow-600"
                                : "text-red-600"
                            }`}
                          >
                            {selectedListing.calculatedMonthlyCashflow !==
                            undefined
                              ? formatCurrency(
                                  selectedListing.calculatedMonthlyCashflow
                                )
                              : "N/A"}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {(selectedListing.calculatedMonthlyCashflow || 0) >=
                            200
                              ? "Strong positive cashflow"
                              : (selectedListing.calculatedMonthlyCashflow ||
                                  0) >= 0
                              ? "Break-even or slight positive"
                              : "Negative cashflow"}
                          </div>
                        </div>
                        <Badge
                          className={
                            (selectedListing.calculatedMonthlyCashflow || 0) >=
                            200
                              ? "bg-green-600 hover:bg-green-700 text-lg px-4 py-2"
                              : (selectedListing.calculatedMonthlyCashflow ||
                                  0) >= 0
                              ? "bg-yellow-600 hover:bg-yellow-700 text-lg px-4 py-2"
                              : "bg-red-600 hover:bg-red-700 text-lg px-4 py-2"
                          }
                        >
                          {(selectedListing.calculatedMonthlyCashflow || 0) >=
                          200
                            ? "Excellent"
                            : (selectedListing.calculatedMonthlyCashflow ||
                                0) >= 0
                            ? "Okay"
                            : "Poor"}
                        </Badge>
                      </div>
                    </div>

                    {/* PITI Breakdown */}
                    <div className="p-4 bg-muted/50 rounded-lg mb-4">
                      <h4 className="font-semibold mb-3 text-sm">
                        Monthly Expense Breakdown (PITI + HOA)
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            Principal & Interest (P&I)
                          </span>
                          <span className="font-medium">
                            {selectedListing.calculatedMonthlyPayment
                              ? formatCurrency(
                                  selectedListing.calculatedMonthlyPayment
                                )
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            Property Tax (T)
                          </span>
                          <span className="font-medium">
                            {selectedListing.calculatedMonthlyPropertyTax
                              ? formatCurrency(
                                  selectedListing.calculatedMonthlyPropertyTax
                                )
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            Insurance (I)
                          </span>
                          <span className="font-medium">
                            {selectedListing.calculatedMonthlyInsurance
                              ? formatCurrency(
                                  selectedListing.calculatedMonthlyInsurance
                                )
                              : "N/A"}
                          </span>
                        </div>
                        {selectedListing.hoaFee &&
                          selectedListing.hoaFee > 0 && (
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">
                                HOA Fee
                              </span>
                              <span className="font-medium">
                                {formatCurrency(selectedListing.hoaFee)}
                              </span>
                            </div>
                          )}
                        <Separator className="my-2" />
                        <div className="flex justify-between items-center font-semibold">
                          <span>Total Monthly Expenses</span>
                          <span className="text-lg">
                            {selectedListing.calculatedTotalMonthlyExpenses
                              ? formatCurrency(
                                  selectedListing.calculatedTotalMonthlyExpenses
                                )
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 text-xs text-muted-foreground italic">
                        * Property tax based on {selectedListing.state} rate (
                        {selectedListing.calculatedMonthlyPropertyTax
                          ? `~$${(
                              selectedListing.calculatedMonthlyPropertyTax * 12
                            ).toFixed(0)}/year`
                          : "varies by state"}
                        )
                        <br />* Insurance estimated based on property value
                        (0.25-0.5% annually)
                      </div>
                    </div>

                    {/* Investment Rules of Thumb */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">
                          1% Rule
                        </div>
                        <Badge
                          className={
                            selectedListing.calculatedMeets1Percent
                              ? "bg-green-600 hover:bg-green-700"
                              : "bg-red-600 hover:bg-red-700"
                          }
                        >
                          {selectedListing.calculatedMeets1Percent
                            ? "✓ Pass"
                            : "✗ Fail"}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          Need{" "}
                          {formatCurrency((selectedListing.price || 0) * 0.01)}
                          /mo
                        </div>
                      </div>

                      <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">
                          2% Rule
                        </div>
                        <Badge
                          className={
                            selectedListing.calculatedMeets2Percent
                              ? "bg-green-600 hover:bg-green-700"
                              : "bg-red-600 hover:bg-red-700"
                          }
                        >
                          {selectedListing.calculatedMeets2Percent
                            ? "✓ Pass"
                            : "✗ Fail"}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          Need{" "}
                          {formatCurrency((selectedListing.price || 0) * 0.02)}
                          /mo
                        </div>
                      </div>

                      <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">
                          50% Rule
                        </div>
                        <Badge
                          className={
                            selectedListing.calculatedMeets50Percent
                              ? "bg-green-600 hover:bg-green-700"
                              : "bg-red-600 hover:bg-red-700"
                          }
                        >
                          {selectedListing.calculatedMeets50Percent
                            ? "✓ Pass"
                            : "✗ Fail"}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          Expenses &lt; 50% rent
                        </div>
                      </div>

                      <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1">
                          Price/Rent
                        </div>
                        <Badge
                          className={
                            getPriceToRentColor(
                              selectedListing.calculatedPriceToRent
                            ).className
                          }
                        >
                          {selectedListing.calculatedPriceToRent
                            ? selectedListing.calculatedPriceToRent.toFixed(1)
                            : "N/A"}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {(selectedListing.calculatedPriceToRent || 0) <= 15
                            ? "Good for buying"
                            : (selectedListing.calculatedPriceToRent || 0) <= 20
                            ? "Neutral"
                            : "Better to rent"}
                        </div>
                      </div>
                    </div>

                    {/* Return Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">
                          Expected Monthly Rent
                        </div>
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(
                            selectedListing.calculatedExpectedRent
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-muted-foreground mb-1">
                          Cap Rate
                        </div>
                        <div
                          className={`text-2xl font-bold ${
                            (selectedListing.calculatedCapRate || 0) >= 8
                              ? "text-green-600"
                              : (selectedListing.calculatedCapRate || 0) >= 5
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        >
                          {selectedListing.calculatedCapRate !== undefined
                            ? `${selectedListing.calculatedCapRate.toFixed(1)}%`
                            : "N/A"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {(selectedListing.calculatedCapRate || 0) >= 8
                            ? "Excellent"
                            : (selectedListing.calculatedCapRate || 0) >= 5
                            ? "Good"
                            : "Below Average"}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-muted-foreground mb-1">
                          Cash on Cash Return
                        </div>
                        <div
                          className={`text-2xl font-bold ${
                            (selectedListing.calculatedCashOnCash || 0) >= 8
                              ? "text-green-600"
                              : (selectedListing.calculatedCashOnCash || 0) >= 5
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        >
                          {selectedListing.calculatedCashOnCash !== undefined
                            ? `${selectedListing.calculatedCashOnCash.toFixed(
                                1
                              )}%`
                            : "N/A"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {(selectedListing.calculatedCashOnCash || 0) >= 8
                            ? "Excellent"
                            : (selectedListing.calculatedCashOnCash || 0) >= 5
                            ? "Good"
                            : "Below Average"}
                        </div>
                      </div>
                    </div>

                    {/* Advanced Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg mt-4">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">
                          DSCR (Debt Service Coverage Ratio)
                        </div>
                        <div
                          className={`text-2xl font-bold ${
                            (selectedListing.calculatedDSCR || 0) >= 1.25
                              ? "text-green-600"
                              : (selectedListing.calculatedDSCR || 0) >= 1.0
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        >
                          {selectedListing.calculatedDSCR !== undefined
                            ? selectedListing.calculatedDSCR.toFixed(2)
                            : "N/A"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {(selectedListing.calculatedDSCR || 0) >= 1.25
                            ? "Strong coverage"
                            : (selectedListing.calculatedDSCR || 0) >= 1.0
                            ? "Adequate coverage"
                            : "Insufficient income"}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-muted-foreground mb-1">
                          Break-Even Ratio
                        </div>
                        <div
                          className={`text-2xl font-bold ${
                            (selectedListing.calculatedBreakEvenRatio || 0) < 85
                              ? "text-green-600"
                              : (selectedListing.calculatedBreakEvenRatio ||
                                  0) < 100
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        >
                          {selectedListing.calculatedBreakEvenRatio !==
                          undefined
                            ? `${selectedListing.calculatedBreakEvenRatio.toFixed(
                                0
                              )}%`
                            : "N/A"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {(selectedListing.calculatedBreakEvenRatio || 0) < 85
                            ? "Good cushion"
                            : (selectedListing.calculatedBreakEvenRatio || 0) <
                              100
                            ? "Tight but manageable"
                            : "Negative cash flow"}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm text-muted-foreground mb-1">
                          Operating Expense Ratio
                        </div>
                        <div
                          className={`text-2xl font-bold ${
                            (selectedListing.calculatedOER || 0) <= 40
                              ? "text-green-600"
                              : (selectedListing.calculatedOER || 0) <= 50
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        >
                          {selectedListing.calculatedOER !== undefined
                            ? `${selectedListing.calculatedOER.toFixed(0)}%`
                            : "N/A"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {(selectedListing.calculatedOER || 0) <= 40
                            ? "Excellent efficiency"
                            : (selectedListing.calculatedOER || 0) <= 50
                            ? "Industry standard"
                            : "High expenses"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <div className="text-xs text-muted-foreground">
                        <strong>Financing Assumptions:</strong>{" "}
                        {financingStrategy.downPaymentPercent}% down (
                        {formatCurrency(
                          (selectedListing.price || 0) *
                            (financingStrategy.downPaymentPercent / 100)
                        )}
                        ), {financingStrategy.interestRate}% interest rate,{" "}
                        {financingStrategy.loanTermYears}-year term
                      </div>
                    </div>
                  </div>
                )}

                {/* Listing Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">
                    Listing Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Source</div>
                      <div className="font-medium">
                        {selectedListing.source}
                      </div>
                    </div>
                    {selectedListing.sourceMlsNumber && (
                      <div>
                        <div className="text-muted-foreground">MLS Number</div>
                        <div className="font-medium">
                          {selectedListing.sourceMlsNumber}
                        </div>
                      </div>
                    )}
                    {selectedListing.listDate && (
                      <div>
                        <div className="text-muted-foreground">Listed Date</div>
                        <div className="font-medium">
                          {formatDate(selectedListing.listDate)}
                        </div>
                      </div>
                    )}
                    {selectedListing.daysOnMarket !== undefined && (
                      <div>
                        <div className="text-muted-foreground">
                          Days on Market
                        </div>
                        <div className="font-medium">
                          {selectedListing.daysOnMarket}
                        </div>
                      </div>
                    )}
                    {selectedListing.soldDate && (
                      <div>
                        <div className="text-muted-foreground">Sold Date</div>
                        <div className="font-medium">
                          {formatDate(selectedListing.soldDate)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* External Link */}
                {selectedListing.sourceUrl && (
                  <div>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() =>
                        window.open(selectedListing.sourceUrl, "_blank")
                      }
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View on {selectedListing.source}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
