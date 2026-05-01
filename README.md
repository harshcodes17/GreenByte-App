# GreenByte Platform

GreenByte is a modernized e-waste collection platform designed to streamline sustainable recycling through a transparent, administrative-driven lifecycle.

The platform has three user roles:
- `customer`: Register, schedule drop-offs, and track environmental impact.
- `recycler`: Manage collection points, accept drop-off requests, and move items through recycling stages.
- `admin`: Monitor system-wide analytics, approve pricing, and manually assign recyclers to validated requests.

## Recent Modernization & UX Improvements

The platform has recently undergone a significant transformation to improve usability and administrative control:
- **Drop-off Only Model**: Shifted from doorstep pickups to a streamlined "Drop-off" model. Customers now select specific recycler collection points when scheduling.
- **Modern Notification System**: Replaced blocking native alerts with a global, non-blocking **Toast Notification System** (`ToastContext` + `InlineToast`) for a seamless mobile-web experience.
- **Refined Admin Workflows**:
  - **Manual Assignment**: Admins now manually assign specific recyclers to requests once price negotiations are resolved.
  - **Force Delete**: Admins have permanent delete authority over any request, bypassing standard lifecycle restrictions.
- **Dynamic Tracking UI**: The customer tracking timeline is now specialized for the drop-off flow, providing clear status updates (e.g., "Drop-off Location Approved", "Drop-off Pending").

## Tech Stack

- **Frontend**: Expo (React Native), React Navigation, Material Community Icons, Context API (Toast & App state).
- **Backend**: Node.js, Express, Mongoose (MongoDB), Zod Validation.
- **AI Integration**: Gemini API for automated e-waste value estimation and reasoning.
- **Database**: MongoDB (Local or Docker).

## Repository Structure

```text
GreenByte-App
├── App.js                  # Global entry point, navigation, and state providers
├── firebaseClient.js       # Firebase Auth configuration
├── package.json            # Frontend scripts and dependencies
└── backend
    ├── src
    │   ├── controllers     # Request handlers (Admin, Recycler, Pickup, Auth)
    │   ├── models          # Mongoose Schemas (User, Pickup, RecyclerProfile, etc.)
    │   ├── routes          # API versioning (v1) and route definitions
    │   ├── services        # Core business logic and status transitions
    │   └── validators      # Schema validation with Zod
    ├── scripts             # Seeding, analytics, and test data scripts
    └── package.json        # Backend dependencies
```

## Getting Started

### Prerequisites
- **Node.js**: v18 or higher
- **MongoDB**: v6.0 or higher (if running manually)
- **Docker & Docker Compose**: (Required for Docker setup)
- **Gemini API Key**: Obtain from [Google AI Studio](https://aistudio.google.com/app/apikey)

---

### 🚀 Quick Start with Docker (Recommended)
The easiest way to get the full stack running with a pre-populated database:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/harshcodes17/GreenByte-App.git
   cd GreenByte-App
   ```

2. **Configure Environment**:
   ```bash
   cd backend
   # Create a .env file and add your key
   echo "GEMINI_API_KEY=your_actual_key_here" > .env
   ```

3. **Spin up the stack**:
   ```bash
   docker-compose up --build
   ```
   *The API will automatically seed the catalog data on its first startup.*

4. **Access the App**:
   The backend will be running at `http://localhost:4000`. You can now start the frontend (see below).

---

### 🛠️ Manual Setup

#### 1. Backend Setup
1. **Install Dependencies**:
   ```bash
   cd backend
   npm install
   ```
2. **Environment Configuration**:
   Copy `.env.example` to `.env` and fill in your `MONGODB_URI` and `GEMINI_API_KEY`.
3. **Start the Server**:
   ```bash
   npm run dev
   ```

#### 2. Frontend Setup (Expo)
1. **Install Dependencies**:
   ```bash
   # From the root directory
   npm install
   ```
2. **Start the App**:
   ```bash
   npm start
   # Or for web:
   npm run web
   ```

#### 3. Initial Data Seeding
If you are **not** using Docker and starting with a fresh database, run the seed script:
```bash
cd backend
npm run seed
```

## Main Product Flows

### Customer Flow
1. **Log in**: Authenticate with phone number (OTP-backed).
2. **Select E-Waste**: Browse the catalog and add items for estimation.
3. **Schedule Drop-off**: Select a preferred **Recycler Collection Point** and a drop-off date.
4. **Track Status**: Monitor the "Drop-off Status" screen for admin approval and recycler validation.
5. **Impact**: View CO2 saved and environmental metrics on the dashboard.

### Admin Flow
1. **Overview**: Monitor system-wide totals (CO2, weight, users).
2. **Scrutinize Requests**: Review AI-estimated prices and approve or negotiate with customers.
3. **Assign Recycler**: Once the price is accepted, manually assign a recycler from the pool to the request.
4. **Lifecycle Control**: Force-delete invalid requests or process payments once items are recycled.

### Recycler Flow
1. **Assigned Jobs**: View requests assigned by the admin.
2. **Process Waste**: Advance the status from "Drop-off Location Approved" to "In Transit" (if applicable), "Collected", and "Recycled".
3. **Dashboard**: Track collection metrics and facility availability.

## API Overview (v1)

- **Auth**: `POST /auth/register`, `POST /auth/login`
- **Pickups**: `POST /pickups/estimate`, `POST /pickups` (Drop-off requests)
- **Recyclers**: `GET /recyclers` (Public list for customers), `GET /recyclers/:id/profile`
- **Admin**:
  - `GET /admin/overview`
  - `GET /admin/requests`
  - `POST /admin/requests/:id/assign` (Manual assignment)
  - `DELETE /admin/requests/:id` (Force delete)

## Developer Notes

- **AI Estimation**: Requires a `GEMINI_API_KEY` for automated scrap valuation.
- **Toast System**: Controlled via the `useToast()` hook and the `<ToastProvider>` in `App.js`.
- **Validation**: All inputs are strictly validated via Zod on the backend (`backend/src/validators`).
- **Styling**: Uses a custom `THEME` object for consistent brand colors and aesthetic premium look.

## Recommended Next Steps

1. **Environment Hardening**: Move the `GEMINI_API_KEY` and MongoDB connection strings into proper `.env` files.
2. **Push Notifications**: Integrate Expo Push Notifications to alert customers of price approvals and recycler assignments.
3. **Automated Testing**: Implement integration tests for the administrative manual assignment flow.
