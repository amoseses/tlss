import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Bookmark, Grid3X3, Heart, ImagePlus, Plus, Share2, Sparkles, X, Camera, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { GIFT_COLLECTIONS, MARKETPLACE_PRODUCTS, MARKETPLACE_RATINGS } from "@/lib/data/marketplace";
import { ProductCard } from "@/components/product/product-card";
import {
  mergeBoardLikes,
  persistBoardLike,
  readUserBoards,
  writeUserBoards,
  type BoardImage,
  type UserBoard,
} from "@/lib/boards/storage";

const LIKED_BOARDS_KEY = "givit-liked-board-ids";

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
      coverImage: coverUrl.trim() || `https://picsum.photos/seed/board-${Date.now()}/400/300`,
      images: [],
      likes: 0,
      liked: false,
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
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setUrl(ev.target?.result as string); };
    reader.readAsDataURL(file);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    onAdd({ id: crypto.randomUUID(), src: url.trim(), caption: caption.trim() });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="font-serif text-xl font-bold text-givit-ink">Add an image</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-5">
          <div className="grid gap-1.5">
            <label className="text-sm font-semibold">Upload from device</label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()} className="flex h-24 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground hover:border-givit-ember/40 hover:text-givit-ember transition">
              <Camera className="h-5 w-5" /> Click to upload
            </button>
            {url && url.startsWith("data:") && <img src={url} alt="preview" className="mt-1 h-24 w-full rounded-lg object-cover" />}
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-semibold">Or paste image URL</label>
            <input value={url.startsWith("data:") ? "" : url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20" />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-semibold">Caption</label>
            <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="What is this gift idea?" className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-givit-ember/20" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1 rounded-lg" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!url.trim()} className="flex-1 rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover">Add image</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BoardCard({ board, onOpen, onDelete }: { board: UserBoard; onOpen: () => void; onDelete?: () => void }) {
  return (
    <div className="group relative overflow-hidden rounded-xl bg-white shadow-sm border border-border/60 transition-all hover:-translate-y-1 hover:shadow-md">
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
            <span>{board.images.length} image{board.images.length !== 1 ? "s" : ""}</span>
            <span>·</span>
            <span>{board.likes} ♥</span>
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
    <div className="columns-2 gap-2 sm:columns-3 md:columns-4">
      {images.map((img) => (
        <div key={img.id} className="mb-2 break-inside-avoid">
          <div className="group relative overflow-hidden rounded-lg">
            <img src={img.src} alt={img.caption || "Gift idea"} className="w-full object-cover transition group-hover:scale-105" />
            {onRemove && (
              <button type="button" onClick={() => onRemove(img.id)} className="absolute right-1.5 top-1.5 hidden rounded-full bg-black/60 p-1 text-white group-hover:flex">
                <X className="h-3 w-3" />
              </button>
            )}
            {img.caption && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 px-2 py-2 opacity-0 transition group-hover:opacity-100">
                <p className="text-xs font-medium text-white line-clamp-2">{img.caption}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BoardsPage() {
  const ratings = Object.fromEntries(MARKETPLACE_RATINGS);
  const [activeTab, setActiveTab] = useState<"curated" | "mine">("curated");
  const [userBoards, setUserBoards] = useState<UserBoard[]>([]);
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [showAddImage, setShowAddImage] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

  useEffect(() => {
    const saved = mergeBoardLikes(readUserBoards());
    const likedIds = new Set(JSON.parse(window.localStorage.getItem(LIKED_BOARDS_KEY) ?? "[]") as string[]);
    setUserBoards(saved.map((b) => ({ ...b, liked: likedIds.has(b.id) })));
  }, []);

  function persistBoards(boards: UserBoard[]) {
    setUserBoards(boards);
    writeUserBoards(boards.map(({ liked, ...rest }) => rest));
  }

  function createBoard(b: UserBoard) {
    persistBoards([...userBoards, b]);
    setSelectedBoardId(b.id);
    setActiveTab("mine");
  }

  function deleteBoard(id: string) {
    persistBoards(userBoards.filter((b) => b.id !== id));
    if (selectedBoardId === id) setSelectedBoardId(null);
  }

  function toggleLike(id: string) {
    const board = userBoards.find((b) => b.id === id);
    if (!board) return;
    const liked = !board.liked;
    const likes = liked ? board.likes + 1 : Math.max(0, board.likes - 1);
    const likedIds = new Set(JSON.parse(window.localStorage.getItem(LIKED_BOARDS_KEY) ?? "[]") as string[]);
    if (liked) likedIds.add(id); else likedIds.delete(id);
    window.localStorage.setItem(LIKED_BOARDS_KEY, JSON.stringify([...likedIds]));
    persistBoardLike(id, liked, likes);
    persistBoards(userBoards.map((b) => b.id === id ? { ...b, liked, likes } : b));
  }

  function addImageToBoard(img: BoardImage) {
    if (!selectedBoardId) return;
    persistBoards(userBoards.map((b) => b.id === selectedBoardId ? { ...b, images: [...b.images, img] } : b));
  }

  function removeImageFromBoard(boardId: string, imgId: string) {
    persistBoards(userBoards.map((b) => b.id === boardId ? { ...b, images: b.images.filter((i) => i.id !== imgId) } : b));
  }

  const selectedBoard = userBoards.find((b) => b.id === selectedBoardId);

  return (
    <PageShell wide>
      {showCreateBoard && <CreateBoardModal onAdd={createBoard} onClose={() => setShowCreateBoard(false)} />}
      {showAddImage && selectedBoard && <AddImageModal onAdd={addImageToBoard} onClose={() => setShowAddImage(false)} />}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-bold text-givit-ink">Gift boards</h1>
          <p className="mt-1 text-sm text-muted-foreground">Public boards — collect and share gift ideas</p>
        </div>
        <Button onClick={() => setShowCreateBoard(true)} className="rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover">
          <Plus className="h-4 w-4" /> Create board
        </Button>
      </div>

      <div className="mb-5 flex gap-1 rounded-lg bg-muted p-1 w-fit">
        <button type="button" onClick={() => setActiveTab("curated")} className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${activeTab === "curated" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
          Curated
        </button>
        <button type="button" onClick={() => setActiveTab("mine")} className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${activeTab === "mine" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
          My boards {userBoards.length > 0 && <span className="ml-1 rounded-full bg-givit-ember/10 px-1.5 py-0.5 text-xs text-givit-ember">{userBoards.length}</span>}
        </button>
      </div>

      {activeTab === "curated" && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {GIFT_COLLECTIONS.map((col) => (
            <Link key={col.slug} href={`/products?q=${encodeURIComponent(col.query)}`} className="group relative overflow-hidden rounded-xl bg-white shadow-sm border border-border/60 transition-all hover:-translate-y-1 hover:shadow-md">
              <div className="aspect-[4/3] overflow-hidden bg-gradient-to-br from-givit-ember/20 to-amber-100/40">
                <div className="flex h-full items-center justify-center text-4xl">
                  {col.slug.includes("pens") ? "✍️" : col.slug.includes("christmas") ? "🎄" : col.slug.includes("experience") ? "🎭" : col.slug.includes("tech") ? "💻" : "🎁"}
                </div>
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-givit-ink line-clamp-1">{col.title}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{col.description}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {activeTab === "mine" && (
        <>
          {userBoards.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-20 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-givit-ember/10 text-3xl">📌</div>
              <p className="mt-4 font-serif text-xl font-bold text-givit-ink">No boards yet</p>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">Create your first board to collect gift ideas, add images, and share with friends.</p>
              <Button onClick={() => setShowCreateBoard(true)} className="mt-5 rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover">
                <Plus className="h-4 w-4" /> Create your first board
              </Button>
            </div>
          ) : selectedBoard && selectedBoardId ? (
            <>
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    {selectedBoard.coverImage && (
                      <img src={selectedBoard.coverImage} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    )}
                    <div>
                      <h2 className="font-serif text-2xl font-bold text-givit-ink">{selectedBoard.title}</h2>
                      {selectedBoard.description && <p className="text-sm text-muted-foreground">{selectedBoard.description}</p>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={() => toggleLike(selectedBoard.id)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${selectedBoard.liked ? "border-rose-300 bg-rose-50 text-rose-600" : "border-border hover:bg-muted text-muted-foreground"}`}
                  >
                    <Heart className={`h-4 w-4 ${selectedBoard.liked ? "fill-current" : ""}`} />
                    {selectedBoard.likes > 0 ? selectedBoard.likes : "Like"}
                  </button>
                  <Button onClick={() => setShowAddImage(true)} size="sm" className="rounded-lg bg-givit-ember text-white hover:bg-givit-ember-hover gap-1.5">
                    <ImagePlus className="h-3.5 w-3.5" /> Add image
                  </Button>
                  <button
                    type="button"
                    onClick={() => { setSelectedBoardId(null); }}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
                  >
                    Back to all
                  </button>
                </div>
              </div>

              {selectedBoard.images.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-16 text-center cursor-pointer hover:border-givit-ember/40 transition"
                  onClick={() => setShowAddImage(true)}
                >
                  <Camera className="h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-3 font-semibold text-muted-foreground">Add your first image</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">Upload a photo or paste an image URL</p>
                </div>
              ) : (
                <>
                  <PinterestGrid
                    images={selectedBoard.images}
                    onRemove={(imgId) => removeImageFromBoard(selectedBoard.id!, imgId)}
                  />
                  <button type="button" onClick={() => setShowAddImage(true)}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/60 py-4 text-sm text-muted-foreground hover:border-givit-ember/40 hover:text-givit-ember transition"
                  >
                    <Plus className="h-4 w-4" /> Add more images
                  </button>
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
                    onDelete={() => deleteBoard(b.id)}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setShowCreateBoard(true)}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/60 py-12 text-sm text-muted-foreground transition hover:border-givit-ember/40 hover:text-givit-ember"
                >
                  <Plus className="h-6 w-6" />
                  New board
                </button>
              </div>
            </>
          )}
        </>
      )}
    </PageShell>
  );
}