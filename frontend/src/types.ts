export interface Author {
  id: string;
  name?: string | null;
  email: string;
}

export interface Blog {
  id: string;
  title: string;
  content: string;
  coverImage?: string | null;
  authorId: string;
  author?: Author;
  status: "DRAFT" | "UNDER_REVIEW" | "PUBLISHED";
  flaggedMetrics?: string[];
  rejectionReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
  likes?: { id: string }[];
  bookmarks?: { id: string }[];
  _count?: {
    likes: number;
    comments: number;
  };
}

export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface Comment {
  id: string;
  content: string;
  userId: string;
  postId: string;
  createdAt: string;
  user: {
    id: string;
    name?: string | null;
    email: string;
  };
}
