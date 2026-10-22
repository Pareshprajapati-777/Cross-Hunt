# 🚢 Cross Hunt — Luxury Cruise & Maritime Event Booking Platform

<p align="center">
  <img src="https://img.shields.io/badge/Python-FastAPI-009688?logo=fastapi&logoColor=white" alt="Python and FastAPI">
  <img src="https://img.shields.io/badge/ORM-SQLAlchemy-D71F00?logo=sqlalchemy&logoColor=white" alt="SQLAlchemy">
  <img src="https://img.shields.io/badge/Validation-Pydantic-E92063?logo=pydantic&logoColor=white" alt="Pydantic">
  <img src="https://img.shields.io/badge/React-TypeScript-3178C6?logo=typescript&logoColor=white" alt="React and TypeScript">
  <img src="https://img.shields.io/badge/Vite-Frontend-646CFF?logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Three.js-3D%20Experience-black?logo=threedotjs&logoColor=white" alt="Three.js">
  <img src="https://img.shields.io/badge/SQLite-Database-003B57?logo=sqlite&logoColor=white" alt="SQLite">
</p>

> 🌊 A cinematic cruise discovery and reservation experience for voyages, premium cabins, private charters, and maritime events.

---

## 📌 Overview

**Cross Hunt** is a full-stack maritime booking platform that pairs a high-performance Python **FastAPI** backend (with SQLAlchemy ORM and Pydantic validation) with an interactive **React + Vite** frontend. Travelers can explore cruise options and cabin tiers, review itineraries, and manage booking journeys. Event organizers can explore private charter packages for celebrations and corporate gatherings.

The frontend emphasizes a premium ocean-inspired visual experience, including a Three.js hero scene, responsive layouts, and motion effects.

## 🗄️ Database, Accounts & Directory

The project includes an active SQLite database with demo accounts, real maritime fleet data, and export records:
- 📖 **Full Accounts & Fleet Directory**: [`DATABASE_DATA.md`](DATABASE_DATA.md) *(View all 49 users, owners, fleet operators, vessels, and bookings directly on GitHub)*
- 💾 **Primary SQLite Database**: [`db.sqlite3`](db.sqlite3)
- 📄 **Complete JSON Export**: [`database/database_export.json`](database/database_export.json)
- 📜 **Full SQL Dump**: [`database/database_dump.sql`](database/database_dump.sql)
- 🔑 **Quick Test Credentials**:
  - 👑 **Admin**: `admin` / `Admin@12345`
  - ⚓ **Operator / Owner**: `owner1` / `Owner@12345`
  - 🧳 **Guest Traveler**: `user1` / `User@12345`

## ✨ Key Features

### 🚢 Cruise Discovery & Reservations
- 🌍 Explore destinations including the Caribbean, Greek Isles, Norwegian fjords, the French Riviera, the South Pacific, and Alaska.
- 🗺️ Review day-by-day voyage itineraries and ports of call.
- 🛏️ Compare cabin tiers, from interior rooms to premium suites.
- 💵 Calculate booking prices on the server using the configured cabin, passenger, and voyage-duration rules.
- 🎫 Generate a printable digital boarding pass with QR-style verification data and a security barcode.

### 🥂 Private Charters & Events
- 💍 Explore private events such as weddings, birthdays, corporate meetings, conferences, and gala dinners.
- 💎 Compare three curated event packages: Diamond Horizon, Emerald Wave, and Sapphire Anchor.
- 👥 Match charter options to the configured guest-capacity range.

### 🧑‍💼 Role-Based Workflows
- 🧳 Traveler booking journeys
- ⚓ Cruise operator vessel and reservation management
- 🛡️ Administrator management and oversight
- 📊 Dashboard views with 10 KPI metrics, 10 interactive analytics charts, and profit accounting

### 🎨 Visual Experience
- 🌊 Three.js ocean scene with animated waves and a stylized cruise ship
- 🪟 Selective glass-style panels and polished navigation
- 📱 Responsive layout with a reduced-complexity fallback for lower-powered devices
- 🎉 Confetti feedback on reservation confirmation

## 🧱 Technology Stack

| Layer | Technologies | Responsibility |
| --- | --- | --- |
| ⚡ Backend | Python 3.10+, FastAPI, Starlette | High-performance asynchronous REST API framework |
| 🗃️ ORM & Database | SQLAlchemy 2.0, SQLite (development) | Relational data access, relationship models, and data integrity |
| 🛡️ Validation & Schemas | Pydantic v2 | Strict request validation, typing, and response serialization |
| 🔄 Schema Migrations | Alembic | Trackable database schema revisions |
| 📚 Interactive Docs | Swagger UI (`/docs`) & ReDoc (`/redoc`) | Auto-generated OpenAPI 3.0 specification |
| ⚛️ Frontend | React 18, TypeScript, Vite | Interactive client interface (100% preserved visual design) |
| 🎨 Styling | Tailwind CSS | Layout and design system |
| 🌊 3D Graphics | Three.js / WebGL | Ocean-themed hero animation |
| 🔐 Security & Auth | PBKDF2-SHA256, HTTP-only session cookies & Bearer JWT | Secure authentication preserving existing Django password hashes |

## 🏗️ Architecture

The application is split into two cleanly separated tiers:

- **Backend (`backend/`):** FastAPI application structured modularly:
  - `backend/app/main.py`: Application entrypoint, CORS middleware, static file mounts, and route registration.
  - `backend/app/core/`: Configuration (`config.py`) and security/hashing (`security.py`).
  - `backend/app/database/`: Database session management (`session.py`) and declarative base (`base.py`).
  - `backend/app/models/`: SQLAlchemy database models preserving the existing schema.
  - `backend/app/schemas/`: Pydantic input validation and response schemas.
  - `backend/app/routers/`: 10 domain routers covering auth, cruises, tours, offers, events, bookings, operator, admin, notifications, and AI.
  - `backend/app/services/`: Serializers, WhatsApp engine, and Dolphin AI concierge.
- **Frontend (`frontend/`):** React/Vite application in the `frontend/` directory (unmodified).

## 📂 Project Structure

```text
Cross-Hunt/
├── backend/
│   ├── app/
│   │   ├── core/           # Configuration & Security (PBKDF2, JWT)
│   │   ├── database/       # SQLAlchemy engine & session factory
│   │   ├── models/         # User, Operator, Cross, Booking, Tour, Offer, etc.
│   │   ├── routers/        # Auth, Cruises, Tours, Bookings, Admin, Operator, etc.
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Serializers, WhatsApp, AI Concierge
│   │   └── main.py         # FastAPI application entrypoint
│   └── requirements.txt
├── alembic/                # Alembic migration revisions
├── frontend/               # React + TypeScript + Vite frontend
├── tests/                  # Automated pytest test suite
├── db.sqlite3              # Preserved SQLite database
├── run-backend.js          # Cross-platform runner launching Uvicorn
├── package.json            # Root npm scripts
├── requirements.txt        # Python backend dependencies
└── README.md
```

## 🚀 Run Locally

### Quick Start (Backend + Frontend Concurrently)
Run directly from the root project folder:
```powershell
npm run dev
```
This automatically boots both:
1. **FastAPI Backend** on `http://127.0.0.1:8000/` (Interactive docs at `http://127.0.0.1:8000/docs`)
2. **React + Vite Frontend** on `http://localhost:5173/`

### Individual Services (Optional)
- **Frontend only**: `npm run dev:frontend` (or `cd frontend && npm run dev`)
- **Backend only**: `npm run dev:backend` (or `python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload`)
- **Build Frontend**: `npm run build`

### Prerequisites

Install **Python 3.10+** and **Node.js 18+** / npm.

### 1️⃣ Clone the repository

```bash
git clone https://github.com/Pareshprajapati-777/Cross-Hunt.git
cd Cross-Hunt
```

### 2️⃣ Set up the FastAPI backend manually

Create and activate a virtual environment:

**Windows PowerShell**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

**macOS / Linux**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install Python dependencies:

```bash
python -m pip install -r requirements.txt
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

Keep the backend terminal running. You can explore the interactive OpenAPI documentation at:
- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

### 3️⃣ Set up the React frontend manually

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local frontend URL printed by Vite, commonly `http://127.0.0.1:5173/` or `http://localhost:5173/`.

### 🔧 Configuration Notes

- Check the frontend's environment/configuration files to confirm the API base URL points to your local FastAPI server (`http://127.0.0.1:8000`).
- If requests fail, verify FastAPI is running and the frontend origin is allowed in `.env` / CORS settings.
- Use local development settings for local testing; do not expose development credentials or debug settings in a public deployment.

## 🧪 Tests

The repository includes a comprehensive automated test suite powered by `pytest` and FastAPI's `TestClient`, along with standalone end-to-end and role-routing verifiers:

```bash
# Run the automated pytest suite (15 tests covering auth, admin, AI/WhatsApp, bookings, cruises, operator)
python -m pytest tests/ -v

# Run the role-routing permissions verifier
python test_role_routing.py

# Run the end-to-end booking, invoice & requirement matching verifier
python test_e2e.py

# Run the new features verifier (WhatsApp resolution, 10 KPI cards, profit formula, 10 charts)
python test_new_features.py
```

## 🔐 Security & Deployment Checklist

- 🔑 **Do not publish real credentials.** Use environment variables or a local-only seed process for development accounts. If any credentials in an earlier README or commit were real or reused, rotate them.
- 🗃️ **Do not commit a production database.** The repository currently includes a SQLite database file; ensure it contains no real user data, session information, or sensitive records before sharing publicly.
- 🛡️ Use strong secret keys, disable debug mode, configure allowed hosts, and enforce HTTPS in production.
- 👤 Apply appropriate authentication, authorization, and access controls to traveler, operator, and administrator workflows.
- 💳 Do not treat demo booking flows as real payment processing unless a verified payment provider is integrated.
- 🧾 Confirm QR verification is validated server-side before treating a boarding pass as authentic.

## 🔮 Potential Improvements

- ☁️ Add a production database with reliable backups and deployment persistence.
- 💳 Integrate a secure payment provider and booking cancellation/refund flows.
- 📧 Add transactional email for booking confirmation and event requests.
- 🧪 Run automated tests in CI for every change.
- ♿ Audit keyboard navigation, contrast, reduced-motion preferences, and screen-reader support.
- 📈 Add observability, structured logging, and health checks for production operations.
- 📸 Add verified screenshots or a short demo video to showcase the interface.

## 👨‍💻 Author

**Paresh Prajapati**

- 🐙 [GitHub Profile](https://github.com/Pareshprajapati-777)
- 📦 [Cross Hunt Repository](https://github.com/Pareshprajapati-777/Cross-Hunt)

---

<p align="center">
  🌊 <b>Discover the voyage. Reserve the experience. Celebrate at sea.</b> 🚢
</p>
