# Admin Moderation Module - Implementation Guide

## Overview
A complete real data-driven Admin Moderation system for the LifeLink platform with user reporting, flagging, and admin control capabilities.

---

## 📋 Table of Contents
1. [Database Schema](#database-schema)
2. [Backend APIs](#backend-apis)
3. [Frontend Components](#frontend-components)
4. [Security Features](#security-features)
5. [Usage Guide](#usage-guide)
6. [API Examples](#api-examples)

---

## 🗄️ Database Schema

### 1. User Model (Enhanced)
**File:** `src/models/User.js`

New field added:
```javascript
status: {
  type: String,
  enum: ['Active', 'Suspended', 'Blocked'],
  default: 'Active',
}
```

**States:**
- `Active` - Normal user, can perform all functions
- `Suspended` - Temporary restriction, cannot report but can access platform
- `Blocked` - Complete access restriction, cannot access platform

---

### 2. Report Model
**File:** `src/models/Report.js`

Schema:
```javascript
{
  reported_user_id: ObjectId (FK → User),      // User being reported
  reported_by_user_id: ObjectId (FK → User),   // Person filing report
  reason: String (required, 10-1000 chars),    // Why user is reported
  description: String (optional),              // Detailed explanation
  status: String (pending|under_review|resolved|dismissed), // Report progress
  admin_notes: String,                         // Admin's comments
  evidence: [String],                          // URLs/file paths
  createdAt: DateTime,
  updatedAt: DateTime
}
```

**Indices:**
- `reported_user_id`
- `reported_by_user_id`
- `createdAt`
- `status`

---

### 3. ActivityLog Model
**File:** `src/models/ActivityLog.js`

Schema:
```javascript
{
  user_id: ObjectId (FK → User),        // User performing action
  action: String (enum),                 // Action type
  description: String,                   // Details about action
  ip_address: String,                    // Optional IP tracking
  user_agent: String,                    // Optional device info
  metadata: Mixed,                       // Additional context
  createdAt: DateTime
}
```

**Supported Actions:**
- `login`, `logout`, `register`
- `profile_update`, `donation_request`
- `report_filed`, `message_sent`
- `status_suspended`, `status_blocked`, `status_activated`
- `other`

---

## 🔌 Backend APIs

### Base URL: `/api/moderation`

### 1. Report User (Public)

**POST** `/report-user`

**Access:** Authenticated users (any role)

**Request Body:**
```json
{
  "reported_user_id": "userId",
  "reason": "Inappropriate behavior (min 10 chars)",
  "description": "Detailed description of issue",
  "evidence": ["url1", "url2"]  // Optional
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Report submitted successfully",
  "data": {
    "_id": "reportId",
    "reported_user_id": "userId",
    "reported_by_user_id": "reportingUserId",
    "reason": "...",
    "status": "pending",
    "createdAt": "2024-01-01T10:00:00Z"
  }
}
```

**Validation:**
- ✅ User is authenticated
- ✅ Cannot report self
- ✅ Target user exists
- ✅ Only one report per user per 24 hours

---

### 2. Get Flagged Users

**GET** `/flagged-users?limit=10&skip=0&sortBy=reportCount`

**Access:** Admin only

**Query Parameters:**
- `limit` - Results per page (default: 10)
- `skip` - Pagination offset (default: 0)
- `sortBy` - Sort field: `reportCount` or `createdAt`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Flagged users retrieved successfully",
  "data": [
    {
      "_id": "userId",
      "name": "User Name",
      "email": "user@email.com",
      "role": "donor",
      "status": "Active",
      "reportCount": 5,
      "isFlagged": true
    }
  ],
  "pagination": {
    "total": 12,
    "limit": 10,
    "skip": 0,
    "pages": 2
  }
}
```

**Flagging Criteria:** `reportCount >= 3`

---

### 3. Get All Users with Reports

**GET** `/all-users-with-reports?role=patient&status=Active&limit=20&skip=0`

**Access:** Admin only

**Query Parameters:**
- `role` - Filter by role (optional)
- `status` - Filter by status (optional)
- `limit` - Results per page (default: 20)
- `skip` - Pagination offset (default: 0)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Users with reports retrieved successfully",
  "data": [
    {
      "_id": "userId",
      "name": "User Name",
      "email": "user@email.com",
      "role": "patient",
      "status": "Active",
      "reportCount": 2,
      "isFlagged": false,
      "createdAt": "2024-01-01T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 156,
    "limit": 20,
    "skip": 0,
    "pages": 8
  }
}
```

---

### 4. Get Reports for User

**GET** `/reports/:userId?limit=50&skip=0`

**Access:** Admin only

**Parameters:**
- `userId` - User ID to get reports for
- `limit` - Results per page (default: 50)
- `skip` - Pagination offset (default: 0)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Reports retrieved successfully",
  "data": {
    "user": {
      "_id": "userId",
      "name": "User Name",
      "email": "user@email.com",
      "role": "donor",
      "status": "Active"
    },
    "reports": [
      {
        "_id": "reportId",
        "reason": "Inappropriate language",
        "description": "Used offensive language in messages",
        "status": "pending",
        "admin_notes": null,
        "evidence": [],
        "reported_by_user_id": {
          "_id": "reporterId",
          "name": "Reporter Name",
          "email": "reporter@email.com",
          "role": "patient"
        },
        "createdAt": "2024-01-01T10:00:00Z"
      }
    ],
    "totalCount": 1,
    "pagination": {
      "limit": 50,
      "skip": 0,
      "pages": 1
    }
  }
}
```

---

### 5. Change User Status

**PUT** `/user/:userId/status`

**Access:** Admin only

**Parameters:**
- `userId` - User ID to modify

**Request Body:**
```json
{
  "status": "Suspended",  // "Active", "Suspended", or "Blocked"
  "reason": "Multiple violations"  // Optional
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User status updated to Suspended",
  "data": {
    "userId": "userId",
    "name": "User Name",
    "email": "user@email.com",
    "oldStatus": "Active",
    "newStatus": "Suspended"
  }
}
```

**Validation:**
- ✅ Admin cannot change own status
- ✅ Valid status values only
- ✅ User exists

---

### 6. Update Report Status

**PUT** `/reports/:reportId/status`

**Access:** Admin only

**Parameters:**
- `reportId` - Report ID to update

**Request Body:**
```json
{
  "status": "resolved",  // "pending", "under_review", "resolved", "dismissed"
  "admin_notes": "User has been warned"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Report status updated successfully",
  "data": {
    "_id": "reportId",
    "status": "resolved",
    "admin_notes": "User has been warned",
    "updatedAt": "2024-01-01T11:30:00Z"
  }
}
```

---

### 7. Get Activity Logs

**GET** `/activity-logs/:userId?limit=50&skip=0`

**Access:** Admin only

**Parameters:**
- `userId` - User ID to get logs for

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Activity logs retrieved successfully",
  "data": [
    {
      "_id": "logId",
      "user_id": "userId",
      "action": "login",
      "description": "User logged in",
      "createdAt": "2024-01-01T10:00:00Z"
    },
    {
      "_id": "logId",
      "user_id": "userId",
      "action": "report_filed",
      "description": "Reported user XYZ",
      "createdAt": "2024-01-01T10:15:00Z"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 50,
    "skip": 0,
    "pages": 1
  }
}
```

---

## 🎨 Frontend Components

### 1. AdminUserManagement Component
**File:** `src/components/admin/AdminUserManagement.jsx`

**Features:**
- ✅ Real-time user list from database
- ✅ Search by name/email
- ✅ Filter by role and status
- ✅ Display report count per user
- ✅ Flag visual indicator (red highlight when ≥3 reports)
- ✅ View reports button
- ✅ Status change actions (Activate, Suspend, Block)
- ✅ Pagination support

**Props:** None (self-contained)

**Data Source:** `/api/moderation/all-users-with-reports`

---

### 2. ReportsModal Component
**File:** `src/components/admin/ReportsModal.jsx`

**Features:**
- ✅ Modal dialog with reports list
- ✅ Reporter information per report
- ✅ Report details and notes
- ✅ Status badge for each report
- ✅ Formatted timestamps
- ✅ Evidence links

**Props:**
```javascript
{
  isOpen: Boolean,          // Modal visibility
  onClose: Function,        // Close handler
  user: Object {            // User data
    _id: String,
    name: String,
    email: String,
    role: String
  }
}
```

**Data Source:** `/api/moderation/reports/:userId`

---

### 3. FlaggedUsers Component
**File:** `src/components/admin/FlaggedUsers.jsx`

**Features:**
- ✅ Highlight users with ≥3 reports
- ✅ Red background for flagged users
- ✅ Report count badge
- ✅ Quick access to reports
- ✅ Status change actions
- ✅ Zero-state UI when no flagged users

**Props:** None (self-contained)

**Data Source:** `/api/moderation/flagged-users`

---

## 🔐 Security Features

### Authentication & Authorization

1. **Token-Based Authentication**
   - All endpoints require JWT token in Authorization header
   - `Authorization: Bearer <token>`

2. **Role-Based Access Control**
   - Public endpoints: Any authenticated user
   - Admin endpoints: Only users with `role: 'admin'`
   - `adminOnly` middleware enforces restriction

3. **Self-Action Prevention**
   - Users cannot report themselves
   - Admins cannot change own status
   - Time-based duplicate prevention (24-hour cooldown)

### Data Validation

- ✅ Reason length: 10-1000 characters
- ✅ Description: max 2000 characters
- ✅ Strong typing on all enums (status, action)
- ✅ User existence verification before operations
- ✅ Unique checks on reports

### Activity Logging

Every moderation action is logged:
- Admin status changes
- Report submissions
- Report status updates
- All tracked with timestamps

---

## 📖 Usage Guide

### For Regular Users (Reporting)

1. **Report a User:**
   ```javascript
   POST /api/moderation/report-user
   {
     "reported_user_id": "<userId>",
     "reason": "Offensive behavior in messages",
     "description": "User sent derogatory comments on...",
     "evidence": ["url_to_screenshot"]
   }
   ```

2. **Can't report:**
   - Yourself
   - Same user twice in 24 hours
   - Non-existent users

### For Admins (Moderation)

1. **View Flagged Users:**
   ```javascript
   GET /api/moderation/flagged-users
   ```
   Shows users with 3+ reports, sorted by report count

2. **Check Specific Reports:**
   ```javascript
   GET /api/moderation/reports/<userId>
   ```
   View all reports for a user with reporter details

3. **Take Action:**
   ```javascript
   PUT /api/moderation/user/<userId>/status
   {
     "status": "Suspended"  // or "Blocked"
   }
   ```

4. **Update Report Status:**
   ```javascript
   PUT /api/moderation/reports/<reportId>/status
   {
     "status": "resolved",
     "admin_notes": "User warned, violation noted"
   }
   ```

---

## 💾 Database Indices

The following indices are created for performance:

### Report Model
```javascript
{ reported_user_id: 1 }       // Fast lookup by reported user
{ reported_by_user_id: 1 }    // Fast lookup by reporter
{ createdAt: -1 }             // Timestamp queries
{ status: 1 }                 // Status filtering
```

### ActivityLog Model
```javascript
{ user_id: 1 }                // Fast user activity lookup
{ createdAt: -1 }             // Recent activity queries
{ action: 1 }                 // Action filtering
```

---

## 🔍 Aggregation Pipelines

### Flagged Users Pipeline
```javascript
[
  $lookup: reports,
  $addFields: reportCount,
  $match: { reportCount: { $gte: 3 } },
  $sort: { reportCount: -1 },
  $pagination,
  $project: necessary fields
]
```

### All Users with Reports
```javascript
[
  $lookup: reports,
  $addFields: reportCount and isFlagged,
  $match: optional filters,
  $sort: by reportCount/name/date,
  $pagination,
  $project: all user data
]
```

---

## 📊 Example Workflows

### Reporting Workflow
```
User A → Reports User B
   ↓
Report saved in DB with status="pending"
   ↓
Admin views reports via dashboard
   ↓
Admin decides action
   ↓
Admin updates User B's status
   ↓
Admin closes report with status="resolved"
```

### Escalation Workflow
```
Report 1 → User X (1 report)
Report 2 → User X (2 reports)
Report 3 → User X (3 reports) ← FLAG!
   ↓
User X appears in "Flagged Users"
   ↓
Admin reviews reports
   ↓
Admin can Suspend/Block User X
   ↓
All new reports for User X are handled quickly
```

---

## 🚀 Deployment Checklist

- [ ] Models created and indexed
- [ ] Controllers implemented
- [ ] Routes registered in app.js
- [ ] Middleware added (adminOnly)
- [ ] Frontend components created
- [ ] API endpoints tested
- [ ] Error handling verified
- [ ] Security validation reviewed
- [ ] Database indices created
- [ ] Activity logging working

---

## 🐛 Troubleshooting

### Issue: Users not appearing in flagged list
**Solution:** Check if they have 3+ reports in database. Run:
```javascript
db.reports.countDocuments({ reported_user_id: "<userId>" })
```

### Issue: Status change fails
**Solution:** Verify user exists and token is admin role

### Issue: Reports not showing
**Solution:** Check report status is not null, verify reported_user_id exists

---

## 📌 Important Notes

1. **No Auto-Blocking:** System flags users for admin review but doesn't auto-block. Admin decides action.

2. **Activity Logging:** Every moderation action is logged for audit trail.

3. **Real Data Only:** No mocks, no hardcoded data. All data from database.

4. **Pagination:** All list endpoints support pagination for performance.

5. **Time Zones:** Timestamps are in UTC/ISO format.

---

## 📞 API Response Codes

- `200` - Success
- `201` - Created
- `400` - Bad request (validation error)
- `401` - Unauthorized (no token)
- `403` - Forbidden (not admin)
- `404` - Not found
- `500` - Server error

---

**Last Updated:** January 2024
**Version:** 1.0.0
**Maintainer:** Admin Team
