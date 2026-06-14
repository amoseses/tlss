import { GiftBoards, type FeaturedBoard } from "@/components/boards/gift-boards";
import { PageShell } from "@/components/layout/page-shell";
import { GIFT_COLLECTIONS, getMarketplaceProductBySlug } from "@/lib/data/marketplace";
import { resolveProductImageSrc } from "@/lib/product-photo";

export const metadata = {
  title: "Gift Boards | Givit",
  description: "Create, save, and like gift boards. Pin products and inspiration images for every person you gift.",
};

export default function BoardsPage() {
  const featuredBoards: FeaturedBoard[] = GIFT_COLLECTIONS.map((collection) => ({
    id: `featured-${collection.slug}`,
    name: collection.title,
    description: collection.description,
    images: collection.productSlugs
      .map((slug) => {
        const product = getMarketplaceProductBySlug(slug);
        if (!product) return null;
        return {
          url: resolveProductImageSrc(product.id, product.images),
          label: product.name,
          href: `/products/${product.slug}`,
        };
      })
      .filter((image): image is NonNullable<typeof image> => image !== null),
  }));

  return (
    <PageShell wide>
      <GiftBoards featuredBoards={featuredBoards} />
    </PageShell>
  );
}
