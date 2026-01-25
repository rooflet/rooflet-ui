"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  RentPeriodsManager,
  type RentPeriod,
  calculateMonths,
  formatDateWithMonth,
} from "@/components/rent-periods-manager";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { WizardContainer } from "@/components/wizard/wizard-container";
import { WizardNavigation } from "@/components/wizard/wizard-navigation";
import { useToast } from "@/hooks/use-toast";
import { propertiesApi } from "@/lib/api/properties";
import { rentCollectionsApi } from "@/lib/api/rent-collections";
import { tenantsApi } from "@/lib/api/tenants";
import type {
  CreatePropertyRequest,
  CreateTenantRequest,
  UserResponse,
} from "@/lib/api/types";
import { getCurrentUserFromApi } from "@/lib/api/users";
import { ROUTES } from "@/lib/constants/routes";
import {
  ensureDecimalPadding,
  ensurePercentagePadding,
  formatCurrencyInput,
  formatPercentageInput,
  parseCurrencyToNumber,
  parsePercentageToNumber,
} from "@/lib/currency-utils";
import {
  getTodayLocalDate,
  validateLeaseDates,
  validatePurchaseDate,
} from "@/lib/date-validation";
import {
  extractPhoneNumbers,
  formatPhoneAsYouType,
  validateAndFormatPhone,
} from "@/lib/phone-validation";
import { US_STATES, validateState } from "@/lib/state-validation";
import {
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Info,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function UserOnboardingWizard() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserResponse | null>(null);
  const [tenantPhoneError, setTenantPhoneError] = useState<string | null>(null);

  // Property data state (for API submission)
  const [propertyData, setPropertyData] = useState<
    Omit<CreatePropertyRequest, "ownerId">
  >({
    address1: "",
    address2: "",
    city: "",
    state: "",
    zipCode: "",
    propertyType: "SINGLE_FAMILY",
    bedrooms: undefined,
    bathrooms: undefined,
    squareFeet: undefined,
    marketValue: undefined,
    purchasePrice: undefined,
    purchaseDate: "",
    debt: undefined,
    interestRate: undefined,
    monthlyHoa: undefined,
    monthlyPropertyTax: undefined,
    monthlyInsurance: undefined,
    notes: "",
  });

  // Form data state (for display with formatted strings)
  const [formData, setFormData] = useState({
    bedrooms: "",
    bathrooms: "",
    squareFeet: "",
    marketValue: "",
    purchasePrice: "",
    debt: "",
    interestRate: "",
    monthlyHoa: "",
    monthlyPropertyTax: "",
    monthlyInsurance: "",
    monthlyRent: "",
  });

  // Tenant data state
  const [tenantData, setTenantData] = useState<
    Omit<CreateTenantRequest, "propertyId">
  >({
    name: "",
    email: "",
    phoneNumber: "",
    leaseStartDate: "",
    leaseEndDate: "",
    monthlyRent: 0,
  });

  // Rent periods state - support multiple periods with different amounts
  const [rentPeriodsEnabled, setRentPeriodsEnabled] = useState(false);
  const [rentPeriods, setRentPeriods] = useState<RentPeriod[]>([]);

  const totalSteps = 4;

  // Phone number handler
  const handleTenantPhoneChange = (value: string) => {
    // Format as user types
    const formatted = formatPhoneAsYouType(value);
    setTenantData({ ...tenantData, phoneNumber: formatted });

    // Clear previous error
    setTenantPhoneError(null);

    // Validate if there's content
    if (formatted) {
      const validation = validateAndFormatPhone(formatted);
      if (!validation.isValid) {
        setTenantPhoneError(validation.error || "Invalid phone number");
      }
    }
  };

  // Load current user on component mount
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await getCurrentUserFromApi();
        setCurrentUser(user);
      } catch (error) {
        console.error("Failed to load current user:", error);
        toast({
          title: "Error",
          description: "Failed to load user information",
          variant: "destructive",
        });
      }
    };

    loadCurrentUser();
  }, [toast]);

  const handleNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async () => {
    if (!currentUser?.id) {
      toast({
        title: "Error",
        description: "User information not loaded",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number if provided for tenant
    if (tenantData.name && tenantData.phoneNumber) {
      const phoneValidation = validateAndFormatPhone(tenantData.phoneNumber);
      if (!phoneValidation.isValid) {
        toast({
          title: "Invalid Phone Number",
          description: phoneValidation.error,
          variant: "destructive",
        });
        return;
      }
    }

    // Validate state (required field)
    const stateValidation = validateState(propertyData.state);
    if (!stateValidation.isValid) {
      toast({
        title: "Invalid State",
        description: stateValidation.error,
        variant: "destructive",
      });
      return;
    }

    // Validate purchase date if provided
    if (propertyData.purchaseDate) {
      const purchaseDateValidation = validatePurchaseDate(
        propertyData.purchaseDate
      );
      if (!purchaseDateValidation.isValid) {
        toast({
          title: "Invalid Purchase Date",
          description: purchaseDateValidation.error,
          variant: "destructive",
        });
        return;
      }
    }

    // Validate lease dates if tenant is being added
    if (
      tenantData.name &&
      (tenantData.leaseStartDate || tenantData.leaseEndDate)
    ) {
      const leaseDateValidation = validateLeaseDates(
        tenantData.leaseStartDate || "",
        tenantData.leaseEndDate || ""
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

    // Validate rent history end date if bulk creation is enabled
    if (rentPeriodsEnabled && rentPeriods.length === 0) {
      toast({
        title: "Missing Rent Periods",
        description:
          "Please add at least one rent period or disable automatic rent history creation.",
        variant: "destructive",
      });
      return;
    }

    // Validate rent periods if enabled
    if (rentPeriodsEnabled && rentPeriods.length > 0) {
      // Check for valid dates and amounts
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
        if (
          tenantData.leaseStartDate &&
          period.startDate < tenantData.leaseStartDate
        ) {
          toast({
            title: "Invalid Rent Period",
            description: `Period ${
              i + 1
            }: Start date cannot be before the lease start date (${
              tenantData.leaseStartDate
            }).`,
            variant: "destructive",
          });
          return;
        }

        // Validate end date doesn't exceed lease end date
        if (
          tenantData.leaseEndDate &&
          period.endDate > tenantData.leaseEndDate
        ) {
          toast({
            title: "Invalid Rent Period",
            description: `Period ${
              i + 1
            }: End date cannot be after the lease end date (${
              tenantData.leaseEndDate
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
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
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

        // Check for overlaps with other periods
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

    setIsLoading(true);

    try {
      // Create property first - parse formatted values
      const property = await propertiesApi.create({
        address1: propertyData.address1,
        address2: propertyData.address2,
        city: propertyData.city,
        state: propertyData.state,
        zipCode: propertyData.zipCode,
        propertyType: propertyData.propertyType,
        bedrooms: formData.bedrooms ? Number(formData.bedrooms) : undefined,
        bathrooms: formData.bathrooms ? Number(formData.bathrooms) : undefined,
        squareFeet: formData.squareFeet
          ? Number(formData.squareFeet)
          : undefined,
        marketValue: parseCurrencyToNumber(formData.marketValue),
        purchasePrice: parseCurrencyToNumber(formData.purchasePrice),
        purchaseDate: propertyData.purchaseDate,
        debt: parseCurrencyToNumber(formData.debt),
        interestRate: parsePercentageToNumber(formData.interestRate),
        monthlyHoa: parseCurrencyToNumber(formData.monthlyHoa),
        monthlyPropertyTax: parseCurrencyToNumber(formData.monthlyPropertyTax),
        monthlyInsurance: parseCurrencyToNumber(formData.monthlyInsurance),
        notes: propertyData.notes,
        ownerId: currentUser.id,
      });

      // Create tenant and associate with property if tenant data provided
      let createdTenant = null;
      if (tenantData.name) {
        createdTenant = await tenantsApi.create({
          name: tenantData.name,
          email: tenantData.email,
          phoneNumber: tenantData.phoneNumber
            ? extractPhoneNumbers(tenantData.phoneNumber)
            : undefined,
          leaseStartDate: tenantData.leaseStartDate,
          leaseEndDate: tenantData.leaseEndDate,
          monthlyRent: parseCurrencyToNumber(formData.monthlyRent),
          propertyId: property.id,
        });
      }

      // Create rent history if opted in
      if (rentPeriodsEnabled && createdTenant && rentPeriods.length > 0) {
        // Helper function to generate monthly rent collection items for a period
        const generateMonthlyItems = (
          startDate: string,
          endDate: string,
          monthlyRent: number
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
                "0"
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
            period.monthlyRent
          )
        );

        // Create all rent collections in one bulk request
        if (allItems.length > 0) {
          await rentCollectionsApi.bulkCreate({
            tenantId: createdTenant.id,
            items: allItems,
          });
        } else {
          console.warn("No rent collection items generated");
        }

        toast({
          title: "Success",
          description:
            "Your property, tenant, and rent history have been added successfully!",
        });
      } else {
        toast({
          title: "Success",
          description: "Your property and tenant have been added successfully!",
        });
      }

      // Redirect to dashboard
      router.push(ROUTES.HOME);
    } catch (error) {
      console.error("Failed to create property/tenant:", error);
      toast({
        title: "Error",
        description: "Failed to create property and tenant. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return true;
      case 2:
        return (
          propertyData.address1.trim() !== "" &&
          propertyData.city.trim() !== "" &&
          validateState(propertyData.state).isValid &&
          propertyData.zipCode.trim() !== "" &&
          propertyData.propertyType
        );
      case 3:
        return (
          tenantData.name.length > 0 &&
          formData.monthlyRent !== "" &&
          parseCurrencyToNumber(formData.monthlyRent) > 0
        );
      case 4:
        return true;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-6">
                <User className="size-12 text-primary" />
              </div>
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Welcome to Rooflet</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Let's get you set up so you can start managing your rental
                properties effectively.
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-6 space-y-3">
              <h3 className="font-semibold">What you'll get:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 mt-0.5 text-primary flex-shrink-0" />
                  <span>Comprehensive property and tenant management</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 mt-0.5 text-primary flex-shrink-0" />
                  <span>Financial tracking and reporting</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 mt-0.5 text-primary flex-shrink-0" />
                  <span>Rent collection and expense management</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 mt-0.5 text-primary flex-shrink-0" />
                  <span>Investment analysis tools</span>
                </li>
              </ul>
            </div>
            <WizardNavigation onNext={handleNextStep} nextLabel="Continue" />
          </div>
        );

      // Step 2: Add Your First Property
      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Add Your First Property</h2>
              <p className="text-muted-foreground">
                Let's start by adding your first rental property to the system.
                Fields marked with * are required, but you can always update
                additional details later.
              </p>
            </div>

            <div className="space-y-6">
              {/* Property Address Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">
                  Property Address
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="address1">
                      Street Address <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="address1"
                      placeholder="123 Main St"
                      value={propertyData.address1}
                      onChange={(e) =>
                        setPropertyData({
                          ...propertyData,
                          address1: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address2">Address Line 2</Label>
                    <Input
                      id="address2"
                      placeholder="Apt 101, Suite 200"
                      value={propertyData.address2}
                      onChange={(e) =>
                        setPropertyData({
                          ...propertyData,
                          address2: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">
                      City <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="city"
                      placeholder="San Francisco"
                      value={propertyData.city}
                      onChange={(e) =>
                        setPropertyData({
                          ...propertyData,
                          city: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">
                      State <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={propertyData.state}
                      onValueChange={(value) =>
                        setPropertyData({
                          ...propertyData,
                          state: value,
                        })
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
                      placeholder="94102"
                      value={propertyData.zipCode}
                      onChange={(e) =>
                        setPropertyData({
                          ...propertyData,
                          zipCode: e.target.value,
                        })
                      }
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
                    <Label htmlFor="propertyType">
                      Property Type <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={propertyData.propertyType}
                      onValueChange={(value) =>
                        setPropertyData({
                          ...propertyData,
                          propertyType: value as any,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SINGLE_FAMILY">
                          Single Family
                        </SelectItem>
                        <SelectItem value="CONDO">Condo</SelectItem>
                        <SelectItem value="TOWN_HOUSE">Townhouse</SelectItem>
                        <SelectItem value="MULTI_FAMILY">
                          Multi Family
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="squareFeet">Square Feet</Label>
                    <Input
                      id="squareFeet"
                      type="number"
                      min="0"
                      max="100000"
                      placeholder="1200"
                      value={formData.squareFeet}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (
                          value === "" ||
                          (Number(value) >= 0 && Number(value) <= 100000)
                        ) {
                          setFormData({ ...formData, squareFeet: value });
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bedrooms">Bedrooms</Label>
                    <Input
                      id="bedrooms"
                      type="number"
                      min="0"
                      max="500"
                      placeholder="3"
                      value={formData.bedrooms}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (
                          value === "" ||
                          (Number(value) >= 0 && Number(value) <= 500)
                        ) {
                          setFormData({ ...formData, bedrooms: value });
                        }
                      }}
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
                      placeholder="2.5"
                      value={formData.bathrooms}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (
                          value === "" ||
                          (Number(value) >= 0 && Number(value) <= 500)
                        ) {
                          setFormData({ ...formData, bathrooms: value });
                        }
                      }}
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
                      placeholder="$450,000.00"
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
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="purchaseDate">Purchase Date</Label>
                    <Input
                      id="purchaseDate"
                      type="date"
                      value={propertyData.purchaseDate}
                      min="1900-01-01"
                      max={getTodayLocalDate()}
                      onChange={(e) =>
                        setPropertyData({
                          ...propertyData,
                          purchaseDate: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="marketValue">Current Market Value</Label>
                    <Input
                      id="marketValue"
                      type="text"
                      placeholder="$500,000.00"
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
                      placeholder="$350,000.00"
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
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="interestRate">Interest Rate</Label>
                    <Input
                      id="interestRate"
                      type="text"
                      placeholder="6.125%"
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
                          interestRate: ensurePercentagePadding(e.target.value),
                        })
                      }
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
                    <Label htmlFor="monthlyPropertyTax">Property Tax</Label>
                    <Input
                      id="monthlyPropertyTax"
                      type="text"
                      placeholder="$450.00"
                      value={formData.monthlyPropertyTax}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          monthlyPropertyTax: formatCurrencyInput(
                            e.target.value
                          ),
                        })
                      }
                      onBlur={(e) =>
                        setFormData({
                          ...formData,
                          monthlyPropertyTax: ensureDecimalPadding(
                            e.target.value
                          ),
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="monthlyInsurance">Insurance</Label>
                    <Input
                      id="monthlyInsurance"
                      type="text"
                      placeholder="$120.00"
                      value={formData.monthlyInsurance}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          monthlyInsurance: formatCurrencyInput(e.target.value),
                        })
                      }
                      onBlur={(e) =>
                        setFormData({
                          ...formData,
                          monthlyInsurance: ensureDecimalPadding(
                            e.target.value
                          ),
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="monthlyHoa">HOA Fees</Label>
                    <Input
                      id="monthlyHoa"
                      type="text"
                      placeholder="$75.00"
                      value={formData.monthlyHoa}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          monthlyHoa: formatCurrencyInput(e.target.value),
                        })
                      }
                      onBlur={(e) =>
                        setFormData({
                          ...formData,
                          monthlyHoa: ensureDecimalPadding(e.target.value),
                        })
                      }
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
                    placeholder="Any additional information about the property..."
                    rows={3}
                    value={propertyData.notes}
                    onChange={(e) =>
                      setPropertyData({
                        ...propertyData,
                        notes: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handlePrevStep}>
                Previous
              </Button>
              <Button onClick={handleNextStep} disabled={!isStepValid()}>
                Next: Add Tenant
              </Button>
            </div>
          </div>
        );

      // Step 3: Add Your First Tenant
      case 3:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Add Your First Tenant</h2>
              <p className="text-muted-foreground">
                Add a tenant for your property at {propertyData.address1},{" "}
                {propertyData.city}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tenantName">
                  Tenant Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="tenantName"
                  placeholder="John Doe"
                  value={tenantData.name}
                  onChange={(e) =>
                    setTenantData({ ...tenantData, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenantEmail">Email</Label>
                <Input
                  id="tenantEmail"
                  type="email"
                  placeholder="john@example.com"
                  value={tenantData.email}
                  onChange={(e) =>
                    setTenantData({ ...tenantData, email: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tenantPhone">Phone Number</Label>
                <Input
                  id="tenantPhone"
                  placeholder="222-333-4444"
                  value={tenantData.phoneNumber}
                  onChange={(e) => handleTenantPhoneChange(e.target.value)}
                  className={tenantPhoneError ? "border-destructive" : ""}
                />
                {tenantPhoneError && (
                  <p className="text-sm text-destructive">{tenantPhoneError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthlyRent">
                  Monthly Rent <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="monthlyRent"
                  type="text"
                  placeholder="$2,000.00"
                  value={formData.monthlyRent}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      monthlyRent: formatCurrencyInput(e.target.value),
                    })
                  }
                  onBlur={(e) =>
                    setFormData({
                      ...formData,
                      monthlyRent: ensureDecimalPadding(e.target.value),
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="leaseStartDate">Lease Start Date</Label>
                <Input
                  id="leaseStartDate"
                  type="date"
                  value={tenantData.leaseStartDate}
                  min="1900-01-01"
                  max="2100-12-31"
                  onChange={(e) =>
                    setTenantData({
                      ...tenantData,
                      leaseStartDate: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="leaseEndDate">Lease End Date</Label>
                <Input
                  id="leaseEndDate"
                  type="date"
                  value={tenantData.leaseEndDate}
                  min={tenantData.leaseStartDate || "1900-01-01"}
                  max="2100-12-31"
                  onChange={(e) =>
                    setTenantData({
                      ...tenantData,
                      leaseEndDate: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            {/* Rent Periods Section - Only show if lease start date is filled */}
            {tenantData.leaseStartDate && (
              <RentPeriodsManager
                enabled={rentPeriodsEnabled}
                onEnabledChange={setRentPeriodsEnabled}
                periods={rentPeriods}
                onPeriodsChange={setRentPeriods}
                leaseStartDate={tenantData.leaseStartDate}
                leaseEndDate={tenantData.leaseEndDate}
                defaultRentAmount={
                  parseCurrencyToNumber(formData.monthlyRent)
                }
              />
            )}

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Don't worry if you don't have all the tenant information right
                now. You can always add or update tenant details later from your
                dashboard.
              </p>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handlePrevStep}>
                Previous
              </Button>
              <Button onClick={handleNextStep} disabled={!isStepValid()}>
                Next: Review & Complete
              </Button>
            </div>
          </div>
        );

      // Step 4: Final Step - Confirmation
      case 4:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Review & Complete Setup</h2>
              <p className="text-muted-foreground">
                Please review your property and tenant information before
                completing the setup.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Property Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <h4 className="font-medium text-sm">Address</h4>
                    <p className="text-sm text-muted-foreground">
                      {propertyData.address1}
                      {propertyData.address2 && `, ${propertyData.address2}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {propertyData.city}, {propertyData.state}{" "}
                      {propertyData.zipCode}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <strong>Type:</strong>{" "}
                      {propertyData.propertyType.replace("_", " ")}
                    </div>
                    {propertyData.bedrooms && (
                      <div>
                        <strong>Bedrooms:</strong> {propertyData.bedrooms}
                      </div>
                    )}
                    {propertyData.bathrooms && (
                      <div>
                        <strong>Bathrooms:</strong> {propertyData.bathrooms}
                      </div>
                    )}
                    {propertyData.squareFeet && (
                      <div>
                        <strong>Sq Ft:</strong>{" "}
                        {propertyData.squareFeet.toLocaleString()}
                      </div>
                    )}
                  </div>

                  {(propertyData.purchasePrice || propertyData.marketValue) && (
                    <div className="space-y-1 pt-2 border-t">
                      <h4 className="font-medium text-sm">Financial</h4>
                      <div className="grid grid-cols-1 gap-1 text-sm">
                        {propertyData.purchasePrice && (
                          <div>
                            <strong>Purchase Price:</strong> $
                            {propertyData.purchasePrice.toLocaleString()}
                          </div>
                        )}
                        {propertyData.marketValue && (
                          <div>
                            <strong>Market Value:</strong> $
                            {propertyData.marketValue.toLocaleString()}
                          </div>
                        )}
                        {propertyData.debt && (
                          <div>
                            <strong>Outstanding Debt:</strong> $
                            {propertyData.debt.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {(propertyData.monthlyPropertyTax ||
                    propertyData.monthlyInsurance ||
                    propertyData.monthlyHoa) && (
                    <div className="space-y-1 pt-2 border-t">
                      <h4 className="font-medium text-sm">Monthly Expenses</h4>
                      <div className="grid grid-cols-1 gap-1 text-sm">
                        {propertyData.monthlyPropertyTax && (
                          <div>
                            <strong>Property Tax:</strong> $
                            {propertyData.monthlyPropertyTax.toLocaleString()}
                          </div>
                        )}
                        {propertyData.monthlyInsurance && (
                          <div>
                            <strong>Insurance:</strong> $
                            {propertyData.monthlyInsurance.toLocaleString()}
                          </div>
                        )}
                        {propertyData.monthlyHoa && (
                          <div>
                            <strong>HOA:</strong> $
                            {propertyData.monthlyHoa.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tenant Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <strong>Name:</strong>{" "}
                    {tenantData.name || "No tenant added"}
                  </div>
                  {tenantData.email && (
                    <div>
                      <strong>Email:</strong> {tenantData.email}
                    </div>
                  )}
                  {tenantData.phoneNumber && (
                    <div>
                      <strong>Phone:</strong>{" "}
                      {(() => {
                        const validation = validateAndFormatPhone(
                          tenantData.phoneNumber
                        );
                        return validation.formatted || tenantData.phoneNumber;
                      })()}
                    </div>
                  )}
                  {tenantData.monthlyRent !== undefined &&
                    tenantData.monthlyRent > 0 && (
                      <div>
                        <strong>Monthly Rent:</strong> $
                        {tenantData.monthlyRent.toLocaleString()}
                      </div>
                    )}
                  {tenantData.leaseStartDate && (
                    <div>
                      <strong>Lease Start:</strong> {tenantData.leaseStartDate}
                    </div>
                  )}
                  {tenantData.leaseEndDate && (
                    <div>
                      <strong>Lease End:</strong> {tenantData.leaseEndDate}
                    </div>
                  )}

                  {rentPeriodsEnabled && rentPeriods.length > 0 && (
                    <div className="pt-2 border-t mt-2">
                      <h4 className="font-medium text-sm mb-3">
                        Rent History Periods
                      </h4>

                      <div className="space-y-2">
                        {rentPeriods.map((period, index) => {
                          const monthsCount = calculateMonths(
                            period.startDate,
                            period.endDate
                          );
                          const totalAmount = monthsCount * period.monthlyRent;

                          return (
                            <div
                              key={period.id}
                              className="bg-muted/50 rounded-lg p-3 space-y-2 text-sm border border-primary/10"
                            >
                              <div className="flex items-start gap-2">
                                <DollarSign className="size-4 mt-0.5 flex-shrink-0 text-primary" />
                                <div className="space-y-1.5 flex-1">
                                  <div className="font-semibold text-base">
                                    Period {index + 1}
                                  </div>
                                  <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                                    <span className="text-muted-foreground">
                                      Duration:
                                    </span>
                                    <span className="font-medium">
                                      {formatDateWithMonth(period.startDate)} →{" "}
                                      {formatDateWithMonth(period.endDate)}
                                    </span>

                                    <span className="text-muted-foreground">
                                      Monthly Rent:
                                    </span>
                                    <span className="font-semibold text-primary">
                                      $
                                      {period.monthlyRent.toLocaleString(
                                        "en-US",
                                        {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        }
                                      )}
                                    </span>

                                    {monthsCount > 0 && (
                                      <>
                                        <span className="text-muted-foreground">
                                          Months:
                                        </span>
                                        <span className="font-medium">
                                          {monthsCount} month
                                          {monthsCount !== 1 ? "s" : ""}
                                        </span>

                                        <span className="text-muted-foreground">
                                          Period Total:
                                        </span>
                                        <span className="font-semibold">
                                          $
                                          {totalAmount.toLocaleString("en-US", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {(() => {
                          let totalMonths = 0;
                          let totalAmount = 0;

                          rentPeriods.forEach((period) => {
                            const monthsCount = calculateMonths(
                              period.startDate,
                              period.endDate
                            );
                            totalMonths += monthsCount;
                            totalAmount += monthsCount * period.monthlyRent;
                          });

                          return (
                            <div className="bg-primary/10 rounded-lg p-3 space-y-1 text-sm font-semibold border border-primary/20">
                              <div className="flex justify-between">
                                <span>Total Months:</span>
                                <span>{totalMonths}</span>
                              </div>
                              <div className="flex justify-between text-primary text-base">
                                <span>Grand Total:</span>
                                <span>
                                  $
                                  {totalAmount.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground font-normal italic pt-1 border-t border-primary/20">
                                All records will be marked as fully paid
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handlePrevStep}>
                Previous
              </Button>
              <Button onClick={handleFinish} disabled={isLoading}>
                {isLoading ? "Creating..." : "Complete Setup"}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <WizardContainer
      title="Welcome to Rooflet"
      description="Get started with your property management journey"
      currentStep={currentStep}
      totalSteps={totalSteps}
    >
      {renderStep()}
    </WizardContainer>
  );
}
