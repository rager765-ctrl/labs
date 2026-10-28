# Attendance Platform — University Laboratories & Practical Sessions

A mobile-first attendance web platform designed for university laboratory environments, supporting students and lab coordinators with modern QR check-ins, real-time arrival feeds, session scheduling, and attendance audit trails.

Built strictly according to the **Product Requirements Document (PRD)** and [`attendance-design-tokens.md`](./attendance-design-tokens.md).

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Installation & Run

```bash
# 1. Install dependencies
npm install

# 2. Start local development server
npm run dev

# 3. Build & typecheck for production
npm run build
```

Development server URL: **http://localhost:5173**

---

## 📱 Features Delivered

### 1. Student Mobile Experience (Optimized for 320px – 480px)
- **Home Dashboard (`/student`)**:
  - Gradient art header with personalized greeting, date, and university avatar.
  - Active practical session card with prominent Check In pill and context-aware Check Out button.
  - Real-time attendance overview: Attended, Late, Missed sessions, and overall percentage standing.
  - Upcoming laboratory practical schedule list.
  - Fixed 64px bottom navigation bar (`Home`, `History`, `Profile`) adhering to mobile safe-area insets.
- **Full-Screen QR Scanner (`/student/scan`)**:
  - Charcoal scanner surface (`#66686B`) with live camera stream (`getUserMedia`) and polite permission fallback.
  - Bright white corner brackets around square scan frame (`min(68vw, 280px)`) and animated laser guide.
  - Flashlight/torch toggle control.
  - Deterministic **"Simulate Scan"** button with automatic verification against active session state.
  - Alternative **"Enter PIN"** tab for manual 4-digit code entry (e.g., PIN `8492`).
  - White rounded confirmation bottom sheet with status illustrations, metadata, and primary action.
- **Attendance History (`/student/history`)**:
  - Cumulative attendance rate banner and good standing indicators.
  - Course and room search bar with clear filters.
  - Filter pills (`All`, `Present`, `Late`, `Absent`, `Excused`).
  - Interactive **"Report an issue / dispute"** modal submitting verified correction requests to the coordinator.
- **Session Detail (`/student/sessions/:sessionId`)**:
  - Complete lab syllabus, coordinator info, time window, room, and prerequisite instructions.
  - Live check-in/out triggers and official audit history log.
- **Student Profile (`/student/profile`)**:
  - University student credentials, programme, level, and campus verification status.
  - Local demo notification toggles and role switcher.

### 2. Coordinator Operations (Responsive Desktop & Mobile)
- **Coordinator Dashboard (`/coordinator`)**:
  - Key operational metrics: Enrolled cohort, Today's check-ins, Attendance rate %, Active sessions.
  - Today's practical schedule with one-click **"Start Session"** action.
  - Accessible pure-CSS attendance trend bar chart across recent weeks.
  - Attention banner highlighting pending student correction requests.
- **Session Scheduling (`/coordinator/sessions/new`)**:
  - Form validation with course code, room, date, start/end times.
  - Check-in window offsets and late arrival threshold settings.
  - Require checkout toggle and room collision warning detection.
- **Live Attendance Monitor (`/coordinator/sessions/:sessionId`)**:
  - Live session pass featuring a high-contrast QR code with clear quiet zone.
  - Simulated rotating token refresh affordance.
  - 4-digit session PIN display (`8492`).
  - Attendance breakdown progress bar (Present, Late, Pending).
  - **"Simulate Student Arrival"** button for immediate arrival demonstrations.
  - Real-time student check-in feed.
- **Attendance Roster Management (`/coordinator/sessions/:sessionId/attendance`)**:
  - Searchable student cohort table with status filters.
  - Manual attendance marking dialog with mandatory audit reason logging.
  - Comprehensive audit trail drawer recording actors, timestamps, old/new statuses, and explanations.
  - Demo CSV export trigger with user notification.
- **Reports & Analytics (`/coordinator/reports`)**:
  - Multi-course and date-range filters.
  - At-risk student identification table (< 75% attendance threshold).
  - Session turnout and attendance percentage breakdown.
- **Coordinator Profile (`/coordinator/profile`)**:
  - Faculty credentials and department information.

---

## 🎨 Design System & Tokens

Implemented directly from [`attendance-design-tokens.md`](./attendance-design-tokens.md) via CSS custom properties:
- **Palette**: Pale blue background (`#EEF3FF`), Vivid indigo brand actions (`#283DB8`, `#354BD1`), White surfaces (`#FFFFFF`), Soft blue icon wells (`#DCE6FF`).
- **Status Signals**: Present (`#15845A` / `#E6F6EF`), Late (`#A96812` / `#FFF2D8`), Absent (`#B83A4B` / `#FDECEE`), Live indicator (`#354BD1` with pulsing glow).
- **Typography**: Google Fonts **Poppins** for rounded display headings and **Inter** for clean UI readability.
- **Touch & Accessibility**: 44px minimum touch targets, high contrast ratios, visible keyboard focus rings, and `prefers-reduced-motion` compliance.

---

---

## 🔥 Firebase BaaS (Backend-as-a-Service)

Connected to Firebase Project: **`attendance-9a7f5`**

### Modules Configured:
- **Firebase Authentication** (`src/services/authService.ts`):
  - Email/Password Sign-In and User Registration (`signInUser`, `signUpUser`, `signOutUser`).
  - Real-time authentication state listening (`listenToAuthChanges`).
  - Automatic profile generation and linking in Firestore (`users/{uid}`).
- **Cloud Firestore Database** (`src/services/firestoreService.ts`):
  - Collections: `sessions`, `attendance`, `corrections`, `users`.
  - Real-time data synchronization with optimistic local caching.
  - Automatic initial collection seeding (`seedFirestoreIfEmpty`).
  - Live real-time check-in stream across devices.
- **Firebase Analytics** (`src/services/firebase.ts`):
  - Initialized in supported browser environments.
- **Auth & Cloud Sync UI** (`src/components/common/AuthModal.tsx`):
  - Click **"Firebase BaaS"** in the top bar to sign in, create a Firebase account, or synchronize local state to Cloud Firestore.

---

## 🧪 Prototype Controls & Limitations

1. **Role Switcher**: Use the persistent top demo header to switch between **Student (Alex Chen)** and **Coordinator (Dr. Elena Vance)** at any time.
2. **Reset Demo Data**: Click **"Reset Data"** in the top bar to restore all sessions, records, and requests to their original clean fixture state.
3. **Storage & Cloud Sync**: All actions (check-ins, check-outs, sessions created, manual marks, and dispute requests) are persisted locally via `localStorage` and continuously synced in real time to **Firebase Firestore**.
4. **Prototype Boundaries**:
   - Client-side mock QR generation and simulated token refresh. In production, rotating TOTP/signed cryptographic tokens from an authenticated server should be used.
   - Camera preview uses the standard HTML5 `MediaDevices.getUserMedia` API with automatic fallback to simulated scans and PIN entry when camera access is denied or unavailable.
