# Musthak Class Management System — Setup Guide

## Tech Stack
- **Frontend:** Vanilla HTML/CSS/JavaScript (no framework)
- **Database:** Firebase Firestore
- **Auth:** Firebase Authentication
- **Hosting:** GitHub Pages
- **Email:** EmailJS
- **WhatsApp:** CallMeBot API
- **QR:** qrcode.js + html5-qrcode

---

## Step 1: Firebase Setup

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project (e.g. `musthak-cms`)
3. Enable **Firestore** (Start in production mode)
4. Enable **Authentication** → Sign-in method → **Email/Password**
5. Enable **Storage** (for student/teacher photos)
6. Go to Project Settings → Your apps → Add Web App
7. Copy the Firebase config object

---

## Step 2: Configure the App

Edit `js/config.js` and replace the placeholder values:

```js
const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};
```

---

## Step 3: Create Admin User

In the Firebase Console:
- Authentication → Users → Add user
- Enter admin email + password

---

## Step 4: Set Firestore Security Rules

In Firebase Console → Firestore → Rules, paste the contents of `firestore.rules`.

---

## Step 5: Deploy to GitHub Pages

1. Create a new GitHub repo (e.g. `musthak-cms`)
2. Push all files to the `main` branch:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/musthak-cms.git
   git push -u origin main
   ```
3. Go to repo Settings → Pages → Source: `main` branch, root `/`
4. Site will be live at: `https://YOUR_USERNAME.github.io/musthak-cms/`

---

## Step 6: Configure Notifications (in the app)

### EmailJS
1. Sign up at [emailjs.com](https://www.emailjs.com) (free: 200/month)
2. Connect your Gmail account as a service
3. Create 3 email templates:
   - `payment_receipt` — Variables: `{{to_email}}`, `{{student_name}}`, `{{parent_name}}`, `{{receipt_number}}`, `{{class_name}}`, `{{months_covered}}`, `{{amount_paid}}`, `{{payment_date}}`, `{{center_name}}`
   - `due_reminder` — Variables: `{{to_email}}`, `{{student_name}}`, `{{due_month}}`, `{{amount_due}}`, `{{due_date}}`, `{{class_name}}`, `{{center_phone}}`
   - `overdue_notice` — Variables: `{{to_email}}`, `{{student_name}}`, `{{balance}}`, `{{class_name}}`, `{{center_phone}}`
4. In the app Settings page, enter your EmailJS Public Key, Service ID, and Template IDs

### WhatsApp (CallMeBot)
1. Each parent must activate their number once by sending WhatsApp to **+34 644 68 18 43**  
   with the message: `I allow callmebot to send me messages`
2. They'll receive an API key in reply
3. Enter that API key in Settings → WhatsApp section
4. Parents' phone numbers must be in international format: `+94771234567`

---

## Step 7: First-time App Setup

1. Log in with your admin email/password
2. Go to **Settings** → click "Seed Default Subjects & Grades"
3. Configure center name, phone, email
4. Add teachers, subjects, grades, classes
5. Add students
6. Start enrolling!

---

## QR Card System

- Each student automatically gets a unique QR code when added
- Go to **Students** → click 📱 to print QR card
- QR code links to: `https://YOUR_USERNAME.github.io/musthak-cms/#/portal/STUDENT_ID`
- Parents can scan this with any camera app (no app installation needed)
- Portal shows: outstanding dues, active classes, recent payments, center contact

---

## Payment Flow

1. Click **+ Payment** (topbar or Payments page)
2. Search student by name or scan their QR code
3. Select the enrollment (class)
4. Set months to pay (1-12), optionally apply advance discount
5. Live calculation shows: total, teacher split, center split
6. Save → receipt shown → email + WhatsApp sent automatically

---

## Attendance with QR

1. Go to **Attendance** → Start Session → select class
2. On the QR Scan tab: select the session
3. Phone camera opens
4. Students hold their QR cards to the camera
5. System marks them Present automatically

---

## File Structure

```
musthak-cms/
├── index.html          ← Single page app shell
├── manifest.json       ← PWA manifest
├── sw.js               ← Service worker (offline)
├── firestore.rules     ← Firebase security rules
├── SETUP.md            ← This file
├── css/                ← All stylesheets
└── js/
    ├── config.js       ← Firebase config (EDIT THIS)
    ├── app.js          ← Entry point
    ├── router.js       ← Hash-based routing
    ├── firebase/       ← Auth, storage
    ├── services/       ← All Firestore operations
    ├── notifications/  ← Email + WhatsApp
    ├── qr/             ← QR generation + scanning
    ├── reports/        ← PDF + CSV export
    ├── utils/          ← Formatters, validators, UI helpers
    └── pages/          ← All page components
```

---

## Collections (Firestore)

| Collection | Description |
|---|---|
| `settings/global` | Center config, EmailJS keys, CallMeBot key |
| `students` | Student profiles + QR ID |
| `teachers` | Teachers with subjects[] + grades[] arrays |
| `subjects` | Subject catalog |
| `grades` | Grade levels (Grade 6–11, O/L, A/L) |
| `classes` | Classes with fee, schedule, teacher |
| `enrollments` | Student-class enrollment with fee_agreed |
| `payments` | Payment records with teacher/center split |
| `due_schedules` | Monthly dues per enrollment |
| `attendance_sessions` | Class attendance sessions |
| `attendance_records` | Per-student attendance per session |
| `notifications_log` | Email/WhatsApp send log |
| `waiting_list` | Class waiting list |
