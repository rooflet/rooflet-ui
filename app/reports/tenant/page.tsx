"use client";

import { TenantGanttChart } from "@/components/tenant-gantt-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { rentCollectionsApi } from "@/lib/api/rent-collections";
import { tenantsApi } from "@/lib/api/tenants";
import type { RentCollectionResponse, TenantResponse } from "@/lib/api/types";
import { useAppSelector } from "@/store/hooks";
import { DollarSign, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

// Calculate tenant metrics using rent collection data
function calculateTenantMetrics(
  tenant: TenantResponse,
  rentCollections: RentCollectionResponse[]
) {
  const now = new Date();
  const leaseStartDate = new Date(tenant.leaseStartDate || now.toISOString());

  // Filter collections for this tenant
  const tenantCollections = rentCollections.filter(
    (collection) => collection.tenantId === tenant.id
  );

  // Calculate total revenue from actual payments
  const totalRevenue = tenantCollections.reduce(
    (sum, collection) => sum + collection.paidAmount,
    0
  );

  // Calculate YTD revenue (from January 1st of current year)
  const currentYear = now.getFullYear();
  const ytdStartDate = new Date(currentYear, 0, 1); // January 1st of current year
  const ytdRevenue = tenantCollections
    .filter((collection) => {
      const paymentDate = collection.paymentDate
        ? new Date(collection.paymentDate)
        : new Date(collection.createdAt);
      return paymentDate >= ytdStartDate;
    })
    .reduce((sum, collection) => sum + collection.paidAmount, 0);

  // Get the most recent expected amount as current rent
  const recentCollections = tenantCollections
    .filter((collection) => collection.expectedAmount > 0)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const currentRent =
    recentCollections.length > 0
      ? recentCollections[0].expectedAmount
      : tenant.monthlyRent || 0;

  // Calculate months since lease start to determine rent increase candidacy
  const monthsAtCurrentRent =
    (now.getFullYear() - leaseStartDate.getFullYear()) * 12 +
    (now.getMonth() - leaseStartDate.getMonth()) +
    1;

  // Calculate additional metrics from collections
  const totalExpected = tenantCollections.reduce(
    (sum, collection) => sum + collection.expectedAmount,
    0
  );

  const totalOutstanding = tenantCollections.reduce(
    (sum, collection) => sum + collection.remainingBalance,
    0
  );

  const paymentCount = tenantCollections.filter(
    (collection) => collection.paidAmount > 0
  ).length;

  const overduePayments = tenantCollections.filter(
    (collection) => collection.isOverdue
  ).length;

  // Check if candidate for rent increase (>12 months at same rate)
  const isRentIncreaseCandidate = monthsAtCurrentRent > 12 && !tenant.archived;

  return {
    tenantName: tenant.name,
    unit: tenant.propertyAddress || "N/A",
    currentRent,
    totalRevenue,
    ytdRevenue,
    totalExpected,
    totalOutstanding,
    paymentCount,
    overduePayments,
    monthsAtCurrentRent,
    isRentIncreaseCandidate,
    archived: tenant.archived,
    collectionRate:
      totalExpected > 0 ? (totalRevenue / totalExpected) * 100 : 0,
  };
}

export default function TenantAnalysisPage() {
  const [tenants, setTenants] = useState<TenantResponse[]>([]);
  const [rentCollections, setRentCollections] = useState<
    RentCollectionResponse[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { refreshKey } = useAppSelector((state) => state.portfolio);

  useEffect(() => {
    fetchTenants();
  }, [refreshKey]);

  const fetchTenants = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch both tenants and rent collections in parallel
      const [tenantsData, collectionsData] = await Promise.all([
        tenantsApi.getAll(),
        rentCollectionsApi.getAll(),
      ]);

      setTenants(tenantsData);
      setRentCollections(collectionsData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load tenant data";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const tenantMetrics = tenants.map((tenant) =>
    calculateTenantMetrics(tenant, rentCollections)
  );
  const totalPortfolioRevenue = tenantMetrics.reduce(
    (sum, t) => sum + t.totalRevenue,
    0
  );
  const totalYtdRevenue = tenantMetrics.reduce(
    (sum, t) => sum + t.ytdRevenue,
    0
  );
  const activeTenants = tenants.filter((t) => !t.archived).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Spinner className="size-8 mx-auto mb-4" />
          <p className="text-muted-foreground">
            Loading tenant data and rent collections...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={fetchTenants}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background px-2 md:px-4 py-3 md:hidden">
        <SidebarTrigger />
        <h1 className="text-lg font-semibold">Tenant Reports</h1>
      </div>

      <main className="container mx-auto px-2 md:px-4 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">
              Tenant Reports
            </h1>
            <p className="text-muted-foreground">
              Overview of tenant occupancy and lease information
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue (All Time)
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${totalPortfolioRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Actual payments collected
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Tenants
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeTenants}</div>
              <p className="text-xs text-muted-foreground">
                Currently occupied units
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue YTD
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${totalYtdRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Since January 1, {new Date().getFullYear()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tenant Revenue & Rent Duration Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Tenant Revenue & Rent Analysis</CardTitle>
            <CardDescription>
              Actual revenue collected for each tenant based on real rent
              collection records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Unit</th>
                    <th className="text-left py-3 px-4 font-semibold">
                      Tenant
                    </th>
                    <th className="text-right py-3 px-4 font-semibold">
                      Current Rent
                    </th>
                    <th className="text-right py-3 px-4 font-semibold">
                      Total Revenue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tenantMetrics.map((tenant, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-3 px-4 font-medium">{tenant.unit}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span>{tenant.tenantName}</span>
                          {tenant.archived && (
                            <Badge variant="secondary">Archived</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        ${tenant.currentRent.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-green-500 font-semibold">
                        ${tenant.totalRevenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Gantt Chart */}
        <TenantGanttChart />
      </main>
    </div>
  );
}
