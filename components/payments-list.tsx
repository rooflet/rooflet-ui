"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { rentCollectionsApi } from "@/lib/api/rent-collections";
import type { RentCollectionResponse } from "@/lib/api/types";
import { ROUTES } from "@/lib/constants/routes";
import { getRelativeTime } from "@/lib/time-utils";
import { useAppSelector } from "@/store/hooks";
import Link from "next/link";
import { useEffect, useState } from "react";

interface PaymentData {
  id: string;
  tenant: string;
  amount: string;
  property: string;
  paymentType: "full" | "partial";
  paymentDate: string;
  relativeDate: string;
}

export function PaymentsList() {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { activePortfolioId } = useAppSelector((state) => state.portfolio);

  useEffect(() => {
    const fetchCurrentMonthPayments = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get current month period (same logic as stats-cards)
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const startPeriod = `${year}-${month.toString().padStart(2, "0")}-01`;
        const lastDayOfMonth = new Date(year, month, 0).getDate();
        const endPeriod = `${year}-${month
          .toString()
          .padStart(2, "0")}-${lastDayOfMonth}`;

        // Get all rent collections for current month
        const rentCollections = await rentCollectionsApi.getAll({
          startPeriod,
          endPeriod,
        });

        // Filter for payments that have been made (paidAmount > 0) and sort by payment date
        const paymentsWithDate = rentCollections
          .filter(
            (collection: RentCollectionResponse) =>
              collection.paidAmount > 0 && collection.paymentDate,
          )
          .sort(
            (a: RentCollectionResponse, b: RentCollectionResponse) =>
              new Date(b.paymentDate!).getTime() -
              new Date(a.paymentDate!).getTime(),
          );

        // Transform to payment data format
        const paymentsData: PaymentData[] = paymentsWithDate.map(
          (collection: RentCollectionResponse) => ({
            id: collection.id,
            tenant: collection.tenantName,
            amount: `$${collection.paidAmount.toLocaleString()}`,
            property: collection.propertyAddress,
            paymentType:
              collection.paidAmount >= collection.expectedAmount
                ? "full"
                : "partial",
            paymentDate: collection.paymentDate!,
            relativeDate: getRelativeTime(collection.paymentDate!),
          }),
        );

        setPayments(paymentsData);
      } catch (err) {
        console.error("Error fetching payments:", err);
        setError("Failed to load payments");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentMonthPayments();
  }, [activePortfolioId]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Link href={ROUTES.OPERATIONS.RENT_COLLECTION}>
            <CardTitle className="cursor-pointer hover:text-primary transition-colors">
              Current Month Payments
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
          <Link href={ROUTES.OPERATIONS.RENT_COLLECTION}>
            <CardTitle className="cursor-pointer hover:text-primary transition-colors">
              Current Month Payments
            </CardTitle>
          </Link>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (payments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <Link href={ROUTES.OPERATIONS.RENT_COLLECTION}>
            <CardTitle className="cursor-pointer hover:text-primary transition-colors">
              Current Month Payments
            </CardTitle>
          </Link>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">
            No payments found for current month
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <Link href={ROUTES.OPERATIONS.RENT_COLLECTION}>
          <CardTitle className="cursor-pointer hover:text-primary transition-colors">
            Current Month Payments
          </CardTitle>
        </Link>
      </CardHeader>
      <CardContent className="space-y-3 max-h-120 overflow-y-auto scrollbar-hide">
        {payments.slice(0, 10).map((payment: PaymentData) => (
          <Link key={payment.id} href={ROUTES.OPERATIONS.RENT_COLLECTION}>
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors cursor-pointer">
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">{payment.tenant}</h3>
                <p className="text-xs text-muted-foreground mb-1">
                  {payment.property}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {(() => {
                      // Parse date as local to avoid timezone shifts
                      const [year, month, day] = payment.paymentDate
                        .split("-")
                        .map(Number);
                      return new Date(
                        year,
                        month - 1,
                        day,
                      ).toLocaleDateString();
                    })()}
                  </span>
                  <span>•</span>
                  <span>{payment.relativeDate}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <p className="font-semibold text-lg">{payment.amount}</p>
                <Badge
                  variant={
                    payment.paymentType === "full" ? "default" : "secondary"
                  }
                  className={
                    payment.paymentType === "full"
                      ? "bg-chart-3/10 text-chart-3 hover:bg-chart-3/20"
                      : "bg-chart-1/10 text-chart-1 hover:bg-chart-1/20"
                  }
                >
                  {payment.paymentType === "full"
                    ? "Full Payment"
                    : "Partial Payment"}
                </Badge>
              </div>
            </div>
          </Link>
        ))}
        {payments.length > 10 && (
          <div className="pt-3 border-t">
            <Link href={ROUTES.OPERATIONS.RENT_COLLECTION}>
              <p className="text-xs text-muted-foreground text-center hover:text-primary transition-colors cursor-pointer">
                +{payments.length - 10} more payments • View all
              </p>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
