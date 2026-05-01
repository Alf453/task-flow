# TaskFlow — Team Task Manager

A full-stack team task management app with role-based access control, Kanban boards, and real-time dashboards.

## 🚀 Live Demo

> **[https://your-app.up.railway.app](https://task-flow-123.up.railway.app/login)**

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
| Database | MongoDB |
| Auth | JWT + bcryptjs |
| Validation | express-validator |
| Deployment | Railway |


