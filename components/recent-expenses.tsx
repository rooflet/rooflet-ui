"use client";

import { TruncatedText } from "@/components/truncated-text";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { expensesApi } from "@/lib/api/expenses";
import type { ExpenseResponse } from "@/lib/api/types";
import { ROUTES } from "@/lib/constants/routes";
import { getRelativeTime } from "@/lib/time-utils";
import { useAppSelector } from "@/store/hooks";
import Link from "next/link";
import { useEffect, useState } from "react";

interface ExpenseData {
  id: number;
  description: string;
  amount: string;
  category: string;
  categoryCode: string;
  property: string;
  expenseDate: string;
  relativeDate: string;
}

export function RecentExpenses() {
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { activePortfolioId } = useAppSelector((state) => state.portfolio);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      REPAIRS_MAINTENANCE:
        "bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-800",
      UTILITIES:
        "bg-sky-500/10 text-sky-700 border-sky-200 dark:text-sky-400 dark:border-sky-800",
      PROPERTY_MANAGEMENT:
        "bg-purple-500/10 text-purple-700 border-purple-200 dark:text-purple-400 dark:border-purple-800",
      INSURANCE:
        "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800",
      PROPERTY_TAX:
        "bg-rose-500/10 text-rose-700 border-rose-200 dark:text-rose-400 dark:border-rose-800",
      HOA_FEES:
        "bg-yellow-500/10 text-yellow-700 border-yellow-200 dark:text-yellow-400 dark:border-yellow-800",
      LEGAL:
        "bg-slate-500/10 text-slate-700 border-slate-200 dark:text-slate-400 dark:border-slate-800",
      PROFESSIONAL_SERVICES:
        "bg-indigo-500/10 text-indigo-700 border-indigo-200 dark:text-indigo-400 dark:border-indigo-800",
      LANDSCAPING:
        "bg-green-500/10 text-green-700 border-green-200 dark:text-green-400 dark:border-green-800",
      CLEANING:
        "bg-cyan-500/10 text-cyan-700 border-cyan-200 dark:text-cyan-400 dark:border-cyan-800",
      CAPITAL_IMPROVEMENTS:
        "bg-fuchsia-500/10 text-fuchsia-700 border-fuchsia-200 dark:text-fuchsia-400 dark:border-fuchsia-800",
      MARKETING:
        "bg-orange-500/10 text-orange-700 border-orange-200 dark:text-orange-400 dark:border-orange-800",
      OTHER:
        "bg-neutral-500/10 text-neutral-700 border-neutral-200 dark:text-neutral-400 dark:border-neutral-800",
    };
    return colors[category] || colors["OTHER"];
  };

  useEffect(() => {
    const fetchCurrentMonthExpenses = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get current month period (same logic as stats-cards and payments)
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const startDate = `${year}-${month.toString().padStart(2, "0")}-01`;
        const lastDayOfMonth = new Date(year, month, 0).getDate();
        const endDate = `${year}-${month
          .toString()
          .padStart(2, "0")}-${lastDayOfMonth}`;

        // Get all expenses for current month
        const expensesData = await expensesApi.getAll({
          startDate,
          endDate,
        });

        // Sort by expense date (most recent first)
        const sortedExpenses = expensesData.sort(
          (a: ExpenseResponse, b: ExpenseResponse) =>
            new Date(b.expenseDate).getTime() -
            new Date(a.expenseDate).getTime()
        );

        // Transform to expense data format
        const expensesList: ExpenseData[] = sortedExpenses.map(
          (expense: ExpenseResponse) => ({
            id: expense.id,
            description: expense.description || "No description",
            amount: `$${expense.amount.toLocaleString()}`,
            category: expense.categoryDisplayName,
            categoryCode: expense.category,
            property: expense.propertyAddress || "General",
            expenseDate: expense.expenseDate,
            relativeDate: getRelativeTime(expense.expenseDate),
          })
        );

        setExpenses(expensesList);
      } catch (err) {
        console.error("Error fetching expenses:", err);
        setError("Failed to load expenses");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentMonthExpenses();
  }, [activePortfolioId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Link href={ROUTES.OPERATIONS.EXPENSES}>
            <CardTitle className="cursor-pointer hover:text-primary transition-colors">
              Current Month Expenses
            </CardTitle>
          </Link>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <Link href={ROUTES.OPERATIONS.EXPENSES}>
            <CardTitle className="cursor-pointer hover:text-primary transition-colors">
              Current Month Expenses
            </CardTitle>
          </Link>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (expenses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <Link href={ROUTES.OPERATIONS.EXPENSES}>
            <CardTitle className="cursor-pointer hover:text-primary transition-colors">
              Current Month Expenses
            </CardTitle>
          </Link>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">
            No expenses found for current month
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <Link href={ROUTES.OPERATIONS.EXPENSES}>
          <CardTitle className="cursor-pointer hover:text-primary transition-colors">
            Current Month Expenses
          </CardTitle>
        </Link>
      </CardHeader>
      <CardContent className="space-y-3 max-h-120 overflow-y-auto scrollbar-hide">
        {expenses.slice(0, 10).map((expense: ExpenseData) => (
          <Link key={expense.id} href={ROUTES.OPERATIONS.EXPENSES}>
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors cursor-pointer">
              <div className="flex-1">
                <TruncatedText
                  text={expense.description}
                  maxLength={80}
                  className="font-semibold text-sm mb-1 block"
                />
                <p className="text-xs text-muted-foreground mb-1">
                  {expense.property}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {(() => {
                      const [year, month, day] = expense.expenseDate
                        .split("-")
                        .map(Number);
                      return new Date(
                        year,
                        month - 1,
                        day
                      ).toLocaleDateString();
                    })()}
                  </span>
                  <span>•</span>
                  <span>{expense.relativeDate}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 min-w-0 flex-shrink-0">
                <p className="font-semibold text-lg text-red-600 dark:text-red-400">
                  {expense.amount}
                </p>
                <Badge
                  variant="secondary"
                  className={`${getCategoryColor(
                    expense.categoryCode
                  )} text-xs`}
                >
                  {expense.category}
                </Badge>
              </div>
            </div>
          </Link>
        ))}
        {expenses.length > 10 && (
          <div className="pt-3 border-t">
            <Link href={ROUTES.OPERATIONS.EXPENSES}>
              <p className="text-xs text-muted-foreground text-center hover:text-primary transition-colors cursor-pointer">
                +{expenses.length - 10} more expenses • View all
              </p>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
