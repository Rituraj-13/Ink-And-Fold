export interface Author {
  id: string;
  name?: string | null;
  email: string;
}

export interface Blog {
  id: string;
  title: string;
  content: string;
  authorId: string;
  author?: Author;
  published: boolean;
  draft: boolean;
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
