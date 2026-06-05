import Link from "next/link";

import { getCategories } from "@/lib/data/catalog";

import { AdminProductForm } from "../admin-product-form";

export default async function NewAdminProductPage() {
  const categories = await getCategories();

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/products" className="text-muted-foreground text-sm hover:underline">
          ← Products
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New product</h1>
        <p className="text-muted-foreground text-sm">
          Save the listing first, then upload images on the next screen.
        </p>
      </div>
      <AdminProductForm mode="create" categories={categories} />
    </div>
  );
}
