import Link from "next/link";
import { notFound } from "next/navigation";

import { getAdminProduct } from "@/lib/data/admin";
import { getCategories } from "@/lib/data/catalog";

import { AdminDeleteProductButton } from "../../admin-delete-product";
import { AdminProductForm } from "../../admin-product-form";
import { AdminProductImages } from "../../admin-product-images";

type Props = { params: Promise<{ id: string }> };

export default async function EditAdminProductPage({ params }: Props) {
  const { id } = await params;
  let product;
  try {
    product = await getAdminProduct(id);
  } catch {
    notFound();
  }
  const categories = await getCategories();

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/products" className="text-muted-foreground text-sm hover:underline">
            ← Products
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Edit product</h1>
          <p className="text-muted-foreground mt-1 font-mono text-xs">{product.id}</p>
        </div>
        <div className="flex gap-2">
          {product.is_published ? (
            <Link
              href={`/products/${product.slug}`}
              className="text-primary text-sm font-medium underline-offset-4 hover:underline"
            >
              View on storefront →
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <h2 className="mb-4 text-sm font-semibold tracking-wide uppercase">Details</h2>
          <AdminProductForm mode="edit" product={product} categories={categories} />
        </div>
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold tracking-wide uppercase">Images</h2>
          <AdminProductImages productId={product.id} images={product.images} />
        </div>
      </div>

      <div className="border-t pt-8">
        <AdminDeleteProductButton productId={product.id} />
      </div>
    </div>
  );
}
