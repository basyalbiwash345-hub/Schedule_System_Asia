# CGI Scheduling System — How-To Guide

## Overview

This guide explains how to use the CGI Scheduling System — a web application for managing employee schedules, on-call rotations, teams, and users across CGI departments.

The application has three roles with different levels of access:

| Role | What they can do |
|---|---|
| **Administrator** | Full access — manage users, teams, rotations, and the schedule matrix |
| **Team Lead / Supervisor** | Manage teams and rotations; view schedules |
| **Employee** | View the schedule matrix, teams, rotations, and their own profile |

---

## Before You Start

Before using the application, ensure:

- The application is running locally (see the README for setup instructions)
- You have been provided a username and temporary password by an Administrator
- You are using a modern browser (Chrome, Edge, or Firefox recommended)

---

## Logging In

1. Open your browser and go to **http://localhost:3000**

2. Enter your **username or email address** and your **password**, then click **Sign In**.

3. If this is your first login, you will be taken to the **Update Password** screen.

    3.1. Enter your temporary password in the **Current / Temporary Password** field.

    3.2. Enter a new password that meets the requirements: at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character.

    3.3. Confirm your new password and click **Update Password**.

    You will be taken to the main application once your password is set.

---

## Navigating the Application

The navigation bar at the top of the screen shows the pages available to your role:

- **Overview** — a summary dashboard showing team and rotation stats
- **Matrix** — the main schedule grid where codes are painted per employee per day
- **Teams** — view and manage teams and their members
- **Rotations** — view and manage on-call and shift rotations
- **Users** — manage user accounts *(Administrators only)*
- **Roles** — view role definitions and permissions *(Administrators only)*

Click any item in the navigation bar to switch pages.

---

## Using the Schedule Matrix

The Matrix is the main scheduling view. It shows every active employee as a row and every day of the selected month as a column. Each cell can hold a schedule code indicating that employee's status for that day.

### Reading the Matrix

Each coloured cell represents a schedule code:

| Code | Meaning | Colour |
|---|---|---|
| V | Vacation | Red |
| A | Absence (slash = half day) | Cyan |
| IT | 24/7 SPOC IT Services | Purple |
| CD | 24/7 SPOC CDO Stewards | Yellow |
| ES | 24/7 SPOC CDO Escalation | Orange |
| MT | Mountain Time Rotation | Brown |
| MV | Morning Vacation | Pink |
| AV | Afternoon Vacation | Red |
| WS | Working Stat | Orange-Red |
| EF | Encana Friday | Teal |
| CH | Canadian Holiday | Peach |
| UH | US Holiday | Lavender |
| WE | Weekend | Grey |
| PV | Pending Vacation (not approved) | Green |
| SD | Service Desk | Bright Green |

### Navigating Months

Use the **← Prev** and **Next →** buttons at the top of the matrix to move between months. The current month and year are displayed in the centre.

### Painting a Schedule Code (Administrators and Team Leads)

1. Select a code from the **colour palette** on the left side of the matrix. The selected code will be highlighted.

2. Click any cell in the grid to paint that code onto that employee for that day.

3. To remove a code, select **CLEAR** from the palette and click the cell.

4. To paint multiple cells quickly, click and drag across the cells you want to fill.

> Changes are saved automatically as you paint. There is no separate save button.

### Viewing Cell Details

Hover over any painted cell to see a tooltip showing the employee name, date, and full code description.

---

## Managing Teams

### Viewing Teams

1. Click **Teams** in the navigation bar.

2. The table shows all teams with their colour, name, lead, member count, and description.

3. Click **View** on any row to open the full team details including all members.

### Creating a Team (Administrators only)

1. Click **+ Create Team** in the top right corner.

2. Fill in the team details:
    - **Team Name** — required
    - **Team Color** — click the colour swatch to pick a colour; this appears in the matrix header
    - **Team Lead** — search and select a user
    - **Assign Members** — search and check each member to add them to the team

3. Click **Save Team**.

### Editing a Team (Administrators only)

1. Find the team in the table and click **Edit**.

2. Update any fields as needed. To add or remove members, use the **Assign Members** dropdown — check to add, uncheck to remove.

3. Click **Save Team**.

### Deleting a Team (Administrators only)

1. Find the team in the table and click **Delete**.

2. Confirm the deletion in the dialog. This action cannot be undone.

---

## Managing Rotations

Rotations define recurring on-call or shift schedules assigned to a team and its members.

### Viewing Rotations

1. Click **Rotations** in the navigation bar.

2. The table shows all rotations with their name, type, team, coverage, interval, and dates.

3. Use the search bar or filters to narrow results by team or interval.

4. Click **View** on any row to see full rotation details including all assigned members.

### Creating a Rotation (Administrators only)

1. Click **+ Create Rotation** in the top right corner.

2. Fill in the rotation form:

    - **Rotation Type** — select the category that best describes this rotation (e.g. On-Call IT, Service Desk, Mountain Time)
    - **Rotation Name** — a descriptive name for this specific rotation (e.g. "IT On-Call June")
    - **Assigned Team** — the team this rotation belongs to
    - **Assigned Members** — select the team members who are part of this rotation
    - **Rotation Interval** — how frequently the rotation repeats (Daily, Weekly, Bi-Weekly, or Custom)
    - **Start Date** — the date the rotation begins
    - **End Date** — the date the rotation ends
    - **Notes** — optional description or context

3. Click **Create Rotation**.

> Once saved, the system will automatically generate schedule entries in the matrix for the assigned members across the rotation's date range.

### Editing a Rotation (Administrators only)

1. Find the rotation in the table and click **Edit**.

2. Update any fields as needed. Changing the members, dates, or interval will regenerate the schedule entries automatically.

3. Click **Update Rotation**.

### Deleting a Rotation (Administrators only)

1. Find the rotation in the table and click **Delete**.

2. Confirm the deletion. All auto-generated schedule entries for this rotation will be removed. Any cells that were manually painted will remain.

---

## Managing Users

*This section is available to Administrators only.*

### Viewing Users

1. Click **Users** in the navigation bar.

2. The table shows all users with their name, username, email, team, roles, and status.

3. Use the search bar or filters to find users by name, team, or role.

4. Click **View** on any row to see the full user profile.

### Creating a User

1. Click **+ Create User** in the top right corner.

2. Fill in the user form:
    - **First and Last Name** — required
    - **Email** — must be a valid email address and unique in the system
    - **Username** — must be unique
    - **Phone** and **Location** — optional
    - **Assigned Team** — select which team this user belongs to
    - **Role(s)** — select one or more roles (Administrator, Team Lead / Supervisor, Employee)
    - **Temporary Password** — the user will be required to change this on first login

3. Click **Create User**.

### Editing a User

1. Find the user in the table and click **Edit**.

2. Update any fields as needed. The password field is hidden during edits — users change their own password through the login flow.

3. Click **Update User**.

### Deleting a User

1. Find the user in the table and click **Delete**.

2. Confirm the deletion. This action cannot be undone. You cannot delete the last remaining Administrator in the system.

---

## Overview Page

The Overview page provides a quick summary of the system's current state, including:

- Total number of active users, teams, and rotations
- A breakdown of teams and their member counts
- Upcoming or active rotations

This page is read-only and available to all roles.

---

## Roles and Permissions

The Roles page displays the four system roles and their associated permissions. Roles are fixed and cannot be edited.

| Role | Key Permissions |
|---|---|
| Administrator | Full system access, manage all users, teams, rotations, and schedules |
| Team Lead / Supervisor | Manage team members, view schedules, manage rotations |
| Employee | View schedule matrix, view teams and rotations |

---

## See Also

- [README — Installation Guide](./README.md) — how to set up and run the application locally
- [seed.sql](./server/prisma/seed.sql) — SQL script to populate initial teams and employees