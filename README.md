# 🚀 TaskFlow — Task & Team Management Web Application

> **Assignment 1:** Project Setup, Prisma ORM, Full-stack CRUD & Vercel Deployment  
> **Course:** Web Application Development / Software Engineering

---

## 📌 Project Overview

**TaskFlow** is a modern, responsive web application for managing tasks and team collaboration. This project lays down the technical architecture, database modeling with Prisma, API Route Handlers, and automated CI/CD pipeline for the upcoming features in Assignments 2 & 3.

- **Live Deployment:** [TaskFlow on Vercel](https://assignment-1-project-setup-and-deployment.vercel.app) *(Update with your Vercel URL)*
- **GitHub Repository:** [https://github.com/ThanhNam7791aaa/Assignment-1-Project-setup-and-deployment](https://github.com/ThanhNam7791aaa/Assignment-1-Project-setup-and-deployment)

---

## 🛠️ Tech Stack

- **Frontend & Framework:** Next.js 16 (App Router, React 19, TypeScript)
- **Styling:** Tailwind CSS v4 (Responsive design, dark/light theme accents)
- **Database:** PostgreSQL (Hosted on [Supabase](https://supabase.com))
- **ORM:** Prisma 6 (Type-safe client, migrations)
- **Code Quality:** ESLint & Prettier
- **Continuous Integration (CI):** GitHub Actions (`lint-and-build` on push)
- **Hosting & Deployment:** Vercel

---

## 🗂️ Folder Structure

```text
.
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub Actions CI workflow
├── app/
│   ├── api/
│   │   └── tasks/
│   │       ├── route.ts       # GET /api/tasks & POST /api/tasks
│   │       └── [id]/
│   │           └── route.ts   # PUT /api/tasks/:id & DELETE /api/tasks/:id
│   ├── teams/
│   │   └── page.tsx           # "Coming Soon" placeholder for Assignment 2
│   ├── favicon.ico
│   ├── globals.css            # Tailwind CSS styling setup
│   ├── layout.tsx             # Root layout with Header and Footer
│   └── page.tsx               # Homepage rendering TaskDashboard
├── components/
│   ├── EditTaskModal.tsx      # Modal dialog to edit existing tasks
│   ├── Footer.tsx             # Shared responsive footer
│   ├── Navbar.tsx             # Shared navigation bar with mobile support
│   ├── TaskCard.tsx           # Individual task card with status badges & actions
│   ├── TaskDashboard.tsx      # Client dashboard with state management & stats
│   └── TaskForm.tsx           # Task creation form with client validation
├── lib/
│   └── prisma.ts              # PrismaClient singleton instance
├── prisma/
│   └── schema.prisma          # Database schema (User, Team, TeamMember, Task)
├── .env.example               # Template for required environment variables
├── .gitignore
├── .prettierrc
├── package.json
└── tsconfig.json
```

---

## 🗄️ Database Design & ERD (Entity Relationship Diagram)

The database schema is modeled using Prisma ORM with PostgreSQL. It includes 4 core entities:

```mermaid
erDiagram
    users {
        String id PK
        String name
        String email UK
        String password
        DateTime createdAt
    }

    teams {
        String id PK
        String name
        String description
        String ownerId FK
        DateTime createdAt
    }

    team_members {
        String id PK
        String teamId FK
        String userId FK
        String role
        DateTime joinedAt
    }

    tasks {
        String id PK
        String title
        String description
        String status
        String priority
        DateTime dueDate
        String teamId FK
        String assigneeId FK
        DateTime createdAt
    }

    users ||--o{ teams : "owns (TeamOwner)"
    users ||--o{ team_members : "belongs to"
    users ||--o{ tasks : "assigned to (TaskAssignee)"
    teams ||--o{ team_members : "has members"
    teams ||--o{ tasks : "contains"
```

### Model Descriptions
1. **User:** Represents registered members with name, email, credentials, and timestamps.
2. **Team:** Represents collaborative teams owned by a User.
3. **TeamMember:** Join table linking Users and Teams with role-based permissions (`OWNER`, `ADMIN`, `MEMBER`).
4. **Task:** Represents tasks with status (`TODO`, `IN_PROGRESS`, `DONE`), priority (`LOW`, `MEDIUM`, `HIGH`), due date, and optional relationships to `Team` and `User`.

---

## 🔌 API Endpoints (Next.js Route Handlers)

| Method | Endpoint | Description | Request Body |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tasks` | List all tasks (ordered by createdAt DESC) | None |
| `GET` | `/api/tasks?status=TODO` | Filter tasks by status | None |
| `POST` | `/api/tasks` | Create a new task | `{ title, description?, status?, priority?, dueDate? }` |
| `PUT` | `/api/tasks/:id` | Update an existing task | `{ title?, description?, status?, priority?, dueDate? }` |
| `DELETE` | `/api/tasks/:id` | Delete a task by ID | None |

---

## 🚀 Getting Started Locally

### 1. Clone the repository
```bash
git clone https://github.com/ThanhNam7791aaa/Assignment-1-Project-setup-and-deployment.git
cd Assignment-1-Project-setup-and-deployment
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the root folder based on `.env.example`:
```env
DATABASE_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```

### 4. Run database migrations
```bash
npx prisma migrate dev --name init
```

### 5. Launch Prisma Studio (Optional)
Inspect your database records with a visual GUI:
```bash
npx prisma studio
```

### 6. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to view the application.

---

## 🌟 Bonus Features Implemented
- ✅ **Client-side Form Validation:** Real-time feedback preventing empty or too-short task titles.
- ✅ **Status Filter & Search:** Instantly filter tasks by `All`, `To Do`, `In Progress`, and `Done` or search by keyword.
- ✅ **GitHub Actions CI:** Automated pipeline running `ESLint` and `Next.js Build` on every commit/PR.
- ✅ **Entity Relationship Diagram (ERD):** Visualized Mermaid schema included in README.
- ✅ **Tailwind CSS Design:** Modern responsive interface with statistics counters, badges, and smooth modal interactions.
