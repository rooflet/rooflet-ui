"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { portfoliosApi } from "@/lib/api/portfolios"
import { getCurrentUserFromApi } from "@/lib/api/users"
import type {
  PortfolioResponse,
  PortfolioMemberResponse,
  UpdatePortfolioRequest,
  AddPortfolioMemberRequest,
  PortfolioRole,
} from "@/lib/api/types"
import { Loader2, ArrowLeft, UserPlus, Trash2, Save } from "lucide-react"

const ROLE_COLORS: Record<PortfolioRole, string> = {
  OWNER: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  MANAGER: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  VIEWER: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
}

export default function PortfolioDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const portfolioId = Number(params.id)
  const { toast } = useToast()

  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null)
  const [members, setMembers] = useState<PortfolioMemberResponse[]>([])
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [userRole, setUserRole] = useState<PortfolioRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState<UpdatePortfolioRequest>({
    name: "",
    description: "",
  })

  // Add member dialog
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [newMember, setNewMember] = useState<AddPortfolioMemberRequest>({
    email: "",
    role: "VIEWER",
  })
  const [isAddingMember, setIsAddingMember] = useState(false)

  // Remove member dialog
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<PortfolioMemberResponse | null>(null)
  const [isRemovingMember, setIsRemovingMember] = useState(false)

  useEffect(() => {
    loadData()
  }, [portfolioId])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [portfolioData, membersData, userData] = await Promise.all([
        portfoliosApi.getById(portfolioId),
        portfoliosApi.getMembers(portfolioId),
        getCurrentUserFromApi(),
      ])

      setPortfolio(portfolioData)
      setMembers(membersData)
      setCurrentUserId(userData.id)
      setFormData({
        name: portfolioData.name,
        description: portfolioData.description || "",
      })

      // Find current user's role
      const currentMember = membersData.find((m) => m.userId === userData.id)
      setUserRole(currentMember?.role || null)
    } catch (error) {
      console.error("Failed to load portfolio data:", error)
      toast({
        title: "Error",
        description: "Failed to load portfolio details",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdatePortfolio = async () => {
    if (!formData.name?.trim()) {
      toast({
        title: "Error",
        description: "Portfolio name is required",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSaving(true)
      const updated = await portfoliosApi.update(portfolioId, formData)
      setPortfolio(updated)
      toast({
        title: "Success",
        description: "Portfolio updated successfully",
      })
    } catch (error) {
      console.error("Failed to update portfolio:", error)
      toast({
        title: "Error",
        description: "Failed to update portfolio. You may not have permission.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddMember = async () => {
    if (!newMember.email.trim()) {
      toast({
        title: "Error",
        description: "Email is required",
        variant: "destructive",
      })
      return
    }

    try {
      setIsAddingMember(true)
      await portfoliosApi.addMember(portfolioId, newMember)
      toast({
        title: "Member Added",
        description: `${newMember.email} has been added to the portfolio`,
      })
      setAddMemberOpen(false)
      setNewMember({ email: "", role: "VIEWER" })
      await loadData()
    } catch (error) {
      console.error("Failed to add member:", error)
      toast({
        title: "Error",
        description: "Failed to add member. User may not exist or already be a member.",
        variant: "destructive",
      })
    } finally {
      setIsAddingMember(false)
    }
  }

  const handleUpdateMemberRole = async (member: PortfolioMemberResponse, newRole: PortfolioRole) => {
    try {
      await portfoliosApi.updateMemberRole(portfolioId, member.userId, {
        role: newRole,
      })
      toast({
        title: "Role Updated",
        description: `${member.userFullName}'s role has been updated to ${newRole}`,
      })
      await loadData()
    } catch (error) {
      console.error("Failed to update member role:", error)
      toast({
        title: "Error",
        description: "Failed to update role. Cannot change the last owner's role.",
        variant: "destructive",
      })
    }
  }

  const handleRemoveMember = async () => {
    if (!memberToRemove) return

    try {
      setIsRemovingMember(true)
      await portfoliosApi.removeMember(portfolioId, memberToRemove.userId)
      toast({
        title: "Member Removed",
        description: `${memberToRemove.userFullName} has been removed from the portfolio`,
      })
      setRemoveDialogOpen(false)
      setMemberToRemove(null)
      await loadData()
    } catch (error) {
      console.error("Failed to remove member:", error)
      toast({
        title: "Error",
        description: "Failed to remove member. Cannot remove the last owner.",
        variant: "destructive",
      })
    } finally {
      setIsRemovingMember(false)
    }
  }

  const isOwner = userRole === "OWNER"
  const isViewer = userRole === "VIEWER"

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (!portfolio) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg font-medium">Portfolio not found</p>
            <Button className="mt-4" onClick={() => router.push("/portfolios")}>
              Back to Portfolios
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="md:hidden" />
        <Button variant="ghost" size="icon" onClick={() => router.push("/portfolios")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{portfolio.name}</h1>
          <p className="text-muted-foreground">Manage portfolio details and team members</p>
        </div>
        {portfolio.archived && <Badge variant="secondary">Archived</Badge>}
      </div>

      {/* Portfolio Info */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Information</CardTitle>
          <CardDescription>{isOwner ? "Update portfolio details" : "View portfolio details"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="portfolio-name">Portfolio Name</Label>
            <Input
              id="portfolio-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={!isOwner || isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="portfolio-description">Description</Label>
            <Textarea
              id="portfolio-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={!isOwner || isSaving}
              rows={3}
            />
          </div>

          {isOwner && (
            <Button onClick={handleUpdatePortfolio} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Manage who has access to this portfolio</CardDescription>
            </div>
            {isOwner && (
              <Button onClick={() => setAddMemberOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                {isOwner && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">
                    {member.userFullName}
                    {member.userId === currentUserId && (
                      <Badge variant="outline" className="ml-2">
                        You
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{member.userEmail}</TableCell>
                  <TableCell>
                    {isOwner && member.userId !== currentUserId ? (
                      <Select
                        value={member.role}
                        onValueChange={(value) => handleUpdateMemberRole(member, value as PortfolioRole)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OWNER">Owner</SelectItem>
                          <SelectItem value="MANAGER">Manager</SelectItem>
                          <SelectItem value="VIEWER">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={ROLE_COLORS[member.role]}>{member.role}</Badge>
                    )}
                  </TableCell>
                  {isOwner && (
                    <TableCell className="text-right">
                      {member.userId !== currentUserId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setMemberToRemove(member)
                            setRemoveDialogOpen(true)
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
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
            <DialogDescription>
              Invite a user to access this portfolio. They must have an existing account.
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
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                disabled={isAddingMember}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-role">Role</Label>
              <Select
                value={newMember.role}
                onValueChange={(value) => setNewMember({ ...newMember, role: value as PortfolioRole })}
                disabled={isAddingMember}
              >
                <SelectTrigger id="member-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OWNER">Owner - Full control</SelectItem>
                  <SelectItem value="MANAGER">Manager - Manage data</SelectItem>
                  <SelectItem value="VIEWER">Viewer - Read only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberOpen(false)} disabled={isAddingMember}>
              Cancel
            </Button>
            <Button onClick={handleAddMember} disabled={isAddingMember}>
              {isAddingMember && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
              Are you sure you want to remove {memberToRemove?.userFullName} from this portfolio? They will lose all
              access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemovingMember}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isRemovingMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemovingMember && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
