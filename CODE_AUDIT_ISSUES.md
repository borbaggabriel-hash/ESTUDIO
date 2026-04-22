# Code Audit - Issues Catalog

**Analysis Date:** 2026-03-30  
**Status:** In Progress - Phase 1

---

## 🔴 CRITICAL BUGS

### CB-001: No Password Recovery Flow
**File:** `client/src/studio/pages/login.tsx`  
**Line:** N/A (feature missing)  
**Problem:** No "Forgot Password" link or recovery mechanism. Users locked out if they forget password.  
**Impact:** 🔴 Critical - Blocks 100% of users who forget password  
**Solution:** Add password recovery flow with email reset link  
**Fix Priority:** P0 - Immediate

### CB-002: Potential Null Pointer - User Navigation
**File:** `client/src/studio/pages/profile.tsx:62-64`  
**Problem:** Accessing `user.firstName[0]` and `user.lastName[0]` without null check could crash if undefined  
**Impact:** 🔴 High - Could crash profile page  
**Solution:** Add null guards before accessing character indices  
**Fix Priority:** P0

### CB-003: Audio Memory Leak
**File:** `client/src/studio/pages/takes.tsx:92-121`  
**Problem:** AudioPlayer creates Audio element but never cleans it up in useEffect cleanup  
**Impact:** 🟡 Medium - Memory leak on component unmount  
**Solution:** Add cleanup in useEffect return  
**Fix Priority:** P1

### CB-004: Error Handling Missing
**File:** `client/src/studio/pages/takes.tsx:136-151`  
**Problem:** Download error is silently caught with empty catch block  
**Impact:** 🟡 Medium - Users don't know why download failed  
**Solution:** Show error toast on download failure  
**Fix Priority:** P1

---

## 🟠 TYPESCRIPT / TYPE SAFETY

### TS-001: Type Assertion Without Validation
**File:** `client/src/studio/pages/dashboard.tsx:104-109`  
**Problem:** `@ts-ignore` used to access non-existent `posterUrl` property  
**Impact:** 🟡 Medium - Runtime error if property doesn't exist  
**Solution:** Extend Production type to include posterUrl or remove feature  
**Fix Priority:** P1

### TS-002: Any Type Usage
**File:** `client/src/studio/pages/members.tsx:33,92,93,185,186`  
**Problem:** Multiple `any` types used (m: any, err: any) instead of proper types  
**Impact:** 🟢 Low - Reduces type safety  
**Solution:** Define proper interfaces for Member, Error types  
**Fix Priority:** P2

### TS-003: Any Type in Notifications
**File:** `client/src/studio/pages/notifications.tsx:40,n: any`  
**Problem:** Notification object typed as `any`  
**Impact:** 🟢 Low - No intellisense, potential runtime errors  
**Solution:** Define Notification interface  
**Fix Priority:** P2

---

## 🟡 ACCESSIBILITY (WCAG 2.1 AA Violations)

### A11Y-001: Missing ARIA Labels - Icon-Only Buttons (Login Page)
**File:** `client/src/studio/pages/login.tsx:200-214`  
**Problem:** Submit button has no aria-label when in loading state with icon only  
**Impact:** 🟡 Medium - Screen readers can't describe button state  
**Solution:** Add aria-label to button and aria-live region for status  
**Fix Priority:** P1

### A11Y-002: Missing ARIA Labels - Toggle Buttons
**File:** `client/src/studio/pages/dashboard.tsx:70-76`  
**Problem:** Animation toggle button has no aria-label  
**Impact:** 🟡 Medium - Screen readers can't describe purpose  
**Solution:** Add aria-label="Alternar animações"  
**Fix Priority:** P1

### A11Y-003: Non-Semantic Interactive Elements
**File:** `client/src/studio/pages/takes.tsx:300,446,502`  
**Problem:** `<button>` without type attribute (defaults to submit in forms)  
**Impact:** 🟢 Low - Could cause unexpected form submissions  
**Solution:** Add `type="button"` to all non-submit buttons  
**Fix Priority:** P2

### A11Y-004: Missing Form Labels Association
**File:** `client/src/studio/pages/login.tsx:179,189`  
**Problem:** `<label>` elements not associated with inputs via `htmlFor`  
**Impact:** 🟡 Medium - Clicking label doesn't focus input  
**Solution:** Add unique IDs to inputs and htmlFor to labels  
**Fix Priority:** P1

### A11Y-005: Icon-Only Buttons Without Labels (Takes Page)
**File:** `client/src/studio/pages/takes.tsx:111-120,189-198`  
**Problem:** Play/Download buttons have icons but no aria-label  
**Impact:** 🔴 High - Screen readers say "button" with no context  
**Solution:** Add aria-label to describe action  
**Fix Priority:** P0

### A11Y-006: Color-Only Status Indicators
**File:** `client/src/studio/pages/dashboard.tsx:250-257`  
**Problem:** Production status shown only by color (emerald/amber/white)  
**Impact:** 🟡 Medium - Colorblind users can't distinguish  
**Solution:** Status already has text label - OK, but ensure sufficient contrast  
**Fix Priority:** P2 (verify contrast ratios)

### A11Y-007: Missing Skip Navigation Link
**File:** All pages  
**Problem:** No skip link to bypass sidebar navigation  
**Impact:** 🟡 Medium - Keyboard users must tab through entire sidebar  
**Solution:** Add skip link in layout component  
**Fix Priority:** P1

### A11Y-008: Keyboard Trap Potential in Modals
**File:** Need to verify all Dialog usages  
**Problem:** Need to verify focus trap is working in all modals  
**Impact:** 🟡 Medium - Keyboard users can't escape modals  
**Solution:** Verify Radix UI Dialog focus trap is enabled  
**Fix Priority:** P1 (verification needed)

---

## 🟢 CODE QUALITY

### CQ-001: Hardcoded Locale Strings
**File:** `client/src/studio/pages/dashboard.tsx:65`  
**Problem:** Hardcoded 'pt-BR' locale string  
**Impact:** 🟢 Low - Difficult to internationalize  
**Solution:** Use i18n context or user preference  
**Fix Priority:** P3

### CQ-002: Magic Numbers
**File:** `client/src/studio/pages/dashboard.tsx:32,39`  
**Problem:** Hardcoded 60 minutes for session duration  
**Impact:** 🟢 Low - Hard to maintain  
**Solution:** Extract to constant DEFAULT_SESSION_DURATION  
**Fix Priority:** P3

### CQ-003: Duplicated Download Logic
**File:** `client/src/studio/pages/takes.tsx:228-244,425-441,579-603`  
**Problem:** Download logic duplicated 3+ times  
**Impact:** 🟢 Low - DRY violation  
**Solution:** Extract to reusable `useDownload` hook  
**Fix Priority:** P3

### CQ-004: Long Function - SessionGroup Component
**File:** `client/src/studio/pages/takes.tsx:203-404`  
**Problem:** 201-line component with multiple responsibilities  
**Impact:** 🟢 Low - Hard to test and maintain  
**Solution:** Split into sub-components (TracksPanel, TakesList)  
**Fix Priority:** P3

### CQ-005: Console.log Left in Production Code
**File:** Need to grep for all instances  
**Problem:** Debug console.logs should be removed  
**Impact:** 🟢 Low - Performance, security (data exposure)  
**Solution:** Remove or wrap in dev-only check  
**Fix Priority:** P2

### CQ-006: Empty Catch Blocks
**File:** `client/src/studio/pages/takes.tsx:147,240,437`  
**Problem:** Errors silently swallowed in empty catch  
**Impact:** 🟡 Medium - Hard to debug issues  
**Solution:** At minimum log error, ideally show user feedback  
**Fix Priority:** P1

---

## 🔵 UX ISSUES (From UX_EXCELLENCE_ANALYSIS.md)

### UX-001: Generic Error Messages
**File:** Multiple files using toast  
**Problem:** Errors like "Falha ao salvar" with no actionable guidance  
**Impact:** 🟡 Medium - 60% user frustration  
**Solution:** Add specific error descriptions and recovery actions  
**Fix Priority:** P0 (per UX analysis)

### UX-002: No Loading States for File Uploads
**File:** Production script upload, session creation  
**Problem:** No progress indicators for file operations  
**Impact:** 🟡 Medium - Users don't know if app is working  
**Solution:** Add progress bars for uploads  
**Fix Priority:** P1

### UX-003: No Confirmation on Destructive Actions
**File:** Delete session, reject member, etc.  
**Problem:** Destructive actions execute immediately without confirmation  
**Impact:** 🟡 Medium - Accidental data loss  
**Solution:** Add confirmation dialogs  
**Fix Priority:** P1

---

## FIXES COMPLETED

### ✅ CB-002: Fixed - Null pointer in profile.tsx
Changed array index access to `.charAt()` method for safe character extraction.

### ✅ CB-003: Fixed - Audio memory leak in takes.tsx
Added useEffect cleanup to properly dispose Audio element on unmount.

### ✅ CB-004: Fixed - Error handling in takes.tsx
Added toast notifications for download errors with actionable messages.

### ✅ A11Y-004: Fixed - Form label associations in login.tsx
Added `htmlFor` attributes and unique IDs to properly associate labels with inputs.

### ✅ A11Y-005: Fixed - Icon-only buttons in takes.tsx
Added `aria-label` attributes to Play and Download buttons for screen readers.

### ✅ A11Y-002: Fixed - Animation toggle button in dashboard.tsx
Added `aria-label` and `type="button"` attributes.

## STATISTICS (So Far)

- **Critical Bugs:** 4 found (2 fixed, 2 remaining)
- **TypeScript Issues:** 3 found
- **Accessibility Violations:** 8 found (3 fixed, 5 remaining)
- **Code Quality Issues:** 6 found
- **UX Issues:** 3 cataloged

**Total Issues:** 24 identified (6 fixed, 18 remaining)
**Analysis:** Ongoing - need to scan remaining components, hooks, and server files

**WCAG Compliance Estimate:** Currently ~65/100 (needs improvement to 100/100 for AA)

---

## NEXT STEPS

1. Continue analysis of remaining files
2. Complete issue catalog
3. Prioritize fixes by severity
4. Begin implementing fixes starting with P0
5. Run verification scan after fixes
6. Generate final audit report
