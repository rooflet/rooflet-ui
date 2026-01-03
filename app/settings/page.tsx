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
  AddPortfolioMemberRequest,
  PortfolioMemberResponse,
  PortfolioResponse,
  PortfolioRole,
  UpdatePortfolioRequest,
  CreatePortfolioRequest,
} from "@/lib/api/types";
import {
  getCurrentUserFromApi,
  updateCurrentUser,
  updateCurrentUserPassword,
} from "@/lib/api/users";
import {
  Loader2,
  X,
  Plus,
  Archive,
  ArchiveRestore,
  Edit2,
  Home,
  Save,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
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
import { portfoliosApi } from "@/lib/api/portfolios";
import { loadPortfolios } from "@/store/slices/portfolioSlice";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ROLE_COLORS: Record<PortfolioRole, string> = {
  OWNER:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  MANAGER: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  VIEWER: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

export default function SettingsPage() {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const { refreshKey, activePortfolioId: reduxActivePortfolioId } =
    useAppSelector((state) => state.portfolio);

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

  // Portfolio Management state
  const [portfolios, setPortfolios] = useState<PortfolioResponse[]>([]);
  const [portfolioMembers, setPortfolioMembers] = useState<
    Record<string, PortfolioMemberResponse[]>
  >({});
  const [activePortfolioId, setActivePortfolioId] = useState<string | null>(
    null
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoadingPortfolios, setIsLoadingPortfolios] = useState(true);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedPortfolio, setSelectedPortfolio] =
    useState<PortfolioResponse | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Edit portfolio modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<UpdatePortfolioRequest>({
    name: "",
    description: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Team management modal
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [currentTeamMembers, setCurrentTeamMembers] = useState<
    PortfolioMemberResponse[]
  >([]);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [newMember, setNewMember] = useState<AddPortfolioMemberRequest>({
    email: "",
    role: "VIEWER",
  });
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] =
    useState<PortfolioMemberResponse | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  // Create portfolio modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState<CreatePortfolioRequest>({
    name: "",
    description: "",
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      setIsLoadingProfile(true);
      try {
        const userData = await getCurrentUserFromApi();
        setUser(userData);
        setProfile({
          fullName: userData.fullName || "",
        });
        setActivePortfolioId(userData.activePortfolioId || null);
        setCurrentUserId(userData.id);
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
    loadPortfolioData();
  }, [toast, dispatch]);

  // Reload portfolio data when active portfolio changes (via portfolio switcher)
  useEffect(() => {
    if (refreshKey > 0) {
      loadPortfolioData();
    }
  }, [refreshKey]);

  const loadPortfolioData = async () => {
    try {
      setIsLoadingPortfolios(true);
      const allPortfolios = await portfoliosApi.getAll(false); // Include archived
      setPortfolios(allPortfolios);

      // Load members for all portfolios
      const membersMap: Record<string, PortfolioMemberResponse[]> = {};
      await Promise.all(
        allPortfolios.map(async (portfolio) => {
          try {
            const members = await portfoliosApi.getMembers(portfolio.id);
            membersMap[portfolio.id] = members;
          } catch (error) {
            console.error(
              `Failed to load members for portfolio ${portfolio.id}:`,
              error
            );
            membersMap[portfolio.id] = [];
          }
        })
      );
      setPortfolioMembers(membersMap);
    } catch (error) {
      console.error("Failed to load portfolios:", error);
      toast({
        title: "Error",
        description: "Failed to load portfolios",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPortfolios(false);
    }
  };

  const handleArchive = async () => {
    if (!selectedPortfolio) return;

    try {
      setActionInProgress(selectedPortfolio.id);
      await portfoliosApi.archive(selectedPortfolio.id);
      toast({
        title: "Portfolio Archived",
        description: `${selectedPortfolio.name} has been archived`,
      });
      await loadPortfolioData();
      // Update Redux store
      dispatch(loadPortfolios());
    } catch (error) {
      console.error("Failed to archive portfolio:", error);
      toast({
        title: "Error",
        description:
          "Failed to archive portfolio. It may be your only active portfolio.",
        variant: "destructive",
      });
    } finally {
      setActionInProgress(null);
      setArchiveDialogOpen(false);
      setSelectedPortfolio(null);
    }
  };

  const handleUnarchive = async (portfolio: PortfolioResponse) => {
    try {
      setActionInProgress(portfolio.id);
      await portfoliosApi.unarchive(portfolio.id);
      toast({
        title: "Portfolio Unarchived",
        description: `${portfolio.name} has been unarchived`,
      });
      await loadPortfolioData();
      // Update Redux store
      dispatch(loadPortfolios());
    } catch (error) {
      console.error("Failed to unarchive portfolio:", error);
      toast({
        title: "Error",
        description: "Failed to unarchive portfolio",
        variant: "destructive",
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleOpenEditModal = (portfolio: PortfolioResponse) => {
    setSelectedPortfolio(portfolio);
    setEditFormData({
      name: portfolio.name,
      description: portfolio.description || "",
    });
    setEditModalOpen(true);
  };

  const handleUpdatePortfolio = async () => {
    if (!selectedPortfolio || !editFormData.name?.trim()) {
      toast({
        title: "Error",
        description: "Portfolio name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      await portfoliosApi.update(selectedPortfolio.id, editFormData);
      toast({
        title: "Success",
        description: "Portfolio updated successfully",
      });
      setEditModalOpen(false);
      await loadPortfolioData();
    } catch (error) {
      console.error("Failed to update portfolio:", error);
      toast({
        title: "Error",
        description: "Failed to update portfolio. You may not have permission.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenTeamModal = async (portfolio: PortfolioResponse) => {
    setSelectedPortfolio(portfolio);
    setCurrentTeamMembers(portfolioMembers[portfolio.id] || []);
    setTeamModalOpen(true);
  };

  const handleAddMember = async () => {
    if (!selectedPortfolio || !newMember.email.trim()) {
      toast({
        title: "Error",
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsAddingMember(true);
      await portfoliosApi.addMember(selectedPortfolio.id, newMember);
      toast({
        title: "Member Added",
        description: `${newMember.email} has been added to the portfolio`,
      });
      setAddMemberOpen(false);
      setNewMember({ email: "", role: "VIEWER" });

      // Reload members for this portfolio
      const members = await portfoliosApi.getMembers(selectedPortfolio.id);
      setCurrentTeamMembers(members);
      setPortfolioMembers((prev) => ({
        ...prev,
        [selectedPortfolio.id]: members,
      }));
    } catch (error) {
      console.error("Failed to add member:", error);
      toast({
        title: "Error",
        description:
          "Failed to add member. User may not exist or already be a member.",
        variant: "destructive",
      });
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleUpdateMemberRole = async (
    member: PortfolioMemberResponse,
    newRole: PortfolioRole
  ) => {
    if (!selectedPortfolio) return;

    try {
      await portfoliosApi.updateMemberRole(
        selectedPortfolio.id,
        member.userId,
        { role: newRole }
      );
      toast({
        title: "Role Updated",
        description: `${member.userFullName}'s role has been updated to ${newRole}`,
      });

      // Reload members for this portfolio
      const members = await portfoliosApi.getMembers(selectedPortfolio.id);
      setCurrentTeamMembers(members);
      setPortfolioMembers((prev) => ({
        ...prev,
        [selectedPortfolio.id]: members,
      }));
    } catch (error) {
      console.error("Failed to update member role:", error);
      toast({
        title: "Error",
        description:
          "Failed to update role. Cannot change the last owner's role.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedPortfolio || !memberToRemove) return;

    try {
      setIsRemovingMember(true);
      await portfoliosApi.removeMember(
        selectedPortfolio.id,
        memberToRemove.userId
      );
      toast({
        title: "Member Removed",
        description: `${memberToRemove.userFullName} has been removed from the portfolio`,
      });
      setRemoveDialogOpen(false);
      setMemberToRemove(null);

      // Reload members for this portfolio
      const members = await portfoliosApi.getMembers(selectedPortfolio.id);
      setCurrentTeamMembers(members);
      setPortfolioMembers((prev) => ({
        ...prev,
        [selectedPortfolio.id]: members,
      }));
    } catch (error) {
      console.error("Failed to remove member:", error);
      toast({
        title: "Error",
        description: "Failed to remove member. Cannot remove the last owner.",
        variant: "destructive",
      });
    } finally {
      setIsRemovingMember(false);
    }
  };

  const getUserRole = (portfolioId: string): PortfolioRole | null => {
    const members = portfolioMembers[portfolioId] || [];
    const currentMember = members.find((m) => m.userId === currentUserId);
    return currentMember?.role || null;
  };

  const isOwner = (portfolioId: string) => getUserRole(portfolioId) === "OWNER";

  const activePortfolios = portfolios.filter((p) => !p.archived);
  const archivedPortfolios = portfolios.filter((p) => p.archived);
  const canArchive = activePortfolios.length > 1;

  const handleCreatePortfolio = async () => {
    if (!createFormData.name.trim()) {
      toast({
        title: "Error",
        description: "Portfolio name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreating(true);
      const newPortfolio = await portfoliosApi.create(createFormData);

      toast({
        title: "Portfolio Created",
        description: `${newPortfolio.name} has been created successfully`,
      });

      // Update Redux store with new portfolio
      await dispatch(loadPortfolios());

      // Reload portfolio data
      await loadPortfolioData();

      // Close modal and reset form
      setCreateModalOpen(false);
      setCreateFormData({ name: "", description: "" });
    } catch (error) {
      console.error("Failed to create portfolio:", error);
      toast({
        title: "Error",
        description: "Failed to create portfolio. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

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
    <TooltipProvider>
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
                Update your personal information. Email address cannot be
                changed.
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
                Manage zip codes you have access to view market data for. You
                can add up to {MAX_ZIP_CODES} zip codes.
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

          {/* Portfolio Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Portfolio Management</CardTitle>
                  <CardDescription>
                    Manage your property portfolios and team access
                  </CardDescription>
                </div>
                <Button onClick={() => setCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Portfolio
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingPortfolios ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading portfolios...</span>
                </div>
              ) : (
                <>
                  {/* Active Portfolios */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Active Portfolios</h3>
                    {activePortfolios.length === 0 ? (
                      <div className="text-center py-8 border rounded-lg bg-muted/50">
                        <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-sm font-medium mb-2">
                          No Active Portfolios
                        </p>
                        <p className="text-sm text-muted-foreground mb-4">
                          Create your first portfolio to get started
                        </p>
                        <Button onClick={() => setCreateModalOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Portfolio
                        </Button>
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {activePortfolios.map((portfolio) => {
                          const members = portfolioMembers[portfolio.id] || [];
                          const memberCount = members.length;
                          const userRole = getUserRole(portfolio.id);
                          const canEdit = userRole === "OWNER";

                          return (
                            <div
                              key={portfolio.id}
                              className={`border rounded-lg p-4 ${
                                portfolio.id === activePortfolioId
                                  ? "border-primary border-2 bg-primary/5"
                                  : ""
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <h4 className="font-semibold truncate">
                                      {portfolio.name}
                                    </h4>
                                    {portfolio.id === activePortfolioId && (
                                      <Badge
                                        variant="default"
                                        className="text-xs shrink-0"
                                      >
                                        Active
                                      </Badge>
                                    )}
                                  </div>
                                  {portfolio.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {portfolio.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Users className="size-4" />
                                  <span>
                                    {memberCount}{" "}
                                    {memberCount === 1 ? "member" : "members"}
                                  </span>
                                  {userRole && (
                                    <>
                                      <span className="text-muted-foreground/50">
                                        •
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className={`text-xs ${ROLE_COLORS[userRole]}`}
                                      >
                                        {userRole}
                                      </Badge>
                                    </>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  {canEdit && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-8"
                                      onClick={() =>
                                        handleOpenEditModal(portfolio)
                                      }
                                      disabled={
                                        actionInProgress === portfolio.id
                                      }
                                      aria-label="Edit portfolio"
                                    >
                                      <Edit2 className="size-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8"
                                    onClick={() =>
                                      handleOpenTeamModal(portfolio)
                                    }
                                    disabled={actionInProgress === portfolio.id}
                                    aria-label="Manage team"
                                  >
                                    <Users className="size-4" />
                                  </Button>
                                  {canArchive ? (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-8 text-muted-foreground hover:text-destructive"
                                      onClick={() => {
                                        setSelectedPortfolio(portfolio);
                                        setArchiveDialogOpen(true);
                                      }}
                                      disabled={
                                        actionInProgress === portfolio.id
                                      }
                                      aria-label="Archive portfolio"
                                    >
                                      <Archive className="size-4" />
                                    </Button>
                                  ) : (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8"
                                            disabled
                                            aria-label="Archive portfolio"
                                          >
                                            <Archive className="size-4" />
                                          </Button>
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>
                                          Cannot archive your only portfolio
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Archived Portfolios */}
                  {archivedPortfolios.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-muted-foreground">
                        Archived Portfolios
                      </h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        {archivedPortfolios.map((portfolio) => {
                          const members = portfolioMembers[portfolio.id] || [];
                          const memberCount = members.length;

                          return (
                            <div
                              key={portfolio.id}
                              className="border rounded-lg p-4 opacity-60 hover:opacity-100 transition-opacity"
                            >
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-semibold truncate">
                                      {portfolio.name}
                                    </h4>
                                    <Badge
                                      variant="secondary"
                                      className="text-xs shrink-0"
                                    >
                                      Archived
                                    </Badge>
                                  </div>
                                  {portfolio.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {portfolio.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Users className="size-4" />
                                  <span>
                                    {memberCount}{" "}
                                    {memberCount === 1 ? "member" : "members"}
                                  </span>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUnarchive(portfolio)}
                                  disabled={actionInProgress === portfolio.id}
                                >
                                  {actionInProgress === portfolio.id ? (
                                    <Loader2 className="size-4 mr-2 animate-spin" />
                                  ) : (
                                    <ArchiveRestore className="size-4 mr-2" />
                                  )}
                                  Restore
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Portfolio Dialogs */}
        <AlertDialog
          open={archiveDialogOpen}
          onOpenChange={setArchiveDialogOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive Portfolio?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to archive &quot;{selectedPortfolio?.name}
                &quot;? Properties will remain but the portfolio won&apos;t be
                accessible until unarchived.
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

        {/* Create Portfolio Dialog */}
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Portfolio</DialogTitle>
              <DialogDescription>
                Set up a new portfolio to organize your properties
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Portfolio Name</Label>
                <Input
                  id="create-name"
                  placeholder="Enter portfolio name"
                  value={createFormData.name}
                  onChange={(e) =>
                    setCreateFormData({
                      ...createFormData,
                      name: e.target.value,
                    })
                  }
                  disabled={isCreating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-description">
                  Description (Optional)
                </Label>
                <Textarea
                  id="create-description"
                  placeholder="Describe this portfolio"
                  value={createFormData.description}
                  onChange={(e) =>
                    setCreateFormData({
                      ...createFormData,
                      description: e.target.value,
                    })
                  }
                  disabled={isCreating}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setCreateModalOpen(false);
                  setCreateFormData({ name: "", description: "" });
                }}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button onClick={handleCreatePortfolio} disabled={isCreating}>
                {isCreating && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Create Portfolio
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Portfolio Dialog */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Portfolio</DialogTitle>
              <DialogDescription>
                Update portfolio name and description
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Portfolio Name</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      description: e.target.value,
                    })
                  }
                  disabled={isSaving}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEditModalOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdatePortfolio} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Team Management Dialog */}
        <Dialog open={teamModalOpen} onOpenChange={setTeamModalOpen}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">
                Team Members - {selectedPortfolio?.name}
              </DialogTitle>
              <DialogDescription>
                Manage who has access to this portfolio and their permission
                levels
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">
                  {currentTeamMembers.length}{" "}
                  {currentTeamMembers.length === 1 ? "member" : "members"}
                </p>
                {selectedPortfolio && isOwner(selectedPortfolio.id) && (
                  <Button size="sm" onClick={() => setAddMemberOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                )}
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[30%]">Name</TableHead>
                      <TableHead className="w-[35%]">Email</TableHead>
                      <TableHead className="w-[20%]">Role</TableHead>
                      {selectedPortfolio && isOwner(selectedPortfolio.id) && (
                        <TableHead className="w-[15%] text-right">
                          Actions
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentTeamMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="truncate">
                              {member.userFullName}
                            </span>
                            {member.userId === currentUserId && (
                              <Badge
                                variant="outline"
                                className="text-xs shrink-0"
                              >
                                You
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="break-all">
                          {member.userEmail}
                        </TableCell>
                        <TableCell>
                          {selectedPortfolio &&
                          isOwner(selectedPortfolio.id) &&
                          member.userId !== currentUserId ? (
                            <Select
                              value={member.role}
                              onValueChange={(value) =>
                                handleUpdateMemberRole(
                                  member,
                                  value as PortfolioRole
                                )
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="OWNER">Owner</SelectItem>
                                <SelectItem value="MANAGER">Manager</SelectItem>
                                <SelectItem value="VIEWER">Viewer</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge className={ROLE_COLORS[member.role]}>
                              {member.role}
                            </Badge>
                          )}
                        </TableCell>
                        {selectedPortfolio && isOwner(selectedPortfolio.id) && (
                          <TableCell className="text-right">
                            {member.userId !== currentUserId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setMemberToRemove(member);
                                  setRemoveDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Member Dialog */}
        <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
              <DialogDescription>
                Invite a user to access this portfolio. They must have an
                existing account.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="member-email">Email Address</Label>
                <Input
                  id="member-email"
                  type="email"
                  placeholder="user@example.com"
                  value={newMember.email}
                  onChange={(e) =>
                    setNewMember({ ...newMember, email: e.target.value })
                  }
                  disabled={isAddingMember}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-role">Role</Label>
                <Select
                  value={newMember.role}
                  onValueChange={(value) =>
                    setNewMember({ ...newMember, role: value as PortfolioRole })
                  }
                  disabled={isAddingMember}
                >
                  <SelectTrigger id="member-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OWNER">Owner - Full control</SelectItem>
                    <SelectItem value="MANAGER">
                      Manager - Manage data
                    </SelectItem>
                    <SelectItem value="VIEWER">Viewer - Read only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddMemberOpen(false)}
                disabled={isAddingMember}
              >
                Cancel
              </Button>
              <Button onClick={handleAddMember} disabled={isAddingMember}>
                {isAddingMember && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Add Member
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove Member Dialog */}
        <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Member?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove {memberToRemove?.userFullName}{" "}
                from this portfolio? They will lose all access immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isRemovingMember}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemoveMember}
                disabled={isRemovingMember}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isRemovingMember && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
