"use client";

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
import { useEffect, useState } from "react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { useToast } from "@/hooks/use-toast";
import type {
  UpdatePasswordRequest,
  UpdateUserRequest,
  UserResponse,
  AvailableZipCodeResponse,
} from "@/lib/api/types";
import {
  getCurrentUserFromApi,
  updateCurrentUser,
  updateCurrentUserPassword,
} from "@/lib/api/users";
import { Loader2, X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchZipCodePreferences,
  addZipCodePreference,
  deleteZipCodePreference,
} from "@/store/slices/authSlice";
import {
  zipCodePreferencesApi,
  MAX_ZIP_CODES,
} from "@/lib/api/zip-code-preferences";
import { validateZipCode, isDuplicateZipCode } from "@/lib/zip-validation";

export default function SettingsPage() {
  const { toast } = useToast();
  const dispatch = useAppDispatch();

  const [user, setUser] = useState<UserResponse | null>(null);
  const [profile, setProfile] = useState({
    fullName: "",
  });
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const [passwords, setPasswords] = useState<UpdatePasswordRequest>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Zip Code Preferences state
  const zipCodePreferences = useAppSelector(
    (state) => state.auth.zipCodePreferences || []
  );
  const zipCodePreferencesLoading = useAppSelector(
    (state) => state.auth.zipCodePreferencesLoading
  );
  const [availableZipCodes, setAvailableZipCodes] = useState<
    AvailableZipCodeResponse[]
  >([]);
  const [isLoadingAvailableZipCodes, setIsLoadingAvailableZipCodes] =
    useState(false);
  const [selectedZipCode, setSelectedZipCode] = useState<string>("");

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoadingProfile(true);
      try {
        const userData = await getCurrentUserFromApi();
        setUser(userData);
        setProfile({
          fullName: userData.fullName || "",
        });
      } catch (error) {
        console.error("Failed to fetch user data:", error);
        toast({
          title: "Error",
          description: "Failed to load user data",
          variant: "destructive",
        });
      } finally {
        setIsLoadingProfile(false);
      }
    };

    const fetchZipCodes = async () => {
      // Fetch user's zip code preferences
      dispatch(fetchZipCodePreferences());

      // Fetch available zip codes
      setIsLoadingAvailableZipCodes(true);
      try {
        const available = await zipCodePreferencesApi.getAvailable();
        setAvailableZipCodes(available);
      } catch (error) {
        console.error("Failed to fetch available zip codes:", error);
        toast({
          title: "Error",
          description: "Failed to load available zip codes",
          variant: "destructive",
        });
      } finally {
        setIsLoadingAvailableZipCodes(false);
      }
    };

    fetchUser();
    fetchZipCodes();
  }, [toast, dispatch]);

  const handleProfileChange = (field: "fullName", value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (
    field: keyof UpdatePasswordRequest,
    value: string
  ) => {
    setPasswords((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    if (!profile.fullName.trim()) {
      toast({
        title: "Error",
        description: "Please fill in your full name",
        variant: "destructive",
      });
      return;
    }

    if (!user?.email) {
      toast({
        title: "Error",
        description: "User email not found. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const updateData: UpdateUserRequest = {
        fullName: profile.fullName,
        email: user.email, // Keep the existing email
      };
      const updatedUser = await updateCurrentUser(updateData);
      setUser(updatedUser);
      toast({
        title: "Success",
        description: "Your profile has been updated successfully",
      });
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePassword = async () => {
    // Validate all fields are filled
    if (
      !passwords.currentPassword ||
      !passwords.newPassword ||
      !passwords.confirmPassword
    ) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    // Validate new password length
    if (passwords.newPassword.length < 8) {
      toast({
        title: "Error",
        description: "New password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    // Validate passwords match
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updateCurrentUserPassword(passwords);

      toast({
        title: "Success",
        description: "Your password has been updated successfully",
      });

      // Clear password fields
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Failed to update password:", error);
      toast({
        title: "Error",
        description:
          "Failed to update password. Please check your current password and try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Zip Code Preference handlers
  const handleAddZipCode = async () => {
    if (!selectedZipCode) {
      toast({
        title: "Error",
        description: "Please select a zip code",
        variant: "destructive",
      });
      return;
    }

    // Validate zip code format
    const validation = validateZipCode(selectedZipCode);
    if (!validation.isValid) {
      toast({
        title: "Error",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    // Check if already added
    const existingZipCodes = zipCodePreferences.map((pref) => pref.zipCode);
    if (isDuplicateZipCode(selectedZipCode, existingZipCodes)) {
      toast({
        title: "Error",
        description: "This zip code is already in your preferences",
        variant: "destructive",
      });
      return;
    }

    // Check limit
    if (zipCodePreferences.length >= MAX_ZIP_CODES) {
      toast({
        title: "Error",
        description: `You can only add up to ${MAX_ZIP_CODES} zip codes`,
        variant: "destructive",
      });
      return;
    }

    try {
      await dispatch(addZipCodePreference(validation.formatted!)).unwrap();
      toast({
        title: "Success",
        description: `Zip code ${validation.formatted} added successfully`,
      });
      setSelectedZipCode("");
    } catch (error) {
      console.error("Failed to add zip code:", error);
      toast({
        title: "Error",
        description: "Failed to add zip code. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteZipCode = async (zipCode: string) => {
    try {
      await dispatch(deleteZipCodePreference(zipCode)).unwrap();
      toast({
        title: "Success",
        description: `Zip code ${zipCode} removed`,
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleUndoDelete(zipCode)}
          >
            Undo
          </Button>
        ),
      });
    } catch (error) {
      console.error("Failed to delete zip code:", error);
      toast({
        title: "Error",
        description: "Failed to remove zip code. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUndoDelete = async (zipCode: string) => {
    try {
      await dispatch(addZipCodePreference(zipCode)).unwrap();
      toast({
        title: "Restored",
        description: `Zip code ${zipCode} has been restored`,
      });
    } catch (error) {
      console.error("Failed to restore zip code:", error);
      toast({
        title: "Error",
        description: "Failed to restore zip code. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Get available zip codes that are not already added
  const getFilteredAvailableZipCodes = () => {
    const existingZipCodes = zipCodePreferences.map((pref) => pref.zipCode);
    return availableZipCodes.filter(
      (zipCode) => !existingZipCodes.includes(zipCode.zipCode)
    );
  };

  // Sort zip codes alphabetically for display
  const getSortedZipCodePreferences = () => {
    return [...zipCodePreferences].sort((a, b) =>
      a.zipCode.localeCompare(b.zipCode)
    );
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="md:hidden" />
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      <div className="grid gap-6 max-w-4xl">
        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your personal information. Email address cannot be changed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingProfile ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading profile...</span>
              </div>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ""}
                    readOnly
                    disabled
                    className="bg-muted text-muted-foreground cursor-not-allowed"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={profile.fullName}
                    onChange={(e) =>
                      handleProfileChange("fullName", e.target.value)
                    }
                    disabled={isUpdatingProfile}
                  />
                </div>
                <Button
                  onClick={handleSaveProfile}
                  className="w-full sm:w-auto"
                  disabled={isUpdatingProfile}
                >
                  {isUpdatingProfile && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isUpdatingProfile ? "Saving..." : "Save Changes"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>
              Manage your password and security preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                placeholder="Enter current password"
                value={passwords.currentPassword}
                onChange={(e) =>
                  handlePasswordChange("currentPassword", e.target.value)
                }
                disabled={isUpdatingPassword}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password (min. 8 characters)"
                value={passwords.newPassword}
                onChange={(e) =>
                  handlePasswordChange("newPassword", e.target.value)
                }
                disabled={isUpdatingPassword}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm new password"
                value={passwords.confirmPassword}
                onChange={(e) =>
                  handlePasswordChange("confirmPassword", e.target.value)
                }
                disabled={isUpdatingPassword}
              />
            </div>
            <Button
              onClick={handleUpdatePassword}
              className="w-full sm:w-auto"
              disabled={isUpdatingPassword}
            >
              {isUpdatingPassword && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isUpdatingPassword ? "Updating..." : "Update Password"}
            </Button>
          </CardContent>
        </Card>

        {/* Market Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Market Preferences</CardTitle>
            <CardDescription>
              Manage zip codes you have access to view market data for. You can
              add up to {MAX_ZIP_CODES} zip codes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Zip Code Counter */}
            <div className="flex items-center justify-between pb-2">
              <span className="text-sm text-muted-foreground">
                {zipCodePreferences.length} / {MAX_ZIP_CODES} zip codes
              </span>
              {zipCodePreferences.length >= MAX_ZIP_CODES && (
                <Badge variant="secondary">Limit Reached</Badge>
              )}
            </div>

            {/* Add Zip Code Section */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Select
                  value={selectedZipCode}
                  onValueChange={setSelectedZipCode}
                  disabled={
                    zipCodePreferencesLoading ||
                    isLoadingAvailableZipCodes ||
                    zipCodePreferences.length >= MAX_ZIP_CODES
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a zip code to add" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingAvailableZipCodes ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="ml-2 text-sm">Loading...</span>
                      </div>
                    ) : getFilteredAvailableZipCodes().length === 0 ? (
                      <div className="py-4 text-center text-sm text-muted-foreground">
                        {zipCodePreferences.length >= MAX_ZIP_CODES
                          ? "Limit reached"
                          : "No available zip codes"}
                      </div>
                    ) : (
                      getFilteredAvailableZipCodes().map((zipCode) => (
                        <SelectItem
                          key={zipCode.zipCode}
                          value={zipCode.zipCode}
                        >
                          {zipCode.zipCode} ({zipCode.listingCount} listings)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleAddZipCode}
                disabled={
                  !selectedZipCode ||
                  zipCodePreferencesLoading ||
                  zipCodePreferences.length >= MAX_ZIP_CODES
                }
              >
                {zipCodePreferencesLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span className="ml-2">Add</span>
              </Button>
            </div>

            {/* Display Current Zip Codes */}
            {zipCodePreferencesLoading && zipCodePreferences.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading zip codes...</span>
              </div>
            ) : zipCodePreferences.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">
                  Add zip codes to customize your market data access.
                </p>
                <p className="text-sm mt-1">
                  You can add up to {MAX_ZIP_CODES} zip codes.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {getSortedZipCodePreferences().map((pref) => (
                  <Badge
                    key={pref.zipCode}
                    variant="outline"
                    className="pl-3 pr-1 py-1 flex items-center gap-2"
                  >
                    <span>{pref.zipCode}</span>
                    <button
                      onClick={() => handleDeleteZipCode(pref.zipCode)}
                      disabled={zipCodePreferencesLoading}
                      className="hover:bg-destructive/20 rounded-sm p-0.5 transition-colors"
                      aria-label={`Remove zip code ${pref.zipCode}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
