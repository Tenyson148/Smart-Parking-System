#!/usr/bin/env python3
"""
ParkFlow - Minimal Standalone Python Backend for Review 3 Evaluation
Framework: Flask + PyMySQL
Database: MySQL 8.0+

Usage:
    pip install flask pymysql
    python backend.py
"""

import os
import math
from datetime import datetime
from flask import Flask, request, jsonify
import pymysql
from pymysql.cursors import DictCursor

app = Flask(__name__)

# Database configuration from environment or defaults
DB_CONFIG = {
    'host': os.environ.get('MYSQL_HOST', 'localhost'),
    'port': int(os.environ.get('MYSQL_PORT', 3306)),
    'user': os.environ.get('MYSQL_USER', 'root'),
    'password': os.environ.get('MYSQL_PASSWORD', ''),
    'database': os.environ.get('MYSQL_DATABASE', 'parking_management_db'),
    'cursorclass': DictCursor,
    'autocommit': True
}

def get_db():
    return pymysql.connect(**DB_CONFIG)

# Compatibility Matrix for Vehicle Types and Slot Types
COMPATIBILITY = {
    'two_wheeler': ['two_wheeler'],
    'four_wheeler': ['four_wheeler'],
    'heavy_vehicle': ['heavy_vehicle'],
    'ev': ['ev', 'four_wheeler']  # EVs can use dedicated EV or standard 4-wheeler
}

# 1. Live Dashboard Occupancy
@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) AS total, SUM(CASE WHEN status='occupied' THEN 1 ELSE 0 END) AS occupied, SUM(CASE WHEN status='reserved' THEN 1 ELSE 0 END) AS reserved, SUM(CASE WHEN status='available' THEN 1 ELSE 0 END) AS available FROM parking_slots")
        counts = cur.fetchone()
        
        cur.execute("SELECT floor, slot_type, status, COUNT(*) as count FROM parking_slots GROUP BY floor, slot_type, status")
        breakdown = cur.fetchall()

        cur.execute("""
            SELECT s.*, v.license_plate, v.vehicle_type, sl.slot_number, sl.floor 
            FROM parking_sessions s
            JOIN vehicles v ON s.vehicle_id = v.id
            JOIN parking_slots sl ON s.slot_id = sl.id
            WHERE s.exit_time IS NULL
            ORDER BY s.entry_time DESC
        """)
        active_sessions = cur.fetchall()

    conn.close()
    total = counts['total'] or 0
    occupied = counts['occupied'] or 0
    occupancy_rate = round((occupied / total * 100), 1) if total > 0 else 0

    return jsonify({
        'total_slots': total,
        'occupied': occupied,
        'reserved': counts['reserved'] or 0,
        'available': counts['available'] or 0,
        'occupancy_rate': occupancy_rate,
        'breakdown': breakdown,
        'active_sessions': active_sessions
    })

# 2. Slot Search & Reservation (With Double Booking & Compatibility Guards)
@app.route('/api/slots', methods=['GET'])
def list_slots():
    slot_type = request.args.get('slot_type')
    floor = request.args.get('floor')
    status = request.args.get('status')
    
    query = "SELECT * FROM parking_slots WHERE 1=1"
    params = []
    if slot_type:
        query += " AND slot_type = %s"
        params.append(slot_type)
    if floor:
        query += " AND floor = %s"
        params.append(floor)
    if status:
        query += " AND status = %s"
        params.append(status)

    conn = get_db()
    with conn.cursor() as cur:
        cur.execute(query, params)
        slots = cur.fetchall()
    conn.close()
    return jsonify(slots)

@app.route('/api/slots/reserve', methods=['POST'])
def reserve_slot():
    data = request.json or {}
    customer_id = data.get('customer_id')
    vehicle_id = data.get('vehicle_id')
    slot_id = data.get('slot_id')
    start_time = data.get('start_time')
    end_time = data.get('end_time')

    if not all([customer_id, vehicle_id, slot_id, start_time, end_time]):
        return jsonify({'error': 'Missing required fields'}), 400

    conn = get_db()
    with conn.cursor() as cur:
        # Check vehicle exists and get its type
        cur.execute("SELECT * FROM vehicles WHERE id = %s", (vehicle_id,))
        vehicle = cur.fetchone()
        if not vehicle:
            conn.close()
            return jsonify({'error': 'Vehicle not found'}), 404

        # Check slot exists and get its type
        cur.execute("SELECT * FROM parking_slots WHERE id = %s", (slot_id,))
        slot = cur.fetchone()
        if not slot:
            conn.close()
            return jsonify({'error': 'Slot not found'}), 404

        # RULE: Compatibility check
        allowed_slots = COMPATIBILITY.get(vehicle['vehicle_type'], [])
        if slot['slot_type'] not in allowed_slots:
            conn.close()
            return jsonify({
                'error': f"Incompatible allocation: Vehicle type '{vehicle['vehicle_type']}' cannot be parked in slot type '{slot['slot_type']}'"
            }), 400

        # RULE: Double booking prevention (Slot occupied OR overlapping reservation)
        if slot['status'] == 'occupied':
            conn.close()
            return jsonify({'error': 'Double booking rejected: Slot is currently occupied'}), 409

        cur.execute("""
            SELECT * FROM reservations 
            WHERE slot_id = %s AND status = 'active'
            AND (
                (start_time <= %s AND end_time > %s) OR
                (start_time < %s AND end_time >= %s) OR
                (start_time >= %s AND end_time <= %s)
            )
        """, (slot_id, start_time, start_time, end_time, end_time, start_time, end_time))
        conflict = cur.fetchone()
        if conflict:
            conn.close()
            return jsonify({'error': 'Double booking rejected: Overlapping reservation exists for this slot'}), 409

        # Insert reservation and update slot status
        cur.execute("""
            INSERT INTO reservations (customer_id, vehicle_id, slot_id, start_time, end_time, status)
            VALUES (%s, %s, %s, %s, %s, 'active')
        """, (customer_id, vehicle_id, slot_id, start_time, end_time))
        res_id = cur.lastrowid
        cur.execute("UPDATE parking_slots SET status = 'reserved' WHERE id = %s", (slot_id,))

    conn.close()
    return jsonify({'message': 'Reservation successful', 'reservation_id': res_id}), 201

# 3. Vehicle Entry and Exit with Duration Billing
@app.route('/api/sessions/entry', methods=['POST'])
def vehicle_entry():
    data = request.json or {}
    license_plate = data.get('license_plate', '').strip().upper()
    slot_id = data.get('slot_id')

    if not license_plate or not slot_id:
        return jsonify({'error': 'License plate and slot ID are required'}), 400

    conn = get_db()
    with conn.cursor() as cur:
        # Check vehicle
        cur.execute("SELECT * FROM vehicles WHERE license_plate = %s", (license_plate,))
        vehicle = cur.fetchone()
        if not vehicle:
            conn.close()
            return jsonify({'error': f"Vehicle with plate '{license_plate}' is not registered"}), 404

        # Check vehicle not already in active session
        cur.execute("SELECT * FROM parking_sessions WHERE vehicle_id = %s AND exit_time IS NULL", (vehicle['id'],))
        active_session = cur.fetchone()
        if active_session:
            conn.close()
            return jsonify({'error': f"Vehicle '{license_plate}' already has an active entry session"}), 400

        # Check slot
        cur.execute("SELECT * FROM parking_slots WHERE id = %s", (slot_id,))
        slot = cur.fetchone()
        if not slot:
            conn.close()
            return jsonify({'error': 'Slot not found'}), 404

        if slot['status'] == 'occupied':
            conn.close()
            return jsonify({'error': 'Cannot enter: Slot is already occupied'}), 409

        # Check vehicle/slot type compatibility
        if slot['slot_type'] not in COMPATIBILITY.get(vehicle['vehicle_type'], []):
            conn.close()
            return jsonify({
                'error': f"Incompatible allocation: Vehicle type '{vehicle['vehicle_type']}' cannot occupy '{slot['slot_type']}' slot"
            }), 400

        # Check if vehicle has an active valid pass
        today = datetime.now().date()
        cur.execute("""
            SELECT * FROM passes 
            WHERE vehicle_id = %s AND is_active = TRUE 
            AND start_date <= %s AND end_date >= %s
        """, (vehicle['id'], today, today))
        pass_record = cur.fetchone()
        has_active_pass = bool(pass_record)

        # Check if reservation exists
        cur.execute("""
            SELECT * FROM reservations 
            WHERE vehicle_id = %s AND slot_id = %s AND status = 'active'
        """, (vehicle['id'], slot_id))
        reservation = cur.fetchone()
        res_id = reservation['id'] if reservation else None

        now = datetime.now()
        cur.execute("""
            INSERT INTO parking_sessions (vehicle_id, slot_id, reservation_id, entry_time, hourly_rate, has_active_pass)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (vehicle['id'], slot_id, res_id, now, slot['hourly_rate'], has_active_pass))
        session_id = cur.lastrowid

        # Update slot to occupied
        cur.execute("UPDATE parking_slots SET status = 'occupied' WHERE id = %s", (slot_id,))
        if res_id:
            cur.execute("UPDATE reservations SET status = 'completed' WHERE id = %s", (res_id,))

    conn.close()
    return jsonify({
        'message': 'Vehicle entry recorded successfully',
        'session_id': session_id,
        'has_active_pass': has_active_pass
    }), 201

@app.route('/api/sessions/exit', methods=['POST'])
def vehicle_exit():
    data = request.json or {}
    session_id = data.get('session_id')
    if not session_id:
        return jsonify({'error': 'Session ID is required'}), 400

    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM parking_sessions WHERE id = %s", (session_id,))
        session = cur.fetchone()
        if not session:
            conn.close()
            return jsonify({'error': 'Session not found'}), 404

        if session['exit_time'] is not None:
            conn.close()
            return jsonify({'error': 'Vehicle has already exited'}), 400

        exit_time = datetime.now()
        entry_time = session['entry_time']
        duration_seconds = (exit_time - entry_time).total_seconds()
        # Round up to hours (minimum 1 hour)
        duration_hours = max(1, math.ceil(duration_seconds / 3600))

        # Billing calculation: Free for active pass holders, otherwise hourly rate * duration
        hourly_rate = float(session['hourly_rate'])
        if session['has_active_pass']:
            total_amount = 0.0
            payment_status = 'paid'
        else:
            total_amount = round(duration_hours * hourly_rate, 2)
            payment_status = 'unpaid' if total_amount > 0 else 'paid'

        cur.execute("""
            UPDATE parking_sessions 
            SET exit_time = %s, duration_hours = %s, total_amount = %s, payment_status = %s
            WHERE id = %s
        """, (exit_time, duration_hours, total_amount, payment_status, session_id))

        # Free the slot
        cur.execute("UPDATE parking_slots SET status = 'available' WHERE id = %s", (session['slot_id'],))

    conn.close()
    return jsonify({
        'message': 'Vehicle exit processed',
        'duration_hours': duration_hours,
        'total_amount': total_amount,
        'payment_status': payment_status,
        'has_active_pass': session['has_active_pass']
    })

# 4. Payment Recording with Overpayment Guard
@app.route('/api/payments', methods=['POST'])
def record_payment():
    data = request.json or {}
    session_id = data.get('session_id')
    amount = float(data.get('amount', 0))
    payment_method = data.get('payment_method', 'cash')

    if not session_id or amount <= 0:
        return jsonify({'error': 'Session ID and a valid positive amount are required'}), 400

    conn = get_db()
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM parking_sessions WHERE id = %s", (session_id,))
        session = cur.fetchone()
        if not session:
            conn.close()
            return jsonify({'error': 'Session not found'}), 404

        total_amount = float(session['total_amount'])
        amount_paid = float(session['amount_paid'])
        remaining_balance = round(total_amount - amount_paid, 2)

        # RULE: Prevention of overpayments
        if amount > remaining_balance:
            conn.close()
            return jsonify({
                'error': f"Overpayment rejected: Attempted payment of {amount} exceeds remaining balance of {remaining_balance}"
            }), 400

        new_paid = round(amount_paid + amount, 2)
        new_status = 'paid' if new_paid >= total_amount else 'partially_paid'
        receipt_number = f"RCP-{datetime.now().strftime('%Y%m%d%H%M%S')}-{session_id}"

        cur.execute("""
            INSERT INTO payments (session_id, amount, payment_method, receipt_number)
            VALUES (%s, %s, %s, %s)
        """, (session_id, amount, payment_method, receipt_number))

        cur.execute("""
            UPDATE parking_sessions 
            SET amount_paid = %s, payment_status = %s 
            WHERE id = %s
        """, (new_paid, new_status, session_id))

    conn.close()
    return jsonify({
        'message': 'Payment recorded successfully',
        'receipt_number': receipt_number,
        'amount_paid': new_paid,
        'remaining_balance': round(total_amount - new_paid, 2),
        'payment_status': new_status
    }), 201

if __name__ == '__main__':
    print(f"Starting ParkFlow Python Backend on http://0.0.0.0:5000 (Target MySQL: {DB_CONFIG['host']})")
    app.run(host='0.0.0.0', port=5000, debug=True)
