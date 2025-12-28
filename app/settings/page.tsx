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
} from "@/lib/api/types";
import {
  getCurrentUserFromApi,
  updateCurrentUser,
  updateCurrentUserPassword,
} from "@/lib/api/users";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
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

    fetchUser();
  }, [toast]);

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
      </div>
    </div>
  );
}
