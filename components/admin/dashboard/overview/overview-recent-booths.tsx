import { format } from "date-fns";

import type {
  AdminDashboardSection,
  BoothRecord,
} from "@/components/admin/dashboard/types";
import {
  getStatusBadgeVariant,
  getStatusLabel,
} from "@/components/admin/dashboard/overview/overview-utils";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface OverviewRecentBoothsProps {
  booths: BoothRecord[];
  onSectionChange: (section: AdminDashboardSection) => void;
}

export function OverviewRecentBooths({
  booths,
  onSectionChange,
}: OverviewRecentBoothsProps) {
  const recentBooths = [...booths]
    .sort((a, b) => {
      const first = new Date(a.installationDate).getTime();
      const second = new Date(b.installationDate).getTime();
      return second - first;
    })
    .slice(0, 5);

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Recently installed booths</CardTitle>
          <CardDescription>
            Latest booth records available in the current database.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Installed</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentBooths.length > 0 ? (
                recentBooths.map((booth) => (
                  <TableRow key={booth._id}>
                    <TableCell className="font-medium">{booth.name}</TableCell>
                    <TableCell>{booth.location}</TableCell>
                    <TableCell>
                      {format(new Date(booth.installationDate), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getStatusBadgeVariant(booth.status)}
                        className="rounded-full"
                      >
                        {getStatusLabel(booth.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No booths have been added yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
