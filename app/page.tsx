"use client";

import { PaymentsList } from "@/components/payments-list";
import { PropertiesOverview } from "@/components/properties-overview";
import { RecentExpenses } from "@/components/recent-expenses";
import { StatsCards } from "@/components/stats-cards";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { WhatsNewBanner } from "@/components/whats-new-banner";
import { propertiesApi } from "@/lib/api/properties";
import { tenantsApi } from "@/lib/api/tenants";
import { ROUTES } from "@/lib/constants/routes";
import { useAppSelector } from "@/store/hooks";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { activePortfolioId } = useAppSelector((state) => state.portfolio);

  useEffect(() => {
    const checkUserData = async () => {
      try {
        const [propertiesResponse, tenantsResponse] = await Promise.all([
          propertiesApi.getAll(true), // Get active properties only
          tenantsApi.getAll({ activeOnly: true }), // Get active tenants only
        ]);

        const hasNoProperties = propertiesResponse.length === 0;
        const hasNoTenants = tenantsResponse.length === 0;

        setShowWelcomeBanner(hasNoProperties && hasNoTenants);
      } catch (error) {
        // Show banner as fallback on error
        setShowWelcomeBanner(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkUserData();
  }, [activePortfolioId]);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background px-2 md:px-4 py-3 md:hidden">
        <SidebarTrigger />
        <h1 className="text-lg font-semibold">Dashboard</h1>
      </div>

      <main className="container mx-auto px-2 md:px-4 py-8 space-y-8">
        <div className="hidden md:block">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your properties.
          </p>
        </div>

        <WhatsNewBanner />

        {!isLoading && showWelcomeBanner && (
          <Card className="border-primary/50 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4 py-6">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-primary/10 p-3">
                  <Sparkles className="size-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">
                    Welcome to Rooflet!
                  </h3>
                  <p className="text-muted-foreground">
                    Get started by adding your first property and tenant using
                    our guided setup wizard.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button asChild variant="outline">
                  <a href={ROUTES.ONBOARDING}>Setup Portfolio</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <StatsCards />

        <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-3">
          <PropertiesOverview />
          <PaymentsList />
          <RecentExpenses />
        </div>
      </main>
    </div>
  );
}
