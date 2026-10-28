# Attendance Platform — Product Requirements Document

**Build brief for:** Antigravity coding agent  
**Product:** Mobile-first attendance platform for university laboratories and practical sessions  
**Frontend stack:** Vite + React  
**Status:** MVP implementation brief  
**Design reference:** `attendance-design-tokens.md` and the supplied four-screen attendance app image

## 1. Product summary

Build a responsive attendance web application for students and lab coordinators. Students can see their upcoming lab activity, check in and out, scan a session QR code, and review their attendance. Coordinators can create and manage sessions, monitor attendance as it arrives, and record a student manually when scanning is unavailable.

The product should feel like the supplied reference on mobile: pale blue background, vivid indigo actions, illustrated welcome area, compact white cards, rounded controls, a fixed bottom navigation, a focused QR scanner view, and a clear success or error confirmation sheet. Coordinator workflows should use the same visual language in a denser responsive layout.

The first release is a polished, interactive frontend prototype with realistic mock data and persisted demo state. Keep data access behind a small service layer so a real API can be connected later. Do not imply that a client-only QR code, browser storage, or simulated live update provides production-grade identity or attendance verification.

## 2. Problem and goals

Lab attendance is often recorded manually or spread across paper sheets and spreadsheets. Students may not know their current record, while coordinators spend time organizing sessions and reconciling attendance.

### Goals

1. Let a student understand today’s lab schedule and current attendance status at a glance.
2. Make the check-in and check-out path simple, fast, and hard to misunderstand.
3. Give coordinators a clear view of a session’s attendance and a way to handle exceptions.
4. Keep student attendance history understandable and filterable.
5. Establish a reusable visual and component system that closely follows the reference.
6. Deliver a navigable prototype that works at phone, tablet, and desktop widths.

### MVP success criteria

- A student can move from home to scan, see a result, and return to the updated home screen without dead ends.
- A coordinator can start a demo session, see present/late counts change, and manually mark a student.
- Every primary screen has loading, empty, error, and success states where relevant.
- Core routes render without horizontal overflow at 320 px, 390 px, tablet, and desktop widths.
- All interactive controls have visible focus, clear labels, and usable touch targets.

## 3. Users and roles

### Student

Needs to know where and when a practical is happening, check in/out, understand whether a check-in succeeded, and review attendance over time.

### Lab coordinator

Needs to schedule and start a lab session, show the QR/PIN to students, monitor arrivals, record exceptions, and close/finalize the session.

### Administrator

Not a full MVP role. Keep the data model and navigation extensible for later administration of users, labs, courses, policies, and reports. Do not build a separate admin console in this first pass unless the existing project already contains one.

## 4. Scope

### In scope for the frontend MVP

- Student and coordinator demo experiences, switchable through a clearly labeled role switcher in the demo profile/menu.
- Student home, QR scanner, check-in/check-out result, attendance history, session detail, and profile/settings screens.
- Coordinator dashboard, session list, session detail/live attendance, start session QR/PIN screen, manual attendance flow, and create/edit session form.
- Mock data for students, courses, labs, sessions, and attendance records.
- Local persistence for demo actions (for example, localStorage) with a reset-demo-data action.
- Search, filters, status badges, toasts, dialogs/sheets, and responsive navigation.
- A simulated QR scanner camera state. Provide an obvious mock scan action for demo use when camera access is unavailable or denied.

### Out of scope for this frontend MVP

- Production authentication, authorization, or account recovery.
- A real backend, database, server-generated rotating QR tokens, or secure attendance validation.
- Real push/email/WhatsApp notifications.
- Geolocation, biometric verification, NFC, payment, or campus system integration.
- Formal policy enforcement or automatic academic penalties.
- Production CSV/PDF export (a clearly labeled demo export may be added only if time permits).

## 5. Information architecture and navigation

Use role-aware navigation. Every route should be directly loadable and have a useful page title.

### Student routes

| Route | Screen | Main navigation |
|---|---|---|
| `/student` | Home dashboard | Home |
| `/student/scan` | QR check-in scanner | Temporary full-screen flow |
| `/student/history` | Attendance history | History |
| `/student/sessions/:sessionId` | Session details | Opened from home/history |
| `/student/profile` | Profile and preferences | Profile |

### Coordinator routes

| Route | Screen | Main navigation |
|---|---|---|
| `/coordinator` | Coordinator dashboard | Overview |
| `/coordinator/sessions` | Sessions list | Sessions |
| `/coordinator/sessions/new` | Create session | Sessions |
| `/coordinator/sessions/:sessionId` | Session detail and live attendance | Sessions |
| `/coordinator/sessions/:sessionId/attendance` | Attendance management | Sessions |
| `/coordinator/reports` | Attendance report overview | Reports |
| `/coordinator/profile` | Profile and demo role switch | Profile |

If the project already uses a routing convention, follow it while preserving equivalent destinations. The scanner and result may be routes or controlled overlays, but browser back and close actions must behave predictably.

## 6. Core workflows

### Student check-in

1. Student opens home and sees the next/current practical, lab, time, and check-in state.
2. Student taps **Check in** or **Scan QR**.
3. Scanner opens full screen with a close/back control, concise instruction, centered scan frame, and torch control where supported.
4. In the prototype, the user can trigger **Simulate scan**. If browser camera permission is available, show a live camera preview and allow a QR scanning library integration to be added without changing the screen contract. If permission is denied or unavailable, present a helpful fallback rather than a blank view.
5. Show a result sheet: success, already checked in, invalid/expired code, outside check-in window, or camera unavailable.
6. On success, update session status and timestamps in the mock store, then return to the home screen or allow **Back to home**.

### Student check-out

1. After a successful check-in, the session card presents **Check out** as the primary action and shows check-in time.
2. Student scans the code or uses the displayed PIN flow when available.
3. Result confirmation records the demo checkout time and updates the session card/history.

### Coordinator starts and monitors a session

1. Coordinator opens dashboard or Sessions and selects an upcoming session.
2. Coordinator reviews room, eligible group, time, and current attendance.
3. Coordinator taps **Start session**. Session state changes to live; a demo QR and short PIN are displayed with a rotating/refresh affordance clearly marked as simulated.
4. The live screen shows attendance count, present/late/expected totals, latest arrivals, and controls for manual marking and ending the session.
5. Coordinator manually marks a student present/late, entering a reason when correcting an existing record.
6. Coordinator ends the session and confirms. Session moves to completed; attendance can be reviewed and finalized.

## 7. Screen requirements

### 7.1 Student home dashboard — `/student`

**Purpose:** Answer “What do I need to attend, and what is my attendance status?”

**Layout and content:**

- Pale blue app background and a branded welcome header with greeting, date, and avatar.
- Upcoming/current session card showing course/lab name, date/time, room, and session state.
- Two compact action cards or buttons for **Check in** and **Check out**. Only the valid action is enabled for the current demo state; explain disabled reasons.
- Overview row with attended sessions, late arrivals, and missed sessions.
- Upcoming sessions list with status and a route to session detail.
- Fixed bottom navigation: Home, History, notifications/activity (may be a lightweight placeholder screen or omit if only three destinations are used), Profile. Keep labels and iconography consistent.

**States:** No upcoming sessions; check-in not open; checked in; checked out; network/demo error; loading skeleton.

**Actions:** Open scanner, open session detail, navigate history/profile, refresh mock data.

### 7.2 QR scanner — `/student/scan`

**Purpose:** Make the scan action focused and readable, matching the supplied third phone screen.

**Layout:** Full viewport, charcoal scanner surface with camera preview or dark fallback, close button, “Scan QR code” title, one short instruction, bright white corner brackets around square scan region, optional torch button, and an explicit demo scan action when needed.

**Behavior:** Request camera only after an explicit user action or when entering the screen with a clear explanation. Handle permission denied, no camera, insecure context, and unsupported browser. Do not persist camera frames. Escape/back closes scanner. The demo action should create a deterministic outcome based on current session state.

**Result states:** Successful check-in/out; already recorded; invalid/expired QR; session not open; camera permission denied. Use a bottom sheet or dialog with a concise explanation and one primary next action.

### 7.3 Attendance history — `/student/history`

**Purpose:** Give students a trustworthy view of their recorded attendance.

**Content:** Summary attendance rate and counts; search by course/lab; filters for date range and status (Present, Late, Absent, Excused); list or compact table of session, date, time, room, status, and recorded check-in/out times where present.

**Interactions:** Clear filters; open a session; select **Report an issue** on a record to open a correction-request form. MVP can store the request locally and show a submitted state; coordinator review can be represented in demo data.

**States:** Empty history, no results, loading, error, selected filters.

### 7.4 Session detail — `/student/sessions/:sessionId`

Show course/lab title, instructor/coordinator, room, start/end time, session state, attendance status, timestamps, and any instructions. If the session is eligible and active, show the valid check-in/out action. Include a correction-request action for finalized records.

### 7.5 Student profile and preferences — `/student/profile`

Show avatar, student name, student ID, programme, level, and account type. Include notification preference toggles as local demo controls, help/support entry, and a clearly marked demo role switch/reset action. Avoid exposing sensitive data in mock fixtures.

### 7.6 Coordinator dashboard — `/coordinator`

**Purpose:** Show today’s operational picture and provide quick access to the next action.

**Content:** Greeting and date; metric cards for registered students, present today, attendance rate, and active sessions; sessions today with status; attendance trend for recent weeks (simple accessible chart or CSS bars); quick actions **Create session** and **View sessions**; review-needed items such as correction requests or sessions awaiting finalization.

At desktop widths use a left sidebar and content grid. At mobile widths use a compact header and bottom navigation or a drawer; keep session start/action controls reachable.

### 7.7 Coordinator sessions list — `/coordinator/sessions`

List sessions with course/lab, date/time, room, attendance count, and status (Scheduled, Live, Completed, Cancelled). Include search and filters by status, lab/course, and date. Provide a strong **Create session** action. Empty state explains how to create the first session.

### 7.8 Create/edit session — `/coordinator/sessions/new`

Form fields: session title/course, laboratory/room, date, start time, end time, eligible group, coordinator, check-in opening time, late threshold, optional notes, and whether check-out is required. Validate required fields inline, ensure end time follows start time, and prevent accidental duplicate/overlapping demo room sessions with a clear warning. Buttons: Cancel, Save draft, Schedule session. On success route to session detail and show confirmation.

### 7.9 Coordinator session detail/live attendance — `/coordinator/sessions/:sessionId`

Show session metadata and status. When scheduled: **Start session** and edit/cancel actions. When live: attendance progress, present/late/absent/expected counts, QR/PIN panel or link to scan-display mode, latest arrivals, and **Manage attendance** / **End session**. When completed: summary, finalized status, attendee list, and edit correction affordance with audit reason.

For live demo updates, provide a “Simulate student check-in” control in a clearly labeled demo panel. Update counts and arrival list immediately. Do not claim actual realtime sync.

### 7.10 Attendance management — `/coordinator/sessions/:sessionId/attendance`

Search eligible students by name or student ID. Filter by attendance status. Show name, student ID, status, check-in/out time, and action menu. Manual mark flow requires selecting status (Present/Late/Absent/Excused) and a reason for edits; show confirmation before changing a finalized record. Provide a visible audit history entry after each edit.

### 7.11 Reports overview — `/coordinator/reports`

Provide date range and lab/course filters; summary metrics; attendance trend; breakdown by session; students needing follow-up. Use fictional demo values and show the active filter scope. Include export affordance only if implemented and clearly label it as demo. Provide empty/no-data state.

## 8. Domain model for mock data

Use typed, normalized objects and stable IDs. Keep fixtures in a dedicated module and route all read/write operations through a mock service.

```ts
type UserRole = "student" | "coordinator";
type SessionStatus = "scheduled" | "live" | "completed" | "cancelled";
type AttendanceStatus = "present" | "late" | "absent" | "excused";

interface User {
  id: string;
  name: string;
  studentId?: string;
  email?: string;
  role: UserRole;
  programme?: string;
  level?: string;
}

interface LabSession {
  id: string;
  title: string;
  courseCode?: string;
  labName: string;
  room: string;
  coordinatorId: string;
  eligibleStudentIds: string[];
  startsAt: string;
  endsAt: string;
  checkInOpensAt: string;
  lateAfterMinutes: number;
  status: SessionStatus;
  requiresCheckOut: boolean;
}

interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  checkedInAt?: string;
  checkedOutAt?: string;
  note?: string;
  updatedBy: string;
  audit: Array<{ at: string; actorId: string; action: string; reason?: string }>;
}
```

Use a fixed demo clock or relative dates that remain sensible when the app is opened later. Keep attendance percentage calculations in shared utilities and define explicitly which statuses count in the demo calculation.

## 9. Functional requirements

- Role-aware routes and navigation; inaccessible routes redirect to the appropriate demo landing screen.
- Forms provide labels, required markers, inline error messages, and success feedback.
- Search and filters operate on the current mock dataset and can be cleared.
- Student check-in prevents duplicate check-ins and rejects ineligible or closed sessions in the demo logic.
- Check-out is unavailable until check-in has been recorded; show why when disabled.
- Coordinator start/end actions require confirmation where they change session state.
- Manual attendance changes record actor, timestamp, old/new status, and reason in a demo audit trail.
- Persist demo actions and current role locally; provide a reset to restore fixture state.
- Toasts announce transient success/error; important results also appear in persistent page content.
- Every navigation item and visible button must lead to an action or have an explicit disabled state and explanation.

## 10. Visual design and interaction rules

Use `attendance-design-tokens.md` as the source of truth for colors, typography, spacing, radii, shadows, component shapes, and mobile dimensions. Do not introduce a competing palette. The reference is a student mobile app; preserve its visual character while adapting coordinator screens for larger data density.

- Main background: pale blue; primary content cards: white; primary actions: saturated indigo pill buttons.
- Use rounded, friendly UI with restrained shadows and subtle hairline borders.
- Student mobile content column target: 390 × 844 px; support 320 px width; page inset 16 px (12 px at narrow widths); max content width 480 px.
- Minimum touch target 44 × 44 px; bottom navigation respects device safe-area insets.
- Use a consistent rounded outline icon set (Lucide React is an acceptable default); avoid mixing icon families.
- Use Poppins with Inter/system fallback when the font is available and loading can be done without blocking render.
- Scanner is a separate charcoal full-screen mode; keep the scan frame bright, square, and high contrast.
- Confirmation is a white bottom sheet with clear outcome, a concise message, and one obvious primary action.
- Status always includes text, not color alone.
- Use subtle transitions (150–220 ms) for hover, focus, sheets, and route changes; respect `prefers-reduced-motion`.

## 11. Accessibility and responsive behavior

- Use semantic landmarks, headings in order, labeled inputs, button elements for actions, and links for navigation.
- Keyboard support: visible focus ring, logical tab order, Enter/Space activation, Escape to close dialog/scanner, focus returned to trigger after sheet/dialog close.
- Dialogs/sheets announce their title and keep focus within the modal while open.
- Charts include text summaries or data labels; do not use color as the only signal.
- Maintain readable contrast for text and controls; especially check muted labels and disabled buttons.
- Support 200% zoom and narrow widths without clipped controls or horizontal page scrolling.
- On phones, use bottom navigation; on desktop, coordinator pages use a persistent sidebar or equivalent navigation with a centered max-width content area.
- Scanner camera permission failure must leave a usable fallback and clear exit route.

## 12. Technical implementation requirements

- Scaffold with **Vite + React** and TypeScript unless the repository is already established in JavaScript. If an existing project is present, inspect it and extend its current stack rather than replacing it.
- Use React Router (or the router already installed) for named routes and deep-link handling.
- Organize by feature: `features/student`, `features/coordinator`, `components`, `services`, `data`, `hooks`, and `styles` (adapt to existing conventions).
- Centralize design tokens in CSS custom properties, using the provided token specification. Avoid scattering literal hex values through components.
- Separate mock data/service logic from UI. Keep components reusable and props explicit.
- Use `lucide-react` or an existing consistent icon library; do not use emoji as interface icons.
- Use a lightweight chart library only if already present or clearly beneficial; otherwise implement simple accessible bars with CSS.
- Handle unknown routes with a branded not-found page and a clear return action.
- Include project scripts and a concise README with setup/run instructions, demo role switching, and prototype limitations.
- Do not add a backend or claim secure attendance validation. Keep TODO/integration seams clear around authentication, API persistence, rotating server QR, realtime events, and camera QR decoding.

## 13. Suggested component inventory

Shared: `AppShell`, `StudentBottomNav`, `CoordinatorSidebar`, `PageHeader`, `Avatar`, `PrimaryButton`, `SecondaryButton`, `IconButton`, `StatusBadge`, `MetricCard`, `SessionCard`, `EmptyState`, `LoadingSkeleton`, `ErrorNotice`, `ToastProvider`, `ConfirmDialog`, `BottomSheet`, `SearchField`, `FilterBar`, `FormField`, `AttendanceTable`, `AuditTrail`.

Student: `WelcomeHeader`, `CheckInActionCard`, `AttendanceOverview`, `UpcomingSessionList`, `ScannerView`, `ScanFrame`, `ScanResultSheet`, `AttendanceHistoryList`, `CorrectionRequestForm`.

Coordinator: `CoordinatorMetricGrid`, `TodaySessions`, `AttendanceTrend`, `SessionForm`, `SessionStatusPanel`, `QrDisplayPanel`, `LiveAttendanceFeed`, `ManualAttendanceDialog`, `SessionAttendanceTable`, `ReportFilters`.

Keep component count purposeful. Avoid building a generic design-system framework beyond what the app uses.

## 14. Suggested delivery sequence

1. Inspect the current workspace and preserve any existing project conventions and user changes.
2. Establish Vite/React entry, routing, global token variables, typography, and responsive app shells.
3. Build shared navigation, cards, buttons, badges, dialogs/sheets, form controls, and empty/loading/error states.
4. Implement student home and end-to-end demo check-in/check-out flow.
5. Implement attendance history, session detail, profile, and persisted mock data.
6. Implement coordinator dashboard, session list/form/detail, live QR/PIN display, and manual attendance flow.
7. Implement reports overview and remaining responsive/error/empty states.
8. Review every route at mobile and desktop widths, fix overflow and dead controls, and confirm the demo works from a fresh state.
9. Provide a short summary of delivered screens, how to run the app, and any deliberately simulated behaviors.

## 15. Acceptance checklist

### Product and flow

- [ ] Student can view upcoming session and current attendance status.
- [ ] Demo check-in and check-out update the correct record and home summary.
- [ ] Scanner includes camera-unavailable/permission fallback and a demo scan action.
- [ ] Student can filter history and open a session record.
- [ ] Coordinator can create a session, start it, monitor arrivals, manually mark attendance, and end it.
- [ ] Corrections include a reason and update the audit trail.
- [ ] Demo role switch and reset are discoverable and clearly marked as prototype controls.

### UI and accessibility

- [ ] Visual system follows the provided design-token file and reference screen.
- [ ] Student bottom navigation works and respects safe-area padding.
- [ ] Coordinator navigation adapts between mobile and desktop.
- [ ] All forms have inline validation and visible labels.
- [ ] Status is communicated with both color and text/icon.
- [ ] Keyboard focus, modal behavior, and reduced-motion preferences are handled.
- [ ] No horizontal overflow at 320 px, 390 px, tablet, or desktop widths.
- [ ] Empty, loading, error, success, and disabled states are designed for relevant screens.
- [ ] No visible button is inert or misleading.

### Delivery

- [ ] App runs using documented Vite scripts.
- [ ] Mock data and demo limitations are documented.
- [ ] No real credentials, personal student data, or production secrets are included.

## 16. Handoff instruction to the coding agent

Build the MVP described here in the existing workspace. First inspect the repository and existing files; preserve current work. Use the supplied `attendance-design-tokens.md` as the visual source of truth and the attached reference image as the composition reference. Implement the student check-in path first, then the coordinator session workflow. Keep the frontend complete and interactive with clearly labeled mock behavior, and report the routes/screens delivered and any acceptance items left incomplete.
