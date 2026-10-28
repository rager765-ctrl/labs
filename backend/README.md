# Attendance FCM & Notification Backend

This is the Node.js/Express backend service designed to handle **Firebase Cloud Messaging (FCM)** push notifications, device token storage, and session broadcast alerts for the Innovations Lab Attendance Web Application.

It is structured and optimized for deployment on **[Render](https://render.com/)** on the free tier.

---

## 📁 Directory Structure

```
backend/
├── src/
│   ├── config/
│   │   └── firebase.js       # Firebase Admin SDK initialization
│   ├── routes/
│   │   ├── health.js         # Health check endpoint for Render (/health)
│   │   └── notifications.js  # FCM push notification & token endpoints
│   └── index.js              # Express app entrypoint & middleware
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore rules for node_modules & secrets
├── package.json              # Backend dependencies and npm scripts
├── render.yaml               # Render Blueprint specification
└── README.md                 # Deployment & setup documentation
```

---

## 🔑 Firebase Service Account Setup

To allow this backend to send push notifications via Firebase Admin SDK:

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project: **`attendance-9a7f5`**.
3. Click the gear icon ⚙️ (Project settings) in the top left sidebar.
4. Go to the **Service accounts** tab.
5. Click **"Generate new private key"** and confirm.
6. A JSON file will download (e.g. `attendance-9a7f5-firebase-adminsdk-xxx.json`).
7. **Important:** Keep this file private. Never commit it to GitHub.

---

## 🚀 Local Development

1. Open a terminal in the `backend/` directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your `.env` file from the template:
   ```bash
   cp .env.example .env
   ```

4. Place your downloaded JSON key inside `backend/` named `serviceAccountKey.json`, **OR** paste its content as a single line into `FIREBASE_SERVICE_ACCOUNT_KEY` in `.env`.

5. Run the dev server:
   ```bash
   npm run dev
   ```
   The server will start on `http://localhost:5000`. You can test the health endpoint at:
   `http://localhost:5000/health`

---

## 🌐 Hosting on Render

### Method A: Connect via Render Dashboard (Quickest)

1. Push your repository to **GitHub**.
2. Sign in to [Render Dashboard](https://dashboard.render.com/).
3. Click **"New +"** → **"Web Service"**.
4. Connect your GitHub repository.
5. Fill in the service settings:
   - **Name:** `attendance-backend` (or any name you prefer)
   - **Language / Runtime:** `Node`
   - **Branch:** `main` (or your active branch)
   - **Root Directory:** `backend` ⚠️ *(Very important! Set to `backend`)*
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan Type:** `Free`
6. Click **"Advanced"** and add your **Environment Variables**:
   | Variable | Value | Notes |
   |---|---|---|
   | `NODE_ENV` | `production` | Production mode |
   | `FIREBASE_PROJECT_ID` | `attendance-9a7f5` | Your Firebase Project ID |
   | `CORS_ORIGIN` | `https://your-frontend.vercel.app,http://localhost:5173` | Allowed frontend domains |
   | `FIREBASE_SERVICE_ACCOUNT_KEY` | `{"type":"service_account",...}` | Paste the **entire JSON file content** as a single string |
7. Under **Health Check Path**, enter: `/health`
8. Click **"Create Web Service"**.

Render will deploy the service and provide a public URL like:
`https://attendance-backend-xxxx.onrender.com`

---

### Method B: Using Render Blueprint (`render.yaml`)

1. In Render, select **"Blueprints"** → **"New Blueprint Instance"**.
2. Select your repository. Render will automatically detect `backend/render.yaml`.
3. In the environment variables prompt, enter your `CORS_ORIGIN` and `FIREBASE_SERVICE_ACCOUNT_KEY`.
4. Click **Apply**.

---

## 📡 API Endpoints Reference

### 1. Health Check
- **`GET /health`**
  - Used by Render to verify server uptime.
  - Response:
    ```json
    {
      "status": "healthy",
      "uptime": "42s",
      "firebaseReady": true
    }
    ```

### 2. Register FCM Device Token
- **`POST /api/notifications/register-token`**
  - Saves a user's browser or mobile device push token in Firestore.
  - Body:
    ```json
    {
      "uid": "user-student-1",
      "token": "eFCM_token_string_here...",
      "deviceName": "Chrome on Windows"
    }
    ```

### 3. Send Notification to User
- **`POST /api/notifications/send-to-user`**
  - Looks up user's active device tokens and sends the push notification.
  - Body:
    ```json
    {
      "uid": "user-student-1",
      "title": "Session Live: Team Standup",
      "body": "Check-in is now open in Room 304B.",
      "url": "/student/sessions/session-1"
    }
    ```

### 4. Live Session Alert Broadcast
- **`POST /api/notifications/session-alert`**
  - Dispatches an alert to all eligible students when a meeting or lab session starts.
  - Body:
    ```json
    {
      "sessionId": "session-1",
      "sessionTitle": "Innovations Lab Review",
      "room": "Room 304B",
      "coordinatorName": "Dr. Vance",
      "eligibleStudentIds": ["user-student-1", "user-student-2"],
      "alertType": "session_live"
    }
    ```

### 5. Attendance Correction Decision Alert
- **`POST /api/notifications/correction-alert`**
  - Alerts student when their correction request is approved or rejected.
  - Body:
    ```json
    {
      "studentId": "user-student-1",
      "sessionTitle": "Innovations Lab Review",
      "status": "approved",
      "decisionReason": "GPS logs verified location within geofence."
    }
    ```

### 6. Topic Subscriptions
- **`POST /api/notifications/subscribe-topic`**
  - Body: `{ "tokens": ["..."], "topic": "all-students" }`
- **`POST /api/notifications/send-to-topic`**
  - Body: `{ "topic": "all-students", "title": "Lab Announcement", "body": "Lab closes at 5PM today." }`
