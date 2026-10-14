# Local MySQL & Python Testing Guide for Review 3 Evaluation

This document provides exact instructions to run the **ParkFlow Parking Management System** locally with your existing MySQL database and Python backend, as well as running the automated test suite.

---

## 1. Quick Requirements
- **MySQL 8.0+** or MariaDB running locally (Default port `3306`)
- **Python 3.8+** (with `pip`)
- **Node.js 18+** (for running the React UI + Express full-stack)

---

## 2. Setting Up Your MySQL Database

1. Open your terminal or MySQL command prompt:
```bash
mysql -u root -p
```

2. Load the schema and seed slots from `schema.sql`:
```bash
mysql -u root -p < schema.sql
```
*(Or in MySQL workbench, open `schema.sql` and click Execute).*

3. Verify tables were created:
```sql
USE parking_management_db;
SHOW TABLES;
SELECT * FROM parking_slots;
```

---

## 3. Running the Standalone Python Test Suite (`test_suite.py`)

The automated Python test suite verifies all **8 core requirements** for Review 3, including valid operations and negative validation tests.

1. Install dependencies:
```bash
pip install pymysql
```

2. Run the test suite:
```bash
python test_suite.py --host localhost --user root --password your_password --db parking_management_db
```

### What `test_suite.py` Executes and Asserts:
| # | Test Scenario | Requirement | Expected Outcome |
|---|---|---|---|
| 1 | Register Customer & Vehicle | Req 6: CRUD | Pass (Record created in `customers` & `vehicles`) |
| 2 | Slot Search, Reservation & Allocation | Req 2: Slots | Pass (Slot status updated to `reserved`) |
| 3 | Vehicle Entry, Duration Calc & Exit | Req 3: Entry/Exit | Pass (Hourly rate multiplied by duration) |
| 4 | Pass Management Issuance & Verification | Req 4: Passes | Pass (Active pass created, zero fee applied) |
| 5 | Payment Recording & Receipt Generation | Req 5: Payments | Pass (Receipt number generated, status `paid`) |
| 6 | **Negative Test: Double Booking** | Req 8: Validation | **REJECTED (409 Conflict)** - Cannot reserve booked slot |
| 7 | **Negative Test: Incompatible Allocation** | Req 8: Validation | **REJECTED (400 Bad Request)** - Cannot assign truck to bike slot |
| 8 | **Negative Test: Overpayment Prevention** | Req 8: Validation | **REJECTED (400 Bad Request)** - Amount cannot exceed due |

---

## 4. Running the Standalone Python Backend (`backend.py`)

If you want to run the REST API using Python:

1. Install lightweight dependencies:
```bash
pip install flask pymysql
```

2. Start the Python server:
```bash
python backend.py
```
By default, it connects to `localhost:3306`, user `root`, database `parking_management_db`, and serves endpoints on `http://localhost:5000`.

---

## 5. Running the Complete Full-Stack Web Application (Node + React)

To run the interactive dashboard locally:

1. Install packages:
```bash
npm install
```

2. Set your MySQL credentials in `.env`:
```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=parking_management_db
```

3. Start development server:
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.
- Go to the **Test Runner** tab in the top navigation.
- Click **"Run Automated Test Suite"** to see live visual test execution and assertions!
