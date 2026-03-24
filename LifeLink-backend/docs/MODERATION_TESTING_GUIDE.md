# Admin Moderation Module - Testing Guide

## 🧪 Pre-Testing Checklist

- [ ] Backend server running (`npm start`)
- [ ] Frontend dev server running (`npm run dev`)
- [ ] MongoDB connection active
- [ ] Admin user account available
- [ ] At least 2 regular users created
- [ ] Browser DevTools open (F12)

---

## 1️⃣ Backend API Testing

### Using Postman or cURL

#### A. Create Test Users (if needed)

```bash
# Register user 1
POST http://localhost:5000/api/auth/register
{
  "name": "Test User 1",
  "email": "testuser1@example.com",
  "password": "password123",
  "role": "donor"
}

# Register user 2
POST http://localhost:5000/api/auth/register
{
  "name": "Test User 2",
  "email": "testuser2@example.com",
  "password": "password123",
  "role": "patient"
}

# Register admin
POST http://localhost:5000/api/auth/register
{
  "name": "Admin User",
  "email": "admin@example.com",
  "password": "password123",
  "role": "admin"
}
```

#### B. Get Auth Tokens

```bash
# Login as user 1
POST http://localhost:5000/api/auth/login
{
  "email": "testuser1@example.com",
  "password": "password123"
}
# Copy token from response

# Login as admin
POST http://localhost:5000/api/auth/login
{
  "email": "admin@example.com",
  "password": "password123"
}
# Copy token from response
```

#### C. Test Report User Endpoint

```bash
# As User 1, report User 2
POST http://localhost:5000/api/moderation/report-user
Header: Authorization: Bearer <USER1_TOKEN>
{
  "reported_user_id": "USER2_ID",
  "reason": "Inappropriate behavior and offensive messages",
  "description": "This user sent derogatory comments in the chat section",
  "evidence": ["https://example.com/screenshot1.png"]
}

Expected Response: 201 Created
{
  "success": true,
  "message": "Report submitted successfully",
  "data": { ...report data... }
}
```

#### D. Submit Multiple Reports (To Flag User)

Repeat step C at least 3 times with different reporters to get `reportCount >= 3`

#### E. Test Get Flagged Users

```bash
# As Admin
GET http://localhost:5000/api/moderation/flagged-users?limit=10
Header: Authorization: Bearer <ADMIN_TOKEN>

Expected Response: 200 OK
{
  "success": true,
  "data": [
    {
      "_id": "USER2_ID",
      "name": "Test User 2",
      "email": "testuser2@example.com",
      "reportCount": 3,
      "isFlagged": true,
      "status": "Active"
    }
  ],
  "pagination": { ... }
}
```

#### F. Test Get All Users with Reports

```bash
GET http://localhost:5000/api/moderation/all-users-with-reports
Header: Authorization: Bearer <ADMIN_TOKEN>

Expected Response: 200 OK
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "...",
      "reportCount": 3,
      "isFlagged": true
    },
    {
      "_id": "...",
      "name": "...",
      "reportCount": 1,
      "isFlagged": false
    }
  ]
}
```

#### G. Test Get Reports for Specific User

```bash
GET http://localhost:5000/api/moderation/reports/USER2_ID
Header: Authorization: Bearer <ADMIN_TOKEN>

Expected Response: 200 OK
{
  "success": true,
  "data": {
    "user": { ... },
    "reports": [
      {
        "_id": "...",
        "reason": "Inappropriate behavior",
        "reported_by_user_id": { ... },
        "status": "pending",
        "createdAt": "2024-01-01T..."
      }
    ],
    "totalCount": 3
  }
}
```

#### H. Test Change User Status

```bash
PUT http://localhost:5000/api/moderation/user/USER2_ID/status
Header: Authorization: Bearer <ADMIN_TOKEN>
{
  "status": "Suspended",
  "reason": "Multiple reports requiring action"
}

Expected Response: 200 OK
{
  "success": true,
  "message": "User status updated to Suspended",
  "data": {
    "userId": "USER2_ID",
    "oldStatus": "Active",
    "newStatus": "Suspended"
  }
}
```

#### I. Test Update Report Status

```bash
PUT http://localhost:5000/api/moderation/reports/REPORT_ID/status
Header: Authorization: Bearer <ADMIN_TOKEN>
{
  "status": "resolved",
  "admin_notes": "User suspended for rule violation"
}

Expected Response: 200 OK
{
  "success": true,
  "message": "Report status updated successfully",
  "data": { ... }
}
```

#### J. Test Activity Logs

```bash
GET http://localhost:5000/api/moderation/activity-logs/USER1_ID
Header: Authorization: Bearer <ADMIN_TOKEN>

Expected Response: 200 OK
{
  "success": true,
  "data": [
    {
      "action": "report_filed",
      "description": "Reported user...",
      "createdAt": "2024-01-01T..."
    }
  ]
}
```

---

## 2️⃣ Security Testing

### A. Test Self-Reporting Prevention

```bash
# As User 1, try to report themselves
POST http://localhost:5000/api/moderation/report-user
Header: Authorization: Bearer <USER1_TOKEN>
{
  "reported_user_id": "USER1_ID",
  "reason": "Testing self-report"
}

Expected Response: 400 Bad Request
{
  "success": false,
  "message": "You cannot report yourself"
}
```

### B. Test Duplicate Report Prevention

```bash
# Submit same report twice quickly
POST http://localhost:5000/api/moderation/report-user
(same data as before)

Expected Response: 400 Bad Request
{
  "success": false,
  "message": "You have already reported this user in the last 24 hours"
}
```

### C. Test Admin-Only Access

```bash
# As regular user, try to access admin endpoint
GET http://localhost:5000/api/moderation/flagged-users
Header: Authorization: Bearer <USER1_TOKEN>

Expected Response: 403 Forbidden
{
  "success": false,
  "message": "Access denied: admin only"
}
```

### D. Test Missing Token

```bash
GET http://localhost:5000/api/moderation/flagged-users
(no Authorization header)

Expected Response: 401 Unauthorized
{
  "success": false,
  "message": "No token provided. Please login."
}
```

---

## 3️⃣ Frontend UI Testing

### A. Admin Dashboard

1. **Login as Admin**
   - Visit `/admin`
   - Dashboard should load displaying:
     - User distribution stats
     - Recent activity
     - System health

2. **Navigate to Users**
   - Click "Users" in sidebar
   - Should see `AdminUserManagement` component
   - Table displays all users with columns:
     - [ ] User name/email
     - [ ] Role badge
     - [ ] Status badge
     - [ ] Report count
     - [ ] Actions dropdown

3. **Verify Flagged Users Section**
   - Scroll down on dashboard
   - Should see "Flagged Users" section
   - Users with ≥3 reports highlighted in red
   - Shows report count badge

### B. Search & Filter Testing

```
In AdminUserManagement:

1. Search by name
   - Type "Test User"
   - Should filter results

2. Search by email
   - Type "user1@"
   - Should filter results

3. Filter by role
   - Select "Donor"
   - Should only show donors

4. Filter by status
   - Select "Suspended"
   - Should only show suspended users

5. Combine filters
   - Filter by role + status
   - Should show intersection
```

### C. User Action Testing

```
1. Click "Reports" button on flagged user
   - Should open ReportsModal
   - Shows all reports for that user
   - Displays reporter info
   - Shows report reason/description

2. Click "Suspend" in dropdown
   - Should update status to "Suspended"
   - Toast notification appears
   - Row should update to show new status

3. Click "Block" in dropdown
   - Should update status to "Blocked"
   - User disappears from Active users filter

4. Click "Activate" in dropdown
   - Should set status back to "Active"
   - User reappears in normal list
```

### D. Reports Modal Testing

```
1. Click "Reports" on any user with reports
   - Modal opens with user info
   - Title shows "Reports for [Name]"
   - Displays number of reports

2. Each report card should show:
   - [ ] Report reason
   - [ ] Report status badge
   - [ ] Timestamp
   - [ ] Reporter info (avatar, name, email, role)
   - [ ] Description (if provided)
   - [ ] Evidence links (if provided)
   - [ ] Admin notes (if any)

3. Test scrolling
   - If many reports, scroll within modal
   - Should not close when scrolling

4. Close modal
   - Click "Close" button
   - Click outside modal
   - Both should close modal
```

### E. Flagged Users Section

```
1. Verify appearance
   - Section has red header
   - AlertOctagon icon visible
   - Badge showing count of flagged users

2. Test with no flagged users
   - Remove reports to get below threshold
   - Should show "No flagged users" message
   - Zero-state UI displayed

3. Test with flagged users
   - Users highlighted with red background
   - Flagged users table displays
   - Quick action buttons available
```

---

## 4️⃣ Database Verification

### Check Models Created

```javascript
// In MongoDB Shell
use lifelink

// Check User model
db.users.findOne({ email: "testuser1@example.com" })
// Should have "status" field

// Check Report model collection
db.reports.findOne({})
// Should show report with fields

// Check ActivityLog model collection
db.activitylogs.findOne({})
// Should show activity entries
```

### Verify Indices

```javascript
// Check Report indices
db.reports.getIndexes()
// Should include: reported_user_id, reported_by_user_id, createdAt, status

// Check ActivityLog indices
db.activitylogs.getIndexes()
// Should include: user_id, createdAt, action
```

### Count Test Data

```javascript
// Count total reports
db.reports.countDocuments({})
// Should match test reports submitted

// Count reports for specific user
db.reports.countDocuments({ reported_user_id: ObjectId("USER2_ID") })
// Should be >= 3 if user is flagged

// Count activity logs
db.activitylogs.countDocuments({})
// Should have entries for each action
```

---

## 5️⃣ Error Handling Testing

### A. Invalid Status Value

```bash
PUT http://localhost:5000/api/moderation/user/USER_ID/status
{
  "status": "InvalidStatus"
}

Expected: 400 Bad Request
```

### B. Non-existent User

```bash
GET http://localhost:5000/api/moderation/reports/INVALID_ID
Header: Authorization: Bearer <ADMIN_TOKEN>

Expected: 404 Not Found
```

### C. Network Error Simulation

```
1. Stop backend server
2. Try to use admin dashboard
3. Should show error message and retry button
4. Restart backend
5. Click retry
6. Should recover
```

---

## 6️⃣ Performance Testing

### A. Pagination Test

```bash
# Get users with pagination
GET /api/moderation/all-users-with-reports?limit=5&skip=0

# Next page
GET /api/moderation/all-users-with-reports?limit=5&skip=5

# Should return different results
```

### B. Sorting Test

```bash
# Sort by report count
GET /api/moderation/flagged-users?sortBy=reportCount

# Sort by creation date
GET /api/moderation/flagged-users?sortBy=createdAt

# Results should differ
```

### C. Search Performance

```
1. Open admin users page
2. Type "test" in search
3. Should filter instantly
4. No server request needed (client-side filtering)
```

---

## 7️⃣ Edge Cases

### A. Empty States

- [ ] No users exist
- [ ] No reports exist
- [ ] No flagged users
- [ ] User has no activity logs

### B. Boundary Conditions

- [ ] User with exactly 3 reports (threshold)
- [ ] User with 2 reports (just below threshold)
- [ ] User with 100+ reports
- [ ] Very long report reason (1000 chars)

### C. Concurrent Operations

- [ ] Two admins changing same user status
- [ ] User reports while admin suspends
- [ ] Multiple reports submitted quickly

---

## ✅ Final Checklist

- [ ] All API endpoints return correct status codes
- [ ] All error messages are descriptive
- [ ] Frontend components render without errors
- [ ] Data persists in database
- [ ] Pagination works correctly
- [ ] Filters work as expected
- [ ] Security validations pass
- [ ] Activity logs are created
- [ ] No console errors
- [ ] Network requests show correct headers
- [ ] Timestamps are accurate
- [ ] Badges and indicators display correctly
- [ ] Modal opens/closes smoothly
- [ ] Status changes visible immediately
- [ ] Report counts update correctly

---

## 📝 Test Results Template

```
Date: _______________
Tester: _______________
Environment: _______________

Backend Tests:
✓ Report submission: PASS / FAIL
✓ Get flagged users: PASS / FAIL
✓ Change user status: PASS / FAIL
✓ Activity logging: PASS / FAIL

Security Tests:
✓ Self-report prevention: PASS / FAIL
✓ Duplicate prevention: PASS / FAIL
✓ Admin-only access: PASS / FAIL
✓ Token validation: PASS / FAIL

Frontend Tests:
✓ Admin dashboard loads: PASS / FAIL
✓ User management displays: PASS / FAIL
✓ Flagged users section: PASS / FAIL
✓ Reports modal opens: PASS / FAIL

Overall Status: ✅ READY FOR PRODUCTION / ⚠️ ISSUES FOUND

Issues Found:
1. _______________
2. _______________
```

---

**Note:** Run all tests in both Chrome and Firefox for browser compatibility.
