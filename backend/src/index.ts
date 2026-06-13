import { Hono } from "hono";
import { PrismaClient } from "./generated/prisma/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import bcrypt from "bcryptjs";
import { sign, verify } from "hono/jwt";
import { logger } from "hono/logger";
import z from "zod";
import { postsSchema, userSchema } from "./utils/validator";
import { cors } from "hono/cors";
import { string } from "zod/mini";

// Define the type of the extended Prisma Client
type ExtendedPrismaClient = ReturnType<typeof getExtendedPrisma>;
function getExtendedPrisma(datasourceUrl: string) {
  return new PrismaClient({
    accelerateUrl: datasourceUrl,
  }).$extends(withAccelerate());
}

const app = new Hono<{
  Bindings: CloudflareBindings;
  Variables: {
    prisma: ExtendedPrismaClient;
    userId: any;
  };
}>();

app.use("*", logger());
app.use(cors());

app.use("*", async (c, next) => {
  const prisma = getExtendedPrisma(c.env.DATABASE_URL);
  c.set("prisma", prisma);
  await next();
});

app.use("/api/v1/blog/*", async (c, next) => {
  const header = c.req.header("Authorization");
  const token = header?.split(" ")[1];

  if (!token) {
    return c.json(
      {
        message: "JWT Token not found !",
      },
      401,
    );
  }
  try {
    const verifyToken = await verify(token, c.env.JWT_SECRET, "HS256");
    c.set("userId", verifyToken.sub);
    await next();
  } catch (error) {
    return c.json(
      {
        message: "Unauthorized: Invalid or expired token",
      },
      401,
    );
  }
});

// NOTE: SignUp Route

app.post("/api/v1/signup", async (c) => {
  const body = await c.req.json();
  const { email, password, name } = body;
  const parsedBody = userSchema.safeParse(body);
  if (!parsedBody.success) {
    return c.json(
      {
        message: "Invalid Payload !",
        errors: parsedBody.error.message,
      },
      400,
    );
  }

  const prisma = c.get("prisma");

  // Check if there is an existing user with the same email
  const existingUser = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });
  if (existingUser) {
    return c.json({ message: "User already exists with this email" }, 409);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const createUser = await prisma.user.create({
      data: {
        email: email,
        password: hashedPassword,
        name: name,
      },
    });

    if (createUser) {
      console.info(`User Created, email - ${createUser.email}`);

      const payload = {
        sub: createUser.id,
        email: createUser.email,
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
      };

      const jwt = await sign(payload, c.env.JWT_SECRET, "HS256");

      return c.json({ message: "User Created !", token: jwt }, 201);
    }
  } catch (error) {
    console.error(`Error while creating user - ${error}`);
    return c.json({ message: "Error while creating the user !" }, 500);
  }
});

// NOTE: SignIn Route

app.post("/api/v1/signin", async (c) => {
  const prisma = c.get("prisma");

  const body = await c.req.json();
  const { email, password } = body;

  const parsedBody = userSchema.safeParse(body);
  if (!parsedBody.success) {
    return c.json(
      {
        message: "Invalid Payload !",
        errors: parsedBody.error.message,
      },
      400,
    );
  }
  const existingUser = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });

  if (!existingUser) {
    console.error(`User not found with email - ${email}`);
    return c.json({ message: "No user found with this email" }, 401);
  }

  try {
    const passwordMatch = await bcrypt.compare(
      password,
      existingUser?.password,
    );

    if (!passwordMatch) {
      return c.json(
        {
          message: "Incorrect Password",
        },
        401,
      );
    }
    const payload = {
      sub: existingUser.id,
      email: existingUser.email,
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    };
    const token = await sign(payload, c.env.JWT_SECRET, "HS256");
    return c.json(
      {
        message: "Signed in Successfully !",
        token,
      },
      200,
    );
  } catch (error) {
    return c.json({
      message: "Invalid or expired authentication token !",
      error,
    });
  }
});

app.post("/api/v1/blog", async (c) => {
  const body = await c.req.json();
  const { title, content, draft, publish } = body;

  const parsedBody = postsSchema.safeParse(body);
  if (!parsedBody.success) {
    return c.json(
      {
        message: "Invalid blog payload !",
        error: parsedBody.error.message,
      },
      400,
    );
  }
  const prisma = c.get("prisma");
  const userID = c.get("userId");

  try {
    const createBlog = await prisma.post.create({
      data: {
        title: title,
        content: content,
        authorId: userID,
        draft: draft,
        published: publish,
      },
    });

    if (createBlog) {
      return c.json(
        {
          message: "Blog Created Successfully !",
        },
        201,
      );
    }
  } catch (error) {
    console.error("ERR: Blog Create: ", error);
    return c.json(
      {
        message: "Internal Server Error !",
      },
      500,
    );
  }
  return c.text("Create Blog");
});

app.put("/api/v1/blog/:id", async (c) => {
  const prisma = c.get("prisma");
  const userId = c.get("userId");
  const blogId = c.req.param("id");

  const body = await c.req.json();
  const { title, content, publish, draft } = body;

  const parsedBody = postsSchema.safeParse(body);
  if (!parsedBody.success) {
    return c.json(
      {
        message: "Invalid Payload !",
        error: parsedBody.error.message,
      },
      400,
    );
  }

  const existingBlog = await prisma.post.findUnique({
    where: { id: blogId },
  });

  if (!existingBlog) {
    return c.json({ message: "Blog not found !" }, 404);
  }

  // Check if the logged-in user owns this post
  if (existingBlog.authorId !== userId) {
    return c.json({ message: "Forbidden: You don't own this post" }, 403);
  }

  try {
    const updatedBlog = await prisma.post.update({
      where: { id: blogId },
      data: {
        title,
        content,
        ...(publish !== undefined && { published: publish }),
        ...(draft !== undefined && { draft }),
      },
    });

    if (updatedBlog) {
      return c.json({ message: "Blog updated successfully !" }, 200);
    }
  } catch (error) {
    console.error("ERR: Updated Blog - ", error);
    return c.json({ message: "Internal Server Error !" }, 500);
  }
});

app.get("/api/v1/blog/all", async (c) => {
  const prisma = c.get("prisma");
  const userId = c.get("userId");

  try {
    const blogList = await prisma.post.findMany({
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        likes: {
          where: { userId },
          select: { id: true },
        },
        bookmarks: {
          where: { userId },
          select: { id: true },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return c.json({ blogs: blogList }, 200);
  } catch (error) {
    console.error("ERR: Fetch all blogs - ", error);
    return c.json({ message: "Internal Server Error !" }, 500);
  }
});

// NOTE: Get blogs of the logged-in user
// Query param: ?type=published | drafts | all (default: all)
app.get("/api/v1/blog/user", async (c) => {
  const userId = c.get("userId");
  const prisma = c.get("prisma");
  const type = c.req.query("type"); // "published" | "drafts" | undefined

  let whereClause: { authorId: string; published?: boolean; draft?: boolean } =
    { authorId: userId };

  if (type === "published") {
    whereClause = { authorId: userId, published: true, draft: false };
  } else if (type === "drafts") {
    whereClause = { authorId: userId, draft: true };
  }

  try {
    const blogsByUser = await prisma.post.findMany({
      where: whereClause,
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
        likes: {
          where: { userId },
          select: { id: true },
        },
        bookmarks: {
          where: { userId },
          select: { id: true },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
    return c.json({ blogs: blogsByUser }, 200);
  } catch (error) {
    console.error("ERR: Fetch blogs by user - ", error);
    return c.json({ message: "Internal Server Error !" }, 500);
  }
});

// NOTE: Get bookmarked posts for the logged-in user
app.get("/api/v1/blog/bookmarks", async (c) => {
  const prisma = c.get("prisma");
  const userId = c.get("userId");

  try {
    const bookmarkedPosts = await prisma.bookmarks.findMany({
      where: { userId },
      include: {
        post: {
          include: {
            author: {
              select: { id: true, name: true, email: true },
            },
            likes: {
              where: { userId },
              select: { id: true },
            },
            bookmarks: {
              where: { userId },
              select: { id: true },
            },
            _count: {
              select: { likes: true, comments: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const blogs = bookmarkedPosts.map((b: any) => b.post);
    return c.json({ blogs }, 200);
  } catch (error) {
    console.error("ERR: Fetch bookmarks - ", error);
    return c.json({ message: "Internal Server Error !" }, 500);
  }
});

// NOTE: Toggle Like for a blog post
app.post("/api/v1/blog/:id/like", async (c) => {
  const prisma = c.get("prisma");
  const userId = c.get("userId");
  const postId = c.req.param("id");

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    return c.json({ message: "Post not found !" }, 404);
  }

  try {
    const existingLike = await prisma.likes.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
    });

    if (existingLike) {
      await prisma.likes.delete({
        where: {
          userId_postId: { userId, postId },
        },
      });
      return c.json({ liked: false, message: "Unliked successfully !" }, 200);
    } else {
      await prisma.likes.create({
        data: { userId, postId },
      });
      return c.json({ liked: true, message: "Liked successfully !" }, 201);
    }
  } catch (error) {
    console.error("ERR: Toggle like - ", error);
    return c.json({ message: "Internal Server Error !" }, 500);
  }
});

// NOTE: Toggle Bookmark for a blog post
app.post("/api/v1/blog/:id/bookmark", async (c) => {
  const prisma = c.get("prisma");
  const userId = c.get("userId");
  const postId = c.req.param("id");

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    return c.json({ message: "Post not found !" }, 404);
  }

  try {
    const existingBookmark = await prisma.bookmarks.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
    });

    if (existingBookmark) {
      await prisma.bookmarks.delete({
        where: {
          userId_postId: { userId, postId },
        },
      });
      return c.json(
        { bookmarked: false, message: "Removed bookmark successfully !" },
        200,
      );
    } else {
      await prisma.bookmarks.create({
        data: { userId, postId },
      });
      return c.json(
        { bookmarked: true, message: "Bookmarked successfully !" },
        201,
      );
    }
  } catch (error) {
    console.error("ERR: Toggle bookmark - ", error);
    return c.json({ message: "Internal Server Error !" }, 500);
  }
});

// NOTE: Add comment to a blog post
app.post("/api/v1/blog/:id/comment", async (c) => {
  const prisma = c.get("prisma");
  const userId = c.get("userId");
  const postId = c.req.param("id");

  const body = await c.req.json();
  const { content } = body;

  const parsedComment = z.string().safeParse(content);
  if (!parsedComment.success) {
    return c.json(
      {
        message: "Invalid Comment !",
      },
      400,
    );
  }
  if (!content || typeof content !== "string" || content.trim() === "") {
    return c.json({ message: "Comment content cannot be empty !" }, 400);
  }

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    return c.json({ message: "Post not found !" }, 404);
  }

  try {
    const comment = await prisma.comments.create({
      data: {
        content: content.trim(),
        userId,
        postId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return c.json({ message: "Comment added successfully !", comment }, 201);
  } catch (error) {
    console.error("ERR: Add comment - ", error);
    return c.json({ message: "Internal Server Error !" }, 500);
  }
});

// NOTE: Get all comments for a blog post
app.get("/api/v1/blog/:id/comments", async (c) => {
  const prisma = c.get("prisma");
  const postId = c.req.param("id");

  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    return c.json({ message: "Post not found !" }, 404);
  }

  try {
    const comments = await prisma.comments.findMany({
      where: { postId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return c.json({ comments }, 200);
  } catch (error) {
    console.error("ERR: Fetch comments - ", error);
    return c.json({ message: "Internal Server Error !" }, 500);
  }
});

// NOTE: Delete a comment (only if user is the comment author or post author)
app.delete("/api/v1/blog/comment/:commentId", async (c) => {
  const prisma = c.get("prisma");
  const userId = c.get("userId");
  const commentId = c.req.param("commentId");

  try {
    const comment = await prisma.comments.findUnique({
      where: { id: commentId },
      include: {
        post: {
          select: { authorId: true },
        },
      },
    });

    if (!comment) {
      return c.json({ message: "Comment not found !" }, 404);
    }

    if (comment.userId !== userId && comment.post.authorId !== userId) {
      return c.json(
        {
          message: "Forbidden: You are not authorized to delete this comment !",
        },
        403,
      );
    }

    await prisma.comments.delete({
      where: { id: commentId },
    });

    return c.json({ message: "Comment deleted successfully !" }, 200);
  } catch (error) {
    console.error("ERR: Delete comment - ", error);
    return c.json({ message: "Internal Server Error !" }, 500);
  }
});

app.get("/api/v1/blog/:id", async (c) => {
  const blogId = c.req.param("id");
  const prisma = c.get("prisma");
  const userId = c.get("userId");

  const getBlog = await prisma.post.findUnique({
    where: { id: blogId },
    include: {
      author: {
        select: { id: true, name: true, email: true },
      },
      likes: {
        where: { userId },
        select: { id: true },
      },
      bookmarks: {
        where: { userId },
        select: { id: true },
      },
      _count: {
        select: { likes: true, comments: true },
      },
    },
  });

  if (!getBlog) {
    return c.json({ message: "Blog not found" }, 404);
  }

  return c.json({ blog: getBlog }, 200);
});

app.delete("/api/v1/blog/:id", async (c) => {
  const blogId = c.req.param("id");
  const prisma = c.get("prisma");
  const userId = c.get("userId");

  const deleteBlog = await prisma.post.delete({
    where: {
      id: blogId,
      authorId: userId,
    },
  });

  if (!deleteBlog) {
    return c.json({ message: "Blog not found" }, 404);
  }

  return c.json(
    {
      message: "Blog deleted successfully !",
    },
    200,
  );
});

export default app;
