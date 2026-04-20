# MOI VIBARAM

> Digital Ledger for tracking traditional Moi (gifting) transactions  
> **Leela Tech** – *Trust Begins*

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or free cloud via [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))

---

### 1️⃣ Setup Backend

```bash
cd server
```

Edit `.env` with your MongoDB URI:

PORT=5000
MONGO_URI=mongodb+srv://leelatechgudal_db_user:[EMAIL_ADDRESS]/?appName=LeelaTechCluster

JWT_SECRET=moi_vibaram_super_secret_key_2024
JWT_EXPIRES_IN=15m

# For email OTP (optional - falls back to console log in dev)
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_app_password

CLIENT_URL=http://localhost:5173
```

Install and start:
```bash
npm install
npm run dev

```
## User host.docker.internal instead of localhost when runnig with Docker
Backend runs at: **http://localhost:5000**

---

### 2️⃣ Setup Frontend

```bash
cd client
npm install
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

### 3️⃣ MongoDB Options

**Option A – Local MongoDB** (recommended for dev):
```bash
# Install via Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Option B – MongoDB Atlas (Free Cloud)**:
1. Sign up at https://www.mongodb.com/cloud/atlas  
2. Create a free cluster  
3. Click **Connect → Connect your application**  
4. Copy the URI and paste it in `server/.env` as `MONGO_URI`

---

## 📦 Project Structure

```
Anand/
├── server/           ← Node.js + Express API
│   ├── models/       ← User, Event, Transaction schemas
│   ├── routes/       ← auth, users, events, transactions
│   ├── middleware/   ← JWT auth
│   ├── utils/        ← Email OTP
│   └── server.js     ← Entry point
│
├── client/           ← React (Vite) frontend
│   └── src/
│       ├── pages/    ← All page components
│       ├── components/ ← Navbar, QrScanner
│       ├── context/  ← AuthContext (auto-logout)
│       ├── api/      ← Axios API client
│       └── i18n/     ← Tamil & English translations
│
└── README.md
```

---

## ✨ Features

| Feature | Status |
|---|---|
| Login / Register | ✅ |
| Forgot Password (OTP) | ✅ |
| Auto-logout after 15 min | ✅ |
| Create / Edit / Delete Events | ✅ |
| Record Moi (monetary) | ✅ |
| Record Seer Varisai (gifts in kind) | ✅ |
| QR Code for profile | ✅ |
| QR Scan to auto-fill party details | ✅ |
| Upcoming Events (pending Moi) | ✅ |
| Balance Sheet (person-wise drill-down) | ✅ |
| Master Sheet (global ledger) | ✅ |
| Search by name / location | ✅ |
| Share (Web Share API) | ✅ |
| Print any report | ✅ |
| Tamil / English toggle | ✅ |

---

## 🛠️ Dev Notes

- **OTP in dev mode**: If email is not configured, OTP prints to **server console**
- **JWT expiry**: 15 minutes of inactivity triggers auto-logout
- **QR scanning**: Works on https or localhost via browser camera API
