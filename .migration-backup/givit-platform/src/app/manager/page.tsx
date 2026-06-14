import Link from "next/link";

import { getManagerStats } from "@/lib/data/manager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function ManagerHomePage() {
  const stats = await getManagerStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Manager console</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Oversee buyers, sellers, feedback, and platform health.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Buyers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{stats.buyers}</p>
            <Button asChild variant="link" className="mt-2 h-auto p-0">
              <Link href="/manager/users?filter=buyers">Manage buyers</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sellers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{stats.sellers}</p>
            <Button asChild variant="link" className="mt-2 h-auto p-0">
              <Link href="/manager/users?filter=sellers">Manage sellers</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Banned accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{stats.banned}</p>
            <Button asChild variant="link" className="mt-2 h-auto p-0">
              <Link href="/manager/users?filter=banned">Review bans</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{stats.feedback}</p>
            <Button asChild variant="link" className="mt-2 h-auto p-0">
              <Link href="/manager/feedback">View messages</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{stats.orders}</p>
            <Button asChild variant="link" className="mt-2 h-auto p-0">
              <Link href="/manager/orders">View orders</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Platform admins</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{stats.admins}</p>
            <p className="text-muted-foreground mt-2 text-xs">Including your account</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
