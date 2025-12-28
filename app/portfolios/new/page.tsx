"use client";

import type React from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { portfoliosApi } from "@/lib/api/portfolios";
import type { CreatePortfolioRequest } from "@/lib/api/types";
import { useAppDispatch } from "@/store/hooks";
import { loadPortfolios } from "@/store/slices/portfolioSlice";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewPortfolioPage() {
  const router = useRouter();
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreatePortfolioRequest>({
    name: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Portfolio name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const newPortfolio = await portfoliosApi.create(formData);

      toast({
        title: "Portfolio Created",
        description: `${newPortfolio.name} has been created successfully`,
      });

      // Update Redux store with new portfolio
      await dispatch(loadPortfolios());

      router.push("/portfolios");
    } catch (error) {
      console.error("Failed to create portfolio:", error);
      toast({
        title: "Error",
        description: "Failed to create portfolio. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="md:hidden" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/portfolios")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Create New Portfolio</h1>
          <p className="text-muted-foreground">
            Set up a new portfolio to organize your properties
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Portfolio Details</CardTitle>
          <CardDescription>
            Enter information about your new portfolio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Portfolio Name *</Label>
              <Input
                id="name"
                placeholder="e.g., My Properties, Mom's Properties"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe this portfolio..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                disabled={isSubmitting}
                rows={4}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Create Portfolio
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/portfolios")}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
