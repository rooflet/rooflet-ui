"use client"

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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import { portfoliosApi } from "@/lib/api/portfolios"
import type {
  AddPortfolioMemberRequest,
  PortfolioMemberResponse,
  PortfolioResponse,
  PortfolioRole,
  UpdatePortfolioRequest,
} from "@/lib/api/types"
import { getCurrentUserFromApi } from "@/lib/api/users"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { loadPortfolios } from "@/store/slices/portfolioSlice"
import { Archive, ArchiveRestore, Edit2, Home, Loader2, Plus, Save, Trash2, UserPlus, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

const ROLE_COLORS: Record<PortfolioRole, string> = {
  OWNER: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  MANAGER: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  VIEWER: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
}

export default function PortfoliosPage() {
  const router = useRouter()
  const { toast } = useToast()
  const dispatch = useAppDispatch()
  const { refreshKey, activePortfolioId: reduxActivePortfolioId } = useAppSelector((state) => state.portfolio)
  const [portfolios, setPortfolios] = useState<PortfolioResponse[]>([])
  const [portfolioMembers, setPortfolioMembers] = useState<Record<number, PortfolioMemberResponse[]>>({})
  const [activePortfolioId, setActivePortfolioId] = useState<number | null>(null)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false)
  const [selectedPortfolio, setSelectedPortfolio] = useState<PortfolioResponse | null>(null)
  const [actionInProgress, setActionInProgress] = useState<number | null>(null)

  // Edit portfolio modal
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editFormData, setEditFormData] = useState<UpdatePortfolioRequest>({
    name: "",
    description: "",
  })
  const [isSaving, setIsSaving] = useState(false)

  // Team management modal
  const [teamModalOpen, setTeamModalOpen] = useState(false)
  const [currentTeamMembers, setCurrentTeamMembers] = useState<PortfolioMemberResponse[]>([])
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [newMember, setNewMember] = useState<AddPortfolioMemberRequest>({
    email: "",
    role: "VIEWER",
  })
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<PortfolioMemberResponse | null>(null)
  const [isRemovingMember, setIsRemovingMember] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  // Reload data when active portfolio changes (via portfolio switcher)
  useEffect(() => {
    if (refreshKey > 0) {
      loadData()
    }
  }, [refreshKey])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [allPortfolios, userData] = await Promise.all([
        portfoliosApi.getAll(false), // Include archived
        getCurrentUserFromApi(),
      ])

      setPortfolios(allPortfolios)
      setActivePortfolioId(userData.activePortfolioId || null)
      setCurrentUserId(userData.id)

      // Load members for all portfolios
      const membersMap: Record<number, PortfolioMemberResponse[]> = {}
      await Promise.all(
        allPortfolios.map(async (portfolio) => {
          try {
            const members = await portfoliosApi.getMembers(portfolio.id)
            membersMap[portfolio.id] = members
          } catch (error) {
            console.error(`Failed to load members for portfolio ${portfolio.id}:`, error)
            membersMap[portfolio.id] = []
          }
        }),
      )
      setPortfolioMembers(membersMap)
    } catch (error) {
      console.error("Failed to load portfolios:", error)
      toast({
        title: "Error",
        description: "Failed to load portfolios",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleArchive = async () => {
    if (!selectedPortfolio) return

    try {
      setActionInProgress(selectedPortfolio.id)
      await portfoliosApi.archive(selectedPortfolio.id)
      toast({
        title: "Portfolio Archived",
        description: `${selectedPortfolio.name} has been archived`,
      })
      await loadData()
      // Update Redux store
      dispatch(loadPortfolios())
    } catch (error) {
      console.error("Failed to archive portfolio:", error)
      toast({
        title: "Error",
        description: "Failed to archive portfolio. It may be your only active portfolio.",
        variant: "destructive",
      })
    } finally {
      setActionInProgress(null)
      setArchiveDialogOpen(false)
      setSelectedPortfolio(null)
    }
  }

  const handleUnarchive = async (portfolio: PortfolioResponse) => {
    try {
      setActionInProgress(portfolio.id)
      await portfoliosApi.unarchive(portfolio.id)
      toast({
        title: "Portfolio Unarchived",
        description: `${portfolio.name} has been unarchived`,
      })
      await loadData()
      // Update Redux store
      dispatch(loadPortfolios())
    } catch (error) {
      console.error("Failed to unarchive portfolio:", error)
      toast({
        title: "Error",
        description: "Failed to unarchive portfolio",
        variant: "destructive",
      })
    } finally {
      setActionInProgress(null)
    }
  }

  const handleOpenEditModal = (portfolio: PortfolioResponse) => {
    setSelectedPortfolio(portfolio)
    setEditFormData({
      name: portfolio.name,
      description: portfolio.description || "",
    })
    setEditModalOpen(true)
  }

  const handleUpdatePortfolio = async () => {
    if (!selectedPortfolio || !editFormData.name?.trim()) {
      toast({
        title: "Error",
        description: "Portfolio name is required",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSaving(true)
      await portfoliosApi.update(selectedPortfolio.id, editFormData)
      toast({
        title: "Success",
        description: "Portfolio updated successfully",
      })
      setEditModalOpen(false)
      await loadData()
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

  const handleOpenTeamModal = async (portfolio: PortfolioResponse) => {
    setSelectedPortfolio(portfolio)
    setCurrentTeamMembers(portfolioMembers[portfolio.id] || [])
    setTeamModalOpen(true)
  }

  const handleAddMember = async () => {
    if (!selectedPortfolio || !newMember.email.trim()) {
      toast({
        title: "Error",
        description: "Email is required",
        variant: "destructive",
      })
      return
    }

    try {
      setIsAddingMember(true)
      await portfoliosApi.addMember(selectedPortfolio.id, newMember)
      toast({
        title: "Member Added",
        description: `${newMember.email} has been added to the portfolio`,
      })
      setAddMemberOpen(false)
      setNewMember({ email: "", role: "VIEWER" })

      // Reload members for this portfolio
      const members = await portfoliosApi.getMembers(selectedPortfolio.id)
      setCurrentTeamMembers(members)
      setPortfolioMembers((prev) => ({
        ...prev,
        [selectedPortfolio.id]: members,
      }))
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
    if (!selectedPortfolio) return

    try {
      await portfoliosApi.updateMemberRole(selectedPortfolio.id, member.userId, { role: newRole })
      toast({
        title: "Role Updated",
        description: `${member.userFullName}'s role has been updated to ${newRole}`,
      })

      // Reload members for this portfolio
      const members = await portfoliosApi.getMembers(selectedPortfolio.id)
      setCurrentTeamMembers(members)
      setPortfolioMembers((prev) => ({
        ...prev,
        [selectedPortfolio.id]: members,
      }))
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
    if (!selectedPortfolio || !memberToRemove) return

    try {
      setIsRemovingMember(true)
      await portfoliosApi.removeMember(selectedPortfolio.id, memberToRemove.userId)
      toast({
        title: "Member Removed",
        description: `${memberToRemove.userFullName} has been removed from the portfolio`,
      })
      setRemoveDialogOpen(false)
      setMemberToRemove(null)

      // Reload members for this portfolio
      const members = await portfoliosApi.getMembers(selectedPortfolio.id)
      setCurrentTeamMembers(members)
      setPortfolioMembers((prev) => ({
        ...prev,
        [selectedPortfolio.id]: members,
      }))
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

  const getUserRole = (portfolioId: number): PortfolioRole | null => {
    const members = portfolioMembers[portfolioId] || []
    const currentMember = members.find((m) => m.userId === currentUserId)
    return currentMember?.role || null
  }

  const isOwner = (portfolioId: number) => getUserRole(portfolioId) === "OWNER"

  const activePortfolios = portfolios.filter((p) => !p.archived)
  const archivedPortfolios = portfolios.filter((p) => p.archived)
  const canArchive = activePortfolios.length > 1

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden" />
          <div className="flex-1">
            <h1 className="text-3xl font-bold">Portfolio Management</h1>
            <p className="text-muted-foreground">Manage your property portfolios and team access</p>
          </div>
          <Button onClick={() => router.push("/portfolios/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Create Portfolio
          </Button>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Active Portfolios</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {activePortfolios.map((portfolio) => {
              const members = portfolioMembers[portfolio.id] || []
              const memberCount = members.length
              const userRole = getUserRole(portfolio.id)
              const canEdit = userRole === "OWNER"

              return (
                <Card
                  key={portfolio.id}
                  className={portfolio.id === activePortfolioId ? "border-primary border-2" : ""}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <CardTitle className="text-lg truncate">{portfolio.name}</CardTitle>
                          {portfolio.id === activePortfolioId && (
                            <Badge variant="default" className="text-xs shrink-0">
                              Active
                            </Badge>
                          )}
                        </div>
                        {portfolio.description && (
                          <CardDescription className="line-clamp-2 text-sm">{portfolio.description}</CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="size-4" />
                        <span>
                          {memberCount} {memberCount === 1 ? "member" : "members"}
                        </span>
                        {userRole && (
                          <>
                            <span className="text-muted-foreground/50">•</span>
                            <Badge variant="outline" className={`text-xs ${ROLE_COLORS[userRole]}`}>
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
                            onClick={() => handleOpenEditModal(portfolio)}
                            disabled={actionInProgress === portfolio.id}
                            aria-label="Edit portfolio"
                          >
                            <Edit2 className="size-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => handleOpenTeamModal(portfolio)}
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
                              setSelectedPortfolio(portfolio)
                              setArchiveDialogOpen(true)
                            }}
                            disabled={actionInProgress === portfolio.id}
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
                              <p>Cannot archive your only portfolio</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
          {/* </CHANGE> */}
          {activePortfolios.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Home className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No Active Portfolios</p>
                <p className="text-sm text-muted-foreground mb-4">Create your first portfolio to get started</p>
                <Button onClick={() => router.push("/portfolios/new")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Portfolio
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {archivedPortfolios.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-muted-foreground">Archived Portfolios</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {archivedPortfolios.map((portfolio) => {
                const members = portfolioMembers[portfolio.id] || []
                const memberCount = members.length

                return (
                  <Card key={portfolio.id} className="opacity-60 hover:opacity-100 transition-opacity">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-lg truncate">{portfolio.name}</CardTitle>
                            <Badge variant="secondary" className="text-xs shrink-0">
                              Archived
                            </Badge>
                          </div>
                          {portfolio.description && (
                            <CardDescription className="line-clamp-2 text-sm">{portfolio.description}</CardDescription>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="size-4" />
                          <span>
                            {memberCount} {memberCount === 1 ? "member" : "members"}
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
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
        {/* </CHANGE> */}

        <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive Portfolio?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to archive &quot;{selectedPortfolio?.name}
                &quot;? Properties will remain but the portfolio won&apos;t be accessible until unarchived.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleArchive}>Archive</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Portfolio Dialog */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Portfolio</DialogTitle>
              <DialogDescription>Update portfolio name and description</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Portfolio Name</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
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
              <Button variant="outline" onClick={() => setEditModalOpen(false)} disabled={isSaving}>
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
              <DialogTitle className="text-xl">Team Members - {selectedPortfolio?.name}</DialogTitle>
              <DialogDescription>Manage who has access to this portfolio and their permission levels</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-muted-foreground">
                  {currentTeamMembers.length} {currentTeamMembers.length === 1 ? "member" : "members"}
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
                        <TableHead className="w-[15%] text-right">Actions</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentTeamMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="truncate">{member.userFullName}</span>
                            {member.userId === currentUserId && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                You
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="break-all">{member.userEmail}</TableCell>
                        <TableCell>
                          {selectedPortfolio && isOwner(selectedPortfolio.id) && member.userId !== currentUserId ? (
                            <Select
                              value={member.role}
                              onValueChange={(value) => handleUpdateMemberRole(member, value as PortfolioRole)}
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
                            <Badge className={ROLE_COLORS[member.role]}>{member.role}</Badge>
                          )}
                        </TableCell>
                        {selectedPortfolio && isOwner(selectedPortfolio.id) && (
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
    </TooltipProvider>
  )
}
