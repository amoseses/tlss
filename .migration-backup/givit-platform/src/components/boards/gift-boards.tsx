"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import Link from "next/link";
import { Heart, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type FeaturedBoard = {
  id: string;
  name: string;
  description: string;
  images: { url: string; label: string; href?: string }[];
};

type UserBoard = {
  id: string;
  name: string;
  description: string;
  images: { url: string; label: string }[];
  createdAt: string;
};

const BOARDS_KEY = "givit-boards";
const LIKES_KEY = "givit-board-likes";

function readBoards(): UserBoard[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(BOARDS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeBoards(boards: UserBoard[]) {
  try {
    window.localStorage.setItem(BOARDS_KEY, JSON.stringify(boards));
  } catch {
    // ignore storage failures
  }
}

function readLikes(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LIKES_KEY) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeLikes(likes: Record<string, boolean>) {
  try {
    window.localStorage.setItem(LIKES_KEY, JSON.stringify(likes));
  } catch {
    // ignore storage failures
  }
}

function baseLikeCount(boardId: string) {
  let hash = 0;
  for (let i = 0; i < boardId.length; i += 1) hash = (hash * 31 + boardId.charCodeAt(i)) >>> 0;
  return 24 + (hash % 180);
}

function LikeButton({ boardId, likes, onToggle }: { boardId: string; likes: Record<string, boolean>; onToggle: (boardId: string) => void }) {
  const liked = Boolean(likes[boardId]);
  const count = baseLikeCount(boardId) + (liked ? 1 : 0);
  return (
    <button
      type="button"
      onClick={() => onToggle(boardId)}
      aria-label={liked ? "Unlike board" : "Like board"}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium shadow-sm transition-colors ${liked ? "bg-givit-ember text-white" : "bg-white/95 text-givit-ink hover:bg-white"}`}
    >
      <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} /> {count}
    </button>
  );
}

function BoardImageGrid({ images }: { images: { url: string; label: string; href?: string }[] }) {
  const shown = images.slice(0, 4);
  if (shown.length === 0) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-t-2xl bg-givit-sand text-sm text-muted-foreground">
        No images yet — add some below
      </div>
    );
  }
  return (
    <div className={`grid gap-0.5 overflow-hidden rounded-t-2xl ${shown.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
      {shown.map((image, index) => {
        const tall = shown.length === 3 && index === 0;
        const img = (
          <img
            src={image.url}
            alt={image.label}
            loading="lazy"
            className={`h-full w-full object-cover ${tall ? "row-span-2" : ""} ${shown.length === 1 ? "aspect-[4/3]" : "aspect-square"}`}
          />
        );
        return image.href ? (
          <Link key={`${image.url}-${index}`} href={image.href} className={tall ? "row-span-2" : ""}>
            {img}
          </Link>
        ) : (
          <div key={`${image.url}-${index}`} className={tall ? "row-span-2" : ""}>
            {img}
          </div>
        );
      })}
    </div>
  );
}

export function GiftBoards({ featuredBoards }: { featuredBoards: FeaturedBoard[] }) {
  const [boards, setBoards] = useState<UserBoard[]>(() => readBoards());
  const [likes, setLikes] = useState<Record<string, boolean>>(() => readLikes());
  const [showCreate, setShowCreate] = useState(false);
  const [addingTo, setAddingTo] = useState<string | null>(null);

  function toggleLike(boardId: string) {
    setLikes((current) => {
      const next = { ...current, [boardId]: !current[boardId] };
      writeLikes(next);
      return next;
    });
  }

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    if (!name) {
      toast.error("Give your board a name.");
      return;
    }
    const imageUrl = String(data.get("image_url") || "").trim();
    const board: UserBoard = {
      id: `board-${Date.now()}`,
      name,
      description: String(data.get("description") || "").trim(),
      images: imageUrl ? [{ url: imageUrl, label: name }] : [],
      createdAt: new Date().toISOString(),
    };
    setBoards((current) => {
      const next = [board, ...current];
      writeBoards(next);
      return next;
    });
    setShowCreate(false);
    toast.success(`Board "${name}" created.`);
  }

  function handleAddImage(boardId: string, event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const url = String(data.get("image_url") || "").trim();
    const label = String(data.get("image_label") || "Gift idea").trim() || "Gift idea";
    if (!url) {
      toast.error("Paste an image URL to pin it.");
      return;
    }
    setBoards((current) => {
      const next = current.map((board) => (board.id === boardId ? { ...board, images: [...board.images, { url, label }] } : board));
      writeBoards(next);
      return next;
    });
    setAddingTo(null);
    toast.success("Image pinned to your board.");
  }

  function handleDelete(boardId: string) {
    setBoards((current) => {
      const next = current.filter((board) => board.id !== boardId);
      writeBoards(next);
      return next;
    });
    toast.success("Board deleted.");
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-bold text-givit-ink">Gift boards</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Pin gift ideas, products, and inspiration images for the people you gift. Like boards you love.
          </p>
        </div>
        <Button type="button" className="rounded-full bg-givit-ember text-white hover:bg-givit-ember-hover" onClick={() => setShowCreate((value) => !value)}>
          {showCreate ? <><X className="mr-1 h-4 w-4" /> Cancel</> : <><Plus className="mr-1 h-4 w-4" /> Create a board</>}
        </Button>
      </div>

      {showCreate ? (
        <form onSubmit={handleCreate} className="grid max-w-xl gap-3 rounded-2xl border border-border/70 bg-white p-5 shadow-sm">
          <div className="grid gap-1.5">
            <Label htmlFor="board-name">Board name</Label>
            <Input id="board-name" name="name" placeholder="Mom's birthday ideas" required />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="board-description">Description</Label>
            <Textarea id="board-description" name="description" rows={2} placeholder="Cozy, plants, and kitchen upgrades under $80" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="board-image">Cover image URL (optional)</Label>
            <Input id="board-image" name="image_url" type="url" placeholder="https://..." />
          </div>
          <Button className="w-fit bg-givit-ember text-white hover:bg-givit-ember-hover">Create board</Button>
        </form>
      ) : null}

      <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 [&>*]:mb-5 [&>*]:break-inside-avoid">
        {boards.map((board) => (
          <article key={board.id} className="overflow-hidden rounded-2xl border border-border/70 bg-white shadow-sm">
            <div className="relative">
              <BoardImageGrid images={board.images} />
              <div className="absolute right-3 top-3">
                <LikeButton boardId={board.id} likes={likes} onToggle={toggleLike} />
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-serif text-lg font-bold text-givit-ink">{board.name}</h2>
                  {board.description ? <p className="mt-1 text-sm text-muted-foreground">{board.description}</p> : null}
                  <p className="mt-1 text-xs text-muted-foreground">{board.images.length} {board.images.length === 1 ? "pin" : "pins"} · Your board</p>
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label="Delete board" onClick={() => handleDelete(board.id)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
              {addingTo === board.id ? (
                <form onSubmit={(event) => handleAddImage(board.id, event)} className="mt-3 grid gap-2">
                  <Input name="image_url" type="url" placeholder="Image URL https://..." required />
                  <Input name="image_label" placeholder="Label (optional)" />
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-givit-ember text-white hover:bg-givit-ember-hover">Pin image</Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setAddingTo(null)}>Cancel</Button>
                  </div>
                </form>
              ) : (
                <Button type="button" variant="outline" size="sm" className="mt-3 rounded-full" onClick={() => setAddingTo(board.id)}>
                  <ImagePlus className="mr-1 h-4 w-4" /> Add image
                </Button>
              )}
            </div>
          </article>
        ))}

        {featuredBoards.map((board) => (
          <article key={board.id} className="overflow-hidden rounded-2xl border border-border/70 bg-white shadow-sm">
            <div className="relative">
              <BoardImageGrid images={board.images} />
              <div className="absolute right-3 top-3">
                <LikeButton boardId={board.id} likes={likes} onToggle={toggleLike} />
              </div>
            </div>
            <div className="p-4">
              <h2 className="font-serif text-lg font-bold text-givit-ink">{board.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{board.description}</p>
              <p className="mt-1 text-xs text-muted-foreground">{board.images.length} pins · Curated by Givit</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
