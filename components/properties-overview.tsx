"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { expensesApi } from "@/lib/api/expenses";
import { propertiesApi } from "@/lib/api/properties";
import { rentCollectionsApi } from "@/lib/api/rent-collections";
import { tenantsApi } from "@/lib/api/tenants";
import type {
  ExpenseResponse,
  PropertyResponse,
  RentCollectionResponse,
  TenantResponse,
} from "@/lib/api/types";
import { ROUTES } from "@/lib/constants/routes";
import { toLocalDateString } from "@/lib/date-validation";
import { useAppSelector } from "@/store/hooks";
import { MapPin, Receipt, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface PropertyOverviewData {
  id: number;
  name: string;
  address: string;
  monthlyRent: number;
  collectedRent: number;
  fixedCosts: number;
  currentMonthExpenses: number;
  marketValue: number;
  cocReturn: number;
}

const getReturnColor = (value: number) => {
  if (value >= 8) return "text-green-500";
  if (value >= 6) return "text-green-600";
  if (value >= 4) return "text-yellow-600";
  return "text-red-500";
};

export function PropertiesOverview() {
  const [properties, setProperties] = useState<PropertyOverviewData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { activePortfolioId } = useAppSelector((state) => state.portfolio);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const propertiesData = await propertiesApi.getAll(true); // Get active properties only

        // Fetch all active tenants
        const tenantsData = await tenantsApi.getAll({ activeOnly: true });

        // Get current month date range for expenses
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const startDate = toLocalDateString(startOfMonth);
        const endDate = toLocalDateString(endOfMonth);

        // Fetch all expenses for current month
        const expensesData = await expensesApi.getAll({
          startDate,
          endDate,
        });

        // Fetch all rent collections for current month
        const rentCollectionsData = await rentCollectionsApi.getAll({
          startPeriod: startDate,
          endPeriod: endDate,
        });

        // Transform API data to overview format
        const overviewData: PropertyOverviewData[] = propertiesData.map(
          (property: PropertyResponse) => {
            // Calculate fixed costs (sum of all monthly recurring costs)
            const fixedCosts =
              (property.monthlyHoa || 0) +
              (property.monthlyPropertyTax || 0) +
              (property.monthlyInsurance || 0);

            // Calculate current month expenses for this property
            const currentMonthExpenses = expensesData
              .filter(
                (expense: ExpenseResponse) => expense.propertyId === property.id
              )
              .reduce(
                (sum: number, expense: ExpenseResponse) => sum + expense.amount,
                0
              );

            // Calculate collected rent for this property in current month
            const collectedRent = rentCollectionsData
              .filter(
                (collection: RentCollectionResponse) =>
                  collection.propertyId === property.id
              )
              .reduce(
                (sum: number, collection: RentCollectionResponse) =>
                  sum + collection.paidAmount,
                0
              );

            // Find tenants for this property and get maximum expected rent
            const propertyTenants = tenantsData.filter(
              (tenant: TenantResponse) =>
                tenant.propertyId === property.id && !tenant.archived
            );
            const monthlyRent =
              propertyTenants.length > 0
                ? Math.max(
                    ...propertyTenants.map(
                      (t: TenantResponse) => t.monthlyRent || 0
                    )
                  )
                : 0;

            // Calculate Cash-on-Cash return (simplified calculation)
            // CoC = (Annual Cash Flow / Initial Cash Investment) * 100
            const annualCashFlow = (monthlyRent - fixedCosts) * 12;
            const initialInvestment =
              (property.purchasePrice || 0) - (property.debt || 0);
            const cocReturn =
              initialInvestment > 0
                ? (annualCashFlow / initialInvestment) * 100
                : 0;

            return {
              id: property.id,
              name: property.address2
                ? `${property.address1}, ${property.address2}`
                : property.address1,
              address: `${property.address1}, ${property.city}`,
              monthlyRent,
              collectedRent,
              fixedCosts,
              currentMonthExpenses,
              marketValue: property.marketValue || 0,
              cocReturn: Math.round(cocReturn * 100) / 100, // Round to 2 decimal places
            };
          }
        );

        setProperties(overviewData);
      } catch (err) {
        console.error("Error fetching properties:", err);
        setError("Failed to load properties");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProperties();
  }, [activePortfolioId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Link href={ROUTES.OPERATIONS.PROPERTIES}>
            <CardTitle className="cursor-pointer hover:text-primary transition-colors">
              Properties
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
          <Link href={ROUTES.OPERATIONS.PROPERTIES}>
            <CardTitle className="cursor-pointer hover:text-primary transition-colors">
              Properties
            </CardTitle>
          </Link>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (properties.length === 0) {
    return (
      <Card>
        <CardHeader>
          <Link href={ROUTES.OPERATIONS.PROPERTIES}>
            <CardTitle className="cursor-pointer hover:text-primary transition-colors">
              Properties
            </CardTitle>
          </Link>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">No properties found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <Link href={ROUTES.OPERATIONS.PROPERTIES}>
          <CardTitle className="cursor-pointer hover:text-primary transition-colors">
            Properties
          </CardTitle>
        </Link>
      </CardHeader>
      <CardContent className="space-y-3 max-h-120 overflow-y-auto scrollbar-hide">
        {properties.slice(0, 7).map((property: PropertyOverviewData) => (
          <Link key={property.id} href={ROUTES.OPERATIONS.PROPERTIES}>
            <div className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors cursor-pointer">
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-base">{property.name}</h3>

                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  {property.address}
                </div>

                <div className="grid grid-cols-5 gap-3 pt-2">
                  <div className="flex flex-col">
                    <p className="text-xs text-muted-foreground mb-1 h-8 flex items-center">
                      Collected Rent
                    </p>
                    <p className="text-sm font-semibold text-green-600">
                      ${property.collectedRent.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-xs text-muted-foreground mb-1 h-8 flex items-center">
                      Expected Rent
                    </p>
                    <p className="text-sm font-semibold text-primary">
                      ${property.monthlyRent.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-xs text-muted-foreground mb-1 h-8 flex items-center">
                      Fixed Costs
                    </p>
                    <div className="flex items-center gap-1">
                      <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                      <p className="text-sm font-semibold text-orange-500">
                        ${property.fixedCosts.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-xs text-muted-foreground mb-1 h-8 flex items-center">
                      Month Expenses
                    </p>
                    <div className="flex items-center gap-1">
                      <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                      <p className="text-sm font-semibold text-red-500">
                        ${property.currentMonthExpenses.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-xs text-muted-foreground mb-1 h-8 flex items-center">
                      CoC Return
                    </p>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                      <p
                        className={`text-sm font-semibold ${getReturnColor(
                          property.cocReturn
                        )}`}
                      >
                        {property.cocReturn}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
        {properties.length > 7 && (
          <div className="pt-3 border-t">
            <Link href={ROUTES.OPERATIONS.PROPERTIES}>
              <p className="text-xs text-muted-foreground text-center hover:text-primary transition-colors cursor-pointer">
                +{properties.length - 7} more properties • View all
              </p>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
