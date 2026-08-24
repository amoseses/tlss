import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Bookmark, Grid3X3, Heart, ImagePlus, Plus, Share2, Sparkles, X, Camera, ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { GIFT_COLLECTIONS, MARKETPLACE_PRODUCTS, MARKETPLACE_RATINGS } from "@/lib/data/marketplace";
import { ProductCard } from "@/components/product/product-card";
import { resolveProductImageSrc } from "@/lib/product-photo";
import { useAuth } from "@/lib/auth/use-auth";
import { uploadFileToS3 } from "@/lib/upload";
import {
  mergeBoardLikes,
  readUserBoards,
  writeUserBoards,
  type BoardImage,
  type UserBoard,
} from "@/lib/boards/storage";
import { getPublicBoards, getUserBoardsFromDb, saveBoardsToDb, addBoardItem, saveBoard, getBoardComments, addBoardComment, toggleBoardLike, getBoardLikeCounts, getUserLikedBoardIds } from "@/lib/supabase/db";

const LIKED_BOARDS_KEY = "givit-liked-board-ids";

function dbBoardToUserBoard(board: any): UserBoard {
  const items = Array.isArray(board.gift_board_items) ? board.gift_board_items : [];
  const images = items.map((item: any) => ({
    id: item.id ?? crypto.randomUUID(),
    src: item.image_url || item.product_image || item.metadata?.image_url || "",
    caption: item.caption || item.product_name || item.title || "Gift idea",
    description: item.description || item.metadata?.description || "",
    productUrl: item.product_url || item.metadata?.product_url || "",
    kind: item.item_type === "image" ? "image" : "product",
  })).filter((img: BoardImage) => img.src);
  return {
    id: board.id,
    title: board.title ?? "Gift board",
    description: board.description ?? "",
    coverImage: board.cover_image || images[0]?.src || undefined,
    images,
    likes: board.likes ?? 0,
    liked: false,
    isPublic: board.is_public ?? true,
  };
}

function boardSearchScore(board: UserBoard, query: string) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return 1;
  const title = board.title.toLowerCase();
  const description = board.description.toLowerCase();
  const captions = board.images.map((img) => img.caption.toLowerCase()).join(" ");
  return terms.reduce((score, term) => score + (title.includes(term) ? 5 : 0) + (description.includes(term) ? 3 : 0) + (captions.includes(term) ? 2 : 0), 0);
}

function CreateBoardModal({ onAdd, onClose }: { onAdd: (b: UserBoard) => void; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      coverImage: coverUrl.trim() || undefined,
      images: [],
      likes: 0,
      liked: false,
      isPublic: true,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="font-serif text-xl font-bold text-givit-ink">Create a board</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-5">
          <div className="grid gap-1.5">
            <label className="text-sm font-semibold">Board name *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Cozy home gifts" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20" />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-semibold">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What's this board for?" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20" />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-semibold">Cover image URL</label>
            <input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://... (optional, will auto-generate)" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1 rounded-lg" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1 rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover">Create board</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddImageModal({ onAdd, onClose }: { onAdd: (img: BoardImage) => void; onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [description, setDescription] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const { url } = await uploadFileToS3(file, "board-images");
      setUrl(url);
    } catch (error) {
      console.error("Board image upload failed:", error);
      setUploadError("Couldn't upload that image. Try again or paste an image URL.");
    } finally {
      setUploading(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    onAdd({ id: crypto.randomUUID(), src: url.trim(), caption: caption.trim(), description: description.trim(), kind: "image" });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="font-serif text-xl font-bold text-givit-ink">Add a product</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-5">
          <div className="grid gap-1.5">
            <label className="text-sm font-semibold">Upload from device</label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()} className="flex h-24 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground hover:border-givit-ember/40 hover:text-givit-ember transition">
              <Camera className="h-5 w-5" /> {uploading ? "Uploading..." : "Click to upload"}
            </button>
            {uploadError && <p className="text-xs font-medium text-destructive">{uploadError}</p>}
            {url && <img src={url} alt="preview" className="mt-1 h-24 w-full rounded-lg object-cover" />}
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-semibold">Or paste product image URL</label>
            <input value={url.startsWith("data:") ? "" : url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20" />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-semibold">Caption</label>
            <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Product name or gift idea" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20" />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-semibold">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Add notes, sizing, color, flavor, or why it belongs on this board." className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1 rounded-lg" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!url.trim() || uploading} className="flex-1 rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover">Add product</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BoardCard({ board, onOpen, onDelete }: { board: UserBoard; onOpen: () => void; onDelete?: () => void }) {
  return (
    <div className="group relative overflow-hidden rounded-xl bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10">
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="aspect-[4/3] overflow-hidden bg-givit-sand">
          {board.coverImage ? (
            <img src={board.coverImage} alt={board.title} className="h-full w-full object-cover transition group-hover:scale-105" />
          ) : board.images[0] ? (
            <img src={board.images[0].src} alt={board.title} className="h-full w-full object-cover transition group-hover:scale-105" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Camera className="h-10 w-10 text-muted-foreground/30" />
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-givit-ink line-clamp-1">{board.title}</h3>
          {board.description && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{board.description}</p>}
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span>{board.images.length} product{board.images.length !== 1 ? "s" : ""}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">{board.likes} <Heart className="h-3 w-3" /></span>
          </div>
        </div>
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute right-2 top-2 hidden rounded-full bg-black/50 p-1.5 text-white transition hover:bg-black/70 group-hover:flex"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function PinterestGrid({ images, onRemove }: { images: BoardImage[]; onRemove?: (id: string) => void }) {
  if (images.length === 0) return null;
  return (
    <div className="columns-2 gap-4 sm:columns-3 lg:columns-4 [column-fill:balance]">
      {images.map((img) => (
        <article key={img.id} className="group mb-4 break-inside-avoid overflow-hidden rounded-xl bg-card shadow-sm shadow-black/[0.04]">
          <div className="relative overflow-hidden bg-muted">
            <img src={img.src} alt={img.caption || "Gift board product"} className="w-full object-cover transition group-hover:scale-105" loading="lazy" />
            {onRemove && (
              <button type="button" onClick={() => onRemove(img.id)} className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white transition hover:bg-black/75">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="space-y-1.5 p-3">
            <p className="line-clamp-2 text-sm font-semibold text-givit-ink">{img.caption || "Gift board product"}</p>
            {img.description && <p className="line-clamp-3 text-xs leading-5 text-muted-foreground">{img.description}</p>}
            {img.productUrl && <a href={img.productUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-givit-ember hover:underline">View product <ExternalLink className="h-3 w-3" /></a>}
          </div>
        </article>
      ))}
    </div>
  );
}

function BoardComments({ comments, onSubmit, canComment }: { comments: any[]; onSubmit: (message: string) => void; canComment: boolean }) {
  const [text, setText] = useState("");
  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-bold text-givit-ink">Comments {comments.length > 0 && `(${comments.length})`}</h3>
      {comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet, be the first to say something.</p>
      ) : (
        <div className="mb-4 space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="rounded-lg bg-muted/50 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-givit-ink">{c.author_name}</span>
                <span className="text-[11px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
              </div>
              <p className="mt-1 text-muted-foreground">{c.message}</p>
            </div>
          ))}
        </div>
      )}
      {canComment ? (
        <form
          onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; onSubmit(text.trim()); setText(""); }}
          className="flex gap-2"
        >
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment..." className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20" />
          <Button type="submit" size="sm" disabled={!text.trim()} className="rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover">Post</Button>
        </form>
      ) : (
        <p className="text-xs text-muted-foreground"><Link href="/login" className="font-semibold text-givit-ember hover:underline">Log in</Link> to leave a comment.</p>
      )}
    </div>
  );
}

export default function BoardsPage() {
  const { user, loading: authLoading } = useAuth();
  const ratings = Object.fromEntries(MARKETPLACE_RATINGS);
  const [activeTab, setActiveTabState] = useState<"public" | "mine">("public");
  // "My boards" only means something once there's an account to attach boards
  // to — force back to "public" if the user signs out (or never signed in).
  function setActiveTab(tab: "public" | "mine") {
    setActiveTabState(user ? tab : "public");
  }
  const [userBoards, setUserBoards] = useState<UserBoard[]>([]);
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [showAddImage, setShowAddImage] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [boardSearchQuery, setBoardSearchQuery] = useState("");
  const [openBoardLikes, setOpenBoardLikes] = useState({ count: 0, liked: false });
  const [openBoardComments, setOpenBoardComments] = useState<any[]>([]);

  useEffect(() => {
    if (!user && !authLoading) setActiveTabState("public");
  }, [user, authLoading]);

  useEffect(() => {
    async function loadBoards() {
      const saved = mergeBoardLikes(readUserBoards());
      try {
        const publicBoards = (await getPublicBoards()).map(dbBoardToUserBoard);
        const merged = mergeBoardLikes([...publicBoards, ...saved]);
        const deduped = Array.from(new Map(merged.map((b) => [b.id, b])).values());
        const likedIds = new Set(JSON.parse(window.localStorage.getItem(LIKED_BOARDS_KEY) ?? "[]") as string[]);
        setUserBoards(deduped.map((b) => ({ ...b, liked: likedIds.has(b.id) })));
      } catch {
        const likedIds = new Set(JSON.parse(window.localStorage.getItem(LIKED_BOARDS_KEY) ?? "[]") as string[]);
        setUserBoards(saved.map((b) => ({ ...b, liked: likedIds.has(b.id) })));
      }
    }
    void loadBoards();
  }, []);

  // Load user's gift boards from Supabase when logged in
  useEffect(() => {
    const userId = user?.id;
    if (!userId || authLoading) return;
    async function loadUserBoards() {
      try {
        const userBoardsData = (await getUserBoardsFromDb(userId as string)).map(dbBoardToUserBoard);
        const publicBoards = (await getPublicBoards()).map(dbBoardToUserBoard);
        const localStorageBoards = readUserBoards();
        const merged = mergeBoardLikes([...publicBoards, ...userBoardsData, ...localStorageBoards]);
        const likedIds = new Set(JSON.parse(window.localStorage.getItem(LIKED_BOARDS_KEY) ?? "[]") as string[]);
        setUserBoards(merged.map((b) => ({ ...b, liked: likedIds.has(b.id) })));
      } catch (err) {
        console.error("Failed to load boards:", err);
      }
    }
    loadUserBoards();
  }, [user, authLoading]);

  // Load real (server-side) like count/status and comments whenever a board is opened.
  useEffect(() => {
    if (!selectedBoardId) { setOpenBoardLikes({ count: 0, liked: false }); setOpenBoardComments([]); return; }
    let cancelled = false;
    async function loadEngagement() {
      try {
        const [counts, liked, comments] = await Promise.all([
          getBoardLikeCounts([selectedBoardId as string]),
          user ? getUserLikedBoardIds(user.id, [selectedBoardId as string]) : Promise.resolve(new Set<string>()),
          getBoardComments(selectedBoardId as string),
        ]);
        if (cancelled) return;
        setOpenBoardLikes({ count: counts[selectedBoardId as string] ?? 0, liked: liked.has(selectedBoardId as string) });
        setOpenBoardComments(comments);
      } catch (err) {
        console.error("Failed to load board engagement:", err);
      }
    }
    void loadEngagement();
    return () => { cancelled = true; };
  }, [selectedBoardId, user]);

  async function toggleOpenBoardLike() {
    if (!user || !selectedBoardId) return;
    const { liked, error } = await toggleBoardLike(selectedBoardId, user.id, openBoardLikes.liked);
    if (error) return;
    setOpenBoardLikes((prev) => ({ count: Math.max(0, prev.count + (liked ? 1 : -1)), liked }));
  }

  async function submitOpenBoardComment(message: string) {
    if (!user || !selectedBoardId) return;
    const { data, error } = await addBoardComment(selectedBoardId, user.id, message);
    if (error || !data) return;
    setOpenBoardComments((prev) => [...prev, { ...data, author_name: "You" }]);
  }

  async function persistBoards(boards: UserBoard[]) {
    setUserBoards(boards);
    writeUserBoards(boards.map(({ liked, ...rest }) => ({ ...rest, liked: false })));
    if (user) {
      try {
        await saveBoardsToDb(user.id, boards);
      } catch (err) {
        console.error("Failed to save boards to DB:", err);
      }
    }
  }

  async function createBoard(b: UserBoard) {
    const newBoard = { ...b, isPublic: true };
    if (user) {
      try {
        const { data } = await saveBoard({ 
          user_id: user.id, 
          title: b.title, 
          description: b.description, 
          cover_image: b.coverImage,
          is_public: true,
          likes: b.likes 
        });
        if (data?.id) newBoard.id = data.id;
      } catch (err) {
        console.error("Failed to save board to DB:", err);
      }
    }
    await persistBoards([...userBoards, newBoard]);
    setSelectedBoardId(newBoard.id);
    setActiveTab("mine");
  }

  function deleteBoard(id: string) {
    persistBoards(userBoards.filter((b) => b.id !== id));
    if (selectedBoardId === id) setSelectedBoardId(null);
  }

  async function addImageToBoard(img: BoardImage) {
    if (!selectedBoardId) return;
    
    if (user) {
      try {
        await addBoardItem({
          board_id: selectedBoardId,
          item_type: "product",
          image_url: img.src,
          caption: img.caption,
          metadata: { description: img.description },
        });
      } catch (err) {
        console.error("Failed to save product to DB:", err);
      }
    }
    
    persistBoards(userBoards.map((b) => b.id === selectedBoardId ? { ...b, images: [...b.images, img] } : b));
  }

  async function addProductToBoard(product: typeof MARKETPLACE_PRODUCTS[0]) {
    if (!selectedBoardId) return;
    
    const imgSrc = resolveProductImageSrc(product.id, product.images ?? []);
    const priceCents = (product as any).priceCents ?? (product as any).price_cents ?? 0;

    const productImage: BoardImage = {
      id: crypto.randomUUID(),
      src: imgSrc,
      caption: product.name,
      description: product.description ?? undefined,
      productUrl: product.affiliate_url ?? undefined,
      kind: "product",
    };
    
    if (user) {
      try {
        await addBoardItem({
          board_id: selectedBoardId,
          item_type: "product",
          product_slug: product.slug,
          product_name: product.name,
          product_price_cents: priceCents,
          product_image: imgSrc,
          caption: product.name,
          metadata: { description: product.description, product_url: product.affiliate_url },
        });
      } catch (err) {
        console.error("Failed to save product to DB:", err);
      }
    }
    
    persistBoards(userBoards.map((b) => b.id === selectedBoardId ? { ...b, images: [...b.images, productImage] } : b));
    setShowAddProduct(false);
    setProductSearchQuery("");
  }

  function removeImageFromBoard(boardId: string, imgId: string) {
    persistBoards(userBoards.map((b) => b.id === boardId ? { ...b, images: b.images.filter((i) => i.id !== imgId) } : b));
  }

  async function saveAllBoards() {
    await persistBoards(userBoards);
  }

  const selectedBoard = userBoards.find((b) => b.id === selectedBoardId);
  // Empty boards aren't useful to anyone browsing public boards — a board
  // can still have a coverImage here even with zero items, since
  // CreateBoardModal auto-generates a random placeholder cover when none is
  // given, so only b.images.length actually reflects real content.
  const publicBoards = userBoards
    .filter((b) => b.isPublic && b.images.length > 0)
    .map((b) => ({ board: b, score: boardSearchScore(b, boardSearchQuery) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ board }) => board);

  // Filter products based on search
  const filteredProducts = MARKETPLACE_PRODUCTS.filter(p => {
    if (!productSearchQuery) return true;
    const query = productSearchQuery.toLowerCase();
    return p.name.toLowerCase().includes(query) || 
           p.brand.toLowerCase().includes(query) ||
           (p.category?.name?.toLowerCase().includes(query) || p.category?.slug?.toLowerCase().includes(query));
  });

  return (
    <PageShell wide>
      {showCreateBoard && <CreateBoardModal onAdd={createBoard} onClose={() => setShowCreateBoard(false)} />}
      {showAddImage && selectedBoard && <AddImageModal onAdd={addImageToBoard} onClose={() => setShowAddImage(false)} />}
      
      {/* Add Product Modal */}
      {showAddProduct && selectedBoard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border p-5">
              <h2 className="font-serif text-xl font-bold text-givit-ink">Add product to "{selectedBoard.title}"</h2>
              <button type="button" onClick={() => { setShowAddProduct(false); setProductSearchQuery(""); }} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5">
              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  placeholder="Search products by name, brand, or category..."
                  className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {filteredProducts.slice(0, 12).map((product) => (
                  <button
                    key={product.slug}
                    type="button"
                    onClick={() => addProductToBoard(product)}
                    className="group rounded-lg border border-border bg-card p-2 text-left transition hover:border-givit-ember/40 hover:shadow-sm"
                  >
                    <div className="aspect-square overflow-hidden rounded-md bg-muted">
                      <img src={resolveProductImageSrc(product.id, product.images ?? [])} alt={product.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                    </div>
                    <p className="mt-1.5 line-clamp-1 text-xs font-semibold text-givit-ink">{product.name}</p>
                    <p className="text-[10px] text-muted-foreground">{product.brand}</p>
                    {((product as any).priceCents || product.price_cents) && <p className="mt-0.5 text-xs font-bold text-givit-ember">${(((product as any).priceCents ?? product.price_cents) / 100).toFixed(2)}</p>}
                  </button>
                ))}
              </div>
              {filteredProducts.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No products found. Try a different search.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-givit-ember">Gift boards</p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-givit-ink">Gift boards</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {user ? "Browse public boards or manage your own" : "Browse public gift boards, sign in to start your own"}
          </p>
        </div>
        {user && (
          <Button onClick={() => setShowCreateBoard(true)} className="rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover">
            <Plus className="h-4 w-4" /> Create board
          </Button>
        )}
      </div>

      {!user && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-givit-ember/20 bg-givit-ember/5 px-4 py-3">
          <p className="text-sm text-foreground">Sign in to create your own boards, like, and comment.</p>
          <Button asChild size="sm" className="rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover">
            <Link href="/login">Log in</Link>
          </Button>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1 sm:max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={boardSearchQuery} onChange={(e) => setBoardSearchQuery(e.target.value)} placeholder="Search boards by vibe, name, or description..." className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20" /></div>
        {user && (
          <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
            <button type="button" onClick={() => setActiveTab("public")} className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${activeTab === "public" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              Public boards
            </button>
            <button type="button" onClick={() => setActiveTab("mine")} className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${activeTab === "mine" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              My boards {userBoards.length > 0 && <span className="ml-1 rounded-full bg-givit-ember/10 px-1.5 py-0.5 text-xs text-givit-ember">{userBoards.length}</span>}
            </button>
          </div>
        )}
      </div>

      {selectedBoard && selectedBoardId && activeTab === "public" ? (
        <div className="mb-6 rounded-xl border border-border bg-card p-5">
          <button type="button" onClick={() => setSelectedBoardId(null)} className="mb-4 text-sm font-semibold text-givit-ember hover:underline">← Back to public boards</button>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {selectedBoard.coverImage && <img src={selectedBoard.coverImage} alt="" className="h-14 w-14 rounded-lg object-cover" />}
              <div><h2 className="font-serif text-2xl font-bold text-givit-ink">{selectedBoard.title}</h2>{selectedBoard.description && <p className="text-sm text-muted-foreground">{selectedBoard.description}</p>}</div>
            </div>
            {user ? (
              <button type="button" onClick={toggleOpenBoardLike}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${openBoardLikes.liked ? "border-rose-400/40 bg-rose-500/10 text-rose-400" : "border-border text-muted-foreground hover:bg-muted"}`}
              >
                <Heart className={`h-4 w-4 ${openBoardLikes.liked ? "fill-current" : ""}`} /> {openBoardLikes.count > 0 ? openBoardLikes.count : "Like"}
              </button>
            ) : (
              <Link href="/login" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground transition hover:border-givit-ember/40 hover:text-givit-ember">
                <Heart className="h-4 w-4" /> {openBoardLikes.count > 0 ? openBoardLikes.count : "Log in to like"}
              </Link>
            )}
          </div>
          {selectedBoard.images.length > 0 ? <PinterestGrid images={selectedBoard.images} /> : <p className="text-sm text-muted-foreground">No items yet.</p>}
          <BoardComments comments={openBoardComments} onSubmit={submitOpenBoardComment} canComment={Boolean(user)} />
        </div>
      ) : activeTab === "public" && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {publicBoards.length > 0 ? (
            publicBoards.map((b) => (
              <BoardCard key={b.id} board={b} onOpen={() => setSelectedBoardId(b.id)} />
            ))
          ) : (
            <div className="col-span-full rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No public boards match yet. Try a different search or create one to share with everyone.</div>
          )}
        </div>
      )}

      {activeTab === "mine" && (
        <>
          {userBoards.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-givit-ember/10"><Bookmark className="h-6 w-6 text-givit-ember" /></div>
              <p className="mt-4 font-serif text-xl font-bold text-givit-ink">No boards yet</p>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">Create your first board to collect gift ideas, add products, and share with friends.</p>
              {user ? (
                <Button onClick={() => setShowCreateBoard(true)} className="mt-5 rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover">
                  <Plus className="h-4 w-4" /> Create your first board
                </Button>
              ) : (
                <Button asChild className="mt-5 rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover">
                  <Link href="/login">Log in to create</Link>
                </Button>
              )}
            </div>
          ) : selectedBoard && selectedBoardId ? (
            <>
              <button type="button" onClick={() => setSelectedBoardId(null)} className="mb-4 text-sm font-semibold text-givit-ember hover:underline">← Back to my boards</button>
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {selectedBoard.coverImage && (
                    <img src={selectedBoard.coverImage} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  )}
                  <div>
                    <h2 className="font-serif text-2xl font-bold text-givit-ink">{selectedBoard.title}</h2>
                    {selectedBoard.description && <p className="text-sm text-muted-foreground">{selectedBoard.description}</p>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <div className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground">
                    <Heart className={openBoardLikes.count > 0 ? "h-4 w-4 fill-rose-400 text-rose-400" : "h-4 w-4"} /> {openBoardLikes.count}
                  </div>
                  <Button onClick={() => setShowAddProduct(true)} size="sm" className="rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Add products
                  </Button>
                </div>
              </div>
              <div className="mb-6 flex flex-wrap gap-2">
                <Button onClick={() => setShowAddImage(true)} size="sm" variant="outline" className="rounded-lg gap-1.5">
                  <ImagePlus className="h-3.5 w-3.5" /> Add custom product
                </Button>
                <Button onClick={saveAllBoards} size="sm" variant="outline" className="rounded-lg gap-1.5">
                  <Bookmark className="h-3.5 w-3.5" /> Save all
                </Button>
              </div>

              {selectedBoard.images.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-16 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-givit-ember/10"><Sparkles className="h-6 w-6 text-givit-ember" /></div>
                  <p className="mt-4 font-serif text-xl font-bold text-givit-ink">No items yet</p>
                  <p className="mt-2 max-w-xs text-sm text-muted-foreground">Add marketplace products or custom products to build your gift board.</p>
                  <div className="mt-5 flex gap-3">
                    <Button onClick={() => setShowAddProduct(true)} className="rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover">
                      <Sparkles className="h-4 w-4" /> Browse products
                    </Button>
                    <Button onClick={() => setShowAddImage(true)} variant="outline" className="rounded-lg">
                      <ImagePlus className="h-4 w-4" /> Add custom product
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <PinterestGrid
                    images={selectedBoard.images}
                    onRemove={(imgId) => removeImageFromBoard(selectedBoard.id!, imgId)}
                  />
                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={() => setShowAddProduct(true)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-givit-ember/30 py-3 text-sm font-semibold text-givit-ember transition hover:border-givit-ember/50 hover:bg-givit-ember/5"
                    >
                      <Sparkles className="h-4 w-4" /> Add products
                    </button>
                    <button type="button" onClick={() => setShowAddImage(true)}
                      className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/40 px-4 py-3 text-sm text-muted-foreground transition hover:border-givit-ember/40 hover:text-givit-ember"
                    >
                      <ImagePlus className="h-4 w-4" /> Add custom product
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {userBoards.map((b) => (
                  <BoardCard
                    key={b.id}
                    board={b}
                    onOpen={() => setSelectedBoardId(b.id)}
                    onDelete={user ? () => deleteBoard(b.id) : undefined}
                  />
                ))}
                {user && (
                  <button
                    type="button"
                    onClick={() => setShowCreateBoard(true)}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/40 py-12 text-sm text-muted-foreground transition hover:border-givit-ember/40 hover:text-givit-ember"
                  >
                    <Plus className="h-6 w-6" />
                    New board
                  </button>
                )}
              </div>
            </>
          )}
        </>
      )}
    </PageShell>
  );
}