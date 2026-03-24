# Login As Role Selection Feature - Testing Guide

## Overview
The login system has been enhanced with a "Login As" role selection feature. Users must now select a role from a dropdown before logging in. The backend validates that the selected role matches the user's actual role in the database.

## Implementation Summary

### Frontend Changes (src/pages/public/Login.jsx)
1. **New State Variable:**
   - `loginRole` - stores the selected role from the dropdown

2. **New UI Component:**
   - Role selection dropdown with placeholder "Select Role"
   - Options: Patient, Hospital, Donor, NGO, Admin
   - Positioned in the login form between password and forgot password link

3. **Updated Login Handler:**
   - Validates that a role is selected before submission
   - Shows error toast if role is empty
   - Passes role to backend API

### Backend Changes (src/controllers/authController.js)
1. **Enhanced Login Controller:**
   - Accepts `role` parameter in request body
   - Validates role is provided
   - Compares selected role with user's database role
   - Returns error (HTTP 403) if roles don't match
   - Error message: "Invalid role selected for this user."

## Testing Checklist

### Test Case 1: Login Without Selecting Role
**Step 1:** Click on Login tab
**Step 2:** Enter valid email and password
**Step 3:** Click "Sign In" WITHOUT selecting a role
**Expected Result:** Error toast appears with message "Role Required - Please select a role before logging in."
**Status:** ✓ Pass / ✗ Fail

---

### Test Case 2: Login with Correct Role
**Step 1:** Navigate to login form
**Step 2:** Enter valid email for a patient user
**Step 3:** Enter correct password
**Step 4:** Select "Patient" from "Login As" dropdown
**Step 5:** Click "Sign In"
**Expected Result:** 
- Success toast: "Welcome back!"
- Redirect to Patient Dashboard
- User session stored in localStorage
**Status:** ✓ Pass / ✗ Fail

---

### Test Case 3: Login with Incorrect Role (Role Mismatch)
**Step 1:** Navigate to login form
**Step 2:** Enter valid email for a DONOR user
**Step 3:** Enter correct password
**Step 4:** Select "Hospital" from "Login As" dropdown (incorrect)
**Step 5:** Click "Sign In"
**Expected Result:** Error toast appears with message "Login Failed - Invalid role selected for this user."
**Status:** ✓ Pass / ✗ Fail

---

### Test Case 4: Test Each Role Selection
Complete the following login attempts with correct roles:

**Patient Login:**
- Email: [patient email]
- Role: Patient
- Expected: Redirect to /patient/dashboard
- Status: ✓ Pass / ✗ Fail

**Hospital Login:**
- Email: [hospital email]
- Role: Hospital
- Expected: Redirect to /hospital/dashboard
- Status: ✓ Pass / ✗ Fail

**Donor Login:**
- Email: [donor email]
- Role: Donor
- Expected: Redirect to /donor/dashboard
- Status: ✓ Pass / ✗ Fail

**NGO Login:**
- Email: [ngo email]
- Role: NGO
- Expected: Redirect to /ngo/dashboard
- Status: ✓ Pass / ✗ Fail

**Admin Login:**
- Email: [admin email]
- Role: Admin
- Expected: Redirect to /admin/dashboard
- Status: ✓ Pass / ✗ Fail

---

### Test Case 5: Invalid Credentials with Correct Role
**Step 1:** Navigate to login form
**Step 2:** Enter invalid email
**Step 3:** Enter any password
**Step 4:** Select any role
**Step 5:** Click "Sign In"
**Expected Result:** Error toast "Login Failed - Invalid email or password"
**Status:** ✓ Pass / ✗ Fail

---

### Test Case 6: Invalid Password with Correct Role
**Step 1:** Navigate to login form
**Step 2:** Enter valid email
**Step 3:** Enter incorrect password
**Step 4:** Select corresponding correct role
**Step 5:** Click "Sign In"
**Expected Result:** Error toast "Login Failed - Invalid email or password"
**Status:** ✓ Pass / ✗ Fail

---

### Test Case 7: UI Validation
**Step 1:** Check login form layout
**Expected Results:**
- Email field is present and functional ✓
- Password field is present and functional ✓
- Role dropdown is labeled "Login As" ✓
- Dropdown shows "Select Role" as placeholder ✓
- All 5 roles are available in dropdown ✓
- Forgot Password link is still visible ✓
- Sign In button is present and functional ✓
**Status:** ✓ Pass / ✗ Fail

---

### Test Case 8: Browser Session Persistence
**Step 1:** Login with correct role
**Step 2:** Verify redirected to correct dashboard
**Step 3:** Check localStorage contains:
   - `token` with JWT
   - `user` with user data (including role)
**Step 4:** Refresh the page
**Expected Result:** User remains logged in
**Status:** ✓ Pass / ✗ Fail

---

## Error Messages Reference

| Scenario | HTTP Status | Error Message |
|----------|-------------|---------------|
| No role selected | Client-side | "Role Required - Please select a role before logging in." |
| Role missing in request | 400 | "Role selection is required" |
| Role doesn't match DB | 403 | "Invalid role selected for this user." |
| Invalid credentials | 401 | "Invalid email or password" |
| Server error | 500 | "Server error" |

---

## Backend Testing with cURL/Postman

### Correct Request (Role Matches):
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "password123",
    "role": "patient"
  }'
```

### With Role Mismatch:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "password123",
    "role": "hospital"
  }'
```

### Without Role:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "patient@example.com",
    "password": "password123"
  }'
```

---

## Files Modified

1. **c:\SukshmiPandey\LifeLinkEverySecCounts\LifeLink-EverySecCounts\src\pages\public\Login.jsx**
   - Added loginRole state
   - Updated handleLogin function
   - Added role selection dropdown

2. **c:\SukshmiPandey\LifeLinkEverySecCounts\LifeLink-backend\src\controllers\authController.js**
   - Updated login controller to accept and validate role parameter

---

## Known Behavior

1. **Role validation is case-insensitive:** "Patient" and "patient" are treated the same
2. **Role is required:** Form cannot be submitted without selecting a role
3. **Server-side validation:** Role validation happens on backend for security
4. **Existing user flows:** Previous login methods are updated to require role selection
5. **Session tokens:** Include user role for further authorization checks

---

## Rollback Instructions (if needed)

1. Revert Login.jsx to remove loginRole state and role dropdown
2. Update handleLogin to not pass role parameter
3. Revert authController.js to original login function
4. Clear any cached localStorage data

---

## Notes for Developers

- The role dropdown uses the Select component from shadcn/ui
- All 5 roles (patient, hospital, donor, ngo, admin) are supported
- Role comparison is case-insensitive on backend for flexibility
- Error handling uses HTTP 403 for role mismatch vs 401 for auth failure
- Toast notifications provide user-friendly feedback
