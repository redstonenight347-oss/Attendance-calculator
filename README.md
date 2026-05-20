# 📅 Attendance Calculator

A beautiful, modern, and highly interactive attendance tracking web application built to help students seamlessly manage their schedules, plan classes, track attendance metrics, and view real-time statistics. 

Designed with a **premium dark aesthetic**, **offline-resilient background syncing**, and **strict production security**, this project makes tracking academic requirements satisfying and completely stress-free.

---

## ✨ Features

*   **📊 Dynamic Stats Analytics**: Track overall percentages, see exactly how many classes you can afford to miss, or find out how many consecutive classes you need to attend to hit your target goal (e.g., 75%).
*   **📅 Interactive Attendance Calendar**: View daily schedules with colored status badges (mixed, present, absent, cancelled) and clear pending visual indicators.
*   **📍 Custom Start Marker**: Set a custom start date for your semester calculations, automatically ignoring prior dates without cluttering logs.
*   **➕ Extra Classes Support**: Seamlessly log unscheduled extra sessions on any day, safely co-existing with standard timetable schedules.
*   **🔄 Optimistic UI & Debounced Syncing**: Experience zero-latency button clicks. Edits update the local UI and local cache instantly, and changes sync to the Postgres database in the background using smart debounced queue queues.
*   **🔒 Production-Ready Security**: Protected by JWT tokens, secure `bcryptjs` password hashing, Helmet Content Security Policies (CSP), Express Rate Limiters, body size limits, and robust backend-level input validation.

---

## 🛠️ Technology Stack

### Frontend (Client-Side)
*   **HTML5 & CSS3**: Custom responsive grids, glassmorphism layouts, Google Fonts (Outfit & Inter), custom-tailored HSL color models, and custom micro-animations. (No Tailwind dependencies).
*   **Vanilla ES6+ JavaScript**: Structured modular design using modern ES Modules (`import`/`export`).
*   **Local Cache Layer**: Resilient client-side fallback storage managing local state.

### Backend (Server-Side)
*   **Node.js & Express.js**: Fast, lightweight API server running on the latest Express framework.
*   **Drizzle ORM**: Type-safe database queries and migrations mapped to the schema.
*   **PostgreSQL (Neon Serverless)**: Scalable, serverless cloud database integration.
*   **Nodemailer**: Dispatches transactional secure OTP emails for forgotten or changed passwords.
*   **Structured Logging**: Consolidates operational events in clean production-ready JSON formats.

---

## 📂 Project Structure

```txt
├── public/                     # Frontend client codebase
│   ├── index.html              # Landing page (Sign-Up / Sign-In)
│   ├── dashboard.html          # Core workspace layout
│   ├── index.css               # Unified styling and responsive variables
│   ├── dashboard.js            # Main dashboard setup and layout orchestrator
│   └── modules/                # Specialized ES frontend modules
│       ├── api.js              # Fetch requests to secure API endpoints
│       ├── calculator.js       # Real-time attendance percentage formulas
│       ├── calendar.js         # Daily schedules grid, badges, and markers
│       ├── timetable.js        # Timetable allocation and day buttons
│       ├── subjects.js         # Adds, edits, and manages course lists
│       ├── storage.js          # Synchronizes offline local storage
│       ├── sync.js             # Debounces background DB save queues
│       └── utils.js            # General UI helpers and custom toast alerts
│
├── src/                        # Backend server codebase
│   ├── server.js               # Entrypoint (dynamic port allocation)
│   ├── app.js                  # Middlewares (Helmet CSP, limiters, JSON sizes)
│   ├── controllers/            # Maps HTTP requests to services
│   │   ├── users.controller.js
│   │   └── attendance.controller.js
│   ├── services/               # core database query handlers
│   │   ├── users.services.js
│   │   ├── attendance.services.js
│   │   └── email.services.js
│   ├── routes/                 # Express endpoint route tables
│   │   ├── users.router.js
│   │   └── attendance.router.js
│   ├── db/                     # DB client configurations
│   │   ├── db.js
│   │   ├── schema.js           # Database tables and unique indices
│   │   └── seeds/
│   │       └── seed.js         # Idempotent, secure dev seeder script
│   ├── middleware/             # Request pre-processors
│   │   ├── auth.middleware.js  # JWT verification and user resolution
│   │   └── error.middleware.js # Centralized production JSON error reporter
│   └── utils/
│       └── logger.js           # Structured JSON logging framework
│
├── package.json                # Project dependencies and script hooks
└── .env                        # Private environment keys (Ignored by git)
```

---

## 🚀 Getting Started

Follow these simple steps to set up the project locally:

### 1. Prerequisite Installations
*   Ensure **Node.js** (v18 or higher) is installed on your computer.
*   Ensure you have access to a **PostgreSQL** database instance (e.g., [Neon DB](https://neon.tech/)).

### 2. Clone and Install Dependencies
Open your terminal inside the project root folder and run:
```bash
npm install
```

### 3. Configure the Environment variables
Create a `.env` file in the root folder of the project and populate it with your credentials:
```env
DATABASE_URL=postgresql://user:password@endpoint-pooler.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=your-super-long-secure-random-jwt-key
EMAIL_USER=your-nodemailer-smtp-auth-email@gmail.com
EMAIL_PASS=your-secure-app-password
```

### 4. Push Database Schema Configurations
We use Drizzle Kit to automatically synchronize tables and indexes with the database. Synchronize your schema instantly by running:
```bash
npx drizzle-kit push
```

### 5. Seed the Database (Optional)
To instantly populate your local development environment with a demo student user, a preconfigured timetable, subjects, and mock attendance history:
```bash
npm run seed
```
> 💡 **Developer Note:** The seeder is fully **idempotent**. Every time you run `npm run seed`, it cleanly purges previous test user logs using database cascade configurations, hashes the seeded password, and creates a fresh test suite. You can run it repeatedly without generating database clutter!

### 6. Start the Server
*   For **Development** (starts up the server using `tsx` for live tracking):
    ```bash
    npm run dev
    ```
*   For **Production** deployments:
    ```bash
    npm start
    ```

Once started, open your web browser and navigate to:
👉 **`http://localhost:3000`**

---

## 🔒 Security Implementations

*   **No Exposed User IDs**: The client application never passes raw user database IDs in route paths. The backend relies solely on extracting the secure, cryptographically verified `userId` directly from the user's JWT credentials inside the headers.
*   **Robust Input Validation**: The backend validates text length parameters (2-50 for names, 2-40 for subjects) and rejects string inputs containing bracket characters (`<` or `>`) to shield against script injection.
*   **Password Integrity**: Passwords must contain a minimum of 8 characters including at least one letter and one number, hashed inside the database via `bcryptjs`.
*   **Double-Booking Protection**: Standard timetable attendance logging is governed by a Postgres-level unique constraint index: `(userId, timetableId, date)`. This blocks accidental duplicate attendance items while leaving the `timetableId` NULL field open to permit multiple manual extra classes per day.
*   **Strict Security Headers**: Helmet.js is preconfigured with standard Content Security Policies (CSP), successfully blocking inline script elements and protecting user cookies.

---

## 🩺 Diagnostics & Health Checks
The server deploys a native `/health` check endpoint returning JSON parameters representing system wellness. Access this endpoint on:
👉 `http://localhost:3000/health`

---

## 🤝 Contributing
Feel free to fork the repository, open issues, or submit pull requests. If you are developing a new feature, make sure to test changes locally using `npm run dev` and verify that database tables map smoothly under Drizzle configurations.

Happy tracking! 🎓🚀
