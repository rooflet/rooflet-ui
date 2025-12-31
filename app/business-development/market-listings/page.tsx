"use client";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { marketListingsApi } from "@/lib/api/market-listings";
import type { MarketListingResponse } from "@/lib/api/types";
import {
  calculateInvestmentMetrics,
  estimateMonthlyPropertyTax,
  estimateMonthlyInsurance,
  type FinancingStrategy,
} from "@/lib/investment-calculations";
import {
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
  const [listings, setListings] = useState<MarketListingResponse[]>([]);
  const [filteredListings, setFilteredListings] = useState<
    MarketListingResponse[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] =
    useState<MarketListingResponse | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Filter states
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterPropertyType, setFilterPropertyType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterMinPrice, setFilterMinPrice] = useState<string>("");
  const [filterMaxPrice, setFilterMaxPrice] = useState<string>("");
  const [filterMinBeds, setFilterMinBeds] = useState<string>("");
  const [filterMinBaths, setFilterMinBaths] = useState<string>("");
  const [filterCity, setFilterCity] = useState<string>("");
  const [filterState, setFilterState] = useState<string>("");
  const [showInterestedOnly, setShowInterestedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Sort states
  type SortField =
    | "address"
    | "city"
    | "price"
    | "bedrooms"
    | "bathrooms"
    | "squareFeet"
    | "daysOnMarket";
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Financing strategy state
  const [financingStrategy, setFinancingStrategy] = useState<FinancingStrategy>(
    {
      downPaymentPercent: 20,
      interestRate: 6,
      loanTermYears: 30,
    }
  );
  const [loadingExpectedRents, setLoadingExpectedRents] = useState(false);

  useEffect(() => {
    loadListings();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [
    listings,
    filterSource,
    filterPropertyType,
    filterStatus,
    filterMinPrice,
    filterMaxPrice,
    filterMinBeds,
    filterMinBaths,
    filterCity,
    filterState,
    showInterestedOnly,
    searchQuery,
    sortField,
    sortDirection,
  ]);

  const loadListings = async () => {
    try {
      setLoading(true);
      const data = await marketListingsApi.getAll();
      setListings(data);
      // Load expected rents for all listings
      await loadExpectedRents(data);
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

  const loadExpectedRents = async (listingsData: MarketListingResponse[]) => {
    setLoadingExpectedRents(true);
    const updatedListings = await Promise.all(
      listingsData.map(async (listing) => {
        if (!listing.zipCode || !listing.bedrooms || !listing.price) {
          return listing;
        }

        try {
          const expectedRentData = await marketListingsApi.getExpectedRent(
            listing.zipCode,
            listing.bedrooms
          );

          if (!expectedRentData) {
            return listing;
          }

          // Calculate investment metrics
          const metrics = calculateInvestmentMetrics(
            listing.price,
            expectedRentData.expectedRent,
            financingStrategy,
            listing.hoaFee || 0,
            estimateMonthlyPropertyTax(listing.price),
            estimateMonthlyInsurance(listing.price)
          );

          return {
            ...listing,
            calculatedExpectedRent: expectedRentData.expectedRent,
            calculatedMonthlyPayment: metrics.monthlyMortgagePayment,
            calculatedCashOnCash: metrics.cashOnCashReturn,
            calculatedMeets1Percent: metrics.meets1PercentRule,
          };
        } catch (error) {
          console.error(
            `Failed to load expected rent for listing ${listing.id}:`,
            error
          );
          return listing;
        }
      })
    );
    setListings(updatedListings);
    setLoadingExpectedRents(false);
  };

  const recalculateMetrics = async () => {
    await loadExpectedRents(listings);
    toast({
      title: "Success",
      description:
        "Investment metrics recalculated with new financing strategy.",
    });
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

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter((l) => l.listingStatus === filterStatus);
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
    setFilterStatus("all");
    setFilterMinPrice("");
    setFilterMaxPrice("");
    setFilterMinBeds("");
    setFilterMinBaths("");
    setFilterCity("");
    setFilterState("");
    setShowInterestedOnly(false);
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getUniqueValues = (key: keyof MarketListingResponse) => {
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {/* Filters Section */}
        {showFilters && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Filter Listings</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFilters(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Source</Label>
                  <Select value={filterSource} onValueChange={setFilterSource}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
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

                <div className="space-y-2">
                  <Label>Property Type</Label>
                  <Select
                    value={filterPropertyType}
                    onValueChange={setFilterPropertyType}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {getUniqueValues("propertyType").map((type) => (
                        <SelectItem key={type as string} value={type as string}>
                          {type as string}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {getUniqueValues("listingStatus").map((status) => (
                        <SelectItem
                          key={status as string}
                          value={status as string}
                        >
                          {status as string}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    placeholder="e.g., Boston"
                    value={filterCity}
                    onChange={(e) => setFilterCity(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    placeholder="e.g., MA"
                    value={filterState}
                    onChange={(e) => setFilterState(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Min Price</Label>
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filterMinPrice}
                    onChange={(e) => setFilterMinPrice(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Price</Label>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filterMaxPrice}
                    onChange={(e) => setFilterMaxPrice(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Min Beds</Label>
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filterMinBeds}
                    onChange={(e) => setFilterMinBeds(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Min Baths</Label>
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="Min"
                    value={filterMinBaths}
                    onChange={(e) => setFilterMinBaths(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Financing Strategy Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Financing Strategy</CardTitle>
                <CardDescription>
                  Set your financing assumptions to calculate investment metrics
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={recalculateMetrics}
                disabled={loadingExpectedRents}
              >
                {loadingExpectedRents ? "Calculating..." : "Recalculate"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="downPayment">Down Payment (%)</Label>
                <Input
                  id="downPayment"
                  type="number"
                  min="0"
                  max="100"
                  value={financingStrategy.downPaymentPercent}
                  onChange={(e) =>
                    setFinancingStrategy({
                      ...financingStrategy,
                      downPaymentPercent: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interestRate">Interest Rate (%)</Label>
                <Input
                  id="interestRate"
                  type="number"
                  min="0"
                  max="20"
                  step="0.1"
                  value={financingStrategy.interestRate}
                  onChange={(e) =>
                    setFinancingStrategy({
                      ...financingStrategy,
                      interestRate: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loanTerm">Loan Term (years)</Label>
                <Select
                  value={financingStrategy.loanTermYears.toString()}
                  onValueChange={(value) =>
                    setFinancingStrategy({
                      ...financingStrategy,
                      loanTermYears: parseInt(value),
                    })
                  }
                >
                  <SelectTrigger id="loanTerm">
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
          </CardContent>
        </Card>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Listings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredListings.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Interested
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {listings.filter((l) => l.isInterested).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Price
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredListings.length > 0
                  ? formatCurrency(
                      filteredListings.reduce(
                        (sum, l) => sum + (l.price || 0),
                        0
                      ) / filteredListings.length
                    )
                  : "$0"}
              </div>
            </CardContent>
          </Card>
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
                  filterStatus !== "all" ||
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
                      <TableHead className="w-12"></TableHead>
                      <TableHead
                        className="cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort("address")}
                      >
                        <div className="flex items-center">
                          Address
                          {getSortIcon("address")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort("city")}
                      >
                        <div className="flex items-center">
                          Location
                          {getSortIcon("city")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-right cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort("price")}
                      >
                        <div className="flex items-center justify-end">
                          Price
                          {getSortIcon("price")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-center cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort("bedrooms")}
                      >
                        <div className="flex items-center justify-center">
                          Beds
                          {getSortIcon("bedrooms")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-center cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort("bathrooms")}
                      >
                        <div className="flex items-center justify-center">
                          Baths
                          {getSortIcon("bathrooms")}
                        </div>
                      </TableHead>
                      <TableHead
                        className="text-right cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort("squareFeet")}
                      >
                        <div className="flex items-center justify-end">
                          Sqft
                          {getSortIcon("squareFeet")}
                        </div>
                      </TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead
                        className="text-center cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort("daysOnMarket")}
                      >
                        <div className="flex items-center justify-center">
                          DOM
                          {getSortIcon("daysOnMarket")}
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Est. Rent</TableHead>
                      <TableHead className="text-center">1% Rule</TableHead>
                      <TableHead className="text-right">CoC Return</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
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
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
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
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {listing.address1 || listing.address}
                          {listing.address2 && (
                            <span className="text-muted-foreground">
                              {" "}
                              {listing.address2}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {listing.city}, {listing.state}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {listing.zipCode}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(listing.price)}
                          {listing.pricePerSqft && (
                            <div className="text-xs text-muted-foreground font-normal">
                              ${listing.pricePerSqft}/sqft
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {listing.bedrooms || "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {listing.bathrooms || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {listing.squareFeet
                            ? listing.squareFeet.toLocaleString()
                            : "-"}
                        </TableCell>
                        <TableCell className="text-sm max-w-[150px] truncate">
                          {listing.propertyType || "-"}
                        </TableCell>
                        <TableCell>
                          {listing.listingStatus && (
                            <Badge
                              variant={
                                listing.listingStatus === "Active"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {listing.listingStatus}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {listing.daysOnMarket !== undefined
                            ? listing.daysOnMarket
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {listing.calculatedExpectedRent ? (
                            <div className="font-medium">
                              {formatCurrency(listing.calculatedExpectedRent)}
                              <div className="text-xs text-muted-foreground font-normal">
                                /month
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {listing.calculatedMeets1Percent !== undefined ? (
                            <Badge
                              variant={
                                listing.calculatedMeets1Percent
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {listing.calculatedMeets1Percent ? "✓" : "✗"}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {listing.calculatedCashOnCash !== undefined ? (
                            <div
                              className={`font-medium ${
                                listing.calculatedCashOnCash >= 8
                                  ? "text-green-600"
                                  : listing.calculatedCashOnCash >= 5
                                  ? "text-yellow-600"
                                  : "text-red-600"
                              }`}
                            >
                              {listing.calculatedCashOnCash.toFixed(1)}%
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {listing.source}
                        </TableCell>
                        <TableCell className="text-right">
                          {listing.sourceUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(listing.sourceUrl, "_blank");
                              }}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedListing && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">
                          Expected Monthly Rent
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(
                            selectedListing.calculatedExpectedRent
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">
                          Monthly Mortgage Payment
                        </div>
                        <div className="text-2xl font-bold">
                          {selectedListing.calculatedMonthlyPayment
                            ? formatCurrency(
                                selectedListing.calculatedMonthlyPayment
                              )
                            : "N/A"}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">
                          1% Rule
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              selectedListing.calculatedMeets1Percent
                                ? "default"
                                : "secondary"
                            }
                            className="text-lg px-3 py-1"
                          >
                            {selectedListing.calculatedMeets1Percent
                              ? "✓ Passes"
                              : "✗ Fails"}
                          </Badge>
                          {selectedListing.price && (
                            <span className="text-xs text-muted-foreground">
                              (Need{" "}
                              {formatCurrency(selectedListing.price * 0.01)}/mo)
                            </span>
                          )}
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
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <div className="text-xs text-muted-foreground">
                        <strong>Financing:</strong>{" "}
                        {financingStrategy.downPaymentPercent}% down,{" "}
                        {financingStrategy.interestRate}% interest,{" "}
                        {financingStrategy.loanTermYears} years
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
