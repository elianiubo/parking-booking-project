CREATE TABLE user_info (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    arrival_date DATE NOT NULL,
    departure_date DATE NOT NULL,
    arrival_time TIME NOT NULL,
    departure_time TIME NOT NULL,
    car_brand VARCHAR(50),
    car_color VARCHAR(50),
    car_type VARCHAR(50),
    license_plate VARCHAR(50),
    total_price DECIMAL(10, 2),
    parking_spot_id INT REFERENCES parking_spots(id)
);
CREATE TABLE parking_spots (
    id SERIAL PRIMARY KEY,
    slot_name VARCHAR(100),
    price_per_day DECIMAL(10, 2),
    status VARCHAR(20) CHECK (status IN ('available', 'reserved', 'booked')) DEFAULT 'available' --Maybe unnecessary
);
CREATE TABLE payment_methods (
    id SERIAL PRIMARY KEY,
    booking_id INT REFERENCES user_info(id),
    payment_method VARCHAR(50),
    payment_status VARCHAR(20) CHECK (payment_status IN ('pending', 'completed'))
);
CREATE TABLE spot_availability (
    id SERIAL PRIMARY KEY,
    parking_spot_id INT REFERENCES parking_spots(id),
    arrival_date DATE,
    departure_date DATE,
    status VARCHAR(20) CHECK (status IN ('available', 'reserved', 'canceled')) DEFAULT 'available'
);
CREATE TABLE booking_status (
    id SERIAL PRIMARY KEY,
    booking_id INT REFERENCES user_info(id),
    status VARCHAR(20) CHECK (status IN ('reserved', 'booked', 'canceled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO parking_spots (slot_name, price_per_day, status) 
VALUES 
('Spot A', 20.00, 'available'),
('Spot B', 25.00, 'available'),
('Spot C', 15.00, 'available'),
('Spot D', 18.00, 'available');

DELETE FROM spot_availability;

INSERT INTO spot_availability (parking_spot_id, arrival_date, departure_date, status)
VALUES 
    (1, '1999-01-01', '2000-12-31', 'reserved'),
    (2, '1999-01-01', '2000-12-31', 'reserved'),
    (3, '1999-01-01', '2000-12-31', 'reserved'),
	(4, '1999-01-01', '2000-12-31', 'reserved'),
    (1, '2024-12-20', '2024-12-25', 'reserved'),
    (2, '2024-12-22', '2024-12-24', 'reserved'),
    (3, '2025-01-20', '2025-01-05', 'reserved'),
	(4, '2025-01-01', '2025-01-05', 'reserved');

select * from spot_availability;

SELECT parking_spot_id, arrival_date, departure_date, status 
FROM spot_availability 
WHERE (departure_date < '2024-11-25' OR arrival_date > '2024-11-30');

ALTER TABLE spot_availability
DROP COLUMN paking_spot_id;