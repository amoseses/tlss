import Link from "next/link";

import { ManagerUserActions } from "./manager-user-actions";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requirePlatformAdmin } from "@/lib/auth/require-platform-admin";
import { getManagerUsers } from "@/lib/data/manager";
import type { Profile } from "@/types/database";

type Props = {
  searchParams: Promise<{ filter?: string }>;
};

const filters = [
  { key: "all", label: "All" },
  { key: "buyers", label: "Buyers" },
  { key: "sellers", label: "Sellers" },
  { key: "banned", label: "Banned" },
] as const;

const roleLabel: Record<string, string> = {
  customer: "Buyer",
  staff: "Seller",
  admin: "Admin",
};

export default async function ManagerUsersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const filter = (sp.filter ?? "all") as "all" | "buyers" | "sellers" | "banned";
  const [{ user }, rows] = await Promise.all([
    requirePlatformAdmin(),
    getManagerUsers(filter),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage buyer and seller accounts. Change roles or ban users who violate policy.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/manager/users" : `/manager/users?filter=${f.key}`}
            className={
              filter === f.key
                ? "rounded-full bg-givit-ink px-4 py-1.5 text-sm font-medium text-white"
                : "rounded-full border px-4 py-1.5 text-sm hover:bg-muted"
            }
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-[280px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(rows as Profile[]).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground text-center text-sm">
                  No users in this view.
                </TableCell>
              </TableRow>
            ) : (
              (rows as Profile[]).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{p.full_name || "—"}</p>
                      <p className="text-muted-foreground text-xs">{p.email}</p>
                      {p.is_banned && p.ban_reason ? (
                        <p className="text-destructive mt-1 text-xs">Reason: {p.ban_reason}</p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="rounded-lg">
                      {roleLabel[p.role] ?? p.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{p.company_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {new Date(p.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <ManagerUserActions user={p} currentUserId={user.id} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
