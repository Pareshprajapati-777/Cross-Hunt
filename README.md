# 🚢 Cross Hunt — Luxury Cruise & Maritime Event Booking Platform

<p align="center">
  <img src="https://img.shields.io/badge/Python-Django-092E20?logo=django&logoColor=white" alt="Python and Django">
  <img src="https://img.shields.io/badge/React-TypeScript-3178C6?logo=typescript&logoColor=white" alt="React and TypeScript">
  <img src="https://img.shields.io/badge/Vite-Frontend-646CFF?logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Three.js-3D%20Experience-black?logo=threedotjs&logoColor=white" alt="Three.js">
  <img src="https://img.shields.io/badge/SQLite-Database-003B57?logo=sqlite&logoColor=white" alt="SQLite">
</p>

> 🌊 A cinematic cruise discovery and reservation experience for voyages, premium cabins, private charters, and maritime events.

---

## 📌 Overview

**Cross Hunt** is a full-stack maritime booking platform that combines a Django REST-style backend with a modern React interface. Travelers can explore cruise options and cabin tiers, review itineraries, and manage booking journeys. Event organizers can explore private charter packages for celebrations and corporate gatherings.

The frontend emphasizes a premium ocean-inspired visual experience, including a Three.js hero scene, responsive layouts, and motion effects.

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
- 📊 Dashboard views for operational information

### 🎨 Visual Experience
- 🌊 Three.js ocean scene with animated waves and a stylized cruise ship
- 🪟 Selective glass-style panels and polished navigation
- 📱 Responsive layout with a reduced-complexity fallback for lower-powered devices
- 🎉 Confetti feedback on reservation confirmation

## 🧱 Technology Stack

| Layer | Technologies | Responsibility |
| --- | --- | --- |
| 🐍 Backend | Python, Django, Django ORM | Business logic, models, and server-side workflows |
| 🔌 API | Django endpoints under `/api/` | Authentication, cruises, events, bookings, and dashboards |
| ⚛️ Frontend | React, TypeScript, Vite | Interactive client interface |
| 🎨 Styling | Tailwind CSS | Layout and design system |
| 🌊 3D Graphics | Three.js / WebGL | Ocean-themed hero animation |
| 🗃️ Database | SQLite | Local development data storage |
| 🔐 Integration | CORS and session-cookie configuration | Local frontend/backend communication |

## 🏗️ Architecture

The application is split into two main parts:

- **Backend:** Django project at the repository root, with `manage.py`, application modules, and API routes.
- **Frontend:** React/Vite application in the `frontend/` directory.

The frontend communicates with the backend API. Booking totals and reservation rules should be validated server-side rather than trusted from browser input.

## 📂 Project Structure

```text
Cross-Hunt/
├── manage.py
├── requirements.txt
├── accounts/
├── api/
├── bookings/
├── cross_booking/
├── crosses/
├── dashboard/
├── frontend/
├── static/
├── templates/
├── test_e2e.py
├── test_role_routing.py
├── DESIGN.md
├── PRODUCT.md
└── README.md
```

- 🎨 [DESIGN.md](./DESIGN.md) — visual design tokens, typography, motion, and accessibility guidance.
- 🧭 [PRODUCT.md](./PRODUCT.md) — product workflows, personas, booking rules, and data-model notes.

## 🚀 Run Locally

### Prerequisites

Install **Python 3.10+** and a compatible Node.js/npm version. Use the versions supported by the project's dependency files.

### 1️⃣ Clone the repository

```bash
git clone https://github.com/Pareshprajapati-777/Cross-Hunt.git
cd Cross-Hunt
```

### 2️⃣ Set up the Django backend

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

Install Python dependencies and prepare the database:

```bash
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

Keep the backend terminal running.

### 3️⃣ Set up the React frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local frontend URL printed by Vite, commonly `http://127.0.0.1:5173/`.

### 🔧 Configuration Notes

- Check the frontend's environment/configuration files to confirm the API base URL points to your local Django server.
- If requests fail, verify Django is running and the frontend origin is allowed by the CORS settings.
- Use local development settings for local testing; do not expose development credentials or debug settings in a public deployment.

## 🧪 Tests

The repository includes integration and role-routing test scripts:

```bash
python test_e2e.py
python test_role_routing.py
```

Run the tests in a configured local environment with the backend dependencies installed. Test outcomes can vary with database state, seeded records, and environment configuration; review each script's output rather than assuming a previous result guarantees a current pass.

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
