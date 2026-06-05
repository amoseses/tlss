import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = { searchParams: Promise<{ welcome?: string }> };

export default async function AdminHomePage({ searchParams }: Props) {
  const sp = await searchParams;

  return (
    <div className="space-y-8">
      {sp.welcome === "seller" ? (
        <div className="border-primary/30 bg-primary/5 rounded-lg border px-4 py-3 text-sm">
          Welcome to the admin curation console. Start by{" "}
          <Link href="/admin/products/new" className="text-primary font-medium underline">
            adding your first product
          </Link>
          .
        </div>
      ) : null}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin curation console</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage the free marketplace catalog, rankings, retailer links, and product quality signals.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Products</CardTitle>
            <CardDescription>Edit gift products, pricing, tags, rankings, and retailer URLs.</CardDescription>
            <Button asChild variant="outline" className="mt-4 w-fit">
              <Link href="/admin/products">Open</Link>
            </Button>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Retailer links</CardTitle>
            <CardDescription>Keep outbound product links and marketplace metadata clean.</CardDescription>
            <Button asChild variant="outline" className="mt-4 w-fit">
              <Link href="/admin/shipping">Open</Link>
            </Button>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Signals</CardTitle>
            <CardDescription>Review saves, clicks, ratings, and product performance signals.</CardDescription>
            <Button asChild variant="outline" className="mt-4 w-fit">
              <Link href="/admin/orders">Open</Link>
            </Button>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
