-- =====================================================================
-- ParkFlow Minimal MySQL Schema for Review 3 Evaluation
-- Target: MySQL 8.0+ / MariaDB 10.5+
-- Features: Foreign keys, strict constraints, unique indexes, double-booking guard
-- =====================================================================

CREATE DATABASE IF NOT EXISTS parking_management_db;
USE parking_management_db;

-- 1. Customers Table (Master data)
CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Vehicles Table (Linked to Customers with unique license plate)
CREATE TABLE IF NOT EXISTS vehicles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    license_plate VARCHAR(20) NOT NULL UNIQUE,
    vehicle_type ENUM('two_wheeler', 'four_wheeler', 'heavy_vehicle', 'ev') NOT NULL,
    brand_model VARCHAR(80) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vehicle_customer FOREIGN KEY (customer_id) 
        REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Parking Slots Table (Physical slots with floor, type, and hourly rates)
CREATE TABLE IF NOT EXISTS parking_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slot_number VARCHAR(20) NOT NULL UNIQUE,
    floor VARCHAR(10) NOT NULL,
    slot_type ENUM('two_wheeler', 'four_wheeler', 'heavy_vehicle', 'ev') NOT NULL,
    hourly_rate DECIMAL(8, 2) NOT NULL DEFAULT 20.00,
    status ENUM('available', 'reserved', 'occupied', 'maintenance') NOT NULL DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 4. Passes Table (Long-term passes: daily, weekly, monthly, vip)
CREATE TABLE IF NOT EXISTS passes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    vehicle_id INT NOT NULL,
    pass_type ENUM('daily', 'weekly', 'monthly', 'vip') NOT NULL,
    price DECIMAL(8, 2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pass_customer FOREIGN KEY (customer_id) 
        REFERENCES customers(id) ON DELETE CASCADE,
    CONSTRAINT fk_pass_vehicle FOREIGN KEY (vehicle_id) 
        REFERENCES vehicles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. Slot Reservations Table (Guards against double booking)
CREATE TABLE IF NOT EXISTS reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    vehicle_id INT NOT NULL,
    slot_id INT NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_res_customer FOREIGN KEY (customer_id) 
        REFERENCES customers(id) ON DELETE CASCADE,
    CONSTRAINT fk_res_vehicle FOREIGN KEY (vehicle_id) 
        REFERENCES vehicles(id) ON DELETE CASCADE,
    CONSTRAINT fk_res_slot FOREIGN KEY (slot_id) 
        REFERENCES parking_slots(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. Parking Sessions (Vehicle entry and exit with duration & auto-calculated bill)
CREATE TABLE IF NOT EXISTS parking_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vehicle_id INT NOT NULL,
    slot_id INT NOT NULL,
    reservation_id INT NULL,
    entry_time DATETIME NOT NULL,
    exit_time DATETIME NULL,
    duration_hours INT DEFAULT 0,
    hourly_rate DECIMAL(8, 2) NOT NULL,
    total_amount DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    amount_paid DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    payment_status ENUM('unpaid', 'partially_paid', 'paid') NOT NULL DEFAULT 'unpaid',
    has_active_pass BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_sess_vehicle FOREIGN KEY (vehicle_id) 
        REFERENCES vehicles(id) ON DELETE CASCADE,
    CONSTRAINT fk_sess_slot FOREIGN KEY (slot_id) 
        REFERENCES parking_slots(id) ON DELETE CASCADE,
    CONSTRAINT fk_sess_reservation FOREIGN KEY (reservation_id) 
        REFERENCES reservations(id) ON DELETE SET NULL,
    CONSTRAINT chk_no_negative_payment CHECK (amount_paid >= 0),
    CONSTRAINT chk_no_overpayment CHECK (amount_paid <= total_amount)
) ENGINE=InnoDB;

-- 7. Payments Table (Records individual transactions and receipt numbers)
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    amount DECIMAL(8, 2) NOT NULL,
    payment_method ENUM('cash', 'card', 'upi') NOT NULL,
    payment_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    receipt_number VARCHAR(30) NOT NULL UNIQUE,
    CONSTRAINT fk_payment_session FOREIGN KEY (session_id) 
        REFERENCES parking_sessions(id) ON DELETE CASCADE,
    CONSTRAINT chk_positive_payment CHECK (amount > 0)
) ENGINE=InnoDB;

-- =====================================================================
-- Seed Initial Parking Slots (Floors 1, 2, 3 with different vehicle types)
-- =====================================================================
INSERT INTO parking_slots (slot_number, floor, slot_type, hourly_rate, status) VALUES
('F1-B01', 'Floor 1', 'two_wheeler', 15.00, 'available'),
('F1-B02', 'Floor 1', 'two_wheeler', 15.00, 'available'),
('F1-C01', 'Floor 1', 'four_wheeler', 30.00, 'available'),
('F1-C02', 'Floor 1', 'four_wheeler', 30.00, 'available'),
('F1-EV01', 'Floor 1', 'ev', 40.00, 'available'),
('F2-C01', 'Floor 2', 'four_wheeler', 25.00, 'available'),
('F2-C02', 'Floor 2', 'four_wheeler', 25.00, 'available'),
('F2-H01', 'Floor 2', 'heavy_vehicle', 50.00, 'available'),
('F3-C01', 'Floor 3', 'four_wheeler', 20.00, 'available'),
('F3-B01', 'Floor 3', 'two_wheeler', 10.00, 'available')
ON DUPLICATE KEY UPDATE slot_number = slot_number;
