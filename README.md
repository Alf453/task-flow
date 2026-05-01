# TaskFlow — Team Task Manager

A full-stack team task management app with role-based access control, Kanban boards, and real-time dashboards.

![TaskFlow Dashboard](https://via.placeholder.com/1200x600/0a0b0f/7c6af7?text=TaskFlow+Dashboard)

## 🚀 Live Demo

> **[https://your-app.up.railway.app](https://your-app.up.railway.app)**

## ✨ Features

- **Authentication** — JWT-based signup/login with password hashing (bcrypt)
- **Projects** — Create, update, delete projects with custom colors
- **Role-Based Access** — Admins manage members & project settings; Members create/edit their own tasks
- **Task Management** — Full CRUD with status, priority, assignee, and due date
- **Kanban Board** — Visual drag-and-drop-style board view by status
- **List View** — Tabular task view with inline status updates
- **Comments** — Thread discussions on individual tasks
- **Dashboard** — Personal overview: my tasks, overdue alerts, status charts, recent activity
- **Team Management** — Invite by email, change roles, remove members

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router, Axios, date-fns |
| Backend | Node.js, Express.js |
| Database | SQLite (via better-sqlite3) |
| Auth | JWT + bcryptjs |
| Validation | express-validator |
| Deployment | Railway |

## 📁 Project Structure

```
taskflow/
├── backend/
│   ├── middleware/
│   │   └── auth.js          # JWT + role middleware
│   ├── models/
│   │   └── db.js            # SQLite setup + schema
│   ├── routes/
│   │   ├── auth.js          # /api/auth/*
│   │   ├── projects.js      # /api/projects/*
│   │   ├── tasks.js         # /api/projects/:id/tasks/*
│   │   └── dashboard.js     # /api/dashboard
│   └── server.js            # Express entry point
├── frontend/
│   └── src/
│       ├── context/         # AuthContext (global user state)
│       ├── pages/           # Dashboard, Projects, ProjectDetail, TaskDetail, AuthPage
│       ├── components/      # Layout, TaskModal
│       ├── api.js           # Axios instance
│       └── index.css        # Design system
├── railway.toml             # Railway deployment config
└── package.json             # Root build scripts
```

## 🔐 Role-Based Access

| Action | Admin | Member |
|--------|-------|--------|
| Create/delete project | ✅ | ❌ |
| Invite/remove members | ✅ | ❌ |
| Change member roles | ✅ | ❌ |
| Create tasks | ✅ | ✅ |
| Edit own tasks | ✅ | ✅ |
| Edit any task | ✅ | ❌ |
| Delete own tasks | ✅ | ✅ |
| Delete any task | ✅ | ❌ |
| Comment on tasks | ✅ | ✅ |

## 🗄️ Database Schema

- `users` — id, name, email, password (hashed), avatar
- `projects` — id, name, description, color, owner_id
- `project_members` — project_id, user_id, role (admin/member)
- `tasks` — id, title, description, status, priority, project_id, assignee_id, creator_id, due_date
- `comments` — id, task_id, user_id, content

## 🌐 API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Register |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user |

### Projects
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/projects` | ✅ | List my projects |
| POST | `/api/projects` | ✅ | Create project |
| GET | `/api/projects/:id` | Member | Project details + members |
| PUT | `/api/projects/:id` | Admin | Update project |
| DELETE | `/api/projects/:id` | Admin | Delete project |
| POST | `/api/projects/:id/members` | Admin | Add member by email |
| PUT | `/api/projects/:id/members/:userId` | Admin | Update role |
| DELETE | `/api/projects/:id/members/:userId` | Admin | Remove member |

### Tasks
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/projects/:id/tasks` | Member | List tasks (filterable) |
| POST | `/api/projects/:id/tasks` | Member | Create task |
| PUT | `/api/projects/:id/tasks/:taskId` | Member* | Update task |
| DELETE | `/api/projects/:id/tasks/:taskId` | Member* | Delete task |
| GET | `/api/projects/:id/tasks/:taskId/comments` | Member | List comments |
| POST | `/api/projects/:id/tasks/:taskId/comments` | Member | Add comment |

*Members can only modify their own tasks

## 🚀 Local Development

```bash
# Clone
git clone https://github.com/yourusername/taskflow.git
cd taskflow

# Install all dependencies
npm install --prefix backend
npm install --prefix frontend

# Set up environment
cp .env.example .env
# Edit .env with your JWT_SECRET

# Run backend (port 5000)
npm run dev:backend

# Run frontend (port 5173) — in another terminal
npm run dev:frontend
```

Visit `http://localhost:5173`

## 🚂 Deploy to Railway

1. Push code to GitHub
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
3. Select your repository
4. Set environment variables in Railway dashboard:
   ```
   JWT_SECRET=your-very-long-random-secret-string
   NODE_ENV=production
   DB_PATH=/data
   ```
5. (Optional) Add a **Volume** at `/data` for persistent SQLite storage
6. Railway auto-detects `railway.toml` and builds/deploys

Your app will be live at `https://your-app.up.railway.app` 🎉

## 📝 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | ✅ | — | Secret for signing JWTs (use a long random string) |
| `PORT` | ❌ | `5000` | Server port |
| `NODE_ENV` | ❌ | `development` | Set to `production` in Railway |
| `DB_PATH` | ❌ | `./data` | Directory for SQLite database file |

## 🎥 Demo Video

[Watch 3-minute demo →](https://your-video-link.com)
