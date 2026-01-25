"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { rentCollectionsApi } from "@/lib/api/rent-collections";
import type {
  CreateTenantRequest,
  PropertyResponse,
  TenantResponse,
  UpdateTenantRequest,
} from "@/lib/api/types";
import { ROUTES } from "@/lib/constants/routes";
import {
  ensureDecimalPadding,
  formatCurrencyInput,
  parseCurrencyToNumber,
} from "@/lib/currency-utils";
import {
  getTodayLocalDate,
  toLocalDateString,
  validateLeaseDates,
} from "@/lib/date-validation";
import {
  extractPhoneNumbers,
  formatPhoneAsYouType,
  validateAndFormatPhone,
} from "@/lib/phone-validation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchProperties } from "@/store/slices/propertiesSlice";
import {
  archiveTenant,
  createTenant,
  deleteTenant,
  fetchTenants,
  unarchiveTenant,
  updateTenant,
} from "@/store/slices/tenantsSlice";
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Mail,
  Pencil,
  Phone,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

type Tenant = TenantResponse;
type Property = PropertyResponse;

export default function TenantsPage() {
  const dispatch = useAppDispatch();
  const { tenants, isLoading, error } = useAppSelector(
    (state) => state.tenants,
  );
  const { properties } = useAppSelector((state) => state.properties);
  const { activePortfolioId } = useAppSelector((state) => state.portfolio);
  const { toast } = useToast();

  // Local UI state
  const [showArchived, setShowArchived] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    propertyId: "",
    rent: "",
    leaseStart: "",
    leaseEnd: "",
  });
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Rent periods state
  interface RentPeriod {
    id: string;
    startDate: string;
    endDate: string;
    monthlyRent: number;
  }

  interface ValidationWarning {
    type: "gap" | "overlap" | "future";
    message: string;
    periodIndices: number[];
  }

  const [rentPeriodsEnabled, setRentPeriodsEnabled] = useState(false);
  const [rentPeriods, setRentPeriods] = useState<RentPeriod[]>([]);
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);

  // Date formatting utility
  const formatDateWithMonth = (dateString: string): string => {
    // Parse date string manually to avoid timezone issues
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${
      months[date.getMonth()]
    } ${date.getDate()}, ${date.getFullYear()}`;
  };

  // Calculate months between two dates
  const calculateMonths = (startDate: string, endDate: string): number => {
    // Parse date strings manually to avoid timezone issues
    const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
    const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
    const start = new Date(startYear, startMonth - 1, startDay);
    const end = new Date(endYear, endMonth - 1, endDay);
    const yearsDiff = end.getFullYear() - start.getFullYear();
    const monthsDiff = end.getMonth() - start.getMonth();
    return Math.max(0, yearsDiff * 12 + monthsDiff + 1);
  };

  // Validate rent periods and return warnings
  const validateRentPeriods = (periods: RentPeriod[]): ValidationWarning[] => {
    if (periods.length === 0) return [];

    const warnings: ValidationWarning[] = [];
    const sortedPeriods = [...periods].sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );

    // Check for overlaps
    for (let i = 0; i < sortedPeriods.length - 1; i++) {
      const current = sortedPeriods[i];
      const next = sortedPeriods[i + 1];
      const currentEnd = new Date(current.endDate);
      const nextStart = new Date(next.startDate);

      if (currentEnd >= nextStart) {
        const currentIndex = periods.indexOf(current);
        const nextIndex = periods.indexOf(next);
        warnings.push({
          type: "overlap",
          message: `Period ${currentIndex + 1} and Period ${
            nextIndex + 1
          } overlap`,
          periodIndices: [currentIndex, nextIndex],
        });
      }
    }

    // Check for gaps (more than 1 day)
    for (let i = 0; i < sortedPeriods.length - 1; i++) {
      const current = sortedPeriods[i];
      const next = sortedPeriods[i + 1];
      const currentEnd = new Date(current.endDate);
      const nextStart = new Date(next.startDate);

      const daysDiff = Math.floor(
        (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysDiff > 1) {
        const currentIndex = periods.indexOf(current);
        const nextIndex = periods.indexOf(next);
        warnings.push({
          type: "gap",
          message: `${daysDiff} day gap between Period ${
            currentIndex + 1
          } and Period ${nextIndex + 1}`,
          periodIndices: [currentIndex, nextIndex],
        });
      }
    }

    // Check for future dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    sortedPeriods.forEach((period, index) => {
      const endDate = new Date(period.endDate);
      endDate.setHours(0, 0, 0, 0);

      if (endDate > today) {
        const originalIndex = periods.indexOf(period);
        warnings.push({
          type: "future",
          message: `Period ${originalIndex + 1} ends in the future`,
          periodIndices: [originalIndex],
        });
      }
    });

    return warnings;
  };

  useEffect(() => {
    dispatch(fetchTenants({ activeOnly: false }));
    dispatch(fetchProperties(true));
  }, [activePortfolioId, dispatch]);

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

  const activeTenants = tenants.filter((t) => !t.archived);
  const archivedTenants = tenants.filter((t) => t.archived);

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a tenant name",
        variant: "destructive",
      });
      return;
    }

    // Validate property is selected
    if (!formData.propertyId) {
      toast({
        title: "Validation Error",
        description: "Please select a property",
        variant: "destructive",
      });
      return;
    }

    // Validate monthly rent is provided
    if (!formData.rent || parseCurrencyToNumber(formData.rent) <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a monthly rent amount greater than $0",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number if provided
    if (formData.phone) {
      const phoneValidation = validateAndFormatPhone(formData.phone);
      if (!phoneValidation.isValid) {
        toast({
          title: "Invalid Phone Number",
          description: phoneValidation.error,
          variant: "destructive",
        });
        return;
      }
    }

    // Validate lease dates if provided
    if (formData.leaseStart || formData.leaseEnd) {
      const leaseDateValidation = validateLeaseDates(
        formData.leaseStart,
        formData.leaseEnd,
      );

      if (!leaseDateValidation.startDateValidation.isValid) {
        toast({
          title: "Invalid Lease Start Date",
          description: leaseDateValidation.startDateValidation.error,
          variant: "destructive",
        });
        return;
      }

      if (!leaseDateValidation.endDateValidation.isValid) {
        toast({
          title: "Invalid Lease End Date",
          description: leaseDateValidation.endDateValidation.error,
          variant: "destructive",
        });
        return;
      }

      if (!leaseDateValidation.dateRangeValidation.isValid) {
        toast({
          title: "Invalid Date Range",
          description: leaseDateValidation.dateRangeValidation.error,
          variant: "destructive",
        });
        return;
      }
    }

    // Validate rent periods if enabled
    if (rentPeriodsEnabled && rentPeriods.length === 0) {
      toast({
        title: "Missing Rent Periods",
        description:
          "Please add at least one rent period or disable automatic rent history creation.",
        variant: "destructive",
      });
      return;
    }

    if (rentPeriodsEnabled && rentPeriods.length > 0) {
      for (let i = 0; i < rentPeriods.length; i++) {
        const period = rentPeriods[i];

        if (!period.startDate || !period.endDate) {
          toast({
            title: "Invalid Rent Period",
            description: `Period ${i + 1} is missing start or end date.`,
            variant: "destructive",
          });
          return;
        }

        // Validate start date is not before lease start date
        if (formData.leaseStart && period.startDate < formData.leaseStart) {
          toast({
            title: "Invalid Rent Period",
            description: `Period ${
              i + 1
            }: Start date cannot be before the lease start date (${
              formData.leaseStart
            }).`,
            variant: "destructive",
          });
          return;
        }

        // Validate end date doesn't exceed lease end date
        if (formData.leaseEnd && period.endDate > formData.leaseEnd) {
          toast({
            title: "Invalid Rent Period",
            description: `Period ${
              i + 1
            }: End date cannot be after the lease end date (${
              formData.leaseEnd
            }).`,
            variant: "destructive",
          });
          return;
        }

        if (period.monthlyRent <= 0) {
          toast({
            title: "Invalid Rent Amount",
            description: `Period ${
              i + 1
            } must have a rent amount greater than $0.`,
            variant: "destructive",
          });
          return;
        }

        const startDate = new Date(period.startDate);
        const endDate = new Date(period.endDate);

        if (endDate < startDate) {
          toast({
            title: "Invalid Date Range",
            description: `Period ${i + 1}: End date must be after start date.`,
            variant: "destructive",
          });
          return;
        }

        // Validate period is not unreasonably long (e.g., over 10 years)
        const daysDiff = Math.floor(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (daysDiff > 3650) {
          toast({
            title: "Invalid Period Duration",
            description: `Period ${
              i + 1
            }: Period duration exceeds 10 years. Please verify the dates.`,
            variant: "destructive",
          });
          return;
        }

        for (let j = i + 1; j < rentPeriods.length; j++) {
          const otherPeriod = rentPeriods[j];
          const otherStart = new Date(otherPeriod.startDate);
          const otherEnd = new Date(otherPeriod.endDate);

          const overlaps =
            (startDate <= otherEnd && endDate >= otherStart) ||
            (otherStart <= endDate && otherEnd >= startDate);

          if (overlaps) {
            toast({
              title: "Overlapping Periods",
              description: `Period ${i + 1} and Period ${
                j + 1
              } overlap. Please adjust the dates.`,
              variant: "destructive",
            });
            return;
          }
        }
      }
    }

    try {
      const newTenant: CreateTenantRequest = {
        name: formData.name,
        email: formData.email,
        phoneNumber: formData.phone
          ? extractPhoneNumbers(formData.phone)
          : undefined,
        propertyId: formData.propertyId || undefined,
        monthlyRent: formData.rent ? parseCurrencyToNumber(formData.rent) : 0,
        leaseStartDate: formData.leaseStart,
        leaseEndDate: formData.leaseEnd,
      };

      const created = await dispatch(createTenant(newTenant)).unwrap();

      // Create rent history if enabled
      if (rentPeriodsEnabled && rentPeriods.length > 0) {
        // Helper function to generate monthly rent collection items for a period
        const generateMonthlyItems = (
          startDate: string,
          endDate: string,
          monthlyRent: number,
        ) => {
          const items = [];

          // Parse dates manually to avoid timezone issues
          const [startYear, startMonth, startDay] = startDate
            .split("-")
            .map(Number);
          const [endYear, endMonth, endDay] = endDate.split("-").map(Number);

          // Use the 1st of the month for iteration, starting from the start date's month
          let currentYear = startYear;
          let currentMonth = startMonth; // 1-indexed (1 = January)

          const endMonthNum = endYear * 12 + endMonth;

          // Generate a payment for each month in the range
          while (currentYear * 12 + currentMonth <= endMonthNum) {
            items.push({
              paymentDate: `${currentYear}-${String(currentMonth).padStart(
                2,
                "0",
              )}-01`,
              expectedAmount: monthlyRent,
              paidAmount: monthlyRent, // Mark as paid for historical records
              notes: "Historical rent payment",
            });

            // Move to next month
            currentMonth++;
            if (currentMonth > 12) {
              currentMonth = 1;
              currentYear++;
            }
          }

          return items;
        };

        // Collect all items from all periods
        const allItems = rentPeriods.flatMap((period) =>
          generateMonthlyItems(
            period.startDate,
            period.endDate,
            period.monthlyRent,
          ),
        );

        // Create all rent collections in one bulk request
        if (allItems.length > 0) {
          await rentCollectionsApi.bulkCreate({
            tenantId: created.id,
            items: allItems,
          });
        } else {
          console.warn("No rent collection items generated");
        }
      }

      setIsAddDialogOpen(false);
      resetForm();

      toast({
        title: "Success",
        description: rentPeriodsEnabled
          ? "Tenant and rent history added successfully"
          : "Tenant added successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to add tenant",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async () => {
    if (!selectedTenant) return;

    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a tenant name",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number if provided
    if (formData.phone) {
      const phoneValidation = validateAndFormatPhone(formData.phone);
      if (!phoneValidation.isValid) {
        toast({
          title: "Invalid Phone Number",
          description: phoneValidation.error,
          variant: "destructive",
        });
        return;
      }
    }

    // Validate lease dates if provided
    if (formData.leaseStart || formData.leaseEnd) {
      const leaseDateValidation = validateLeaseDates(
        formData.leaseStart,
        formData.leaseEnd,
      );

      if (!leaseDateValidation.startDateValidation.isValid) {
        toast({
          title: "Invalid Lease Start Date",
          description: leaseDateValidation.startDateValidation.error,
          variant: "destructive",
        });
        return;
      }

      if (!leaseDateValidation.endDateValidation.isValid) {
        toast({
          title: "Invalid Lease End Date",
          description: leaseDateValidation.endDateValidation.error,
          variant: "destructive",
        });
        return;
      }

      if (!leaseDateValidation.dateRangeValidation.isValid) {
        toast({
          title: "Invalid Date Range",
          description: leaseDateValidation.dateRangeValidation.error,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const updateData: UpdateTenantRequest = {
        name: formData.name,
        email: formData.email,
        phoneNumber: formData.phone
          ? extractPhoneNumbers(formData.phone)
          : undefined,
        propertyId: formData.propertyId || undefined,
        monthlyRent: formData.rent
          ? parseCurrencyToNumber(formData.rent)
          : undefined,
        leaseStartDate: formData.leaseStart,
        leaseEndDate: formData.leaseEnd,
      };

      await dispatch(
        updateTenant({ id: selectedTenant.id, data: updateData }),
      ).unwrap();
      setIsEditDialogOpen(false);
      setSelectedTenant(null);
      resetForm();

      toast({
        title: "Success",
        description: "Tenant updated successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to update tenant",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedTenant) return;

    try {
      await dispatch(deleteTenant(selectedTenant.id)).unwrap();
      setIsDeleteDialogOpen(false);
      setSelectedTenant(null);

      toast({
        title: "Success",
        description: "Tenant deleted successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to delete tenant",
        variant: "destructive",
      });
    }
  };

  const handleArchive = async () => {
    if (!selectedTenant) return;

    try {
      await dispatch(archiveTenant(selectedTenant.id)).unwrap();
      setIsArchiveDialogOpen(false);
      setSelectedTenant(null);

      toast({
        title: "Success",
        description: "Tenant archived successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to archive tenant",
        variant: "destructive",
      });
    }
  };

  const handleUnarchive = async (tenant: Tenant) => {
    try {
      await dispatch(unarchiveTenant(tenant.id)).unwrap();

      toast({
        title: "Success",
        description: "Tenant unarchived successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to unarchive tenant",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    // Format phone number for display if it exists
    const phoneForDisplay = tenant.phoneNumber
      ? (() => {
          const validation = validateAndFormatPhone(tenant.phoneNumber);
          return validation.formatted || tenant.phoneNumber;
        })()
      : "";

    setFormData({
      name: tenant.name,
      email: tenant.email || "",
      phone: phoneForDisplay,
      propertyId: tenant.propertyId?.toString() || "",
      rent: tenant.monthlyRent
        ? formatCurrencyInput(tenant.monthlyRent.toString())
        : "",
      leaseStart: tenant.leaseStartDate
        ? tenant.leaseStartDate.split("T")[0]
        : "",
      leaseEnd: tenant.leaseEndDate ? tenant.leaseEndDate.split("T")[0] : "",
    });
    setPhoneError(null);
    setIsEditDialogOpen(true);
  };

  const openArchiveDialog = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsArchiveDialogOpen(true);
  };

  const openDeleteDialog = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      propertyId: "",
      rent: "",
      leaseStart: "",
      leaseEnd: "",
    });
    setPhoneError(null);
    setRentPeriodsEnabled(false);
    setRentPeriods([]);
    setEditingPeriodId(null);
  };

  const handlePhoneChange = (value: string) => {
    // Format as user types
    const formatted = formatPhoneAsYouType(value);
    setFormData({ ...formData, phone: formatted });

    // Clear previous error
    setPhoneError(null);

    // Validate if there's content
    if (formatted) {
      const validation = validateAndFormatPhone(formatted);
      if (!validation.isValid) {
        setPhoneError(validation.error || "Invalid phone number");
      }
    }
  };

  const _getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Spinner className="size-8 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading tenants...</p>
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
              dispatch(fetchTenants({ activeOnly: false }));
              dispatch(fetchProperties(true));
            }}
          >
            {" "}
            Retry{" "}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background px-2 md:px-4 py-3 md:hidden">
        <SidebarTrigger />
        <h1 className="text-lg font-semibold">Tenants</h1>
      </div>

      <main className="container mx-auto px-2 md:px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">
              Tenant Management
            </h1>
            <p className="text-muted-foreground">
              Manage your tenants and their rental information
            </p>
          </div>

          {activeTenants.length > 0 && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="mr-2 size-4" />
                  Add Tenant
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>Add New Tenant</DialogTitle>
                  <DialogDescription>
                    Enter the tenant's information below
                  </DialogDescription>
                </DialogHeader>
                <div className="overflow-y-auto flex-1 px-1">
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">
                          Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => handlePhoneChange(e.target.value)}
                          placeholder="222-333-4444"
                          className={phoneError ? "border-destructive" : ""}
                        />
                        {phoneError && (
                          <p className="text-sm text-destructive">
                            {phoneError}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="property">
                          Property <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={formData.propertyId}
                          onValueChange={(value) =>
                            setFormData({ ...formData, propertyId: value })
                          }
                        >
                          <SelectTrigger id="property">
                            <SelectValue placeholder="Select property" />
                          </SelectTrigger>
                          <SelectContent>
                            {properties.map((property) => (
                              <SelectItem key={property.id} value={property.id}>
                                {property.address1}{" "}
                                {property.address2 && `- ${property.address2}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="rent">
                          Monthly Rent{" "}
                          <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="rent"
                          type="text"
                          value={formData.rent}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              rent: formatCurrencyInput(e.target.value),
                            })
                          }
                          onBlur={(e) =>
                            setFormData({
                              ...formData,
                              rent: ensureDecimalPadding(e.target.value),
                            })
                          }
                          placeholder="$2,000.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="leaseStart">Lease Start</Label>
                        <Input
                          id="leaseStart"
                          type="date"
                          value={formData.leaseStart}
                          min="1900-01-01"
                          max="2100-12-31"
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              leaseStart: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="leaseEnd">Lease End</Label>
                        <Input
                          id="leaseEnd"
                          type="date"
                          value={formData.leaseEnd}
                          min={formData.leaseStart || "1900-01-01"}
                          max="2100-12-31"
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              leaseEnd: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    {/* Rent Periods Section */}
                    {formData.leaseStart && formData.propertyId && (
                      <div className="pt-4 border-t space-y-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="createRentPeriods"
                            checked={rentPeriodsEnabled}
                            onCheckedChange={(checked) => {
                              setRentPeriodsEnabled(checked === true);
                              if (checked && rentPeriods.length === 0) {
                                const today = getTodayLocalDate();
                                const rentValue = formData.rent
                                  ? parseCurrencyToNumber(formData.rent)
                                  : 0;
                                setRentPeriods([
                                  {
                                    id: crypto.randomUUID(),
                                    startDate: formData.leaseStart || today,
                                    endDate: today,
                                    monthlyRent: rentValue,
                                  },
                                ]);
                              }
                            }}
                          />
                          <Label
                            htmlFor="createRentPeriods"
                            className="font-semibold cursor-pointer text-sm"
                          >
                            Create rent payment history automatically
                          </Label>
                        </div>

                        {rentPeriodsEnabled && (
                          <div className="space-y-3 pl-6 border-l-2 border-primary/20">
                            <Alert className="items-start">
                              <AlertTriangle className="size-4" />
                              <AlertDescription className="text-xs">
                                Define rent periods to track rent history. This
                                will create fully paid rent records.
                              </AlertDescription>
                            </Alert>

                            {/* Existing Rent Periods */}
                            <div className="space-y-2">
                              {rentPeriods.map((period, index) => {
                                const warnings =
                                  validateRentPeriods(rentPeriods);
                                const periodWarnings = warnings.filter((w) =>
                                  w.periodIndices.includes(index),
                                );

                                return (
                                  <Card
                                    key={period.id}
                                    className={`border-primary/20 ${
                                      periodWarnings.length > 0
                                        ? "ring-2 ring-amber-500/30"
                                        : ""
                                    }`}
                                  >
                                    <CardContent className="pt-3 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <h4 className="font-semibold text-xs">
                                          Period {index + 1}
                                        </h4>
                                        <div className="flex gap-1.5">
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                              setEditingPeriodId(period.id)
                                            }
                                            className="h-6 text-xs border-primary/30"
                                          >
                                            Edit
                                          </Button>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              setRentPeriods(
                                                rentPeriods.filter(
                                                  (p) => p.id !== period.id,
                                                ),
                                              );
                                            }}
                                            className="h-6 text-xs border-destructive/30 text-destructive"
                                          >
                                            Remove
                                          </Button>
                                        </div>
                                      </div>

                                      {editingPeriodId === period.id ? (
                                        <div className="space-y-2">
                                          <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                              <Label className="text-xs">
                                                Start Date
                                              </Label>
                                              <Input
                                                type="date"
                                                value={period.startDate}
                                                min={
                                                  formData.leaseStart ||
                                                  undefined
                                                }
                                                max={period.endDate}
                                                onChange={(e) => {
                                                  setRentPeriods(
                                                    rentPeriods.map((p) =>
                                                      p.id === period.id
                                                        ? {
                                                            ...p,
                                                            startDate:
                                                              e.target.value,
                                                          }
                                                        : p,
                                                    ),
                                                  );
                                                }}
                                                className="h-7 text-xs"
                                              />
                                            </div>
                                            <div className="space-y-1">
                                              <Label className="text-xs">
                                                End Date
                                              </Label>
                                              <Input
                                                type="date"
                                                value={period.endDate}
                                                min={period.startDate}
                                                max={
                                                  formData.leaseEnd || undefined
                                                }
                                                onChange={(e) => {
                                                  setRentPeriods(
                                                    rentPeriods.map((p) =>
                                                      p.id === period.id
                                                        ? {
                                                            ...p,
                                                            endDate:
                                                              e.target.value,
                                                          }
                                                        : p,
                                                    ),
                                                  );
                                                }}
                                                className="h-7 text-xs"
                                              />
                                            </div>
                                          </div>
                                          <div className="space-y-1">
                                            <Label className="text-xs">
                                              Monthly Rent
                                            </Label>
                                            <Input
                                              type="text"
                                              value={
                                                period.monthlyRent
                                                  ? formatCurrencyInput(
                                                      period.monthlyRent.toString(),
                                                    )
                                                  : ""
                                              }
                                              onChange={(e) => {
                                                const formatted =
                                                  formatCurrencyInput(
                                                    e.target.value,
                                                  );
                                                const value =
                                                  parseCurrencyToNumber(
                                                    formatted,
                                                  );
                                                setRentPeriods(
                                                  rentPeriods.map((p) =>
                                                    p.id === period.id
                                                      ? {
                                                          ...p,
                                                          monthlyRent: value,
                                                        }
                                                      : p,
                                                  ),
                                                );
                                              }}
                                              onBlur={(e) => {
                                                const padded =
                                                  ensureDecimalPadding(
                                                    e.target.value,
                                                  );
                                                const value =
                                                  parseCurrencyToNumber(padded);
                                                setRentPeriods(
                                                  rentPeriods.map((p) =>
                                                    p.id === period.id
                                                      ? {
                                                          ...p,
                                                          monthlyRent: value,
                                                        }
                                                      : p,
                                                  ),
                                                );
                                              }}
                                              placeholder="$2,000.00"
                                              className="h-7 text-xs"
                                            />
                                          </div>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                              setEditingPeriodId(null)
                                            }
                                            className="h-6 w-full text-xs"
                                          >
                                            Done
                                          </Button>
                                        </div>
                                      ) : (
                                        <div className="space-y-1.5 text-xs">
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                              Duration
                                            </span>
                                            <span className="font-medium">
                                              {formatDateWithMonth(
                                                period.startDate,
                                              )}{" "}
                                              →{" "}
                                              {formatDateWithMonth(
                                                period.endDate,
                                              )}
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                              Rent
                                            </span>
                                            <span className="font-semibold text-primary">
                                              $
                                              {period.monthlyRent.toLocaleString(
                                                "en-US",
                                                {
                                                  minimumFractionDigits: 2,
                                                  maximumFractionDigits: 2,
                                                },
                                              )}
                                            </span>
                                          </div>
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                              Duration
                                            </span>
                                            <span>
                                              {calculateMonths(
                                                period.startDate,
                                                period.endDate,
                                              )}{" "}
                                              months
                                            </span>
                                          </div>

                                          {periodWarnings.length > 0 && (
                                            <div className="space-y-1 pt-1 border-t border-amber-500/20">
                                              {periodWarnings.map(
                                                (warning, wIdx) => (
                                                  <div
                                                    key={wIdx}
                                                    className="flex items-start gap-1 text-xs text-amber-700 dark:text-amber-400"
                                                  >
                                                    <AlertTriangle className="size-3 mt-0.5" />
                                                    <span>
                                                      {warning.message}
                                                    </span>
                                                  </div>
                                                ),
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const lastPeriod =
                                  rentPeriods[rentPeriods.length - 1];
                                const today = getTodayLocalDate();
                                const nextStartDate = lastPeriod
                                  ? (() => {
                                      const lastEnd = new Date(
                                        lastPeriod.endDate,
                                      );
                                      lastEnd.setDate(lastEnd.getDate() + 1);
                                      return toLocalDateString(lastEnd);
                                    })()
                                  : formData.leaseStart || today;
                                const rentValue = formData.rent
                                  ? parseCurrencyToNumber(formData.rent)
                                  : 0;

                                setRentPeriods([
                                  ...rentPeriods,
                                  {
                                    id: crypto.randomUUID(),
                                    startDate: nextStartDate,
                                    endDate: today,
                                    monthlyRent: rentValue,
                                  },
                                ]);
                              }}
                              className="w-full h-7 text-xs"
                            >
                              + Add Another Period
                            </Button>

                            {/* Summary */}
                            {rentPeriods.length > 0 && (
                              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 space-y-1.5">
                                <div className="flex items-center gap-2 text-primary">
                                  <DollarSign className="size-4" />
                                  <h4 className="font-semibold text-xs">
                                    Summary
                                  </h4>
                                </div>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                      Total periods:
                                    </span>
                                    <span className="font-semibold">
                                      {rentPeriods.length}
                                    </span>
                                  </div>
                                  {(() => {
                                    let totalMonths = 0;
                                    let totalAmount = 0;
                                    rentPeriods.forEach((period) => {
                                      const monthsCount = calculateMonths(
                                        period.startDate,
                                        period.endDate,
                                      );
                                      totalMonths += monthsCount;
                                      totalAmount +=
                                        monthsCount * period.monthlyRent;
                                    });
                                    return (
                                      <>
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">
                                            Total months:
                                          </span>
                                          <span className="font-semibold">
                                            {totalMonths}
                                          </span>
                                        </div>
                                        <div className="flex justify-between pt-1 border-t border-primary/20">
                                          <span className="font-semibold">
                                            Total tracked:
                                          </span>
                                          <span className="font-bold text-primary">
                                            $
                                            {totalAmount.toLocaleString(
                                              "en-US",
                                              {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                              },
                                            )}
                                          </span>
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
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
                      !formData.name.trim() ||
                      !formData.propertyId ||
                      !formData.rent ||
                      parseCurrencyToNumber(formData.rent) <= 0
                    }
                  >
                    Add Tenant
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {activeTenants.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-muted p-6 mb-4">
                <Users className="size-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Tenants Yet</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Add your first tenant along with their property using our guided
                wizard.
              </p>
              <Button asChild size="lg">
                <a href={ROUTES.ONBOARDING}>
                  <Plus className="mr-2 size-4" />
                  Add Property & Tenant
                </a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>All Tenants</CardTitle>
              <CardDescription>
                A list of all tenants across your properties
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Rent</TableHead>
                      <TableHead>Lease Period</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeTenants.map((tenant) => (
                      <TableRow key={tenant.id}>
                        <TableCell className="font-medium">
                          {tenant.name}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="size-3" />
                              {tenant.email}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="size-3" />
                              {tenant.phoneNumber
                                ? (() => {
                                    const validation = validateAndFormatPhone(
                                      tenant.phoneNumber,
                                    );
                                    return (
                                      validation.formatted || tenant.phoneNumber
                                    );
                                  })()
                                : "Not provided"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {tenant.propertyAddress || "Unassigned"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">
                          {tenant.propertyId && tenant.monthlyRent
                            ? `$${tenant.monthlyRent.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}/mo`
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>
                            {tenant.leaseStartDate
                              ? tenant.leaseStartDate.split("T")[0]
                              : "Not set"}
                          </div>
                          <div className="text-muted-foreground">
                            to{" "}
                            {tenant.leaseEndDate
                              ? tenant.leaseEndDate.split("T")[0]
                              : "Not set"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(tenant)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(tenant)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openArchiveDialog(tenant)}
                            >
                              <Archive className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {archivedTenants.length > 0 && (
          <Card className="mt-6">
            <Collapsible
              open={showArchived}
              onOpenChange={() => setShowArchived(!showArchived)}
            >
              <CardHeader
                className="cursor-pointer"
                onClick={() => setShowArchived(!showArchived)}
              >
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        Archived Tenants
                        <Badge variant="secondary">
                          {archivedTenants.length}
                        </Badge>
                      </CardTitle>
                    </div>
                    {showArchived ? (
                      <ChevronUp className="size-5" />
                    ) : (
                      <ChevronDown className="size-5" />
                    )}
                  </div>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent>
                  <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Property</TableHead>
                          <TableHead>Rent</TableHead>
                          <TableHead>Lease Period</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {archivedTenants.map((tenant) => (
                          <TableRow key={tenant.id} className="opacity-60">
                            <TableCell className="font-medium">
                              {tenant.name}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1 text-sm">
                                  <Mail className="size-3" />
                                  {tenant.email}
                                </div>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Phone className="size-3" />
                                  {tenant.phoneNumber
                                    ? (() => {
                                        const validation =
                                          validateAndFormatPhone(
                                            tenant.phoneNumber,
                                          );
                                        return (
                                          validation.formatted ||
                                          tenant.phoneNumber
                                        );
                                      })()
                                    : "Not provided"}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {tenant.propertyAddress || "Unassigned"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono">
                              {tenant.monthlyRent
                                ? `$${tenant.monthlyRent.toLocaleString(
                                    "en-US",
                                    {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    },
                                  )}/mo`
                                : "N/A"}
                            </TableCell>
                            <TableCell className="text-sm">
                              <div>
                                {tenant.leaseStartDate
                                  ? tenant.leaseStartDate.split("T")[0]
                                  : "Not set"}
                              </div>
                              <div className="text-muted-foreground">
                                to{" "}
                                {tenant.leaseEndDate
                                  ? tenant.leaseEndDate.split("T")[0]
                                  : "Not set"}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleUnarchive(tenant)}
                                >
                                  <ArchiveRestore className="size-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openDeleteDialog(tenant)}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Edit Tenant</DialogTitle>
              <DialogDescription>
                Update the tenant's information
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto flex-1 px-1">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">
                      Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="edit-name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone">Phone</Label>
                    <Input
                      id="edit-phone"
                      value={formData.phone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="222-333-4444"
                      className={phoneError ? "border-destructive" : ""}
                    />
                    {phoneError && (
                      <p className="text-sm text-destructive">{phoneError}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-property">Property</Label>
                    <Select
                      value={formData.propertyId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, propertyId: value })
                      }
                    >
                      <SelectTrigger id="edit-property">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {properties.map((property) => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.address1}{" "}
                            {property.address2 && `- ${property.address2}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-rent">Monthly Rent</Label>
                    <Input
                      id="edit-rent"
                      type="text"
                      value={formData.rent}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          rent: formatCurrencyInput(e.target.value),
                        })
                      }
                      onBlur={(e) =>
                        setFormData({
                          ...formData,
                          rent: ensureDecimalPadding(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-leaseStart">Lease Start</Label>
                    <Input
                      id="edit-leaseStart"
                      type="date"
                      value={formData.leaseStart}
                      min="1900-01-01"
                      max="2100-12-31"
                      onChange={(e) =>
                        setFormData({ ...formData, leaseStart: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-leaseEnd">Lease End</Label>
                    <Input
                      id="edit-leaseEnd"
                      type="date"
                      value={formData.leaseEnd}
                      min={formData.leaseStart || "1900-01-01"}
                      max="2100-12-31"
                      onChange={(e) =>
                        setFormData({ ...formData, leaseEnd: e.target.value })
                      }
                    />
                  </div>
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
              <Button onClick={handleEdit} disabled={!formData.name.trim()}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={isArchiveDialogOpen}
          onOpenChange={setIsArchiveDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive Tenant?</AlertDialogTitle>
              <AlertDialogDescription>
                This will move {selectedTenant?.name} to the archived tenants
                section. You can unarchive them later if needed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleArchive}>
                Archive
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete {selectedTenant?.name} from your
                tenant list. This action cannot be undone.
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
