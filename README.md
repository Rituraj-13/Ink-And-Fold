# Ink & Fold ✍️

A full-stack, production-ready blogging platform — write, publish, and discover thoughtful articles. Built with a serverless-first architecture powered by **Hono on Cloudflare Workers** and a **React + Vite** frontend.

---

## ✨ Features

### For Readers

- Browse and read all published articles
- Like and bookmark posts
- Leave comments on posts

### For Writers

- Rich markdown editor to write and preview articles
- Pick a cover image directly from **Unsplash**
- Submit posts for admin review before publishing
- Manage your own posts (drafts, under review, published)
- Delete your posts

### Authentication & Security

- Email + OTP signup verification (via **Resend**)
- Access tokens (JWT) + Refresh token rotation (stored in `httpOnly` cookies)
- Sign out from current session or all sessions

### Admin Panel

- Review queue for submitted posts (approve / reject with a reason)
- Ban / unban users (instantly enforced at the edge via **Cloudflare KV**)
- Promote users to admin
- View all registered users
- **AI-powered content moderation** using **Groq** to flag potentially harmful content before human review; automated emails notify authors on flag / approval / rejection

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                        Client                            │
│            React 19 + Vite + Tailwind CSS v4             │
└───────────────────────┬──────────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼──────────────────────────────────┐
│              Cloudflare Workers (Edge)                    │
│           Hono framework · TypeScript · workerd           │
│                                                           │
│  ┌─────────────────┐   ┌──────────────────────────────┐  │
│  │   Auth Routes   │   │      Blog / Admin Routes     │  │
│  │  JWT + Cookies  │   │   CRUD · Likes · Bookmarks   │  │
│  └────────┬────────┘   └──────────────┬───────────────┘  │
│           │                           │                   │
│  ┌────────▼───────────────────────────▼───────────────┐  │
│  │               Cloudflare KV                         │  │
│  │   INK_FOLD_BANNED_USERS (edge ban enforcement)      │  │
│  └─────────────────────────────────────────────────────┘  │
└────────────────────┬─────────────────┬────────────────────┘
                     │                 │
          ┌──────────▼──────┐  ┌───────▼──────────┐
          │  Prisma Accel.  │  │  Upstash Redis   │
          │  (conn pooling) │  │  (rate limiting) │
          └──────────┬──────┘  └──────────────────┘
                     │
          ┌──────────▼──────┐
          │   PostgreSQL    │
          │ (Prisma Postgres│
          │  / Neon / etc.) │
          └─────────────────┘
```

---

## 🛠️ Tech Stack

| Layer                       | Technology                                        |
| --------------------------- | ------------------------------------------------- |
| **Frontend**                | React 19, TypeScript, Vite, Tailwind CSS v4       |
| **Backend**                 | Hono, TypeScript, Cloudflare Workers              |
| **Database**                | PostgreSQL via Prisma ORM                         |
| **DB Connection Pooling**   | Prisma Accelerate (edge-compatible)               |
| **Caching / Rate Limiting** | Upstash Redis                                     |
| **Edge KV Store**           | Cloudflare KV                                     |
| **AI Moderation**           | Groq SDK                                          |
| **Email**                   | Resend                                            |
| **Cover Images**            | Unsplash API                                      |
| **Validation**              | Zod                                               |
| **Auth**                    | JWT (Hono/jwt) + `httpOnly` cookie refresh tokens |

---

## 📁 Project Structure

```
ink-and-fold/
├── backend/                   # Hono API — Cloudflare Worker
│   ├── src/
│   │   ├── index.ts           # All routes and middleware
│   │   └── utils/
│   │       ├── auth.ts        # OTP generation & hashing
│   │       ├── validator.ts   # Zod schemas
│   │       ├── moderator.ts   # Groq content moderation
│   │       └── mailTemplate.ts# Resend email templates
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── migrations/        # SQL migration files
│   ├── wrangler.jsonc         # Cloudflare Worker config (safe to commit)
│   ├── prisma.config.ts       # Prisma config for local migrations
│   ├── .dev.vars              # ⚠️ Local secrets — gitignored, never commit
│   └── package.json
│
└── frontend/                  # React + Vite SPA
    ├── src/
    │   ├── App.tsx            # Router and route guards
    │   ├── api.ts             # Axios instance + interceptors
    │   ├── types.ts           # Shared TypeScript interfaces
    │   └── components/        # All page/UI components
    │       ├── Landing.tsx
    │       ├── Signup.tsx / Signin.tsx / VerifyOtp.tsx
    │       ├── Blogs.tsx      # Feed
    │       ├── BlogDetail.tsx # Single post view
    │       ├── Write.tsx      # Markdown editor
    │       ├── Edit.tsx
    │       ├── MyPosts.tsx
    │       ├── Admin.tsx      # Admin dashboard
    │       └── UnsplashPicker.tsx
    └── package.json
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- [pnpm](https://pnpm.io/) (recommended) or npm
- A [Cloudflare Account](https://dash.cloudflare.com/sign-up) (free tier works)
- A PostgreSQL database (e.g. [Prisma Postgres](https://www.prisma.io/postgres), [Neon](https://neon.tech/), [Supabase](https://supabase.com/))
- A [Prisma Data Platform](https://console.prisma.io/) account (for the Accelerate connection URL)

---

### Backend Setup

**1. Install dependencies**

```bash
cd backend
pnpm install
```

**2. Configure local secrets**

Create a `.dev.vars` file in the `backend/` directory:

```env
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=YOUR_PRISMA_ACCELERATE_KEY"
JWT_SECRET="your-strong-jwt-secret"
REFRESH_JWT_SECRET="your-strong-refresh-jwt-secret"
UNSPLASH_ACCESS_KEY="your-unsplash-access-key"
RESEND_API_KEY="your-resend-api-key"
GROQ_API_KEY="your-groq-api-key"
UPSTASH_REDIS_REST_URL="https://your-upstash-url.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"
```

> **Note on DATABASE_URL:** Two URLs are involved:
>
> - **Direct URL** (e.g. `postgres://...`) → used only for running `prisma migrate`. Set this in `backend/.env`.
> - **Accelerate URL** (e.g. `prisma+postgres://accelerate.prisma-data.net/...`) → used by the Worker at runtime. Set this in `backend/.dev.vars`.

**3. Apply database migrations**

Set your direct database URL in `backend/.env`, then run:

```bash
npx prisma migrate deploy
```

**4. Start the development server**

```bash
pnpm dev
```

The backend runs at `http://localhost:8787`.

---

### Frontend Setup

**1. Install dependencies**

```bash
cd frontend
pnpm install
```

**2. Configure the API URL**

Create a `.env.local` file in the `frontend/` directory:

```env
VITE_API_URL=http://localhost:8787
```

**3. Start the dev server**

```bash
pnpm dev
```

The frontend runs at `http://localhost:5173`.

---

## 🌐 Deployment

### Backend → Cloudflare Workers

**1. Authenticate with Cloudflare**

```bash
npx wrangler login
```

**2. Deploy with secrets uploaded in one command**

From the `backend` directory:

```bash
npx wrangler deploy --minify --secrets-file .dev.vars
```

This deploys the Worker and uploads all secrets from `.dev.vars` to Cloudflare in one step. Your live URL will be printed on success (e.g. `https://backend.<your-subdomain>.workers.dev`).

---

### Frontend → Cloudflare Pages / Vercel / Netlify

**1.** Set the `VITE_API_URL` environment variable to your deployed Worker URL in your hosting provider's dashboard.

**2.** Build the production bundle:

```bash
cd frontend
pnpm build
```

**3.** Deploy the `frontend/dist/` folder to your hosting provider.

---

## 📡 API Reference

All endpoints are prefixed with `/api/v1`. Protected routes require an `Authorization: Bearer <token>` header.

### Auth

| Method | Endpoint       | Auth | Description                             |
| ------ | -------------- | ---- | --------------------------------------- |
| `POST` | `/signup`      | ✗    | Register a new user                     |
| `POST` | `/verify-otp`  | ✗    | Verify email with OTP                   |
| `POST` | `/signin`      | ✗    | Sign in, returns access + refresh token |
| `POST` | `/refresh`     | ✗    | Refresh access token via cookie         |
| `POST` | `/signout`     | ✓    | Sign out current session                |
| `POST` | `/signout-all` | ✓    | Revoke all sessions                     |

### Blog

| Method   | Endpoint                   | Auth | Description                                |
| -------- | -------------------------- | ---- | ------------------------------------------ |
| `POST`   | `/blog`                    | ✓    | Create a new post (triggers AI moderation) |
| `GET`    | `/blog/all`                | ✓    | Get all published posts                    |
| `GET`    | `/blog/user`               | ✓    | Get current user's posts                   |
| `GET`    | `/blog/bookmarks`          | ✓    | Get bookmarked posts                       |
| `GET`    | `/blog/:id`                | ✓    | Get a single post by ID                    |
| `PUT`    | `/blog/:id`                | ✓    | Update a post                              |
| `DELETE` | `/blog/:id`                | ✓    | Delete a post                              |
| `POST`   | `/blog/:id/like`           | ✓    | Toggle like on a post                      |
| `POST`   | `/blog/:id/bookmark`       | ✓    | Toggle bookmark on a post                  |
| `POST`   | `/blog/:id/comment`        | ✓    | Add a comment                              |
| `GET`    | `/blog/:id/comments`       | ✓    | Get all comments for a post                |
| `DELETE` | `/blog/comment/:commentId` | ✓    | Delete a comment                           |

### Utilities

| Method | Endpoint           | Auth | Description                      |
| ------ | ------------------ | ---- | -------------------------------- |
| `GET`  | `/unsplash/search` | ✓    | Search Unsplash for cover images |

### Admin _(requires `ADMIN` role)_

| Method | Endpoint                     | Description                   |
| ------ | ---------------------------- | ----------------------------- |
| `GET`  | `/admin/review-queue`        | List posts pending review     |
| `POST` | `/admin/blog/:id/approve`    | Approve a post for publishing |
| `POST` | `/admin/blog/:id/reject`     | Reject a post with a reason   |
| `GET`  | `/admin/userslist`           | Get all registered users      |
| `POST` | `/admin/promote/:userId`     | Promote a user to admin       |
| `POST` | `/admin/users/:userId/ban`   | Ban a user                    |
| `POST` | `/admin/users/:userId/unban` | Unban a user                  |

---

## 🔐 Environment Variables Reference

| Variable                   | Used By          | Description                             |
| -------------------------- | ---------------- | --------------------------------------- |
| `DATABASE_URL`             | Worker (runtime) | Prisma Accelerate connection URL        |
| `JWT_SECRET`               | Worker           | Secret for signing access tokens        |
| `REFRESH_JWT_SECRET`       | Worker           | Secret for signing refresh tokens       |
| `UNSPLASH_ACCESS_KEY`      | Worker           | Unsplash API key for image search       |
| `RESEND_API_KEY`           | Worker           | Resend API key for transactional emails |
| `GROQ_API_KEY`             | Worker           | Groq API key for AI content moderation  |
| `UPSTASH_REDIS_REST_URL`   | Worker           | Upstash Redis REST endpoint             |
| `UPSTASH_REDIS_REST_TOKEN` | Worker           | Upstash Redis auth token                |
| `VITE_API_URL`             | Frontend (build) | Backend base URL for the React app      |

> ⚠️ **Never commit `.dev.vars` or `.env` to version control.** Both are already listed in `.gitignore`. The `wrangler.jsonc` (including KV namespace IDs) is safe to commit — those IDs are resource identifiers, not secrets.

---

## 🤝 Contributing

Contributions, issues and feature requests are welcome!

1. **Fork** the repository
2. Create a new branch: `git checkout -b feat/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to your branch: `git push origin feat/your-feature`
5. Open a **Pull Request**

For new database models, update `prisma/schema.prisma` and create a migration:

```bash
npx prisma migrate dev --name your_migration_name
```

---

## 📄 License

MIT © Rituraj
