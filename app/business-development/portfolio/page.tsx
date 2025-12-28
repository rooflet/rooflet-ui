"use client";

import { CardTitle } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { propertiesApi } from "@/lib/api/properties";
import { tenantsApi } from "@/lib/api/tenants";
import type { PropertyResponse } from "@/lib/api/types";
import {
  calculatePortfolioMetrics,
  calculatePortfolioTotals,
  createEmptyProperty,
  recalculateProperty,
  type PropertyData,
} from "@/lib/services/portfolio-calculations";
import { useAppSelector } from "@/store/hooks";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Info,
  Lock,
  Plus,
  RotateCcw,
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

export default function PortfolioPage() {
  const { toast } = useToast();
  const { refreshKey, activePortfolioId } = useAppSelector(
    (state) => state.portfolio
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
    []
  );
  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [isModified, setIsModified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [includeVacant, setIncludeVacant] = useState(
    savedFilters?.includeVacant ?? true
  );
  const [selectedStates, setSelectedStates] = useState<string[]>(
    savedFilters?.selectedStates ?? []
  );
  const [cashFlowFilter, setCashFlowFilter] = useState<string>(
    savedFilters?.cashFlowFilter ?? "all"
  );
  const [debtFilter, setDebtFilter] = useState<string>(
    savedFilters?.debtFilter ?? "all"
  );
  const [minMarketValue, setMinMarketValue] = useState<number>(
    savedFilters?.minMarketValue ?? 0
  );
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);

  // Calculate max market value for slider
  const maxMarketValue = Math.max(
    ...properties.map((p) => p.marketValue ?? 0),
    500000
  );

  // Check if any filters are active
  const hasActiveFilters =
    !includeVacant ||
    selectedStates.length > 0 ||
    cashFlowFilter !== "all" ||
    debtFilter !== "all" ||
    minMarketValue > 0;

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
              0
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
          })
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
    value: number
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
    filteredOriginalProperties
  );

  const totals = calculatePortfolioTotals(finalFilteredProperties);
  const baselineTotals = calculatePortfolioTotals(
    finalFilteredOriginalProperties
  );

  const metrics = calculatePortfolioMetrics(finalFilteredProperties, totals);
  const baselineMetrics = calculatePortfolioMetrics(
    finalFilteredOriginalProperties,
    baselineTotals
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
  }: {
    value: number;
    index: number;
    field: keyof PropertyData;
    isPercent?: boolean;
    isExpense?: boolean;
    isIncome?: boolean;
  }) => {
    const [isEditing, setIsEditing] = useState(false);
    const safeValue = value ?? 0;
    const [inputValue, setInputValue] = useState(safeValue.toString());
    const originalProperty = originalProperties[index];
    const baselineValue = originalProperty
      ? (originalProperty[field] as number) ?? 0
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
        {hasChanged && (
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
  }: {
    value: number;
    baselineValue: number;
    isPercent?: boolean;
    colorize?: boolean;
    isExpense?: boolean;
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
        {hasChanged && (
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

  const hasNewProperties = properties.some((p) => p.isNew);

  // Get unique states from all properties
  const uniqueStates = Array.from(
    new Set(properties.map((p) => p.state).filter(Boolean))
  ).sort() as string[];

  const toggleState = (state: string) => {
    setSelectedStates((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state]
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
    </div>
  );
}
