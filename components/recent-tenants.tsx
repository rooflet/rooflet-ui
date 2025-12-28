import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/lib/constants/routes";
import { Mail, Phone } from "lucide-react";
import Link from "next/link";

const tenants = [
  {
    id: 1,
    name: "Sarah Johnson",
    unit: "Unit 12A",
    property: "Sunset Apartments",
    email: "sarah.j@email.com",
    phone: "(555) 123-4567",
    initials: "SJ",
  },
  {
    id: 2,
    name: "Michael Chen",
    unit: "Unit 5B",
    property: "Riverside Complex",
    email: "mchen@email.com",
    phone: "(555) 234-5678",
    initials: "MC",
  },
  {
    id: 3,
    name: "Emily Rodriguez",
    unit: "Unit 3C",
    property: "Garden View Homes",
    email: "emily.r@email.com",
    phone: "(555) 345-6789",
    initials: "ER",
  },
];

export function RecentTenants() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Tenants</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link href={ROUTES.OPERATIONS.TENANTS}>View All</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {tenants.map((tenant) => (
          <Link key={tenant.id} href={ROUTES.OPERATIONS.TENANTS}>
            <div className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors cursor-pointer">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {tenant.initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{tenant.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {tenant.unit} • {tenant.property}
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Mail className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Phone className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
