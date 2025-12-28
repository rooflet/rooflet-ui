"use client";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { propertiesApi } from "@/lib/api/properties";
import type { PropertyResponse } from "@/lib/api/types";
import { useAppSelector } from "@/store/hooks";
import { Calendar, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

interface Property {
  address: string;
  acquired: string;
  value: number | null;
  acquisitionYear: number;
}

const formatAcquiredDate = (dateString: string | undefined) => {
  if (!dateString) return "Not set";
  const date = new Date(dateString);
  // Check if date is invalid or before 1970 (likely epoch issue)
  if (isNaN(date.getTime()) || date.getFullYear() < 1970) {
    return "Not set";
  }
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

const getAcquisitionYear = (dateString: string | undefined) => {
  if (!dateString) return new Date().getFullYear(); // Use current year as fallback
  const date = new Date(dateString);
  // Check if date is invalid or before 1970 (likely epoch issue)
  if (isNaN(date.getTime()) || date.getFullYear() < 1970) {
    return new Date().getFullYear(); // Use current year as fallback
  }
  return date.getFullYear();
};

export default function TimelinePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { refreshKey } = useAppSelector((state) => state.portfolio);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const apiProperties = await propertiesApi.getAll();
        const formattedProperties = apiProperties.map(
          (p: PropertyResponse) => ({
            address: `${p.address1}${p.address2 ? ` ${p.address2}` : ""}`,
            acquired: formatAcquiredDate(p.purchaseDate),
            value: p.marketValue ?? null,
            acquisitionYear: getAcquisitionYear(p.purchaseDate),
          })
        );
        setProperties(formattedProperties);
        setError(null);
      } catch (err) {
        setError("Failed to fetch timeline data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [refreshKey]);

  // Calculate properties acquired per year (exclude properties with invalid dates)
  const validProperties = properties.filter((p) => p.acquired !== "Not set");
  const propertiesByYear = validProperties.reduce((acc, property) => {
    const year = property.acquisitionYear;
    acc[year] = (acc[year] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const years = validProperties.map((p) => p.acquisitionYear);
  const minYear =
    years.length > 0 ? Math.min(...years) : new Date().getFullYear();
  const maxYear =
    years.length > 0 ? Math.max(...years) : new Date().getFullYear();
  const yearRange = Array.from(
    { length: maxYear - minYear + 1 },
    (_, i) => maxYear - i
  );

  const yearStats = yearRange.map((year) => ({
    year,
    count: propertiesByYear[year] || 0,
  }));

  const [hoveredYear, setHoveredYear] = useState<number | null>(null);

  const propertiesPerYear = validProperties.reduce((acc, property) => {
    const year = property.acquisitionYear;
    if (!acc[year]) acc[year] = [];
    acc[year].push(property.address);
    return acc;
  }, {} as Record<number, string[]>);

  const valuePerYear = validProperties.reduce((acc, property) => {
    const year = property.acquisitionYear;
    acc[year] = (acc[year] || 0) + (property.value ?? 0);
    return acc;
  }, {} as Record<number, number>);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 px-2 md:px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-72" />
            <Skeleton className="h-5 w-80 mt-2" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-6 px-2 md:px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background px-2 md:px-4 py-3 md:hidden">
        <SidebarTrigger />
        <h1 className="text-lg font-semibold">Timeline</h1>
      </div>

      <div className="flex flex-col gap-6 px-2 md:px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Property Timeline
            </h1>
            <p className="text-muted-foreground">
              Track your property acquisition history
            </p>
          </div>
        </div>

        {/* Acquisition Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Properties
              </CardTitle>
              <Calendar className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{properties.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Portfolio Value
              </CardTitle>
              <TrendingUp className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                $
                {properties
                  .reduce((sum, p) => sum + (p.value ?? 0), 0)
                  .toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Estimated market value
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Average per Year
              </CardTitle>
              <Calendar className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {validProperties.length > 0 && yearRange.length > 0
                  ? (validProperties.length / yearRange.length).toFixed(1)
                  : "0.0"}
              </div>
              <p className="text-xs text-muted-foreground">
                Properties acquired annually
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Properties by Year */}
        <Card>
          <CardHeader>
            <CardTitle>Acquisitions by Year</CardTitle>
            <CardDescription>
              Number of properties acquired each year (hover to see details)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {yearStats.map((stat) => (
                <div key={stat.year} className="flex items-center gap-4">
                  <div className="w-16 font-semibold">{stat.year}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Popover open={hoveredYear === stat.year}>
                        <PopoverTrigger asChild>
                          <div
                            className="h-8 bg-primary rounded cursor-pointer hover:bg-primary/80 transition-colors relative"
                            style={{
                              width: `${
                                (stat.count /
                                  Math.max(...yearStats.map((s) => s.count))) *
                                100
                              }%`,
                              minWidth: stat.count > 0 ? "40px" : "0px",
                            }}
                            onMouseEnter={() =>
                              stat.count > 0 && setHoveredYear(stat.year)
                            }
                            onMouseLeave={() => setHoveredYear(null)}
                          />
                        </PopoverTrigger>
                        {stat.count > 0 && (
                          <PopoverContent
                            className="w-80"
                            side="right"
                            align="center"
                          >
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm">
                                Properties Acquired in {stat.year}
                              </h4>
                              <div className="text-sm font-medium text-primary">
                                Total Value: $
                                {valuePerYear[stat.year]?.toLocaleString() || 0}
                              </div>
                              <ul className="space-y-1">
                                {propertiesPerYear[stat.year]?.map(
                                  (address, idx) => (
                                    <li
                                      key={idx}
                                      className="text-sm text-muted-foreground"
                                    >
                                      • {address}
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          </PopoverContent>
                        )}
                      </Popover>
                      <Badge variant="secondary">
                        {stat.count}{" "}
                        {stat.count === 1 ? "property" : "properties"}
                      </Badge>
                      {stat.count > 0 && (
                        <Badge variant="outline" className="text-primary">
                          ${((valuePerYear[stat.year] ?? 0) / 1000).toFixed(0)}K
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Property Details Table */}
        <Card>
          <CardHeader>
            <CardTitle>Property Acquisition Details</CardTitle>
            <CardDescription>
              Complete list of all properties with acquisition information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {properties.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-muted-foreground mb-2">
                  <Calendar className="size-12 mx-auto mb-4" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  No Properties Added Yet
                </h3>
                <p className="text-muted-foreground text-sm">
                  Add your first property to start tracking your acquisition
                  timeline.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Address</TableHead>
                    <TableHead>Acquired</TableHead>
                    <TableHead>Est. Value</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead className="text-right"># Properties</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {properties.map((property, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {property.address}
                      </TableCell>
                      <TableCell>{property.acquired}</TableCell>
                      <TableCell>
                        ${property.value?.toLocaleString() ?? "0"}
                      </TableCell>
                      <TableCell>
                        {property.acquired === "Not set"
                          ? "Not set"
                          : property.acquisitionYear}
                      </TableCell>
                      <TableCell className="text-right">
                        {propertiesPerYear[property.acquisitionYear]?.length ??
                          0}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
