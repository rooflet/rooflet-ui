"use client";

import { CompactStatCard } from "@/components/compact-stat-card";
import { expensesApi } from "@/lib/api/expenses";
import { propertiesApi } from "@/lib/api/properties";
import { rentCollectionsApi } from "@/lib/api/rent-collections";
import { tenantsApi } from "@/lib/api/tenants";
import type { ExpenseResponse, RentCollectionResponse } from "@/lib/api/types";
import { useAppSelector } from "@/store/hooks";
import {
  DollarSign,
  Home,
  Receipt,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";

interface StatsData {
  maxRevenue: number;
  collectedRevenue: number;
  propertiesCount: number;
  activeTenantsCount: number;
  monthlyExpenses: number;
  portfolioValue: number;
  maxCashFlow: number;
  actualCashFlow: number;
  occupiedPropertiesCount: number;
  recurringExpenses: number;
  variableExpenses: number;
}

export function StatsCards() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { activePortfolioId } = useAppSelector((state) => state.portfolio);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);

        // Get current month period (Oct 1 to Oct 31, 2025)
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1; // getMonth() returns 0-11, so add 1
        const startPeriod = `${year}-${month.toString().padStart(2, "0")}-01`; // e.g., "2025-10-01"
        const lastDayOfMonth = new Date(year, month, 0).getDate(); // Get last day of current month
        const endPeriod = `${year}-${month
          .toString()
          .padStart(2, "0")}-${lastDayOfMonth}`; // e.g., "2025-10-31"

        const [properties, tenants, rentCollections, expenses] =
          await Promise.all([
            propertiesApi.getAll(true), // Active properties only
            tenantsApi.getAll({ activeOnly: true }), // Active tenants only
            rentCollectionsApi.getAll({
              startPeriod,
              endPeriod,
            }), // Get rent collection data for current month
            expensesApi.getAll({
              startDate: startPeriod,
              endDate: endPeriod,
            }), // Get expenses for current month
          ]);

        // Calculate maximum possible revenue from all tenants
        const maxRevenue = tenants.reduce(
          (sum, prop) => sum + (prop.monthlyRent || 0),
          0
        );

        // Calculate collected revenue for current month (sum of all paidAmount)
        const collectedRevenue = rentCollections.reduce(
          (sum: number, collection: RentCollectionResponse) =>
            sum + collection.paidAmount,
          0
        );

        // Calculate monthly expenses from both actual expenses API data AND recurring property expenses
        const actualExpenses = expenses.reduce(
          (sum: number, expense: ExpenseResponse) => sum + expense.amount,
          0
        );

        const recurringPropertyExpenses = properties.reduce(
          (sum, prop) =>
            sum +
            (prop.monthlyHoa || 0) +
            (prop.monthlyPropertyTax || 0) +
            (prop.monthlyInsurance || 0),
          0
        );

        const monthlyExpenses = actualExpenses + recurringPropertyExpenses;

        // Calculate portfolio value
        const portfolioValue = properties.reduce(
          (sum, prop) => sum + (prop.marketValue || 0),
          0
        );

        // Calculate cash flows
        // Max cash flow = collected revenue - recurring property expenses (PITI only)
        const maxCashFlow = collectedRevenue - recurringPropertyExpenses;
        // Actual cash flow = collected revenue - recurring property expenses - one-time expenses
        const actualCashFlow = collectedRevenue - monthlyExpenses;

        // Calculate occupancy: count unique properties that have at least one active tenant
        const occupiedPropertiesCount = new Set(
          tenants
            .filter((tenant) => tenant.propertyId) // Only count tenants assigned to properties
            .map((tenant) => tenant.propertyId)
        ).size;

        const statsData: StatsData = {
          maxRevenue,
          collectedRevenue,
          propertiesCount: properties.length,
          activeTenantsCount: tenants.length,
          monthlyExpenses,
          portfolioValue,
          maxCashFlow,
          actualCashFlow,
          occupiedPropertiesCount,
          recurringExpenses: recurringPropertyExpenses,
          variableExpenses: actualExpenses,
        };

        setStats(statsData);
      } catch (error) {
        console.error("Error fetching stats:", error);
        // Set default values on error
        setStats({
          maxRevenue: 0,
          collectedRevenue: 0,
          propertiesCount: 0,
          activeTenantsCount: 0,
          monthlyExpenses: 0,
          portfolioValue: 0,
          maxCashFlow: 0,
          actualCashFlow: 0,
          occupiedPropertiesCount: 0,
          recurringExpenses: 0,
          variableExpenses: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [activePortfolioId]);

  if (isLoading || !stats) {
    return (
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-20 rounded-lg border bg-card animate-pulse"
          />
        ))}
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(2)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    } else {
      return `$${amount.toLocaleString()}`;
    }
  };

  const formatCurrencyOneDecimal = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    } else {
      return `$${amount.toLocaleString()}`;
    }
  };

  // Format with 2 decimal places (e.g., $1.50K, $12.00K, $120.50K)
  const formatCurrencyTwoSigFigs = (amount: number) => {
    const absAmount = Math.abs(amount);
    const sign = amount < 0 ? "-" : "";

    if (absAmount >= 1000000) {
      const value = absAmount / 1000000;
      return `${sign}$${value.toFixed(2)}M`;
    } else if (absAmount >= 1000) {
      const value = absAmount / 1000;
      return `${sign}$${value.toFixed(2)}K`;
    } else {
      return `${sign}$${absAmount.toFixed(2)}`;
    }
  };

  const getValueColorClass = (amount: number) => {
    if (amount < 0) {
      return "text-red-600 dark:text-red-400";
    } else if (amount > 0) {
      return "text-green-600 dark:text-green-400";
    }
    return "text-foreground";
  };

  const getCardColorClass = (amount: number) => {
    if (amount < 0) {
      return "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20";
    } else if (amount > 0) {
      return "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20";
    }
    return "";
  };

  const collectionRate =
    stats.maxRevenue > 0
      ? Math.round((stats.collectedRevenue / stats.maxRevenue) * 100)
      : 0;

  const statsConfig = [
    {
      title: "Monthly Revenue",
      value: formatCurrencyOneDecimal(stats.collectedRevenue),
      subtitle: `${formatCurrencyOneDecimal(
        stats.collectedRevenue
      )} of ${formatCurrencyOneDecimal(stats.maxRevenue)} (${collectionRate}%)`,
      icon: DollarSign,
      link: "/rent-collection",
      amount: stats.collectedRevenue,
      helpText:
        "Total rent collected from tenants for the current month. Shows actual collected vs. maximum possible revenue based on property rental rates.",
    },
    {
      title: "Properties",
      value: stats.propertiesCount.toString(),
      subtitle: "Active properties",
      icon: Home,
      link: "/properties",
      amount: null, // Non-monetary value, no color coding
      helpText:
        "Total number of active properties in your portfolio. These are properties that are available for rent and generating income.",
    },
    {
      title: "Active Tenants",
      value: stats.activeTenantsCount.toString(),
      subtitle: `${
        stats.propertiesCount > 0
          ? Math.round(
              (stats.occupiedPropertiesCount / stats.propertiesCount) * 100
            )
          : 0
      }% occupancy`,
      icon: Users,
      link: "/tenants",
      amount: null, // Non-monetary value, no color coding
      helpText:
        "Number of tenants currently leasing your properties. Occupancy rate shows the percentage of properties that have active tenants.",
    },
    {
      title: "Monthly Expenses",
      value: formatCurrencyOneDecimal(stats.monthlyExpenses),
      subtitle: `Fixed: ${formatCurrencyOneDecimal(
        stats.recurringExpenses
      )} | Variable: ${formatCurrencyOneDecimal(stats.variableExpenses)}`,
      icon: Receipt,
      link: "/expenses",
      amount: -stats.monthlyExpenses, // Expenses are negative for color coding
      helpText:
        "Total expenses for the current month. Fixed expenses include recurring property costs (HOA, property tax, insurance). Variable expenses include repairs, maintenance, and capital improvements.",
    },
    {
      title: "Portfolio Value",
      value: formatCurrency(stats.portfolioValue),
      subtitle: "Total market value",
      icon: TrendingUp,
      link: "/portfolio-summary",
      amount: stats.portfolioValue,
      helpText:
        "Combined market value of all properties in your portfolio based on current property valuations.",
    },
    {
      title: "Cash Flow",
      value: formatCurrencyTwoSigFigs(stats.actualCashFlow),
      subtitle: `Actual: ${formatCurrencyTwoSigFigs(
        stats.actualCashFlow
      )} | Max: ${formatCurrencyTwoSigFigs(stats.maxCashFlow)}`,
      icon: Wallet,
      link: "/portfolio-summary",
      amount: stats.actualCashFlow,
      helpText: `Actual cash flow: Revenue collected minus ALL expenses (recurring + one-time). Max cash flow: Revenue collected minus only recurring property expenses (PITI - Principal, Interest, Taxes, Insurance/HOA). The difference shows impact of one-time expenses like repairs and improvements.`,
    },
  ];

  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {statsConfig.map((stat) => (
        <CompactStatCard
          key={stat.title}
          title={stat.title}
          value={stat.value}
          subtitle={stat.subtitle}
          icon={stat.icon}
          link={stat.link}
          className={stat.amount !== null ? getCardColorClass(stat.amount) : ""}
          valueColorClass={
            stat.amount !== null ? getValueColorClass(stat.amount) : undefined
          }
          helpText={stat.helpText}
        />
      ))}
    </div>
  );
}
