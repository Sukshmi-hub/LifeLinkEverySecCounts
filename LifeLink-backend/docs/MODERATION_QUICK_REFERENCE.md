# Admin Moderation Module - Quick Reference

## 🎯 What Was Implemented

### ✅ Backend (Node.js/Express)

**New Models:**
- `User.js` - Added `status` field (Active, Suspended, Blocked)
- `Report.js` - User reports with reason, evidence, status
- `ActivityLog.js` - Track all user and admin actions

**New Controllers:**
- `moderationController.js` - 7 core functions:
  1. `reportUser` - Submit report (public)
  2. `getFlaggedUsers` - Get users with 3+ reports (admin)
  3. `getAllUsersWithReports` - Full user list with report counts (admin)
  4. `getUserReports` - Reports for specific user (admin)
  5. `changeUserStatus` - Suspend/Block/Activate user (admin)
  6. `updateReportStatus` - Update report progress (admin)
  7. `getUserActivityLogs` - Track user actions (admin)

**New Routes:**
- `moderationRoutes.js` - All moderation endpoints
- Registered at `/api/moderation`

**New Middleware:**
- `adminOnly` - Enforces admin-only access

---

### ✅ Frontend (React/Vite)

**New Components:**
1. **AdminUserManagement.jsx** (Enhanced)
   - Display all users with report counts
   - Filter by role and status
   - Shows flagged users (red highlight)
   - Change status (Activate/Suspend/Block)
   - View reports button

2. **ReportsModal.jsx** (New)
   - Modal showing all reports for a user
   - Reporter info, reasons, evidence
   - Report status tracking
   - Admin notes display

3. **FlaggedUsers.jsx** (New)
   - Dashboard section for flagged users (≥3 reports)
   - Quick actions for moderation
   - Zero-state UI when none flagged

**Updated Pages:**
- `AdminDashboard.jsx` - Integrated FlaggedUsers section

---

## 🔗 API Endpoints

### Public (Authenticated Users)
```
POST   /api/moderation/report-user
```

### Admin Only
```
GET    /api/moderation/flagged-users
GET    /api/moderation/all-users-with-reports
GET    /api/moderation/reports/:userId
GET    /api/moderation/activity-logs/:userId
PUT    /api/moderation/user/:userId/status
PUT    /api/moderation/reports/:reportId/status
```

---

## 📊 Database Schemas

### User Status Values
- `Active` - Normal user
- `Suspended` - Temp restriction
- `Blocked` - Banned from platform

### Report Status Values
- `pending` - New report
- `under_review` - Being investigated
- `resolved` - Action taken
- `dismissed` - False report

### Activity Log Actions
- `login`, `logout`, `register`
- `profile_update`, `donation_request`
- `report_filed`, `message_sent`
- `status_suspended`, `status_blocked`, `status_activated`
- `other`

---

## 🚨 Security Rules

✅ **Users can:**
- Report other users (not themselves)
- View their own reports in activity logs

✅ **Admins can:**
- View all users and their report counts
- See all reports for any user
- Change user status (Suspend/Block/Activate)
- Update report progress
- View activity logs

❌ **Preventions:**
- No self-reporting
- No duplicate reports (24-hour cooldown)
- No self-status changes (admins)
- Role-based access enforcement
- Invalid status values rejected

---

## 📱 Frontend Features

### User Management Table
- Real-time data from DB
- Search by name/email
- Filter by role (Patient/Donor/Hospital/NGO/Admin)
- Filter by status (Active/Suspended/Blocked)
- Pagination support
- Report count display
- Flagged user highlighting (red background)

### Flagged Users Section
- Automatic highlighting when ≥3 reports
- Quick view reports button
- Direct action dropdown
- Summary badge showing count

### Reports Modal
- Full report details
- Reporter information
- Evidence links
- Admin notes
- Timestamps
- Status badges

---

## 🔄 Typical Workflows

### Reporting Workflow
```
User A → Fill report form
      ↓
Validate (not self, not duplicate)
      ↓
Save to Reports table
      ↓
Log activity for User A
      ↓
Success message
```

### Moderation Workflow
```
Admin → Visit Admin Dashboard
     ↓
View Flagged Users section
     ↓
Click "Reports" for user
     ↓
Review reports in modal
     ↓
Make decision
     ↓
Click action (Suspend/Block/Activate)
     ↓
User status updated in DB
     ↓
Activity logged
```

---

## 📦 File Structure

### Backend
```
src/
├── models/
│   ├── User.js (updated)
│   ├── Report.js (new)
│   └── ActivityLog.js (new)
├── controllers/
│   └── moderationController.js (new)
├── routes/
│   └── moderationRoutes.js (new)
├── middleware/
│   └── roleMiddleware.js (updated - added adminOnly)
└── app.js (updated - register routes)
```

### Frontend
```
src/
├── components/admin/
│   ├── AdminUserManagement.jsx (updated)
│   ├── ReportsModal.jsx (new)
│   └── FlaggedUsers.jsx (new)
└── pages/admin/
    └── AdminDashboard.jsx (updated)
```

---

## 🎯 Key Numbers

- **Flagging Threshold:** 3+ reports = flagged
- **Report Cooldown:** 24 hours (prevent spam)
- **Status Values:** 3 (Active, Suspended, Blocked)
- **Report Status Values:** 4 (pending, under_review, resolved, dismissed)
- **Activity Log Actions:** 11 predefined + custom

---

## 🧪 Testing

### Test as User
```bash
# Report another user
POST /api/moderation/report-user
{
  "reported_user_id": "userId",
  "reason": "Inappropriate messages"
}
```

### Test as Admin
```bash
# Get flagged users
GET /api/moderation/flagged-users

# Get reports for user
GET /api/moderation/reports/:userId

# Change user status
PUT /api/moderation/user/:userId/status
{
  "status": "Suspended"
}
```

---

## 💡 Design Decisions

1. **No Auto-Blocking:** Admin must review and decide
2. **Activity Logging:** Complete audit trail
3. **Real Data Only:** No mocks, 100% database-driven
4. **Pagination:** All lists paginated for scale
5. **Soft Moderation:** Status = Suspended (not delete)
6. **Evidence Storage:** URLs/paths, not file uploads
7. **24-Hour Cooldown:** Prevent report spam

---

## 🔧 Next Steps (Optional Enhancements)

- [ ] Email notifications to user when suspended
- [ ] Batch report exports for analysis
- [ ] Auto-escalation rules (5+ reports auto-suspend)
- [ ] Report scheduling (batch updates)
- [ ] Analytics dashboard for moderation trends
- [ ] Appeal system for suspended users
- [ ] Mod team assignments
- [ ] Automated rule engine

---

## 📞 Support

**For Database Issues:**
- Check MongoDB indices: `db.reports.getIndexes()`
- Verify collections exist: `show collections`

**For API Issues:**
- Check token in header: `Authorization: Bearer <token>`
- Verify admin role in JWT token

**For Frontend Issues:**
- Check serverUrl in config
- Verify component imports
- Check browser console for errors

---

**Version:** 1.0.0  
**Status:** ✅ Production Ready  
**Last Updated:** January 2024
