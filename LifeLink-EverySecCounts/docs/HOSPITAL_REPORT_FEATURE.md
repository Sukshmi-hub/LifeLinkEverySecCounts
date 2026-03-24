# Hospital Request Report Feature - Implementation Summary

## Overview
Added "Report" functionality to the Hospital Manage Requests page, allowing hospital staff to report suspicious patients or donors directly to the admin moderation system.

## Files Modified/Created

### 1. New Component: `src/components/hospital/HospitalReportModal.jsx`
A modal dialog component for hospital staff to submit reports with reason and optional description.

**Features:**
- Reason dropdown with preset options (Suspicious Activity, Inappropriate Behavior, Fraudulent Information, etc.)
- Optional additional details textarea
- Loading state during submission
- Form validation
- Information box warning about consequences

**Props:**
- `open`: Boolean - controls modal visibility
- `onOpenChange`: Function - handles modal open/close state
- `userName`: String - name of user being reported
- `userType`: String - 'patient' or 'donor'
- `onReport`: Function - callback for report submission

### 2. Modified: `src/components/hospital/ManageRequests.jsx`
Updated the hospital's manage requests component to integrate reporting.

**Changes Made:**

#### a. Imports
- Added `AlertOctagon` icon from lucide-react
- Imported `HospitalReportModal` component

#### b. State
- Added `showReportModal` state (boolean)
- Added `reportingUser` state (object with name, type, userId, raw)

#### c. New Functions

**`handleSubmitReport(reportData)`**
- Extracts user ID from patient/donor raw data
- Posts to `/api/moderation/report-user` endpoint
- Shows success/error toast notification
- Parameters in request:
  - `reported_user_id`: User ID being reported
  - `reason`: Selected reason from dropdown
  - `description`: Optional additional context
- Authenticates using Bearer token from localStorage

**`openReportModal(name, type, raw)`**
- Helper function to open report modal with context
- Parameters:
  - `name`: Display name of user being reported
  - `type`: 'patient' or 'donor'
  - `raw`: Full request object for ID extraction

#### d. UI Changes

**Patient Organ Requests Section:**
- Added "Report" button (AlertOctagon icon) between Details and Check/Reject buttons
- Click opens HospitalReportModal for the patient
- Button styling: warning color with hover effect
- Includes tooltip: "Report this patient to admin"

**Donor Availability Section:**
- Added "Report" button (AlertOctagon icon) between Details and Check/Reject buttons
- Click opens HospitalReportModal for the donor
- Button styling: warning color with hover effect
- Includes tooltip: "Report this donor to admin"

## Workflow

### Report Submission Flow:
1. Hospital staff clicks Report button (AlertOctagon icon) next to patient/donor
2. Modal opens with user context pre-filled
3. Staff selects reason from dropdown
4. Staff optionally enters additional details
5. Staff clicks "Submit Report" button
6. Component:
   - Extracts user ID from request data
   - Calls POST `/api/moderation/report-user`
   - Shows toast notification on success/error
   - Closes modal on success
   - Resets form state
7. Report appears in Admin Dashboard's "Flagged Users" section after 3+ reports

### ID Extraction Strategy:
For **Patient Requests:**
- Tries: `req.patientId._id` → `req.patientId.id` → `req.requestedBy._id` → `req.requestedBy.id` → `req._id`

For **Donor Requests:**
- Tries: `donor.raw.donorId._id` → `donor.raw.donorId.id` → `donor.raw.requestedBy._id` → `donor.raw.requestedBy.id` → `donor.raw._id`

## API Integration

### Endpoint Used:
- **URL:** `POST http://localhost:5000/api/moderation/report-user`
- **Authentication:** Bearer token (from localStorage)
- **Request Body:**
  ```json
  {
    "reported_user_id": "user_id",
    "reason": "Suspicious Activity",
    "description": "Optional details"
  }
  ```
- **Response:** Report object with status

## Features

✅ **Core Functionality:**
- Report patients and donors from manage requests page
- Pre-filled user context (name, type)
- Structured reason selection
- Optional detailed description
- Real-time form validation
- Loading states during submission
- Toast notifications (success/error)

✅ **Integration:**
- Seamless connection to existing moderation system
- Reports flow directly to admin dashboard
- Uses same backend API as admin reporting
- Respects hospital staff authentication
- Filters report counts in admin's Flagged Users section

✅ **UX/UI:**
- Consistent button styling with existing buttons
- Warning color (amber) for report action
- Clear labels and tooltips
- Responsive modal dialog
- Form validation feedback

## User Instructions for Hospital Staff

### How to Report a Patient or Donor:

1. **Navigate to Manage Requests:**
   - Go to Hospital Dashboard > Manage Requests tab

2. **Locate the Patient/Donor:**
   - Find patient in "Patient Organ Requests" section OR
   - Find donor in "Donor Availability" section

3. **Click Report Button:**
   - Click the flag/alert icon (⚠️) next to the user
   - Modal dialog will appear

4. **Fill Report Form:**
   - **Reason (Required):** Select from dropdown:
     - Suspicious Activity
     - Inappropriate Behavior
     - Fraudulent Information
     - Harassment
     - Misuse of Platform
     - False Medical Records
     - Other
   
   - **Additional Details (Optional):**
     - Provide specific context or observations
     - Example: "Multiple inconsistencies in medical records"
     - Example: "Suspicious payment patterns"

5. **Submit Report:**
   - Click "Submit Report" button
   - You'll see a loading spinner
   - Success notification appears: "Patient/Donor reported successfully"

6. **What Happens Next:**
   - Admin receives report
   - After 3+ reports, user appears in "Flagged Users" section
   - Admin can take action: warn, suspend, or investigate further

## Admin Side Integration

Reports submitted via this form automatically:
1. Appear in `/api/moderation/flagged-users` endpoint
2. Trigger notifications to admins
3. Show in Admin Dashboard's "Flagged Users" component
4. Include report count and reason statistics
5. Enable admin to view all reports for a user

## Testing Checklist

- [ ] Click Report button on any patient in "Patient Organ Requests"
- [ ] Modal opens with patient name pre-filled
- [ ] Dropdown shows all reason options
- [ ] Can type additional details
- [ ] Submit button disabled until reason is selected
- [ ] Click Submit → shows loading state
- [ ] After success → Toast notification appears
- [ ] Modal closes automatically
- [ ] Form resets for next report
- [ ] Click Report on any donor in "Donor Availability"
- [ ] Repeat steps for donor reporting
- [ ] Check admin dashboard to see report appears in Flagged Users (after 3+ reports)

## Error Handling

**Possible Error Scenarios:**
1. User not authenticated → "Not authenticated" error
2. Invalid/missing user ID → "Could not identify user ID" error
3. Network failure → "Failed to submit report" error
4. Server rejection → Displays server error message in toast
5. Form validation → "Please select a reason" alert

All errors show user-friendly toast notifications with actionable messages.

## Security Considerations

✅ **Implemented Security:**
- JWT token authentication required
- Hospital staff can only report from their own interface
- User IDs properly extracted from verified request objects
- Server-side validation on moderation API
- No data exposure in error messages
- Activity logged on backend for audit trail

## Future Enhancements

Potential improvements:
1. Add report history view (hospital staff can see their own reports)
2. Add bulk reporting capability for multiple users
3. Add predefined templates for common report scenarios
4. Real-time update when report count reaches flagged threshold
5. Admin response notifications to reporting staff
6. Report severity/priority levels
7. History of reports against each user

## Troubleshooting

**Modal won't open:**
- Ensure localStorage has valid token
- Check browser console for JavaScript errors
- Clear browser cache and reload

**Report won't submit:**
- Verify you're connected to internet
- Check backend server is running
- Ensure user ID can be extracted from request data
- Check browser network tab for API response

**Don't see success toast:**
- Check browser notifications settings
- Ensure Sonner toast library is initialized
- Check admin dashboard for report appearance (may take moment to load)

---

## Technical Notes

- Modal uses shadcn/ui Dialog component
- Form uses controlled inputs with React state
- Loading state managed with `isSubmitting` state
- API calls use Fetch API with Bearer authentication
- Toast notifications via Sonner library
- Error handling with try-catch and user feedback
- ID extraction handles multiple possible data structures for robustness
