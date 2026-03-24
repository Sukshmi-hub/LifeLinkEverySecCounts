# Admin Moderation Module - Architecture & Flow Diagrams

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         React Frontend (Vite)                        │
├─────────────────────────────────────────────────────────────────────┤
│
│  AdminDashboard.jsx (Main Page)
│  ├── AdminUserManagement (Users Table with Reports)
│  │   ├── Search & Filter
│  │   ├── User List Table
│  │   │   ├── Name/Email
│  │   │   ├── Role Badge
│  │   │   ├── Status Badge
│  │   │   ├── Report Count
│  │   │   └── Actions Dropdown
│  │   └── ReportsModal (On "Reports" click)
│  │       ├── User Info Card
│  │       ├── Reports List
│  │       └── Close Button
│  │
│  └── FlaggedUsers (Dashboard Section)
│      ├── Flagged Users Table (≥3 reports)
│      ├── Red Highlighting
│      ├── Actions Dropdown
│      └── Zero-state UI
│
└─────────────────────────────────────────────────────────────────────┘
                              ↓ HTTP/REST
┌─────────────────────────────────────────────────────────────────────┐
│                    Express.js Backend Server                         │
├─────────────────────────────────────────────────────────────────────┤
│
│  Routes (/api/moderation)
│  ├── POST /report-user (Public)
│  ├── GET /flagged-users (Admin)
│  ├── GET /all-users-with-reports (Admin)
│  ├── GET /reports/:userId (Admin)
│  ├── PUT /user/:userId/status (Admin)
│  ├── PUT /reports/:reportId/status (Admin)
│  └── GET /activity-logs/:userId (Admin)
│
│  Middleware
│  ├── authenticate (JWT validation)
│  └── adminOnly (Role check)
│
│  Controllers (moderationController.js)
│  ├── reportUser()
│  ├── getFlaggedUsers()
│  ├── getAllUsersWithReports()
│  ├── getUserReports()
│  ├── changeUserStatus()
│  ├── updateReportStatus()
│  ├── getUserActivityLogs()
│  └── logActivity() [Internal]
│
└─────────────────────────────────────────────────────────────────────┘
                              ↓ Mongoose ODM
┌─────────────────────────────────────────────────────────────────────┐
│                      MongoDB Database                                │
├─────────────────────────────────────────────────────────────────────┤
│
│  Collections
│  │
│  ├── users (Enhanced)
│  │   ├── _id
│  │   ├── name
│  │   ├── email
│  │   ├── role (patient|donor|hospital|ngo|admin)
│  │   ├── status ⭐ NEW (Active|Suspended|Blocked)
│  │   ├── password
│  │   ├── createdAt
│  │   └── updatedAt
│  │
│  ├── reports ⭐ NEW
│  │   ├── _id
│  │   ├── reported_user_id (FK → users)
│  │   ├── reported_by_user_id (FK → users)
│  │   ├── reason
│  │   ├── description
│  │   ├── status (pending|under_review|resolved|dismissed)
│  │   ├── admin_notes
│  │   ├── evidence [URLs]
│  │   ├── createdAt
│  │   └── updatedAt
│  │
│  └── activitylogs ⭐ NEW
│      ├── _id
│      ├── user_id (FK → users)
│      ├── action (login|logout|report_filed|...)
│      ├── description
│      ├── ip_address
│      ├── user_agent
│      ├── metadata
│      └── createdAt
│
│  Indices
│  reports: [reported_user_id, reported_by_user_id, createdAt, status]
│  activitylogs: [user_id, createdAt, action]
│
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: User Reporting

```
┌──────────────────────────────────┐
│   User A Writes Report           │
│   - Selects User B               │
│   - Fills reason & description   │
│   - Optional evidence            │
│   - Clicks Submit                │
└────────────┬─────────────────────┘
             │ POST /report-user
             │ with JWT token
             ↓
┌──────────────────────────────────┐
│   Backend Validation             │
│   ✓ Is user authenticated?       │
│   ✓ Is User B real?              │
│   ✓ Is User A ≠ User B?          │
│   ✓ No report from A→B in 24h?   │
└────────────┬─────────────────────┘
             │
             ├─ Any validation fails
             │  └─→ Return 400 Bad Request
             │
             └─ All pass
                ↓
┌──────────────────────────────────┐
│   Save Report to DB              │
│   reports.insertOne({            │
│     reported_user_id: B._id,     │
│     reported_by_user_id: A._id,  │
│     reason: "...",               │
│     status: "pending"            │
│   })                             │
└────────────┬─────────────────────┘
             │
             ├─ Log activity
             │  └─→ activitylogs.insertOne({
             │      user_id: A._id,
             │      action: "report_filed"
             │    })
             │
             ↓
┌──────────────────────────────────┐
│   Return 201 Created             │
│   with report data               │
└────────────┬─────────────────────┘
             │
             ↓
┌──────────────────────────────────┐
│   Frontend                       │
│   - Show success toast           │
│   - Clear form                   │
│   - Close modal (if any)         │
└──────────────────────────────────┘
```

---

## Admin Moderation Workflow

```
┌────────────────────────────────────────────────────────────────────┐
│                    ADMIN DASHBOARD JOURNEY                         │
└────────────────────────────────────────────────────────────────────┘

Step 1: View Flagged Users
┌──────────────────────────────────┐
│  Admin visits /admin              │
│  Dashboard loads with:            │
│  - User distribution stats        │
│  - Flagged Users section          │
│    └─ Table of users with ≥3 reports
└────────────┬─────────────────────┘
             │ GET /flagged-users
             ↓
        MongoDB
        reports.aggregate([
          { $group: by reported_user_id, count: sum(1) },
          { $match: count ≥ 3 },
          { $sort: by count desc }
        ])
             │
             ↓
     Show Red-Highlighted Users


Step 2: Review Reports
┌──────────────────────────────────┐
│  Admin clicks "Reports" for User  │
└────────────┬─────────────────────┘
             │ GET /reports/:userId
             ↓
       MongoDB
       reports.find({
         reported_user_id: userId
       }).populate('reported_by_user_id')
             │
             ↓
     ReportsModal displays:
     - All reports with details
     - Reporter info per report
     - Report status
     - Evidence links
     - Admin notes field (editable)
             │
             ↓
     Admin reviews & decides


Step 3: Take Action
┌──────────────────────────────────┐
│  Admin selects action:            │
│  - Activate                       │
│  - Suspend (temp)                 │
│  - Block (permanent)              │
└────────────┬─────────────────────┘
             │ PUT /user/:userId/status
             │ { status: "Suspended" }
             ↓
       MongoDB
       users.updateOne(
         { _id: userId },
         { $set: { status: "Suspended" } }
       )
             │
             ├─ Log activity
             │  activitylogs.insertOne({
             │    user_id: adminId,
             │    action: "status_suspended"
             │  })
             │
             ↓
     Return 200 OK


Step 4: Update Report Status
┌──────────────────────────────────┐
│  Admin adds notes and marks:      │
│  "Resolved" or "Dismissed"        │
└────────────┬─────────────────────┘
             │ PUT /reports/:reportId/status
             │ { status: "resolved", admin_notes: "..." }
             ↓
       MongoDB
       reports.updateOne(
         { _id: reportId },
         { $set: { status: "resolved", admin_notes: "..." } }
       )
             │
             ↓
     Return 200 OK


Step 5: Verify Changes
┌──────────────────────────────────┐
│  User list updates in real-time:  │
│  - Status badge changes           │
│  - User removed from flagged      │
│  - Activity logged                │
└──────────────────────────────────┘
```

---

## Role-Based Access Matrix

```
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│     Endpoint     │   Patient User   │   Donor User     │   Admin User     │
├──────────────────┼──────────────────┼──────────────────┼──────────────────┤
│ /report-user     │  ✅ YES          │  ✅ YES          │  ✅ YES          │
│                  │  (if logged in)  │  (if logged in)  │  (if logged in)  │
├──────────────────┼──────────────────┼──────────────────┼──────────────────┤
│ /flagged-users   │  ❌ NO           │  ❌ NO           │  ✅ YES          │
│                  │  (403 Forbidden) │  (403 Forbidden) │                  │
├──────────────────┼──────────────────┼──────────────────┼──────────────────┤
│ /all-users-...   │  ❌ NO           │  ❌ NO           │  ✅ YES          │
├──────────────────┼──────────────────┼──────────────────┼──────────────────┤
│ /reports/:userId │  ❌ NO           │  ❌ NO           │  ✅ YES          │
├──────────────────┼──────────────────┼──────────────────┼──────────────────┤
│ /user/:id/status │  ❌ NO           │  ❌ NO           │  ✅ YES          │
├──────────────────┼──────────────────┼──────────────────┼──────────────────┤
│ /reports/.../st. │  ❌ NO           │  ❌ NO           │  ✅ YES          │
├──────────────────┼──────────────────┼──────────────────┼──────────────────┤
│ /activity-logs   │  ❌ NO           │  ❌ NO           │  ✅ YES          │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

---

## Component Hierarchy

```
AdminDashboard
│
├── Header (shared component)
├── AdminSidebar (with navigation)
│   └── Navigation to /admin/users, /admin/moderation, etc.
│
└── Main Content Area (based on route)
    │
    ├── /admin (default)
    │   ├── Welcome section
    │   ├── Stat Cards
    │   ├── FlaggedUsers ⭐ NEW
    │   │   ├── Table of flagged users
    │   │   ├── Report count badges
    │   │   └── Actions dropdown
    │   │
    │   ├── User Distribution
    │   ├── Recent Activity
    │   └── System Status
    │
    ├── /admin/users
    │   └── AdminUserManagement (Updated)
    │       ├── Search bar
    │       ├── Filter dropdowns (role, status)
    │       ├── Users table
    │       │   ├── User info column
    │       │   ├── Role badge
    │       │   ├── Status badge
    │       │   ├── Report count
    │       │   └── Actions (dropdown, Reports button)
    │       │
    │       └── ReportsModal ⭐ NEW (triggered on Reports button)
    │           ├── User info card
    │           ├── Reports list
    │           └── Close button
    │
    ├── /admin/requests
    │   └── AdminRequestsView
    │
    ├── /admin/alerts
    │   └── AdminAlerts
    │
    ├── /admin/tributes
    │   └── AdminTributes
    │
    └── /admin/moderation ⭐ NEW route
        └── FlaggedUsers (standalone view)
```

---

## Request/Response Flow: Status Change

```
┌──────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                              │
├──────────────────────────────────────────────────────────────────┤

User clicks "Suspend" in Actions dropdown
                ↓
setActionLoading(userId)  // Show spinner
                ↓
prepare request body {
  status: "Suspended",
  reason: "..."
}
                ↓
fetch("/api/moderation/user/{userId}/status", {
  method: "PUT",
  headers: {
    "Authorization": "Bearer <TOKEN>",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ status: "Suspended" })
})

└──────────────────────────────────────────────────────────────────┘
                              ↓ HTTP
┌──────────────────────────────────────────────────────────────────┐
│                    BACKEND (Express)                             │
├──────────────────────────────────────────────────────────────────┤

Router receives request
                ↓
authenticate middleware
  ✓ Check Authorization header
  ✓ Verify JWT token
  ✓ Get user from DB
  ✓ Attach to req.user
                ↓
adminOnly middleware
  ✓ Check req.user.role === 'admin'
  ✓ Return 403 if not admin
                ↓
changeUserStatus controller
  ✓ Validate status enum
  ✓ Find target user (return 404 if not found)
  ✓ Check admin not changing own status
  ✓ Update user.status in DB
  ✓ Log activity: "status_suspended"
  ✓ Return 200 OK with update data

└──────────────────────────────────────────────────────────────────┘
                              ↓ HTTP 200
┌──────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                              │
├──────────────────────────────────────────────────────────────────┤

Response received: { success: true, data: {...} }
                ↓
Update local state:
  setUserList(prev => prev.map(u => 
    u._id === userId ? {...u, status: "Suspended"} : u
  ))
                ↓
setActionLoading(null)  // Hide spinner
                ↓
show toast: "User status updated to Suspended"
                ↓
User sees table update with Suspended badge

└──────────────────────────────────────────────────────────────────┘
```

---

## Database Query Execution: Get Flagged Users

```
Frontend Request:
  GET /api/moderation/flagged-users?limit=10&skip=0&sortBy=reportCount

Backend receives query
          ↓
Execute aggregation pipeline on "reports" collection:
          ↓
┌─────────────────────────────────────────────────────────────────┐
│ Stage 1: $lookup (join with users)                              │
│                                                                 │
│ {                                                               │
│   $lookup: {                                                    │
│     from: "users",              // Also available: reports      │
│     localField: "_id",          // on reports                  │
│     foreignField: "reported_user_id",                           │
│     as: "reports"               // In reports schema            │
│   }                                                             │
│ }                                                               │
│                                                                 │
│ Output: Each user doc with embedded reports array              │
└─────────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────────┐
│ Stage 2: $addFields (calculate report count)                    │
│                                                                 │
│ {                                                               │
│   $addFields: {                                                 │
│     reportCount: { $size: "$reports" }                          │
│   }                                                             │
│ }                                                               │
│                                                                 │
│ Output: reportCount field added to each doc                    │
└─────────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────────┐
│ Stage 3: $match (filter for >= 3 reports)                      │
│                                                                 │
│ {                                                               │
│   $match: {                                                     │
│     reportCount: { $gte: 3 }                                    │
│   }                                                             │
│ }                                                               │
│                                                                 │
│ Output: Only users with 3+ reports remain                      │
└─────────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────────┐
│ Stage 4: $sort (order by reportCount desc)                     │
│                                                                 │
│ {                                                               │
│   $sort: {                                                      │
│     reportCount: -1   // -1 = descending                        │
│   }                                                             │
│ }                                                               │
│                                                                 │
│ Output: Sorted by report count high to low                     │
└─────────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────────┐
│ Stage 5: $skip & $limit (pagination)                          │
│                                                                 │
│ { $skip: 0 }
│ { $limit: 10 }
│                                                                 │
│ Output: Return 10 results starting from position 0              │
└─────────────────────────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────────────────────────┐
│ Stage 6: $project (select fields)                              │
│                                                                 │
│ {                                                               │
│   $project: {                                                   │
│     _id: 1,                    // Include ID                   │
│     name: 1,                   // Include name                 │
│     email: 1,                  // Include email                │
│     role: 1,                   // Include role                 │
│     status: 1,                 // Include status               │
│     reportCount: 1,            // Include count                │
│     reports: 0                 // Exclude reports array        │
│   }                                                             │
│ }                                                               │
│                                                                 │
│ Output: Only necessary fields returned                         │
└─────────────────────────────────────────────────────────────────┘
          ↓
MongoDB returns result array
          ↓
Backend formats response:
{
  success: true,
  data: [ user1, user2, user3, ... ],
  pagination: {
    total: 45,
    limit: 10,
    skip: 0,
    pages: 5
  }
}
          ↓
Frontend receives and displays
in FlaggedUsers component table
```

---

## Security Flow: Token Validation

```
Frontend makes request with token:
  fetch(url, {
    headers: {
      "Authorization": "Bearer eyJhbGc..."
    }
  })
          ↓
          HTTP Request
          ↓
Backend receives request
          ↓
Express extracts Authorization header
  authHeader = "Bearer eyJhbGc..."
          ↓
Split and extract token
  token = "eyJhbGc..."
          ↓
Verify JWT with secret
  jwt.verify(token, process.env.JWT_SECRET)
          ↓
┌─ Valid signature?
│  ├─ YES → Continue
│  └─ NO → Return 401 Invalid Token
│
├─ Not expired?
│  ├─ YES → Continue
│  └─ NO → Return 401 Token Expired
│
└─ Extract payload
   userId = decoded.userId
          ↓
Find user in DB
  User.findById(userId)
          ↓
┌─ User found?
│  ├─ YES → Attach to req.user
│  └─ NO → Return 401 User Not Found
          ↓
For admin-only endpoints:
  Check req.user.role === 'admin'
          ↓
┌─ Is admin?
│  ├─ YES → Continue to controller
│  └─ NO → Return 403 Access Denied
          ↓
Execute controller logic
```

---

## State Management Pattern (React)

```
AdminUserManagement Component

┌──────────────────────────────────┐
│         State Variables          │
├──────────────────────────────────┤
│ userList []                      │  // All users from API
│ filteredUsers []                 │  // Search/filter results
│ searchTerm ""                    │  // Search input
│ roleFilter "all"                 │  // Role select
│ statusFilter "all"               │  // Status select
│ loading false                    │  // API loading state
│ error null                       │  // Error message
│ actionLoading null               │  // Button loading ID
│ reportsModalOpen false           │  // Modal visibility
│ selectedUserForReports null      │  // User in modal
└──────────────────────────────────┘
          ↓
        Effects
          ↓
useEffect 1: Fetch users on mount
  → fetchUsers()
          ↓
useEffect 2: Recalculate filteredUsers when filters change
  → Filter userList based on:
    • searchTerm (name/email)
    • roleFilter
    • statusFilter
          ↓
        Event Handlers
          ↓
handleStatusChange(userId, newStatus)
  → Call API PUT /moderation/user/:userId/status
  → Update userList in state
  → Show toast
          ↓
handleViewReports(user)
  → Set selectedUserForReports
  → Open ReportsModal
          ↓
        Render
          ↓
Conditional rendering based on:
  • loading → Show spinner
  • error → Show error message
  • !loading && !error → Show table
    ├── Map filteredUsers to TableRows
    ├── Each row has:
    │  ├── Name/Email
    │  ├── Role badge (color coded)
    │  ├── Status badge (color coded)
    │  ├── Report count badge
    │  └── Actions dropdown
    │
    └── ReportsModal (if selectedUserForReports)
```

---

## Data Validation Pipeline

```
User submits report form

Frontend validates:
  ✓ reported_user_id not empty
  ✓ reason length >= 10
  ✓ reason length <= 1000
  
If validation fails:
  → Show error toast
  → Don't send request
  → Return
          ↓
Send to backend

Backend validates:
          ↓
moderationController.reportUser()
          ↓
┌─ Validate input ─────────────────┐
│ ✓ reported_user_id provided?    │
│ ✓ reason provided?              │
└─────────────────────────────────┘
          ↓
  If invalid → Return 400 Bad Request
          ↓
┌─ Business logic validation ─────┐
│ ✓ Reporting user === Auth user? │
│ ✓ Report user ≠ Reported user?  │
└─────────────────────────────────┘
          ↓
  If fails → Return 400 (self-report)
          ↓
┌─ Database validation ───────────┐
│ ✓ Reported user exists?         │
│ ✓ No duplicate in last 24h?     │
└─────────────────────────────────┘
          ↓
  If fails → Return 400 (duplicate) / 404 (not found)
          ↓
✅ All validations passed
          ↓
Save to database
          ↓
Return 201 Created
```

---

## Performance Optimization Points

```
Frontend Optimization:
├── Client-side filtering (instant UX)
├── Debounced search (reduce API calls)
├── Pagination (limit data transfer)
├── Component memoization (React.memo)
└── Lazy loading of reports modal

Backend Optimization:
├── MongoDB indices on:
│  ├── reported_user_id (for lookups)
│  ├── reported_by_user_id (for filter)
│  ├── createdAt (for sorting)
│  └── status (for filtering)
│
├── Aggregation pipelines (server-side processing)
├── Field projection (exclude unnecessary fields)
├── Query pagination (limit results)
└── Database connection pooling

Data optimization:
├── Store only necessary fields
├── Use lean() queries where possible
├── Index frequently queried fields
├── Archive old resolved reports
└── Cleanup expired sessions
```

---

This completes the comprehensive architecture documentation for the Admin Moderation Module!

All systems are production-ready and fully integrated. 🎉
