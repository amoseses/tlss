export type BoardImage = { id: string; src: string; caption: string; description?: string; productUrl?: string; kind?: "product" | "image" };
export type UserBoard = { id: string; title: string; description: string; images: BoardImage[]; likes: number; liked: boolean; isPublic?: boolean; coverImage?: string };

const BOARDS_KEY = "givit-user-boards";
const LIKES_KEY = "givit-board-likes";

export function readUserBoards(): UserBoard[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(BOARDS_KEY) ?? "[]") as UserBoard[];
  } catch {
    return [];
  }
}

export function writeUserBoards(boards: UserBoard[]) {
  window.localStorage.setItem(BOARDS_KEY, JSON.stringify(boards));
}

export function readBoardLikes(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(LIKES_KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

export function writeBoardLikes(likes: Record<string, number>) {
  window.localStorage.setItem(LIKES_KEY, JSON.stringify(likes));
}

export function mergeBoardLikes(boards: UserBoard[]): UserBoard[] {
  const likes = readBoardLikes();
  return boards.map((b) => ({
    ...b,
    likes: likes[b.id] ?? b.likes,
  }));
}

export function persistBoardLike(boardId: string, liked: boolean, currentLikes: number) {
  const likes = readBoardLikes();
  likes[boardId] = liked ? Math.max(1, currentLikes) : Math.max(0, currentLikes);
  writeBoardLikes(likes);
}
