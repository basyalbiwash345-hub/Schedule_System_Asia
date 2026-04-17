# CGI Scheduling System

A full-stack scheduling and rotation management system built with React, Node.js/Express, PostgreSQL, and Prisma.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [1. Clone the Repository](#1-clone-the-repository)
- [2. Set Up the Database](#2-set-up-the-database)
- [3. Configure Environment Variables](#3-configure-environment-variables)
- [4. Install Dependencies](#4-install-dependencies)
- [5. Run Database Migrations](#5-run-database-migrations)
- [6. Seed the Database](#6-seed-the-database)
- [7. Start the Application](#7-start-the-application)
- [Default Login](#default-login)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Make sure the following are installed on your Windows machine before starting.

| Tool | Version | Download |
|---|---|---|
| Node.js | v18 or higher | https://nodejs.org |
| npm | Comes with Node.js | — |
| PostgreSQL | v14 or higher | https://www.postgresql.org/download/windows |
| pgAdmin 4 | Included with PostgreSQL installer | https://www.pgadmin.org/download |
| Git | Any recent version | https://git-scm.com/download/win |

### Verify your installs

Open **Command Prompt** or **PowerShell** and run:

```cmd
node -v
npm -v
psql --version
git --version
```

Each command should print a version number. If any command is not recognized, the tool is either not installed or not added to your PATH — reinstall it and check the **"Add to PATH"** option during setup.

---

## Project Structure

```
CGI_Scheduling_System/
├── server/                   # Node.js + Express backend
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema
│   │   └── seed.sql          # SQL seed file for teams and employees
│   ├── index.js              # Main server entry point
│   ├── rotations.js          # Rotation routes
│   ├── db.js                 # Prisma client instance
│   └── .env                  # Your local environment variables (you create this)
└── frontend/                 # React frontend
    ├── src/
    └── package.json
```

---

## 1. Clone the Repository

Open **Command Prompt** or **PowerShell** and run:

```cmd
cd C:\CGI_Schedule_System_Asia\Schedule_System_Asia
git clone <your-repo-url-here>
cd CGI_Scheduling_System
```

> If you already have the folder copied locally and do not need to clone, just navigate to it:
> ```cmd
> cd C:\CGI_Schedule_System_Asia\Schedule_System_Asia\CGI_Scheduling_System
> ```

---

## 2. Set Up the Database

Each developer runs their own local PostgreSQL database. Follow these steps to create yours.

### 2.1 — Make sure PostgreSQL is running

1. Press `Windows + R`, type `services.msc`, and press Enter
2. Find the service named `postgresql-x64-16` (the number may differ based on your installed version)
3. Make sure the status says **Running** — if not, right-click it and select **Start**

### 2.2 — Create the database in pgAdmin

1. Open **pgAdmin 4** from your Start menu
2. In the left panel, expand **Servers** → right-click your server → **Connect**
   - Default username: `postgres`
   - Password: whatever you set during PostgreSQL installation
3. Right-click **Databases** → **Create** → **Database**
4. Set the name to `cgi_scheduling` and click **Save**

---

## 3. Configure Environment Variables

The backend needs a `.env` file to connect to your local database.

1. Open File Explorer and navigate to:
   ```
   C:\CGI_Schedule_System_Asia\Schedule_System_Asia\CGI_Scheduling_System\server\
   ```
2. Create a new file named `.env`
   > **Important:** Make sure it does not have a `.txt` extension. In File Explorer go to **View → Show → File name extensions** to confirm the file is named exactly `.env`
3. Open it in Notepad or VS Code and paste the following:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/cgi_scheduling"
JWT_SECRET="pick-any-long-random-string-here"
PORT=5000

# Default admin account
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@cgi.com
ADMIN_PASSWORD=AdminPass1!
ADMIN_FIRST_NAME=System
ADMIN_LAST_NAME=Admin
```

**Replace `YOUR_PASSWORD`** with the password you chose when you installed PostgreSQL.

**Replace the `JWT_SECRET` value** with any long random string — it secures login tokens and should be kept private.

> Each developer creates their own `.env` file locally. This file is not committed to the repository.

---

## 4. Install Dependencies

Open **Command Prompt** or **PowerShell** and run each block separately.

**Backend:**
```cmd
cd C:\CGI_Schedule_System_Asia\Schedule_System_Asia\CGI_Scheduling_System\server
npm install
```

**Frontend:**
```cmd
cd C:\CGI_Schedule_System_Asia\Schedule_System_Asia\CGI_Scheduling_System\frontend
npm install
```

---

## 5. Run Database Migrations

Migrations create all the required tables in your `cgi_scheduling` database automatically from the Prisma schema.

From the `server/` folder, run:

```cmd
cd C:\CGI_Schedule_System_Asia\Schedule_System_Asia\CGI_Scheduling_System\server
npx prisma migrate dev
```

If prompted for a migration name, type `initial` and press Enter.

### Verify the tables were created

1. Open **pgAdmin 4**
2. Expand `cgi_scheduling` → **Schemas** → **public** → **Tables**
3. You should see tables including: `users`, `teams`, `rotations`, `schedule_entries`, `roles`, etc.

---

## 6. Seed the Database

This step populates the database with the 18 teams, 54 employees, and rotation type categories.

### 6.1 — Seed teams and employees

1. Open **pgAdmin 4**
2. Right-click the `cgi_scheduling` database → **Query Tool**
3. Click **File → Open** and navigate to:
   ```
   C:\CGI_Schedule_System_Asia\Schedule_System_Asia\CGI_Scheduling_System\server\prisma\seed.sql
   ```
4. Click the **▶ Execute** button or press **F5**
5. Check the **Messages** tab at the bottom — you should see:
   ```
   NOTICE:  Done. Default password for all users: TempPass1!
   Query returned successfully
   ```

### 6.2 — Seed rotation types

In the same Query Tool window, paste and run the following:

```sql
DELETE FROM rotation_types;

INSERT INTO rotation_types (name, default_interval_unit) VALUES
    ('On-Call (IT)',         'week'),
    ('On-Call (CDO)',        'week'),
    ('On-Call (Escalation)', 'week'),
    ('Mountain Time',        'week'),
    ('Service Desk',         'week'),
    ('Stat / Holiday',       'day'),
    ('Custom',               'week');
```

---

## 7. Start the Application

You need **two Command Prompt windows** open at the same time.

### Terminal 1 — Start the backend

```cmd
cd C:\CGI_Schedule_System_Asia\Schedule_System_Asia\CGI_Scheduling_System\server
node index.js
```

You should see:
```
 CGI Scheduling Server live on http://localhost:5000
 Admin User Ready: admin
```

Keep this window open.

### Terminal 2 — Start the frontend

```cmd
cd C:\CGI_Schedule_System_Asia\Schedule_System_Asia\CGI_Scheduling_System\frontend
npm start
```

The app will open automatically in your browser at **http://localhost:3000**

---

## Default Login

| Field | Value |
|---|---|
| Username or Email | `admin` |
| Password | `AdminPass1!` |

All seeded employees have the temporary password **`TempPass1!`** and will be prompted to set a new password on first login.

---

## Troubleshooting

**`JWT_SECRET is not defined` on server start**
Your `.env` file is missing, in the wrong folder, or has a hidden `.txt` extension. Make sure it is named exactly `.env` and lives inside the `server/` folder. Enable **View → Show → File name extensions** in File Explorer to check.

---

**`Can't reach database server` or Prisma connection error**
- Confirm PostgreSQL is running (see Step 2.1)
- Double-check that the password in `DATABASE_URL` matches your PostgreSQL password exactly
- Confirm the database name in the URL (`cgi_scheduling`) matches the one you created in pgAdmin

---

**`npx prisma migrate dev` fails**
- Make sure you are running the command from inside the `server/` folder
- Make sure the `cgi_scheduling` database exists in pgAdmin before running
- Make sure your `.env` file is saved with the correct `DATABASE_URL`

---

**Seeded users do not appear after running seed.sql**
The migration in Step 5 must complete successfully before seeding — the tables must exist first. Check the Messages tab in pgAdmin for any error output from the seed script.

---

**Port 3000 or 5000 already in use**
To change the backend port, update your `.env`:
```env
PORT=5001
```
Then update `frontend/package.json` to match:
```json
"proxy": "http://localhost:5001"
```

---

**`npm install` fails with permission errors**
Right-click the Start menu → **Terminal (Admin)** or **Command Prompt (Admin)** and re-run the install commands.
