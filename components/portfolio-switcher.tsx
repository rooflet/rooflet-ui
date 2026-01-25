"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { loadPortfolios, switchPortfolio } from "@/store/slices/portfolioSlice";
import { Check, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

export function PortfolioSwitcher() {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const { portfolios, activePortfolioId, activePortfolioName, isLoading } =
    useAppSelector((state) => state.portfolio);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (portfolios.length === 0) {
      dispatch(loadPortfolios());
    }
  }, [dispatch, portfolios.length]);

  const handleSwitchPortfolio = async (
    portfolioId: string,
    portfolioName: string,
  ) => {
    if (portfolioId === activePortfolioId) {
      setIsOpen(false);
      return;
    }

    try {
      setIsSwitching(true);
      await dispatch(switchPortfolio({ portfolioId, portfolioName })).unwrap();
      setIsOpen(false);

      toast({
        title: "Portfolio Switched",
        description: `Now managing: ${portfolioName}`,
      });
    } catch (error) {
      console.error("Failed to switch portfolio:", error);
      toast({
        title: "Error",
        description: "Failed to switch portfolio",
        variant: "destructive",
      });
    } finally {
      setIsSwitching(false);
    }
  };

  if (isLoading) {
    return (
      <div className="px-2 py-1.5">
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between group-data-[collapsible=icon]:hidden bg-transparent"
          disabled={isSwitching}
        >
          <span className="truncate">{activePortfolioName}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {portfolios
          .filter((portfolio) => !portfolio.archived)
          .map((portfolio) => (
            <DropdownMenuItem
              key={portfolio.id}
              onClick={() =>
                handleSwitchPortfolio(portfolio.id, portfolio.name)
              }
              className="cursor-pointer"
            >
              <Check
                className={`mr-2 h-4 w-4 ${
                  portfolio.id === activePortfolioId
                    ? "opacity-100"
                    : "opacity-0"
                }`}
              />
              <span className="truncate">{portfolio.name}</span>
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
