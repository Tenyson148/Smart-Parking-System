# Minimal MySQL Parking Management System (Review 3 Evaluation)

A lightweight, robust parking management application tailored for Review 3 evaluation. It implements all 8 required features with minimal file complexity, enforces strict database integrity rules, provides an embedded automated workflow test runner, and includes standalone Python/MySQL scripts (`schema.sql`, `backend.py`, and `test_suite.py`) with complete local execution instructions.

## User Review & Critical Decisions

> [!IMPORTANT]
> **Database & Environment Testing Policy**:
> 1. We strictly differentiate between what is tested live in this cloud runtime versus what requires local execution against your personal MySQL instance.
> 2. The live application includes a self-contained, real executing test suite that proves the complete 8-step workflow (5 valid operations + 3 rejected invalid operations with real HTTP/data assertions).
> 3. We provide an exact `schema.sql`, `backend.py` (FastAPI/Flask + `pymysql`/`mysql-connector`), automated `test_suite.py`, and a `LOCAL_TESTING_GUIDE.md` so you can run the exact same tests locally against your MySQL database and verify every constraint.
> 4. We will never falsely claim an operation was tested on an external database if it was not directly reached.

---

## 1. Overview & Core Concept

- **What It Does**: End-to-end management of parking facilities: real-time slot occupancy tracking, search and allocation, time-stamped vehicle entry/exit with automatic duration calculation and billing, customer pass management, payment recording with receipts, customer/vehicle master data CRUD, occupancy/duration/revenue reporting, and strict constraint validation.
- **Review 3 Focus**: Demonstrates both successful operations and rejected invalid operations (double-booking, incompatible vehicle/slot allocations, and overpayments).
- **Architecture**: Minimalist full-stack application (Express + React for immediate live review in AI Studio) accompanied by standalone Python scripts (`backend.py`, `test_suite.py`) and standard MySQL DDL (`schema.sql`) for local execution.

---

## 2. User Experience & Visual Design

Following SaaS & Dashboard Design Guidelines (`references/3_saas_dashboard.md`):
- **Layout & Structure**: Clean high-density single-page dashboard with top bar metrics (Total Slots, Occupied, Available, Occupancy Rate %) and tabbed workspace navigation:
  - **Live Dashboard**: Occupancy breakdown by floor and vehicle type, active parked vehicles.
  - **Entry & Exit Gate**: Fast check-in (plate lookup, slot assignment) and check-out (duration calculation, fee summary, pass discount).
  - **Slots & Reservations**: Interactive slot grid with search/filtering, reservation modal with conflict detection.
  - **Pass Management**: Active pass directory, new pass generation (daily, weekly, monthly, VIP).
  - **Customers & Vehicles**: Fast search and CRUD table for customers and their registered vehicles.
  - **Payments & Receipts**: Transaction history, payment entry modal, and printable receipt view with full breakdown.
  - **Reports & Analytics**: Occupancy distribution, average parking durations, and revenue breakdown (by method and pass type).
  - **Automated Test Suite & Local Guide**:
    - Live 1-click test runner executing all 8 scenarios with real assertion badges.
    - Tab with the copyable MySQL `schema.sql`, Python `test_suite.py`, and terminal commands to run locally.
- **Visual Identity & Theme**:
  - *Color Palette*: Slate canvas (`bg-slate-50`), crisp white structural surfaces (`bg-white border border-slate-200`), dark navy text (`text-slate-900`), and semantic status tags (Green for available/paid, Amber for reserved, Crimson for occupied/error).
  - *Typography*: Clean display sans (`Plus Jakarta Sans`) with strictly aligned tabular numerals (`font-mono tabular-nums`).
  - *Zero-Pill Discipline*: Clean unboxed metadata with subtle typographic separators (`·`).

---

## 3. Key Product Decisions & Trade-Offs

- **Minimalist Architecture (Fewest Files)**:
  - `server.ts`: Single Express backend handling data routes, business logic validation, and database rules.
  - `schema.sql`: Clean MySQL DDL script with foreign keys, checks, and unique indexes.
  - `backend.py`: Standalone single-file Python backend with MySQL connection for local execution.
  - `test_suite.py`: Standalone Python automated test script with unittest/pytest assertions.
  - `LOCAL_TESTING_GUIDE.md`: Step-by-step instructions to run schema, backend, and tests on local MySQL.
  - `src/App.tsx`: Unified React application with modular sub-views in one cohesive file to eliminate sprawl.
  - `src/api.ts`: Typed API client for all backend endpoints.
- **Relational Integrity Over Client-Side Checks**:
  - Double booking and overpayment logic are enforced on the server/database layer so concurrent requests cannot violate constraints.
- **Transparent Verification Reporting**:
  - The live test runner runs real automated tests, displaying the input parameters, expected outcome, actual outcome, and pass/fail badge.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React Frontend (App.tsx)                        │
│  ┌───────────────┬────────────────┬───────────────┬─────────────────┐  │
│  │ Occupancy     │ Entry / Exit   │ Slot Search & │ Pass Management │  │
│  │ Dashboard     │ Live Gate      │ Allocation    │ & Payments      │  │
│  ├───────────────┼────────────────┼───────────────┼─────────────────┤  │
│  │ Customer CRUD │ Vehicle CRUD   │ Reports View  │ Test Runner &   │  │
│  │               │                │               │ Local Guide     │  │
│  └───────────────┴────────────────┴───────────────┴─────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / JSON API (/api/*)
┌───────────────────────────────────▼────────────────────────────────────┐
│                       Express Backend (server.ts)                      │
│  ┌───────────────────┬───────────────────┬──────────────────────────┐  │
│  │ Vehicle Entry/Exit│ Slot Allocator &  │ Payment & Receipt        │  │
│  │ & Duration Calc   │ Conflict Guard    │ Validator                │  │
│  └─────────┬─────────┴─────────┬─────────┴────────────┬─────────────┘  │
│            │                   │                      │                │
│            ▼                   ▼                      ▼                │
│    Double-Booking Check  Type Match Check   Overpayment Check          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ├── Live DB / Relational Engine
                                    └── Standalone Python + MySQL files:
                                        • schema.sql
                                        • backend.py
                                        • test_suite.py
```

### Relational Schema (`schema.sql`)
1. `customers`: `id`, `name`, `phone`, `email`, `created_at`
2. `vehicles`: `id`, `customer_id`, `license_plate` (UNIQUE), `vehicle_type` (`two_wheeler`, `four_wheeler`, `heavy_vehicle`, `ev`), `model`
3. `parking_slots`: `id`, `slot_number` (UNIQUE), `floor`, `slot_type`, `hourly_rate`, `status` (`available`, `reserved`, `occupied`, `maintenance`)
4. `reservations`: `id`, `customer_id`, `vehicle_id`, `slot_id`, `start_time`, `end_time`, `status` (`active`, `completed`, `cancelled`)
5. `parking_sessions`: `id`, `vehicle_id`, `slot_id`, `entry_time`, `exit_time`, `duration_hours`, `hourly_rate`, `total_amount`, `payment_status` (`unpaid`, `partially_paid`, `paid`)
6. `passes`: `id`, `customer_id`, `vehicle_id`, `pass_type` (`daily`, `weekly`, `monthly`), `start_date`, `end_date`, `price`, `is_active`
7. `payments`: `id`, `session_id`, `amount`, `payment_method` (`cash`, `card`, `upi`), `payment_time`, `receipt_no`

### Enforced Rules & Invariants
1. **Rule 1: No Double Booking**:
   - `slot_id` cannot be reserved if an active reservation overlaps `[start_time, end_time]`, or if the slot is currently `occupied`.
2. **Rule 2: Type Compatibility**:
   - Slot type must match or accommodate the vehicle type:
     - `two_wheeler` vehicle $\rightarrow$ `two_wheeler` slot only.
     - `four_wheeler` vehicle $\rightarrow$ `four_wheeler` slot.
     - `heavy_vehicle` $\rightarrow$ `heavy_vehicle` slot only.
     - `ev` $\rightarrow$ `ev` slot (or standard if configured).
3. **Rule 3: No Overpayment**:
   - `new_payment.amount <= (session.total_amount - session.amount_paid)`. If `amount > remaining`, HTTP 400 Bad Request is returned.
4. **Rule 4: Automatic Duration & Rate Calculation**:
   - `duration = ceil((exit_time - entry_time) in hours)` (minimum 1 hour).
   - If vehicle has an active valid pass, `total_amount = 0`. Otherwise, `total_amount = duration * slot.hourly_rate`.

---

## 5. Automated Test Suite (All 8 Review 3 Requirements)

The test suite explicitly tests and demonstrates:
- ✅ **Test 1 (Requirement 6)**: Customer & Vehicle CRUD registration
- ✅ **Test 2 (Requirement 2)**: Slot search, reservation and allocation
- ✅ **Test 3 (Requirement 3)**: Vehicle entry, duration calculation, and automatic billing exit
- ✅ **Test 4 (Requirement 4)**: Pass management creation and validation
- ✅ **Test 5 (Requirement 5)**: Payment recording and receipt generation
- ❌ **Test 6 (Requirement 8 - Negative Test)**: Double booking rejection (attempting to book an already occupied/reserved slot)
- ❌ **Test 7 (Requirement 8 - Negative Test)**: Incompatible allocation rejection (attempting to assign a heavy truck to a bike slot)
- ❌ **Test 8 (Requirement 8 - Negative Test)**: Overpayment rejection (attempting to record a payment higher than the balance due)

---

## 6. Implementation Steps

1. **Step 1: Install Dependencies**:
   - Install `mysql2` and `canvas-confetti` (for receipt generation celebration).
2. **Step 2: Backend Architecture & Database Engine (`server.ts`)**:
   - Implement database connection and full REST API with strict constraint validation.
   - Implement the `/api/test-suite/run` endpoint executing real automated checks.
3. **Step 3: Standalone Python & MySQL Scripts**:
   - Create `schema.sql` (MySQL DDL).
   - Create `backend.py` (FastAPI/Flask MySQL backend).
   - Create `test_suite.py` (automated Python test runner for local MySQL).
   - Create `LOCAL_TESTING_GUIDE.md` with instructions.
4. **Step 4: Frontend Client & UI (`src/api.ts` & `src/App.tsx`)**:
   - Build the responsive, minimalist dashboard with all 8 requirements.
   - Include interactive modals for slot allocation, vehicle exit, pass creation, payments, and printable receipts.
   - Include live reports for occupancy, duration, and revenue.
   - Include the interactive Test Runner tab showing real test results and query details.
5. **Step 5: Compilation & Verification**:
   - Compile and verify the application builds without errors.
   - Run the automated test suite to verify all requirements.
