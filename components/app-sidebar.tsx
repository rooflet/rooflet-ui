"use client";

import { ChangelogDialog } from "@/components/changelog-dialog";
import { PortfolioSwitcher } from "@/components/portfolio-switcher";
import { RoofletLogo } from "@/components/rooflet-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import type { User } from "@/lib/api/types";
import { getCurrentUserFromApi } from "@/lib/api/users";
import { ROUTES } from "@/lib/constants/routes";
import { persistor } from "@/store";
import { useAppDispatch } from "@/store/hooks";
import { logout } from "@/store/slices/authSlice";
import { resetExpenses } from "@/store/slices/expensesSlice";
import { resetPortfolio } from "@/store/slices/portfolioSlice";
import { resetProperties } from "@/store/slices/propertiesSlice";
import { resetRentCollections } from "@/store/slices/rentCollectionsSlice";
import { resetTenants } from "@/store/slices/tenantsSlice";
import {
  BarChart3,
  Briefcase,
  Calendar,
  DollarSign,
  Home,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Operations section with all items
const adminItems = [
  {
    title: "Rent Collection",
    icon: DollarSign,
    href: "/operations/rent-collection",
  },
  {
    title: "Property",
    icon: Home,
    href: "/operations/properties",
  },
  {
    title: "Tenant",
    icon: Users,
    href: "/operations/tenants",
  },
  {
    title: "Expense",
    icon: Receipt,
    href: "/operations/expenses",
  },
];

// Business Development
const businessDevItems = [
  {
    title: "Portfolio",
    icon: BarChart3,
    href: "/business-development/portfolio",
  },
  {
    title: "Market Listings",
    icon: TrendingUp,
    href: "/business-development/market-listings",
  },
];

// Reports with sub-items
const reportsSubItems = [
  {
    title: "Property",
    icon: Calendar,
    href: "/reports/property",
  },
  {
    title: "Tenant",
    icon: Users,
    href: "/reports/tenant",
  },
  {
    title: "Expense",
    icon: Receipt,
    href: "/reports/expenses",
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await getCurrentUserFromApi();
        setUser(userData);
      } catch (error) {
        console.error("Failed to fetch user data:", error);
      }
    };

    fetchUser();
  }, []);

  const handleLogout = async () => {
    try {
      // Dispatch logout to clear auth state and call backend
      await dispatch(logout()).unwrap();

      // Clear all slice states
      dispatch(resetPortfolio());
      dispatch(resetProperties());
      dispatch(resetTenants());
      dispatch(resetExpenses());
      dispatch(resetRentCollections());

      // Purge persisted Redux state
      await persistor.purge();

      router.push(ROUTES.LOGIN);
    } catch (error) {
      console.error("Logout failed:", error);
      // Still clear everything and redirect even if logout fails
      dispatch(resetPortfolio());
      dispatch(resetProperties());
      dispatch(resetTenants());
      dispatch(resetExpenses());
      dispatch(resetRentCollections());
      await persistor.purge();
      router.push(ROUTES.LOGIN);
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="group-data-[collapsible=icon]:hidden">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between gap-2 px-2 py-1.5">
              <Link
                href={ROUTES.HOME}
                className="flex items-center gap-2 min-w-0"
              >
                <RoofletLogo className="size-8" showBackground={true} />
                <div className="flex flex-col gap-0.5 leading-none overflow-hidden">
                  <span className="font-semibold truncate">Rooflet</span>
                  <span className="text-xs text-muted-foreground truncate">
                    Property Management
                  </span>
                </div>
              </Link>
              <ThemeToggle />
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <PortfolioSwitcher />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* Operations */}
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === ROUTES.HOME}>
                  <Link href={ROUTES.HOME}>
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Business Development */}
        <SidebarGroup>
          <SidebarGroupLabel>Business Development</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {businessDevItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Reports */}
        <SidebarGroup>
          <SidebarGroupLabel>Reports</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {reportsSubItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Account */}
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/portfolios")}
                >
                  <Link href={ROUTES.PORTFOLIOS.LIST}>
                    <Briefcase />
                    <span>Portfolio Management</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:justify-center">
              <Avatar className="size-8 shrink-0">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user?.fullName
                    ? user.fullName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                    : "JD"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5 leading-none overflow-hidden group-data-[collapsible=icon]:hidden">
                <span className="font-semibold text-sm truncate">
                  {user?.fullName || "John Doe"}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {user?.email || "john@example.com"}
                </span>
              </div>
            </div>
          </SidebarMenuItem>

          <Separator className="my-1" />

          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === ROUTES.SETTINGS}>
              <Link href={ROUTES.SETTINGS}>
                <Settings />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout}>
              <LogOut />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
            <div className="flex items-center justify-center px-2 py-1">
              <ChangelogDialog />
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
