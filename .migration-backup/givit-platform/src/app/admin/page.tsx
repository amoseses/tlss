import Link from "next/link";

import { AdminProductSheetImporter } from "@/app/admin/products/admin-product-sheet-importer";
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
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-givit-ember via-rose-500 to-amber-400 p-6 text-white shadow-xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/75">Admin command center</p>
        <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight md:text-5xl">Curate gifts with more control.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">
          Upload product sheets, edit gift tags, publish or pause catalog items, and keep the marketplace focused on better gifts.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild className="rounded-full bg-white text-givit-ember hover:bg-white/90"><Link href="/admin/products">Manage products</Link></Button>
          <Button asChild variant="outline" className="rounded-full border-white/30 bg-white/10 text-white hover:bg-white/20"><Link href="/admin/products/new">Add one product</Link></Button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-givit-ember/25 bg-givit-ember/5">
          <CardHeader>
            <CardTitle className="text-base">Sheet upload</CardTitle>
            <CardDescription>Bulk import rows from Google Sheets or pasted CSV, then refine them.</CardDescription>
            <Button asChild className="mt-4 w-fit bg-givit-ember text-white hover:bg-givit-ember-hover">
              <Link href="/admin/products#import-products">Upload</Link>
            </Button>
          </CardHeader>
        </Card>
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
      <div id="quick-import">
        <AdminProductSheetImporter compact />
      </div>
    </div>
  );
}
