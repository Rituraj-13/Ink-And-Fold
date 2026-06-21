import { Hono } from "hono";
import { PrismaClient, UserType } from "./generated/prisma/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import bcrypt from "bcryptjs";
import { sign, verify } from "hono/jwt";
import { logger } from "hono/logger";
import z from "zod";
import { postsSchema, userSchema } from "./utils/validator";
import { cors } from "hono/cors";
import { string } from "zod/mini";
import { Redis } from "@upstash/redis";
import { generateOtp, hashString, sendOtpEmail } from "./utils/auth";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { moderationCheck } from "./utils/moderator";
import {
  sendFlaggedContentMail,
  sendFlaggedContentApprovalMail,
  sendFlaggedContentRejectMail,
  sendUserBanMail,
} from "./utils/mailTemplate";

type ExtendedPrismaClient = ReturnType<typeof getExtendedPrisma>;
function getExtendedPrisma(datasourceUrl: string) {
  return new PrismaClient({
    accelerateUrl: datasourceUrl,
  }).$extends(withAccelerate());
}

const app = new Hono<{
  Bindings: CloudflareBindings;
  Variables: {
    prisma: PrismaClient;
    userId: any;
    userType: "USER" | "ADMIN";
  };
}>();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: (origin) => origin || "*",
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use("*", async (c, next) => {
  const prisma = getExtendedPrisma(c.env.DATABASE_URL);
  c.set("prisma", prisma as any);
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

    const userId = verifyToken.sub;
    const isBanned = await c.env.INK_FOLD_BANNED_USERS.get(userId as string);
    if (isBanned) {
      return c.json(
        {
          message: "Unauthorized: Your accout has been Suspended !",
        },
        403,
      );
    }

    c.set("userId", userId);
    c.set("userType", verifyToken.userType as "USER" | "ADMIN");
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

app.use("/api/v1/admin/*", async (c, next) => {
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
    c.set("userType", verifyToken.userType as "USER" | "ADMIN");

    if (verifyToken.userType !== "ADMIN") {
      return c.json(
        {
          message: "Forbidden: Admin access required",
        },
        403,
      );
    }

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

  // Checking if there is an existing user with the same email
  const existingUser = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });
  if (existingUser?.isVerified) {
    return c.json({ message: "User already exists and verified !" }, 409);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    // using || for unverfified existing users
    const user =
      existingUser ||
      (await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          isVerified: false,
        },
      }));

    const otp = generateOtp();
    const otpHash = await hashString(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    //
    // await prisma.otp.upsert({
    //   where: { email },
    //   update: { otpHash, expiresAt },
    //   create: { email, otpHash, expiresAt },
    // });
    //
    const redis = new Redis({
      url: c.env.UPSTASH_REDIS_REST_URL,
      token: c.env.UPSTASH_REDIS_REST_TOKEN,
    });
    await redis.set(`otp:${email}`, otpHash, { ex: 10 * 60 });

    await sendOtpEmail(email, otp, c.env.RESEND_API_KEY);

    return c.json(
      {
        message:
          "Registration successful! Please check your email for the verification code",
        email,
      },
      201,
    );
  } catch (error) {
    console.error(`Error while creating user - ${error}`);
    return c.json({ message: "Error while creating the user !" }, 500);
  }
});

// NOTE: OTP Verify Route

app.post("/api/v1/verify-otp", async (c) => {
  const { email, otp } = await c.req.json();
  const prisma = c.get("prisma");

  if (!email || !otp) {
    return c.json(
      {
        message: "Email and OTP are required",
      },
      400,
    );
  }

  try {
    // const otpRecord = await prisma.otp.findUnique({
    //   where: { email },
    // });
    //
    const redis = new Redis({
      url: c.env.UPSTASH_REDIS_REST_URL,
      token: c.env.UPSTASH_REDIS_REST_TOKEN,
    });
    const otpRecord = await redis.get(`otp:${email}`);

    if (!otpRecord) {
      return c.json(
        {
          message: "No active verification code found",
        },
        400,
      );
    }

    const inputHash = await hashString(otp);
    if (inputHash !== otpRecord) {
      return c.json(
        {
          message: "Invalid verification code",
        },
        400,
      );
    }

    const user = await prisma.user.update({
      where: { email },
      data: { isVerified: true },
    });

    // await prisma.otp.delete({ where: { email } });
    await redis.del(`otp:${email}`);

    // Implementation for the Single Device Login - remove existing sessions
    await prisma.session.deleteMany({
      where: { userId: user.id },
    });

    // Issue AccessTokens
    const accessToken = await sign(
      {
        sub: user.id,
        email: user.email,
        userType: user.userType,
        exp: Math.floor(Date.now() / 1000) + 15 * 60,
      },
      c.env.JWT_SECRET,
      "HS256",
    );

    const refreshRaw = crypto.randomUUID();
    const refreshHash = await hashString(refreshRaw);
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 Days

    // Creating a session with the refreshToken
    await prisma.session.create({
      data: {
        refreshToken: refreshHash,
        userId: user.id,
        expiresAt: refreshExpiry,
      },
    });

    setCookie(c, "refresh_token", refreshRaw, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return c.json(
      {
        message: "Email verified successfully!, You are logged in.",
        token: accessToken,
      },
      200,
    );
  } catch (error) {
    console.error("Verification error: ", error);
    return c.json(
      {
        message: "Internal server error",
      },
      500,
    );
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
    return c.json({ message: "Incorrect email or password" }, 401);
  }

  const isBanned = await c.env.INK_FOLD_BANNED_USERS.get(existingUser.id);
  if (isBanned) {
    return c.json(
      {
        message: "User is Suspended, Contact Admin !",
      },
      403,
    );
  }

  if (!existingUser.isVerified) {
    return c.json(
      {
        message: "Email not verified !, Re-SignUp to receive a code.",
        unverified: true,
      },
      403,
    );
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

    // Single-Device Login: delete all previous sessions
    await prisma.session.deleteMany({ where: { userId: existingUser.id } });
    const payload = {
      sub: existingUser.id,
      email: existingUser.email,
      userType: existingUser.userType,
      exp: Math.floor(Date.now() / 1000) + 15 * 60,
    };

    const accessToken = await sign(payload, c.env.JWT_SECRET, "HS256");

    const refreshRaw = crypto.randomUUID();
    const refreshHash = await hashString(refreshRaw);
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        refreshToken: refreshHash,
        userId: existingUser.id,
        expiresAt: refreshExpiry,
      },
    });

    setCookie(c, "refresh_token", refreshRaw, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return c.json(
      {
        message: "Signed in Successfully !",
        token: accessToken,
      },
      200,
    );
  } catch (error) {
    console.error("User SignIn Error: ", error);
    return c.json(
      {
        message: "Internal Server Error!",
      },
      500,
    );
  }
});

// NOTE: Refresh Token Route

app.post("/api/v1/refresh", async (c) => {
  const prisma = c.get("prisma");
  const refreshRaw = getCookie(c, "refresh_token");

  if (!refreshRaw) {
    return c.json(
      {
        message: "Refresh token missing !",
      },
      401,
    );
  }

  try {
    const refreshHash = await hashString(refreshRaw);

    const session = await prisma.session.findUnique({
      where: { refreshToken: refreshHash },
      include: { user: true },
    });

    if (!session || new Date() > session.expiresAt) {
      if (session) {
        await prisma.session.delete({
          where: { id: session.id },
        });
      }
      return c.json(
        {
          message: "Session expired or invalid. Please sign in again.",
        },
        401,
      );
    }

    // Token Rotation
    await prisma.session.delete({
      where: { id: session.id },
    });

    const newAccessToken = await sign(
      {
        sub: session.user.id,
        email: session.user.email,
        userType: session.user.userType,
        exp: Math.floor(Date.now() / 1000) + 15 * 60,
      },
      c.env.JWT_SECRET,
      "HS256",
    );

    const newRefreshRaw = crypto.randomUUID();
    const newRefreshHash = await hashString(newRefreshRaw);
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: {
        refreshToken: newRefreshHash,
        userId: session.user.id,
        expiresAt: refreshExpiry,
      },
    });

    setCookie(c, "refresh_token", newRefreshRaw, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return c.json(
      {
        token: newAccessToken,
      },
      200,
    );
  } catch (error) {
    console.error("Refresh token error: ", error);
    return c.json(
      {
        message: "Internal Server Error !",
      },
      500,
    );
  }
});

// NOTE: Signout Route
app.post("/api/v1/signout", async (c) => {
  const prisma = c.get("prisma");
  const refreshRaw = getCookie(c, "refresh_token");

  if (refreshRaw) {
    try {
      const refreshHash = await hashString(refreshRaw);
      await prisma.session.delete({
        where: { refreshToken: refreshHash },
      });
    } catch (error) {
      console.error("Signout Route: ", error);
    }
  }

  deleteCookie(c, "refresh_token", { path: "/" });

  return c.json(
    {
      message: "Signed out of this device.",
    },
    200,
  );
});

app.post("/api/v1/signout-all", async (c) => {
  const prisma = c.get("prisma");
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

  let userId: string;
  try {
    const verifyToken = await verify(token, c.env.JWT_SECRET, "HS256");
    userId = verifyToken.sub as string;
  } catch (error) {
    return c.json(
      {
        message: "Unauthorized: Invalid or expired token",
      },
      401,
    );
  }

  try {
    await prisma.session.deleteMany({
      where: { userId: userId },
    });

    deleteCookie(c, "refresh_token", { path: "/" });
    return c.json(
      {
        message: "Successfully logged out of all devices",
      },
      200,
    );
  } catch (error) {
    console.error("Global signout error: ", error);
    return c.json(
      {
        message: "Internal Server Error !",
      },
      500,
    );
  }
});

app.post("/api/v1/blog", async (c) => {
  const body = await c.req.json();
  var { title, content, status, coverImage } = body;

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
  let finalStatus = status || "DRAFT";
  let flaggedMetrics: string[] = [];

  try {
    const moderationResponse = await moderationCheck(
      content,
      c.env.GROQ_API_KEY,
    );
    if (moderationResponse.results[0].flagged) {
      finalStatus = "UNDER_REVIEW";

      const flaggedMetricCategories = moderationResponse.results[0].categories;
      flaggedMetrics = Object.entries(flaggedMetricCategories)
        .filter(([_, value]) => value)
        .map(([key]) => key);
    }
  } catch (modError) {
    console.error("Groq Moderation API Error :", modError);
  }

  try {
    const createBlog = await prisma.post.create({
      data: {
        title: title,
        content: content,
        authorId: userID,
        status: finalStatus,
        flaggedMetrics,
        ...(coverImage ? { coverImage } : {}),
      },
    });

    if (createBlog) {
      if (createBlog.status === "UNDER_REVIEW") {
        try {
          const author = await prisma.user.findUnique({
            where: { id: userID },
          });
          if (author?.email) {
            await sendFlaggedContentMail(
              author.email,
              createBlog.title,
              createBlog.flaggedMetrics,
              c.env.RESEND_API_KEY,
            );
          }
        } catch (emailErr) {
          console.error("Failed to send flagged content email:", emailErr);
        }
      }
      return c.json(
        {
          message: "Blog Created Successfully !",
          blog: createBlog,
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
  const { title, content, status, coverImage } = body;

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

  let finalStatus =
    status ||
    (existingBlog.status === "UNDER_REVIEW" ? "DRAFT" : existingBlog.status);
  let flaggedMetrics: string[] = [];

  try {
    const moderationResponse = await moderationCheck(
      content,
      c.env.GROQ_API_KEY,
    );
    if (moderationResponse.results[0].flagged) {
      finalStatus = "UNDER_REVIEW";

      const flaggedMetricCategories = moderationResponse.results[0].categories;
      flaggedMetrics = Object.entries(flaggedMetricCategories)
        .filter(([_, value]) => value)
        .map(([key]) => key);
    }
  } catch (modError) {
    console.error(
      "Groq Moderation API Error (Rate Limit/Quota Exceeded):",
      modError,
    );
    // Graceful Fail-Open: Allow saving/publishing, but log the error
  }

  try {
    const updatedBlog = await prisma.post.update({
      where: { id: blogId },
      data: {
        title,
        content,
        status: finalStatus,
        flaggedMetrics,
        ...(coverImage !== undefined && { coverImage: coverImage || null }),
      },
    });

    if (updatedBlog) {
      if (updatedBlog.status === "UNDER_REVIEW") {
        try {
          const author = await prisma.user.findUnique({
            where: { id: userId },
          });
          if (author?.email) {
            await sendFlaggedContentMail(
              author.email,
              updatedBlog.title,
              updatedBlog.flaggedMetrics,
              c.env.RESEND_API_KEY,
            );
          }
        } catch (emailErr) {
          console.error(
            "Failed to send flagged content email on update:",
            emailErr,
          );
        }
      }
      return c.json(
        { message: "Blog updated successfully !", blog: updatedBlog },
        200,
      );
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
      where: {
        status: "PUBLISHED",
      },
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

  let whereClause: any = { authorId: userId };

  if (type === "published") {
    whereClause = { authorId: userId, status: "PUBLISHED" };
  } else if (type === "drafts") {
    whereClause = {
      authorId: userId,
      status: { in: ["DRAFT", "UNDER_REVIEW"] },
    };
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

// NOTE: Unsplash image search proxy
app.get("/api/v1/unsplash/search", async (c) => {
  const query = c.req.query("query");
  const page = c.req.query("page") || "1";
  const perPage = c.req.query("per_page") || "20";

  if (!query || !query.trim()) {
    return c.json({ message: "Search query is required" }, 400);
  }

  const accessKey = c.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return c.json({ message: "Unsplash API not configured" }, 503);
  }

  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&orientation=landscape`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        "Accept-Version": "v1",
      },
    });

    if (!res.ok) {
      return c.json({ message: "Unsplash API error" }, res.status as any);
    }

    const data: any = await res.json();
    const photos = data.results.map((photo: any) => ({
      id: photo.id,
      url: photo.urls.regular,
      thumb: photo.urls.thumb,
      small: photo.urls.small,
      alt: photo.alt_description || photo.description || "",
      author: photo.user?.name || "Unknown",
      authorProfile: photo.user?.links?.html || "",
      color: photo.color || "#cccccc",
    }));

    return c.json(
      { photos, total: data.total, totalPages: data.total_pages },
      200,
    );
  } catch (error) {
    console.error("ERR: Unsplash search - ", error);
    return c.json({ message: "Internal Server Error !" }, 500);
  }
});

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
        select: {
          id: true,
          name: true,
          // email: true,
        },
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

// Admin Endpoints
app.get("/api/v1/admin/review-queue", async (c) => {
  const prisma = c.get("prisma");
  try {
    const queue = await prisma.post.findMany({
      where: { status: "UNDER_REVIEW" },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return c.json({ queue }, 200);
  } catch (error) {
    console.error("ERR: Fetch review queue - ", error);
    return c.json({ message: "Internal Server Error !" }, 500);
  }
});

app.post("/api/v1/admin/blog/:id/approve", async (c) => {
  const blogId = c.req.param("id");
  const prisma = c.get("prisma");
  try {
    const post = await prisma.post.update({
      where: { id: blogId },
      data: { status: "PUBLISHED", flaggedMetrics: [] },
      include: {
        author: true,
      },
    });

    if (post && post.author?.email) {
      try {
        await sendFlaggedContentApprovalMail(
          post.author.email,
          post.title,
          c.env.RESEND_API_KEY,
        );
      } catch (emailErr) {
        console.error("Failed to send approval email:", emailErr);
      }
    }

    return c.json({ message: "Post approved!", post }, 200);
  } catch (error) {
    console.error("ERR: Approve post - ", error);
    return c.json({ message: "Internal Server Error !" }, 500);
  }
});

app.post("/api/v1/admin/blog/:id/reject", async (c) => {
  const blogId = c.req.param("id");
  const prisma = c.get("prisma");
  const body = await c.req.json();

  const rejectionReason = body.reason || null;
  try {
    const post = await prisma.post.update({
      where: { id: blogId },
      data: { status: "DRAFT", rejectionReason },
      include: {
        author: true,
      },
    });

    if (post && post.author?.email) {
      try {
        await sendFlaggedContentRejectMail(
          post.author.email,
          post.title,
          rejectionReason,
          c.env.RESEND_API_KEY,
        );
      } catch (emailErr) {
        console.error("Failed to send rejection email:", emailErr);
      }
    }

    return c.json(
      { message: "Post rejected and returned to drafts", post },
      200,
    );
  } catch (error) {
    console.error("ERR: Reject post - ", error);
    return c.json({ message: "Internal Server Error !" }, 500);
  }
});

app.post("/api/v1/admin/promote/:userId", async (c) => {
  const userId = c.req.param("userId");
  const prisma = c.get("prisma");
  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { userType: "ADMIN" },
    });
    return c.json(
      {
        message: `${updatedUser.email} promoted to ADMIN successfully.`,
        user: updatedUser,
      },
      200,
    );
  } catch (error) {
    console.error("ERR: Promote user - ", error);
    return c.json({ message: "Internal Server Error !" }, 500);
  }
});

app.get("/api/v1/admin/userslist", async (c) => {
  const prisma = c.get("prisma");
  try {
    const users = await prisma.user.findMany({
      where: { isVerified: true },
      select: {
        id: true,
        email: true,
        name: true,
        userType: true,
        isBanned: true,
        createdAt: true,
        _count: {
          select: { posts: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return c.json(
      {
        users,
      },
      200,
    );
  } catch (error) {
    console.error("ERR: Fetch verified users list: ", error);
    return c.json({ message: "Internal Server Error !" }, 500);
  }
});

app.post("/api/v1/admin/users/:userId/ban", async (c) => {
  const userId = c.req.param("userId");
  const prisma = c.get("prisma");

  try {
    const banUser = await prisma.user.update({
      where: { id: userId },
      data: { isBanned: true },
    });

    await c.env.INK_FOLD_BANNED_USERS.put(userId, "true");

    await prisma.session.deleteMany({
      where: { userId: userId },
    });

    if (banUser && banUser.email) {
      try {
        await sendUserBanMail(banUser.email, c.env.RESEND_API_KEY);
      } catch (emailErr) {
        console.error("Failed to send user ban email:", emailErr);
      }
    }

    return c.json(
      {
        message: `User ${banUser.email} is suspended successfully !`,
      },
      200,
    );
  } catch (error) {
    console.error("ERR: Ban User - ", error);
    return c.json(
      {
        message: "Internal Server Error !",
      },
      500,
    );
  }
});

app.post("/api/v1/admin/users/:userId/unban", async (c) => {
  const userId = c.req.param("userId");
  const prisma = c.get("prisma");

  try {
    const unbanUser = await prisma.user.update({
      where: { id: userId },
      data: { isBanned: false },
    });

    await c.env.INK_FOLD_BANNED_USERS.delete(userId);
    return c.json(
      {
        message: `Suspension revoked for user - ${unbanUser.email}`,
      },
      200,
    );
  } catch (error) {
    console.error("ERR: Unban User - ", error);
    return c.json(
      {
        message: "Internal Server Error !",
      },
      500,
    );
  }
});

export default app;
