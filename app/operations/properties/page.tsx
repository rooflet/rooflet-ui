"use client";

import { CompactStatCard } from "@/components/compact-stat-card";
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
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type {
  CreatePropertyRequest,
  PropertyResponse,
  UpdatePropertyRequest,
} from "@/lib/api/types";
import {
  ensureDecimalPadding,
  ensurePercentagePadding,
  formatCurrencyInput,
  formatPercentageInput,
  parseCurrencyToNumber,
  parsePercentageToNumber,
} from "@/lib/currency-utils";
import { getTodayLocalDate, validatePurchaseDate } from "@/lib/date-validation";
import { US_STATES, validateState } from "@/lib/state-validation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  archiveProperty,
  createProperty,
  deleteProperty,
  fetchProperties,
  unarchiveProperty,
  updateProperty,
} from "@/store/slices/propertiesSlice";
import { fetchTenants } from "@/store/slices/tenantsSlice";
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Home,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

type Property = PropertyResponse;

export default function PropertiesPage() {
  const dispatch = useAppDispatch();
  const { properties, isLoading, error } = useAppSelector(
    (state) => state.properties,
  );
  const { tenants } = useAppSelector((state) => state.tenants);
  const { activePortfolioId } = useAppSelector((state) => state.portfolio);
  const { user } = useAppSelector((state) => state.auth);
  const { toast } = useToast();

  // Local UI state
  const [showArchived, setShowArchived] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null,
  );
  const [formData, setFormData] = useState<{
    address1: string;
    address2: string;
    city: string;
    state: string;
    zipCode: string;
    type: string;
    bedrooms: string;
    bathrooms: string;
    sqft: string;
    marketValue: string;
    purchasePrice: string;
    purchaseDate: string;
    currentRent: string;
    notes: string;
    debt: string;
    hoa: string;
    propertyTax: string;
    insurance: string;
    interestRate: string;
  }>({
    address1: "",
    address2: "",
    city: "",
    state: "",
    zipCode: "",
    type: "",
    bedrooms: "",
    bathrooms: "",
    sqft: "",
    marketValue: "",
    purchasePrice: "",
    purchaseDate: "",
    currentRent: "",
    notes: "",
    debt: "",
    hoa: "",
    propertyTax: "",
    insurance: "",
    interestRate: "",
  });

  useEffect(() => {
    dispatch(fetchProperties(false)); // activeOnly = false to get all properties including archived
    dispatch(fetchTenants({}));
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

  const handleAdd = async () => {
    if (
      !formData.address1.trim() ||
      !formData.type ||
      !formData.city.trim() ||
      !formData.state.trim() ||
      !formData.zipCode.trim()
    ) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Error",
        description: "User information not loaded. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    // Validate state
    const stateValidation = validateState(formData.state);
    if (!stateValidation.isValid) {
      toast({
        title: "Invalid State",
        description: stateValidation.error,
        variant: "destructive",
      });
      return;
    }

    // Validate purchase date if provided
    if (formData.purchaseDate) {
      const purchaseDateValidation = validatePurchaseDate(
        formData.purchaseDate,
      );
      if (!purchaseDateValidation.isValid) {
        toast({
          title: "Invalid Date",
          description: purchaseDateValidation.error,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const _calculatedEquity =
        parseCurrencyToNumber(formData.marketValue) -
        parseCurrencyToNumber(formData.debt);

      const newProperty: CreatePropertyRequest = {
        ownerId: user.id,
        address1: formData.address1,
        address2: formData.address2 || undefined,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        propertyType: formData.type as any,
        bedrooms: Number(formData.bedrooms) || 0,
        bathrooms: Number(formData.bathrooms) || 0,
        squareFeet: Number(formData.sqft) || 0,
        marketValue: parseCurrencyToNumber(formData.marketValue),
        purchasePrice: parseCurrencyToNumber(formData.purchasePrice),
        purchaseDate: formData.purchaseDate,
        debt: parseCurrencyToNumber(formData.debt),
        interestRate: parsePercentageToNumber(formData.interestRate) || 0,
        monthlyHoa: parseCurrencyToNumber(formData.hoa) || 0,
        monthlyPropertyTax: parseCurrencyToNumber(formData.propertyTax),
        monthlyInsurance: parseCurrencyToNumber(formData.insurance),
        notes: formData.notes || undefined,
      };

      await dispatch(createProperty(newProperty)).unwrap();
      setIsAddDialogOpen(false);
      resetForm();

      toast({
        title: "Success",
        description: "Property added successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to add property",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async () => {
    if (!selectedProperty) return;

    if (
      !formData.address1.trim() ||
      !formData.type ||
      !formData.city.trim() ||
      !formData.state.trim() ||
      !formData.zipCode.trim()
    ) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate state
    const stateValidation = validateState(formData.state);
    if (!stateValidation.isValid) {
      toast({
        title: "Invalid State",
        description: stateValidation.error,
        variant: "destructive",
      });
      return;
    }

    // Validate purchase date if provided
    if (formData.purchaseDate) {
      const purchaseDateValidation = validatePurchaseDate(
        formData.purchaseDate,
      );
      if (!purchaseDateValidation.isValid) {
        toast({
          title: "Invalid Date",
          description: purchaseDateValidation.error,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const _calculatedEquity =
        parseCurrencyToNumber(formData.marketValue) -
        parseCurrencyToNumber(formData.debt);

      const updateData: UpdatePropertyRequest = {
        address1: formData.address1,
        address2: formData.address2 || undefined,
        propertyType: formData.type as any,
        bedrooms: Number(formData.bedrooms) || 0,
        bathrooms: Number(formData.bathrooms) || 0,
        squareFeet: Number(formData.sqft) || 0,
        marketValue: parseCurrencyToNumber(formData.marketValue),
        purchasePrice: parseCurrencyToNumber(formData.purchasePrice),
        purchaseDate: formData.purchaseDate,
        debt: parseCurrencyToNumber(formData.debt),
        interestRate: parsePercentageToNumber(formData.interestRate) || 0,
        monthlyHoa: parseCurrencyToNumber(formData.hoa) || 0,
        monthlyPropertyTax: parseCurrencyToNumber(formData.propertyTax),
        monthlyInsurance: parseCurrencyToNumber(formData.insurance),
        notes: formData.notes || undefined,
      };

      await dispatch(
        updateProperty({ id: selectedProperty.id, data: updateData }),
      ).unwrap();
      setIsEditDialogOpen(false);
      setSelectedProperty(null);
      resetForm();

      toast({
        title: "Success",
        description: "Property updated successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to update property",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedProperty) return;

    try {
      await dispatch(deleteProperty(selectedProperty.id)).unwrap();
      setIsDeleteDialogOpen(false);
      setSelectedProperty(null);

      toast({
        title: "Success",
        description: "Property deleted successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to delete property",
        variant: "destructive",
      });
    }
  };

  const handleArchive = async () => {
    if (!selectedProperty) return;

    try {
      await dispatch(archiveProperty(selectedProperty.id)).unwrap();
      setIsArchiveDialogOpen(false);
      setSelectedProperty(null);

      toast({
        title: "Success",
        description: "Property archived successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to archive property",
        variant: "destructive",
      });
    }
  };

  const handleUnarchive = async (property: Property) => {
    try {
      await dispatch(unarchiveProperty(property.id)).unwrap();

      toast({
        title: "Success",
        description: "Property unarchived successfully",
      });
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Failed to unarchive property",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (property: Property) => {
    setSelectedProperty(property);
    setFormData({
      address1: property.address1,
      address2: property.address2 || "",
      city: property.city || "",
      state: property.state || "",
      zipCode: property.zipCode || "",
      type: property.propertyType,
      bedrooms: (property.bedrooms ?? "").toString(),
      bathrooms: (property.bathrooms ?? "").toString(),
      sqft: (property.squareFeet ?? "").toString(),
      marketValue: property.marketValue
        ? ensureDecimalPadding(property.marketValue.toString())
        : "",
      purchasePrice: property.purchasePrice
        ? ensureDecimalPadding(property.purchasePrice.toString())
        : "",
      purchaseDate: property.purchaseDate
        ? property.purchaseDate.split("T")[0]
        : "",
      currentRent: "", // Removed monthlyRent field from property
      notes: property.notes || "",
      debt: property.debt ? ensureDecimalPadding(property.debt.toString()) : "",
      hoa: property.monthlyHoa
        ? ensureDecimalPadding(property.monthlyHoa.toString())
        : "",
      propertyTax: property.monthlyPropertyTax
        ? ensureDecimalPadding(property.monthlyPropertyTax.toString())
        : "",
      insurance: property.monthlyInsurance
        ? ensureDecimalPadding(property.monthlyInsurance.toString())
        : "",
      interestRate: property.interestRate
        ? ensurePercentagePadding(property.interestRate.toString())
        : "",
    });
    setIsEditDialogOpen(true);
  };

  const openArchiveDialog = (property: Property) => {
    setSelectedProperty(property);
    setIsArchiveDialogOpen(true);
  };

  const openDeleteDialog = (property: Property) => {
    setSelectedProperty(property);
    setIsDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      address1: "",
      address2: "",
      city: "",
      state: "",
      zipCode: "",
      type: "",
      bedrooms: "",
      bathrooms: "",
      sqft: "",
      marketValue: "",
      purchasePrice: "",
      purchaseDate: "",
      currentRent: "",
      notes: "",
      debt: "",
      hoa: "",
      propertyTax: "",
      insurance: "",
      interestRate: "",
    });
  };

  const isPropertyOccupied = (propertyId: string): boolean => {
    // Check if any tenant is currently occupying the property and that the tenant is not archived
    return tenants.some(
      (tenant) => tenant.propertyId === propertyId && !tenant.archived,
    );
  };

  const getStatusColor = (isOccupied: boolean) => {
    return isOccupied ? "default" : "secondary";
  };

  const activeProperties = properties.filter((p) => !p.archived);
  const archivedProperties = properties.filter((p) => p.archived);

  const stats = {
    total: activeProperties.length,
    occupied: activeProperties.filter((p) => isPropertyOccupied(p.id)).length,
    vacant: activeProperties.filter((p) => !isPropertyOccupied(p.id)).length,
    totalValue: activeProperties.reduce(
      (sum, p) => sum + (p.marketValue ?? 0),
      0,
    ),
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Spinner className="size-8 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading properties...</p>
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
              dispatch(fetchProperties(false));
              dispatch(fetchTenants({}));
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
        <h1 className="text-lg font-semibold">Properties</h1>
      </div>

      <main className="container mx-auto px-2 md:px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">
              Property Management
            </h1>
            <p className="text-muted-foreground">
              Add, edit, and manage your rental properties
            </p>
          </div>

          {activeProperties.length > 0 && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="mr-2 size-4" />
                  Add Property
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>Add New Property</DialogTitle>
                  <DialogDescription>
                    Enter the property details below
                  </DialogDescription>
                </DialogHeader>
                <div className="overflow-y-auto flex-1 px-1">
                  <div className="space-y-6 py-4">
                    {/* Property Address Section */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground">
                        Property Address
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="address1">
                            Street Address{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="address1"
                            value={formData.address1}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                address1: e.target.value,
                              })
                            }
                            placeholder="123 Main St"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="address2">Address Line 2</Label>
                          <Input
                            id="address2"
                            value={formData.address2}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                address2: e.target.value,
                              })
                            }
                            placeholder="Apt 101, Suite 200"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="city">
                            City <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="city"
                            value={formData.city}
                            onChange={(e) =>
                              setFormData({ ...formData, city: e.target.value })
                            }
                            placeholder="San Francisco"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">
                            State <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={formData.state}
                            onValueChange={(value) =>
                              setFormData({ ...formData, state: value })
                            }
                          >
                            <SelectTrigger id="state">
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {US_STATES.map((state) => (
                                <SelectItem key={state.code} value={state.code}>
                                  {state.code} - {state.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="zipCode">
                            ZIP Code <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="zipCode"
                            value={formData.zipCode}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                zipCode: e.target.value,
                              })
                            }
                            placeholder="94102"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Property Details Section */}
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground">
                        Property Details
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="type">
                            Property Type{" "}
                            <span className="text-destructive">*</span>
                          </Label>
                          <Select
                            value={formData.type}
                            onValueChange={(value) =>
                              setFormData({ ...formData, type: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SINGLE_FAMILY">
                                Single Family
                              </SelectItem>
                              <SelectItem value="CONDO">Condo</SelectItem>
                              <SelectItem value="TOWN_HOUSE">
                                Townhouse
                              </SelectItem>
                              <SelectItem value="MULTI_FAMILY">
                                Multi Family
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sqft">Square Feet</Label>
                          <Input
                            id="sqft"
                            type="number"
                            min="0"
                            max="100000"
                            value={formData.sqft}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "") {
                                setFormData({ ...formData, sqft: "" });
                                return;
                              }
                              const numValue = parseFloat(value);
                              if (numValue >= 0 && numValue <= 100000) {
                                setFormData({ ...formData, sqft: value });
                              }
                            }}
                            placeholder="1200"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bedrooms">Bedrooms</Label>
                          <Input
                            id="bedrooms"
                            type="number"
                            min="0"
                            max="500"
                            value={formData.bedrooms}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "") {
                                setFormData({
                                  ...formData,
                                  bedrooms: "",
                                });
                                return;
                              }
                              const numValue = parseFloat(value);
                              if (numValue >= 0 && numValue <= 500) {
                                setFormData({
                                  ...formData,
                                  bedrooms: value,
                                });
                              }
                            }}
                            placeholder="3"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bathrooms">Bathrooms</Label>
                          <Input
                            id="bathrooms"
                            type="number"
                            min="0"
                            max="500"
                            step="0.5"
                            value={formData.bathrooms}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === "") {
                                setFormData({
                                  ...formData,
                                  bathrooms: "",
                                });
                                return;
                              }
                              const numValue = parseFloat(value);
                              if (numValue >= 0 && numValue <= 500) {
                                setFormData({
                                  ...formData,
                                  bathrooms: value,
                                });
                              }
                            }}
                            placeholder="2.5"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Financial Information Section */}
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground">
                        Financial Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="purchasePrice">Purchase Price</Label>
                          <Input
                            id="purchasePrice"
                            type="text"
                            value={formData.purchasePrice}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                purchasePrice: formatCurrencyInput(
                                  e.target.value,
                                ),
                              })
                            }
                            onBlur={(e) =>
                              setFormData({
                                ...formData,
                                purchasePrice: ensureDecimalPadding(
                                  e.target.value,
                                ),
                              })
                            }
                            placeholder="$450,000.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="purchaseDate">Purchase Date</Label>
                          <Input
                            id="purchaseDate"
                            type="date"
                            value={formData.purchaseDate}
                            min="1900-01-01"
                            max={getTodayLocalDate()}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                purchaseDate: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="marketValue">
                            Current Market Value
                          </Label>
                          <Input
                            id="marketValue"
                            type="text"
                            value={formData.marketValue}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                marketValue: formatCurrencyInput(
                                  e.target.value,
                                ),
                              })
                            }
                            onBlur={(e) =>
                              setFormData({
                                ...formData,
                                marketValue: ensureDecimalPadding(
                                  e.target.value,
                                ),
                              })
                            }
                            placeholder="$500,000.00"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Financing & Debt Section */}
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground">
                        Financing & Debt
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="debt">Outstanding Debt</Label>
                          <Input
                            id="debt"
                            type="text"
                            value={formData.debt}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                debt: formatCurrencyInput(e.target.value),
                              })
                            }
                            onBlur={(e) =>
                              setFormData({
                                ...formData,
                                debt: ensureDecimalPadding(e.target.value),
                              })
                            }
                            placeholder="$350,000.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="interestRate">Interest Rate</Label>
                          <Input
                            id="interestRate"
                            type="text"
                            value={formData.interestRate}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                interestRate: formatPercentageInput(
                                  e.target.value,
                                ),
                              })
                            }
                            onBlur={(e) =>
                              setFormData({
                                ...formData,
                                interestRate: ensurePercentagePadding(
                                  e.target.value,
                                ),
                              })
                            }
                            placeholder="6.125%"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Monthly Expenses Section */}
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground">
                        Monthly Expenses
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="propertyTax">Property Tax</Label>
                          <Input
                            id="propertyTax"
                            type="text"
                            value={formData.propertyTax}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                propertyTax: formatCurrencyInput(
                                  e.target.value,
                                ),
                              })
                            }
                            onBlur={(e) =>
                              setFormData({
                                ...formData,
                                propertyTax: ensureDecimalPadding(
                                  e.target.value,
                                ),
                              })
                            }
                            placeholder="$450.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="insurance">Insurance</Label>
                          <Input
                            id="insurance"
                            type="text"
                            value={formData.insurance}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                insurance: formatCurrencyInput(e.target.value),
                              })
                            }
                            onBlur={(e) =>
                              setFormData({
                                ...formData,
                                insurance: ensureDecimalPadding(e.target.value),
                              })
                            }
                            placeholder="$120.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="hoa">HOA Fees</Label>
                          <Input
                            id="hoa"
                            type="text"
                            value={formData.hoa}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                hoa: formatCurrencyInput(e.target.value),
                              })
                            }
                            onBlur={(e) =>
                              setFormData({
                                ...formData,
                                hoa: ensureDecimalPadding(e.target.value),
                              })
                            }
                            placeholder="$75.00"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Notes Section */}
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-foreground">
                        Additional Notes
                      </h3>
                      <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) =>
                            setFormData({ ...formData, notes: e.target.value })
                          }
                          placeholder="Any additional information about the property..."
                          rows={3}
                        />
                      </div>
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
                      !formData.address1.trim() ||
                      !formData.type ||
                      !formData.city.trim() ||
                      !formData.state.trim() ||
                      !formData.zipCode.trim()
                    }
                  >
                    Add Property
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {activeProperties.length === 0 && archivedProperties.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-muted p-6 mb-4">
                <Home className="size-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No Properties Yet</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Get started by adding your first property using the Add Property
                button above.
              </p>
              <Button size="lg" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 size-4" />
                Add Your First Property
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-4 mb-6">
              <CompactStatCard
                title="Total Properties"
                value={stats.total}
                icon={Home}
              />
              <CompactStatCard
                title="Occupied"
                value={stats.occupied}
                subtitle={`${((stats.occupied / stats.total) * 100).toFixed(
                  0,
                )}% occupancy`}
                icon={Users}
              />
              <CompactStatCard
                title="Vacant"
                value={stats.vacant}
                icon={Home}
              />
              <CompactStatCard
                title="Total Value"
                value={`$${(stats.totalValue / 1000000).toFixed(2)}M`}
                icon={DollarSign}
              />
            </div>

            {/* Properties Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {activeProperties.map((property) => {
                const isOccupied = isPropertyOccupied(property.id);
                const rent =
                  tenants.find(
                    (tenant) =>
                      tenant.propertyId === property.id && !tenant.archived,
                  )?.monthlyRent || 0;
                return (
                  <Card key={property.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate">
                            {property.address1}
                          </CardTitle>
                          {property.address2 && (
                            <CardDescription>
                              Unit {property.address2}
                            </CardDescription>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Badge
                            variant={getStatusColor(isOccupied)}
                            className="mr-2"
                          >
                            {isOccupied ? "occupied" : "vacant"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => openEditDialog(property)}
                            aria-label="Edit property"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => openArchiveDialog(property)}
                            aria-label="Archive property"
                          >
                            <Archive className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => openDeleteDialog(property)}
                            aria-label="Delete property"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Type</p>
                          <p className="font-medium">
                            {property.propertyType.replace("_", " ")}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Size</p>
                          <p className="font-medium">
                            {property.squareFeet
                              ? `${property.squareFeet} sqft`
                              : "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Bed/Bath</p>
                          <p className="font-medium">
                            {property.bedrooms ?? "N/A"} /{" "}
                            {property.bathrooms ?? "N/A"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Current Rent</p>
                          <p className="font-medium font-mono">
                            {rent > 0 ? `$${rent.toLocaleString()}` : "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">
                            Market Value
                          </span>
                          <span className="font-medium font-mono">
                            {property.marketValue
                              ? `$${property.marketValue.toLocaleString()}`
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Purchase Price
                          </span>
                          <span className="font-medium font-mono">
                            {property.purchasePrice
                              ? `$${property.purchasePrice.toLocaleString()}`
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Equity</span>
                          <span className="font-medium font-mono">
                            {property.marketValue && property.debt !== null
                              ? `$${(
                                  property.marketValue - (property.debt ?? 0)
                                ).toLocaleString()}`
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Debt</span>
                          <span className="font-medium font-mono">
                            {property.debt
                              ? `$${property.debt.toLocaleString()}`
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">HOA</span>
                          <span className="font-medium font-mono">
                            {property.monthlyHoa
                              ? `$${property.monthlyHoa.toLocaleString()}`
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">
                            Property Tax
                          </span>
                          <span className="font-medium font-mono">
                            {property.monthlyPropertyTax
                              ? `$${property.monthlyPropertyTax.toLocaleString()}`
                              : "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Insurance
                          </span>
                          <span className="font-medium font-mono">
                            {property.monthlyInsurance
                              ? `$${property.monthlyInsurance.toLocaleString()}`
                              : "N/A"}
                          </span>
                        </div>
                      </div>
                      {property.notes && (
                        <div className="pt-2 border-t">
                          <p className="text-sm text-muted-foreground">
                            {property.notes}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {/* Archived Properties Section */}
        {archivedProperties.length > 0 && (
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
                        Archived Properties
                        <Badge variant="secondary">
                          {archivedProperties.length}
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
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {archivedProperties.map((property) => {
                      const isOccupied = isPropertyOccupied(property.id);
                      const rent =
                        tenants.find(
                          (tenant) =>
                            tenant.propertyId === property.id &&
                            !tenant.archived,
                        )?.monthlyRent || 0;
                      return (
                        <Card key={property.id} className="opacity-60">
                          <CardHeader>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-lg truncate">
                                  {property.address1}
                                </CardTitle>
                                {property.address2 && (
                                  <CardDescription>
                                    Unit {property.address2}
                                  </CardDescription>
                                )}
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Badge
                                  variant={getStatusColor(isOccupied)}
                                  className="mr-2"
                                >
                                  {isOccupied ? "occupied" : "vacant"}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  onClick={() => handleUnarchive(property)}
                                  aria-label="Restore property"
                                >
                                  <ArchiveRestore className="size-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  onClick={() => openDeleteDialog(property)}
                                  aria-label="Delete property"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Type</p>
                                <p className="font-medium">
                                  {property.propertyType.replace("_", " ")}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Size</p>
                                <p className="font-medium">
                                  {property.squareFeet
                                    ? `${property.squareFeet} sqft`
                                    : "N/A"}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">
                                  Bed/Bath
                                </p>
                                <p className="font-medium">
                                  {property.bedrooms ?? "N/A"} /{" "}
                                  {property.bathrooms ?? "N/A"}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">
                                  Current Rent
                                </p>
                                <p className="font-medium font-mono">
                                  {rent > 0
                                    ? `$${rent.toLocaleString()}`
                                    : "N/A"}
                                </p>
                              </div>
                            </div>
                            <div className="pt-2 border-t">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground">
                                  Market Value
                                </span>
                                <span className="font-medium font-mono">
                                  {property.marketValue
                                    ? `$${property.marketValue.toLocaleString()}`
                                    : "N/A"}
                                </span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  Purchase Price
                                </span>
                                <span className="font-medium font-mono">
                                  {property.purchasePrice
                                    ? `$${property.purchasePrice.toLocaleString()}`
                                    : "N/A"}
                                </span>
                              </div>
                            </div>
                            {property.notes && (
                              <div className="pt-2 border-t">
                                <p className="text-sm text-muted-foreground">
                                  {property.notes}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Edit Property</DialogTitle>
              <DialogDescription>
                Update the property details and financial information
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto flex-1 px-1">
              <div className="grid gap-6 py-4">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-address1">
                        Address <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="edit-address1"
                        value={formData.address1}
                        onChange={(e) =>
                          setFormData({ ...formData, address1: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-address2">Unit</Label>
                      <Input
                        id="edit-address2"
                        value={formData.address2}
                        onChange={(e) =>
                          setFormData({ ...formData, address2: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-type">
                        Property Type{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) =>
                          setFormData({ ...formData, type: value })
                        }
                      >
                        <SelectTrigger id="edit-type" className="w-full">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SINGLE_FAMILY">
                            Single Family
                          </SelectItem>
                          <SelectItem value="CONDO">Condo</SelectItem>
                          <SelectItem value="TOWN_HOUSE">Town House</SelectItem>
                          <SelectItem value="MULTI_FAMILY">
                            Multi Family
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-bedrooms">Bedrooms</Label>
                      <Input
                        id="edit-bedrooms"
                        type="number"
                        min="0"
                        max="500"
                        value={formData.bedrooms}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "") {
                            setFormData({ ...formData, bedrooms: "" });
                            return;
                          }
                          const numValue = parseFloat(value);
                          if (numValue >= 0 && numValue <= 500) {
                            setFormData({ ...formData, bedrooms: value });
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-bathrooms">Bathrooms</Label>
                      <Input
                        id="edit-bathrooms"
                        type="number"
                        min="0"
                        max="500"
                        step="0.5"
                        value={formData.bathrooms}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "") {
                            setFormData({
                              ...formData,
                              bathrooms: "",
                            });
                            return;
                          }
                          const numValue = parseFloat(value);
                          if (numValue >= 0 && numValue <= 500) {
                            setFormData({
                              ...formData,
                              bathrooms: value,
                            });
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-sqft">Square Feet</Label>
                      <Input
                        id="edit-sqft"
                        type="number"
                        min="0"
                        max="100000"
                        value={formData.sqft}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "") {
                            setFormData({ ...formData, sqft: "" });
                            return;
                          }
                          const numValue = parseFloat(value);
                          if (numValue >= 0 && numValue <= 100000) {
                            setFormData({ ...formData, sqft: value });
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Financial Information */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">
                    Financial Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-marketValue">Market Value</Label>
                      <Input
                        id="edit-marketValue"
                        type="text"
                        value={formData.marketValue}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            marketValue: formatCurrencyInput(e.target.value),
                          })
                        }
                        onBlur={(e) =>
                          setFormData({
                            ...formData,
                            marketValue: ensureDecimalPadding(e.target.value),
                          })
                        }
                        placeholder="$275,000.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-purchasePrice">Purchase Price</Label>
                      <Input
                        id="edit-purchasePrice"
                        type="text"
                        value={formData.purchasePrice}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            purchasePrice: formatCurrencyInput(e.target.value),
                          })
                        }
                        onBlur={(e) =>
                          setFormData({
                            ...formData,
                            purchasePrice: ensureDecimalPadding(e.target.value),
                          })
                        }
                        placeholder="$250,000.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-purchaseDate">Purchase Date</Label>
                      <Input
                        id="edit-purchaseDate"
                        type="date"
                        value={formData.purchaseDate}
                        min="1900-01-01"
                        max={getTodayLocalDate()}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            purchaseDate: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-debt">Debt ($)</Label>
                      <Input
                        id="edit-debt"
                        type="text"
                        value={formData.debt}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            debt: formatCurrencyInput(e.target.value),
                          })
                        }
                        onBlur={(e) =>
                          setFormData({
                            ...formData,
                            debt: ensureDecimalPadding(e.target.value),
                          })
                        }
                        placeholder="$0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-interestRate">Interest Rate</Label>
                      <Input
                        id="edit-interestRate"
                        type="text"
                        value={formData.interestRate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            interestRate: formatPercentageInput(e.target.value),
                          })
                        }
                        onBlur={(e) =>
                          setFormData({
                            ...formData,
                            interestRate: ensurePercentagePadding(
                              e.target.value,
                            ),
                          })
                        }
                        placeholder="6.125%"
                      />
                    </div>
                  </div>
                </div>

                {/* Monthly Revenue & Expenses */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">
                    Monthly Revenue & Expenses
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-hoa">HOA</Label>
                      <Input
                        id="edit-hoa"
                        type="text"
                        value={formData.hoa}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            hoa: formatCurrencyInput(e.target.value),
                          })
                        }
                        onBlur={(e) =>
                          setFormData({
                            ...formData,
                            hoa: ensureDecimalPadding(e.target.value),
                          })
                        }
                        placeholder="$500.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-propertyTax">Property Tax</Label>
                      <Input
                        id="edit-propertyTax"
                        type="text"
                        value={formData.propertyTax}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            propertyTax: formatCurrencyInput(e.target.value),
                          })
                        }
                        onBlur={(e) =>
                          setFormData({
                            ...formData,
                            propertyTax: ensureDecimalPadding(e.target.value),
                          })
                        }
                        placeholder="$215.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-insurance">Insurance</Label>
                      <Input
                        id="edit-insurance"
                        type="text"
                        value={formData.insurance}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            insurance: formatCurrencyInput(e.target.value),
                          })
                        }
                        onBlur={(e) =>
                          setFormData({
                            ...formData,
                            insurance: ensureDecimalPadding(e.target.value),
                          })
                        }
                        placeholder="$45.00"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t">
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Textarea
                    id="edit-notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
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
                  !formData.address1.trim() ||
                  !formData.type ||
                  !formData.city.trim() ||
                  !formData.state.trim() ||
                  !formData.zipCode.trim()
                }
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Archive Confirmation Dialog */}
        <AlertDialog
          open={isArchiveDialogOpen}
          onOpenChange={setIsArchiveDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive Property?</AlertDialogTitle>
              <AlertDialogDescription>
                This will move {selectedProperty?.address1}
                {selectedProperty?.address2 &&
                  ` (Unit ${selectedProperty.address2})`}{" "}
                to the archived properties section. You can unarchive it later
                if needed.
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
                This will permanently delete the property at{" "}
                {selectedProperty?.address1}
                {selectedProperty?.address2 &&
                  ` (Unit ${selectedProperty.address2})`}
                . This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
