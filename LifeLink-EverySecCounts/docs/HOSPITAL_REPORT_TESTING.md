# Hospital Report Feature - Testing Guide

## Pre-Testing Setup

### 1. Ensure Backend is Running
```bash
cd LifeLink-backend
npm start
# Should be running on http://localhost:5000
```

### 2. Ensure Frontend is Running
```bash
cd LifeLink-EverySecCounts
npm run dev
# Should be running on http://localhost:5173
```

### 3. Authentication
- Login as hospital staff to access Manage Requests page
- Ensure you have valid hospital credentials
- Token will be stored in localStorage

---

## Test Case 1: Report a Patient

### Steps:
1. Navigate to Hospital Dashboard
2. Click "Manage Requests" tab
3. In the "Patient Organ Requests" section, find any patient request
4. Click the **flag/alert icon** (⚠️) next to the patient name
5. Modal should open showing:
   - Title: "Report Patient"
   - Subtitle: "Report [Patient Name] to the admin team..."
   - Empty reason dropdown
   - Empty additional details textarea

### Verification:
- [ ] Modal appears on screen
- [ ] Patient name is correctly displayed
- [ ] Modal is properly styled with warning colors
- [ ] Close (X) button works if clicked
- [ ] "Cancel" button closes modal without submitting

---

## Test Case 2: Fill Patient Report Form

### Steps:
1. Keep modal open from Test Case 1
2. Click "Reason" dropdown
3. Verify all options appear:
   - Suspicious Activity
   - Inappropriate Behavior
   - Fraudulent Information
   - Harassment
   - Misuse of Platform
   - False Medical Records
   - Other
4. Select "Suspicious Activity"
5. In "Additional Details" field, type: "Multiple inconsistencies in medical records"

### Verification:
- [ ] Dropdown opens smoothly
- [ ] All 7 reasons are visible
- [ ] Reason can be selected
- [ ] Selected value appears in dropdown
- [ ] Text can be typed in textarea
- [ ] Character count works (if implemented)

---

## Test Case 3: Submit Patient Report

### Steps:
1. Continue from Test Case 2 (form filled with reason + details)
2. Click "Submit Report" button
3. Observe:
   - Button should show loading spinner
   - Button text changes to "Submitting..."
   - Button becomes disabled
4. Wait for response (typically 1-2 seconds)

### Verification:
- [ ] Submit button shows loading state
- [ ] Network request appears in browser DevTools
- [ ] Request goes to: `POST /api/moderation/report-user`
- [ ] Request includes correct user ID
- [ ] Modal closes after submission
- [ ] Toast notification appears:
   - Text: "Patient reported successfully"
   - Description: "Admins will review this report and take appropriate action"
   - Color: Green/success

---

## Test Case 4: Report a Donor

### Steps:
1. In Manage Requests page, click "Donors" tab
2. Find any donor in "Donor Availability" section
3. Click the **flag/alert icon** (⚠️) next to the donor name
4. Modal should open showing:
   - Title: "Report Donor"
   - Donor name pre-filled

### Verification:
- [ ] Modal appears correctly
- [ ] Shows "Donor" type (not "Patient")
- [ ] Donor name is displayed accurately

### Continue Testing:
5. Select reason: "Fraudulent Information"
6. Add details: "Falsified medical certificates"
7. Click "Submit Report"

### Verification:
- [ ] Report submits successfully
- [ ] Toast shows "Donor reported successfully"
- [ ] Modal closes

---

## Test Case 5: Form Validation

### Steps:
1. Open Report modal (any patient/donor)
2. Leave "Reason" dropdown empty
3. Try clicking "Submit Report" button

### Verification:
- [ ] Submit button should be **disabled** (grayed out)
- [ ] Button text may show "Submit Report" (disabled state)
- [ ] Cannot click submit without reason selected
- [ ] If form allows submission, alert appears: "Please select a reason"

---

## Test Case 6: Error Handling

### Test 6a: Network Error
**Pre-condition:** Stop backend server
- [ ] Click Report button
- [ ] Fill form with reason + details
- [ ] Click Submit
- [ ] Error toast appears: "Failed to submit report"
- [ ] Description shows network error

### Test 6b: Invalid User ID
**If applicable:**
- [ ] Report displays friendly error message
- [ ] Error toast shows helpful info
- [ ] User can try again

---

## Test Case 7: Multiple Reports

### Steps:
1. Report the same patient 3 times:
   - 1st report: "Suspicious Activity" + details
   - 2nd report: "Inappropriate Behavior" + details
   - 3rd report: "False Medical Records" + details
2. After 3rd report, navigate to **Admin Dashboard**
3. Go to **Flagged Users** section

### Verification:
- [ ] Each report submits successfully
- [ ] No errors on 2nd/3rd report (no duplicate prevention on hospital side)
- [ ] Admin dashboard shows patient with:
     - Red background (flagged)
     - Report count badge showing "3+"
     - Most common reason
     - Quick action buttons (Warn, Suspend, etc.)

---

## Test Case 8: UI Consistency

### Patient Report Button:
- [ ] Located between "Details" (Eye icon) and "Check Mark" buttons
- [ ] Shows AlertOctagon icon
- [ ] Uses warning/amber color scheme
- [ ] Same size as other buttons (size="sm")
- [ ] Hover effect works
- [ ] Tooltip shows: "Report this patient to admin"

### Donor Report Button:
- [ ] Located between "Details" and "Check Mark" buttons  
- [ ] Same icon and styling as patient button
- [ ] Tooltip shows: "Report this donor to admin"
- [ ] Consistent with overall page design

---

## Test Case 9: Form Reset

### Steps:
1. Open Report modal for patient A
2. Select reason: "Suspicious Activity"
3. Add details: "Test details"
4. Click Submit
5. After success, open Report modal again for patient B

### Verification:
- [ ] New modal opens
- [ ] Reason dropdown is **empty** (reset from previous report)
- [ ] Details textarea is **empty** (reset from previous report)
- [ ] Patient B name is correctly shown
- [ ] Form has fresh state for new report

---

## Test Case 10: Mobile Responsiveness (if applicable)

### Steps (on mobile device or browser viewport < 768px):
1. Open Hospital Dashboard on mobile
2. Navigate to Manage Requests
3. Click Report button
4. Modal should open and be responsive

### Verification:
- [ ] Modal fits on screen
- [ ] Buttons are clickable (not too small)
- [ ] Form fields are readable
- [ ] Dropdown works on mobile
- [ ] Textarea is usable

---

## Browser Developer Tools Verification

### Open DevTools (F12) and check:

#### Network Tab:
```
POST /api/moderation/report-user HTTP/1.1
Authorization: Bearer <token>
Content-Type: application/json

{
  "reported_user_id": "...",
  "reason": "Suspicious Activity",
  "description": "..."
}
```
- [ ] Request status: 201 Created (success) or 400/404 (error)

#### Console Tab:
- [ ] No JavaScript errors
- [ ] Success message logged (if console.log implemented)
- [ ] Verify reported_user_id is present and valid

#### Application Tab (Storage):
- [ ] Token still present in localStorage
- [ ] Hospital data still accessible

---

## Expected Request/Response

### Successful Report:
```
Status: 201 Created

Response Body:
{
  "success": true,
  "message": "Report submitted successfully",
  "data": {
    "_id": "report_id",
    "reported_user_id": "user_id",
    "reported_by_user_id": "hospital_staff_id",
    "reason": "Suspicious Activity",
    "description": "...",
    "status": "pending",
    "createdAt": "2024-01-20T10:30:00Z"
  }
}
```

### Error Response:
```
Status: 400/404/500

Response Body:
{
  "success": false,
  "message": "Error description"
}
```

---

## Cross-Browser Testing

Test on:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

### Specific Checks:
- [ ] Modal opens correctly
- [ ] Form inputs work
- [ ] Dropdown styling is consistent
- [ ] Toast notifications appear
- [ ] No console errors

---

## Integration Test: Full Flow

### Scenario: Hospital staff reports suspicious donor activity
1. Hospital staff logs in ✓
2. Navigates to Manage Requests ✓
3. Goes to Donors tab ✓
4. Finds donor with unusual patterns ✓
5. Clicks Report button ✓
6. Fills reason: "Fraud Information" ✓
7. Adds note about inconsistencies ✓
8. Submits report ✓
9. Sees success confirmation ✓
10. Admin later sees report in dashboard ✓
11. Admin takes action (warn/block user) ✓
12. System logs activity in audit trail ✓

---

## Known Limitations

⚠️ **Current Limitations:**
1. Hospital staff can submit duplicate reports (no 24hr cooldown - that's enforced on backend)
2. No report history view for hospital staff
3. Report submission is immediate (no draft saving)
4. No bulk reporting feature
5. Limited reason categories (can expand in future)

---

## Rollback/Revert

If issues occur:

1. **Remove Report Buttons from ManageRequests:**
   - Comment out the Report button JSX in both sections
   
2. **Disable Report Modal:**
   - Remove HospitalReportModal import
   - Remove modal from JSX

3. **Keep Modal Component:**
   - Can be reused later without breaking anything

---

## Sign-Off Checklist

- [ ] All 10 test cases pass
- [ ] No console errors
- [ ] Network requests successful
- [ ] Admin dashboard shows reports correctly
- [ ] UI looks polished and consistent
- [ ] Error handling works properly
- [ ] Mobile responsive (if applicable)
- [ ] Feature is production-ready

---

**Test Username/Password:** [Use your hospital staff credentials]

**Admin Dashboard URL:** `/admin/moderation` or equivalent

**Testing Date:** _________________

**Tested By:** _________________

**Status:** ☐ PASS ☐ FAIL ☐ PARTIAL

**Notes:**
```
[Add any findings, bugs, or notes here]
```
