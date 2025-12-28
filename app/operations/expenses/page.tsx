"use client";

import { CompactStatCard } from "@/components/compact-stat-card";
import { TruncatedText } from "@/components/truncated-text";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type {
  CreateExpenseRequest,
  ExpenseCategory,
  ExpenseResponse,
  PropertyResponse,
  UpdateExpenseRequest,
} from "@/lib/api/types";
import {
  formatCurrencyInput,
  parseCurrencyToNumber,
} from "@/lib/currency-utils";
import { getTodayLocalDate, toLocalDateString } from "@/lib/date-validation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  createExpense,
  deleteExpense,
  fetchExpenses,
  updateExpense,
} from "@/store/slices/expensesSlice";
import { fetchProperties } from "@/store/slices/propertiesSlice";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Pencil,
  Plus,
  Trash2,
  TrendingDown,
} from "lucide-react";
import { useEffect, useState } from "react";

type Expense = ExpenseResponse;
type Property = PropertyResponse;

const expenseCategories: { value: ExpenseCategory; label: string }[] = [
  { value: "REPAIRS_MAINTENANCE", label: "Repairs & Maintenance" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "PROPERTY_MANAGEMENT", label: "Property Management" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "PROPERTY_TAX", label: "Property Tax" },
  { value: "HOA_FEES", label: "HOA Fees" },
  { value: "LEGAL", label: "Legal" },
  { value: "PROFESSIONAL_SERVICES", label: "Professional Services" },
  { value: "LANDSCAPING", label: "Landscaping" },
  { value: "CLEANING", label: "Cleaning" },
  { value: "CAPITAL_IMPROVEMENTS", label: "Capital Improvements" },
  { value: "MARKETING", label: "Marketing" },
  { value: "OTHER", label: "Other" },
];

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

export default function ExpensesPage() {
  const dispatch = useAppDispatch();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const { expenses, isLoading, error } = useAppSelector(
    (state) => state.expenses
  );
  const { properties } = useAppSelector((state) => state.properties);
  const { activePortfolioId } = useAppSelector((state) => state.portfolio);
  const { toast } = useToast();

  // Dialog state (kept as local state as it's UI-only)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [formData, setFormData] = useState({
    propertyId: "",
    amount: "",
    category: "" as ExpenseCategory | "",
    date: getTodayLocalDate(),
    description: "",
  });

  useEffect(() => {
    const dateRange = getMonthDateRange(selectedYear, selectedMonth);
    dispatch(
      fetchExpenses({
        startDate: dateRange.start,
        endDate: dateRange.end,
      })
    );
    dispatch(fetchProperties(true));
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

  const handleAdd = async () => {
    if (!formData.category) {
      toast({
        title: "Validation Error",
        description: "Please select a category",
        variant: "destructive",
      });
      return;
    }

    if (!formData.amount || parseCurrencyToNumber(formData.amount) <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a description",
        variant: "destructive",
      });
      return;
    }

    try {
      const newExpense: CreateExpenseRequest = {
        propertyId: formData.propertyId
          ? Number(formData.propertyId)
          : undefined,
        amount: parseCurrencyToNumber(formData.amount),
        category: formData.category as ExpenseCategory,
        expenseDate: formData.date,
        description: formData.description,
      };

      await dispatch(createExpense(newExpense)).unwrap();
      setIsAddDialogOpen(false);
      resetForm();
      setCurrentPage(1);

      toast({
        title: "Success",
        description: "Expense added successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to add expense",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async () => {
    if (!selectedExpense) return;

    if (!formData.category) {
      toast({
        title: "Validation Error",
        description: "Please select a category",
        variant: "destructive",
      });
      return;
    }

    if (!formData.amount || parseCurrencyToNumber(formData.amount) <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid amount",
        variant: "destructive",
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a description",
        variant: "destructive",
      });
      return;
    }

    try {
      const updateData: UpdateExpenseRequest = {
        propertyId: formData.propertyId
          ? Number(formData.propertyId)
          : undefined,
        amount: parseCurrencyToNumber(formData.amount),
        category: formData.category as ExpenseCategory,
        expenseDate: formData.date,
        description: formData.description,
      };

      await dispatch(
        updateExpense({ id: selectedExpense.id, data: updateData })
      ).unwrap();
      setIsEditDialogOpen(false);
      setSelectedExpense(null);
      resetForm();

      toast({
        title: "Success",
        description: "Expense updated successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to update expense",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedExpense) return;

    try {
      await dispatch(deleteExpense(selectedExpense.id)).unwrap();
      setIsDeleteDialogOpen(false);
      setSelectedExpense(null);

      // Adjust page if necessary
      const newTotalPages = Math.ceil((expenses.length - 1) / itemsPerPage);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      }

      toast({
        title: "Success",
        description: "Expense deleted successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to delete expense",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (expense: Expense) => {
    setSelectedExpense(expense);
    setFormData({
      propertyId: expense.propertyId?.toString() || "",
      amount: formatCurrencyInput(expense.amount.toString()),
      category: expense.category,
      date: expense.expenseDate.split("T")[0],
      description: expense.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (expense: Expense) => {
    setSelectedExpense(expense);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      propertyId: "",
      amount: "",
      category: "",
      date: getTodayLocalDate(),
      description: "",
    });
  };

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

  const goToPreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return (
      selectedYear === now.getFullYear() && selectedMonth === now.getMonth()
    );
  };

  const stats = {
    totalExpenses: expenses.reduce((sum, e) => sum + e.amount, 0),
    expenseCount: expenses.length,
    avgExpense:
      expenses.length > 0
        ? expenses.reduce((sum, e) => sum + e.amount, 0) / expenses.length
        : 0,
    byCategory: expenseCategories.map((cat) => ({
      category: cat.label,
      total: expenses
        .filter((e) => e.category === cat.value)
        .reduce((sum, e) => sum + e.amount, 0),
    })),
  };

  const topCategories = stats.byCategory
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  const sortedExpenses = [...expenses].sort(
    (a, b) =>
      new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()
  );
  const totalPages = Math.ceil(sortedExpenses.length / itemsPerPage);
  const paginatedExpenses = sortedExpenses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Spinner className="size-8 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading expenses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-destructive mb-4">{error}</p>
          <Button
            onClick={() => {
              const dateRange = getMonthDateRange(selectedYear, selectedMonth);
              dispatch(
                fetchExpenses({
                  startDate: dateRange.start,
                  endDate: dateRange.end,
                })
              );
              dispatch(fetchProperties(true));
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
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background px-2 md:px-4 py-3 md:hidden">
        <SidebarTrigger />
        <h1 className="text-lg font-semibold">Expenses</h1>
      </div>

      <main className="container mx-auto px-2 md:px-4 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">
              Expense Tracking
            </h1>
            <p className="text-muted-foreground">
              Track and manage property expenses for{" "}
              {formatMonthYear(selectedYear, selectedMonth)}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 items-end sm:items-center">
            <div className="flex items-center gap-2">
              {!isCurrentMonth() && (
                <Button
                  size="sm"
                  onClick={goToCurrentMonth}
                  className="h-8 text-xs"
                >
                  Current Month
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousMonth}
                className="h-8 bg-transparent"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <div className="flex items-center gap-2 min-w-[180px] justify-center">
                <Calendar className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold">
                  {formatMonthYear(selectedYear, selectedMonth)}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextMonth}
                className="h-8 bg-transparent"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm} className="mt-2 sm:mt-0">
                  <Plus className="mr-2 size-4" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>Add New Expense</DialogTitle>
                  <DialogDescription>
                    Record a new property expense
                  </DialogDescription>
                </DialogHeader>
                <div className="overflow-y-auto flex-1 px-1">
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="propertyId">Property</Label>
                        <select
                          id="propertyId"
                          value={formData.propertyId}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              propertyId: e.target.value,
                            })
                          }
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                          required
                        >
                          <option value="">Select a property</option>
                          {properties.map((prop) => (
                            <option key={prop.id} value={prop.id.toString()}>
                              {prop.address1}{" "}
                              {prop.address2 && `- ${prop.address2}`}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="amount">
                          Amount ($) <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="amount"
                          type="text"
                          value={formData.amount}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              amount: formatCurrencyInput(e.target.value),
                            })
                          }
                          placeholder="$450.00"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category">
                          Category <span className="text-destructive">*</span>
                        </Label>
                        <select
                          id="category"
                          value={formData.category}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              category: e.target.value as ExpenseCategory,
                            })
                          }
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                          required
                        >
                          <option value="">Select a category</option>
                          {expenseCategories.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Input
                          id="date"
                          type="date"
                          value={formData.date}
                          onChange={(e) =>
                            setFormData({ ...formData, date: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">
                        Description <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        placeholder="Describe the expense..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter className="flex-shrink-0">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAdd}
                    disabled={
                      !formData.category ||
                      !formData.amount ||
                      parseCurrencyToNumber(formData.amount) <= 0 ||
                      !formData.description.trim()
                    }
                  >
                    Add Expense
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 mb-6">
          <CompactStatCard
            title="Monthly Expenses"
            value={`$${stats.totalExpenses.toLocaleString()}`}
            subtitle={formatMonthYear(selectedYear, selectedMonth)}
            icon={TrendingDown}
            helpText="Total expenses for the selected month"
          />
          <CompactStatCard
            title="Transactions"
            value={stats.expenseCount.toString()}
            subtitle="In selected month"
            icon={Calendar}
            helpText="Number of expense transactions this month"
          />
          <CompactStatCard
            title="Avg. Expense"
            value={`$${stats.avgExpense.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
            subtitle="This month"
            icon={DollarSign}
            helpText="Average expense amount for this month's transactions"
          />
          {topCategories.length > 0 ? (
            topCategories
              .slice(0, 1)
              .map((cat) => (
                <CompactStatCard
                  key={cat.category}
                  title={cat.category}
                  value={`$${cat.total.toLocaleString()}`}
                  subtitle="Top category this month"
                  icon={TrendingDown}
                  helpText="Your highest expense category this month"
                />
              ))
          ) : (
            <CompactStatCard
              title="Top Category"
              value="$0"
              subtitle="No expenses this month"
              icon={TrendingDown}
              helpText="Your highest expense category this month"
            />
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Expenses for {formatMonthYear(selectedYear, selectedMonth)}
            </CardTitle>
            <CardDescription>
              View and manage all property expenses for the selected month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-6 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedExpenses.length > 0 ? (
                      paginatedExpenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="whitespace-nowrap">
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
                          </TableCell>
                          <TableCell className="font-medium">
                            {expense.propertyAddress || "Unassigned"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={getCategoryColor(expense.category)}
                            >
                              {expense.categoryDisplayName}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <TruncatedText
                              text={expense.description || "No description"}
                              maxLength={80}
                            />
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            ${expense.amount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(expense)}
                              >
                                <Pencil className="size-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDeleteDialog(expense)}
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-10 text-muted-foreground"
                        >
                          No expenses recorded for this month.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, expenses.length)} of{" "}
                  {expenses.length} expenses
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from(
                      { length: Math.min(totalPages, 5) },
                      (_, i) => i + 1
                    ).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8"
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Edit Expense</DialogTitle>
              <DialogDescription>Update the expense details</DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto flex-1 px-1">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-propertyId">Property</Label>
                    <select
                      id="edit-propertyId"
                      value={formData.propertyId}
                      onChange={(e) =>
                        setFormData({ ...formData, propertyId: e.target.value })
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                      required
                    >
                      <option value="">Select a property</option>
                      {properties.map((prop) => (
                        <option key={prop.id} value={prop.id.toString()}>
                          {prop.address1}{" "}
                          {prop.address2 && `- ${prop.address2}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-amount">
                      Amount ($) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="edit-amount"
                      type="text"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          amount: formatCurrencyInput(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-category">
                      Category <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="edit-category"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          category: e.target.value as ExpenseCategory,
                        })
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                      required
                    >
                      <option value="">Select a category</option>
                      {expenseCategories.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-date">Date</Label>
                    <Input
                      id="edit-date"
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData({ ...formData, date: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">
                    Description <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="flex-shrink-0">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEdit}
                disabled={
                  !formData.category ||
                  !formData.amount ||
                  parseCurrencyToNumber(formData.amount) <= 0 ||
                  !formData.description.trim()
                }
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this expense record. This action
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
