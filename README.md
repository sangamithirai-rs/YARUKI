# YARUKI

**Your academic space, organized.**

YARUKI is a student productivity web application designed to help students organize their academic life in one place.

🌐 **Live website:** [yaruki.vercel.app](https://yaruki.vercel.app)

## Features

- **Dashboard** — View an overview of your academic activity.
- **Subjects** — Organize your subjects and course details.
- **Marks** — Track assessment marks.
- **Exams** — Keep track of upcoming exams.
- **Assignments** — Manage assignment tasks and deadlines.
- **Study Planner** — Organize study sessions and plans.
- **Materials** — Manage study materials.
- **AI Assistant** — Explore study support through a demo chat. Real AI responses are not connected yet.
- **Analytics** — View marks per subject and weekly study time.
- **Settings** — View your account details.
- **Authentication** — Sign up and log in with Supabase Auth.

## Tech Stack

- React
- TypeScript
- Vite
- Supabase
  - PostgreSQL
  - Authentication
  - Storage
- CSS
- Vercel

## Getting Started

### Prerequisites

- Node.js 20 or newer and npm
- A [Supabase](https://supabase.com) project

### 1. Clone the repository

```bash
git clone https://github.com/sangamithirai-rs/YARUKI.git
cd YARUKI
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a new Supabase project.
2. Open the **SQL Editor** and run `supabase/schema.sql` to create the tables, Row Level Security policies and the private `study-materials` storage bucket.
3. Open **Project Settings → API** and copy your project URL and the public `anon` key.

### 4. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and set:

```text
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Never commit `.env` and never use the `service_role` key in the frontend.

### 5. Run the app

```bash
npm run dev
```

Open the URL shown in the terminal (usually http://localhost:5173).

### Other scripts

| Command | What it does |
|---|---|
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

## Deployment

The app is deployed on Vercel. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in your Vercel project settings.

For email confirmation to work, add your site URL under **Authentication → URL Configuration** in Supabase. The sign-up redirect is currently set in `src/services/authService.ts`.
