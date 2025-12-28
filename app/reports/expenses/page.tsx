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
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { expensesApi } from "@/lib/api/expenses";
import type { ExpenseResponse } from "@/lib/api/types";
import { getTodayLocalDate } from "@/lib/date-validation";
import { useAppSelector } from "@/store/hooks";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Calendar,
  DollarSign,
  Download,
  FileText,
  PieChartIcon,
  TrendingDown,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

const categoryColors: Record<string, string> = {
  "Repairs & Maintenance": "#f97316",
  "Capital Improvements": "#ec4899",
  Cleaning: "hsl(var(--chart-3))",
  Landscaping: "#10b981",
  "Property Tax": "#ef4444",
  Utilities: "#3b82f6",
  Insurance: "#22c55e",
  "HOA Fees": "#eab308",
  "Legal & Professional": "#6366f1",
  "Property Management": "hsl(var(--primary))",
  Other: "#6b7280",
};

export default function ExpenseReportsPage() {
  const [expenses, setExpenses] = useState<ExpenseResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { refreshKey } = useAppSelector((state) => state.portfolio);
  const [_selectedPeriod, _setSelectedPeriod] = useState("all-time");

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        setLoading(true);
        const data = await expensesApi.getAll();
        setExpenses(data);
      } catch (error) {
        console.error("Failed to fetch expenses:", error);
        toast({
          title: "Error",
          description: "Failed to load expense data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, [toast, refreshKey]);

  const expensesByCategory = Object.entries(
    expenses.reduce((acc, exp) => {
      const category = exp.categoryDisplayName || exp.category || "Other";
      acc[category] = (acc[category] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>)
  ).map(([category, amount]) => ({
    category,
    amount,
    fill: categoryColors[category] || categoryColors["Other"],
  }));

  const expensesByProperty = Object.entries(
    expenses.reduce((acc, exp) => {
      const property = exp.propertyAddress || "Unassigned";
      acc[property] = (acc[property] || 0) + exp.amount;
      return acc;
    }, {} as Record<string, number>)
  ).map(([property, amount]) => ({
    property,
    amount,
  }));

  const monthlyExpenses = expenses.reduce((acc, exp) => {
    const month = new Date(exp.expenseDate).toLocaleString("default", {
      month: "short",
      year: "numeric",
    });
    acc[month] = (acc[month] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

  const monthlyData = Object.entries(monthlyExpenses).map(
    ([month, amount]) => ({
      month,
      amount,
    })
  );

  const stats = {
    totalExpenses: expenses.reduce((sum, e) => sum + e.amount, 0),
    avgExpense:
      expenses.length > 0
        ? (
            expenses.reduce((sum, e) => sum + e.amount, 0) / expenses.length
          ).toFixed(0)
        : "0",
    topCategory:
      expensesByCategory.length > 0
        ? expensesByCategory.sort((a, b) => b.amount - a.amount)[0]
        : { category: "N/A", amount: 0 },
    expenseCount: expenses.length,
  };

  const exportToCSV = () => {
    const headers = ["Property", "Category", "Amount", "Date", "Description"];
    const rows = expenses.map((e) => [
      e.propertyAddress || "Unassigned",
      e.categoryDisplayName || e.category,
      e.amount,
      e.expenseDate,
      e.description || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `expense-report-${getTodayLocalDate()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const pdf = new jsPDF();
    const currentDate = new Date().toLocaleDateString();

    // Add title
    pdf.setFontSize(20);
    pdf.text("Expense Report", 20, 20);

    // Add generation date
    pdf.setFontSize(12);
    pdf.text(`Generated on: ${currentDate}`, 20, 30);

    // Add summary statistics
    pdf.setFontSize(14);
    pdf.text("Summary", 20, 45);
    pdf.setFontSize(11);
    pdf.text(
      `Total Expenses: $${stats.totalExpenses.toLocaleString()}`,
      20,
      55
    );
    pdf.text(`Average Expense: $${stats.avgExpense}`, 20, 62);
    pdf.text(`Total Transactions: ${stats.expenseCount}`, 20, 69);
    pdf.text(
      `Top Category: ${
        stats.topCategory.category
      } ($${stats.topCategory.amount.toLocaleString()})`,
      20,
      76
    );

    // Add expenses by category
    if (expensesByCategory.length > 0) {
      pdf.setFontSize(14);
      pdf.text("Expenses by Category", 20, 90);

      const categoryTableData = expensesByCategory.map((item) => [
        item.category,
        `$${item.amount.toLocaleString()}`,
      ]);

      autoTable(pdf, {
        startY: 95,
        head: [["Category", "Amount"]],
        body: categoryTableData,
        theme: "grid",
        styles: { fontSize: 10 },
        headStyles: { fillColor: [75, 85, 99] },
      });
    }

    // Add detailed expense table
    if (expenses.length > 0) {
      const finalY = (pdf as any).lastAutoTable?.finalY || 140;

      pdf.setFontSize(14);
      pdf.text("Detailed Expense List", 20, finalY + 15);

      const tableData = expenses
        .sort(
          (a, b) =>
            new Date(b.expenseDate).getTime() -
            new Date(a.expenseDate).getTime()
        )
        .map((expense) => {
          const [year, month, day] = expense.expenseDate.split("-").map(Number);
          return [
            new Date(year, month - 1, day).toLocaleDateString(),
            expense.propertyAddress || "Unassigned",
            expense.categoryDisplayName || expense.category,
            // Truncate description if too long
            (expense.description || "—").length > 30
              ? (expense.description || "—").substring(0, 30) + "..."
              : expense.description || "—",
            `$${expense.amount.toLocaleString()}`,
          ];
        });

      autoTable(pdf, {
        startY: finalY + 20,
        head: [["Date", "Property", "Category", "Description", "Amount"]],
        body: tableData,
        theme: "grid",
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [75, 85, 99],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 25 }, // Date column
          1: { cellWidth: 35 }, // Property column
          2: { cellWidth: 30 }, // Category column
          3: { cellWidth: 40 }, // Description column
          4: { halign: "right", cellWidth: 25 }, // Amount column right-aligned
        },
        margin: { top: 20, right: 20, bottom: 20, left: 20 },
      });
    }

    // Save the PDF
    const fileName = `expense-report-${getTodayLocalDate()}.pdf`;
    pdf.save(fileName);

    toast({
      title: "Success",
      description: "PDF report has been generated and downloaded.",
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      "Repairs & Maintenance": "bg-orange-500/10 text-orange-500",
      Utilities: "bg-blue-500/10 text-blue-500",
      "Property Management": "bg-primary/10 text-primary",
      Insurance: "bg-green-500/10 text-green-500",
      "Property Tax": "bg-red-500/10 text-red-500",
      "HOA Fees": "bg-yellow-500/10 text-yellow-500",
      "Legal & Professional": "bg-indigo-500/10 text-indigo-500",
      Landscaping: "bg-emerald-500/10 text-emerald-500",
      Cleaning: "bg-chart-3/10 text-chart-3",
      "Capital Improvements": "bg-pink-500/10 text-pink-500",
      Other: "bg-gray-500/10 text-gray-500",
    };
    return colors[category] || colors["Other"];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background px-2 md:px-4 py-3 md:hidden">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold">Expense Reports</h1>
        </div>
        <main className="container mx-auto px-2 md:px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading expense data...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background px-2 md:px-4 py-3 md:hidden">
        <SidebarTrigger />
        <h1 className="text-lg font-semibold">Expense Reports</h1>
      </div>

      <main className="container mx-auto px-2 md:px-4 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">
              Expense Reports
            </h1>
            <p className="text-muted-foreground">
              Comprehensive expense analysis and breakdown
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="default"
              onClick={exportToCSV}
              className="bg-primary hover:bg-primary/90"
            >
              <Download className="mr-2 size-4" />
              Export CSV
            </Button>
            <Button
              variant="default"
              onClick={exportToPDF}
              className="bg-accent hover:bg-accent/90"
            >
              <FileText className="mr-2 size-4" />
              Export PDF
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Expenses
              </CardTitle>
              <TrendingDown className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.totalExpenses.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">All-time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Expense</CardTitle>
              <DollarSign className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.avgExpense}</div>
              <p className="text-xs text-muted-foreground">Per transaction</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Top Category
              </CardTitle>
              <PieChartIcon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.topCategory.amount.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.topCategory.category}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                Total Transactions
              </CardTitle>
              <Calendar className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.expenseCount}</div>
              <p className="text-xs text-muted-foreground">Expense records</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Expenses by Category</CardTitle>
              <CardDescription>
                Distribution of expenses across categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              {expensesByCategory.length > 0 ? (
                <ChartContainer
                  config={Object.fromEntries(
                    Object.keys(categoryColors).map((cat) => [
                      cat.toLowerCase().replace(/\s+/g, "-"),
                      {
                        label: cat,
                        color: categoryColors[cat],
                      },
                    ])
                  )}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensesByCategory}
                        dataKey="amount"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(entry) => `${entry.category}: $${entry.amount}`}
                      >
                        {expensesByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No expense data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Expenses by Property</CardTitle>
              <CardDescription>Total expenses per property</CardDescription>
            </CardHeader>
            <CardContent>
              {expensesByProperty.length > 0 ? (
                <ChartContainer
                  config={{
                    amount: {
                      label: "Amount",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={expensesByProperty}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="property"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="amount"
                        fill="#a78bfa"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No expense data available
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Monthly Expense Trend</CardTitle>
              <CardDescription>Expenses over time</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <ChartContainer
                  config={{
                    amount: {
                      label: "Amount",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="amount"
                        fill="#22d3ee"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No expense data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Expense Details</CardTitle>
            <CardDescription>Complete expense breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {expenses.length > 0 ? (
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
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses
                        .sort(
                          (a, b) =>
                            new Date(b.expenseDate).getTime() -
                            new Date(a.expenseDate).getTime()
                        )
                        .map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell className="whitespace-nowrap">
                              {new Date(
                                expense.expenseDate
                              ).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-medium">
                              {expense.propertyAddress || "Unassigned"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={getCategoryColor(
                                  expense.categoryDisplayName ||
                                    expense.category
                                )}
                              >
                                {expense.categoryDisplayName ||
                                  expense.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {expense.description || "—"}
                            </TableCell>
                            <TableCell className="text-right font-mono font-medium">
                              ${expense.amount.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No expenses found. Add your first expense to get started.
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
