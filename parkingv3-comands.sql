CREATE TABLE user_bookings (
    id SERIAL PRIMARY KEY,
    parking_spot_id VARCHAR REFERENCES parking_slots(slot),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    arrival_date DATE NOT NULL,
    departure_date DATE NOT NULL,
    arrival_time TIME NOT NULL,
    departure_time TIME NOT NULL,
    car_brand VARCHAR(50),
    car_color VARCHAR(50),
    car_type VARCHAR(50),
    license_plate VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE parking_slots (
    slot VARCHAR(10) PRIMARY KEY,
	price DECIMAL(10, 2)
);
select * from parking_slots
UPDATE parking_slots
SET price = CASE
    WHEN slot = 'Slot1' THEN 10.00
    WHEN slot = 'Slot2' THEN 10.00
    WHEN slot = 'Slot3' THEN 10.00
    WHEN slot = 'Slot4' THEN 10.00
    ELSE 10.00 -- Default price for unspecified slots
END;

-- Create the parking_bookings table
CREATE TABLE parking_bookings (
    id SERIAL PRIMARY KEY,              -- Use SERIAL for auto-incrementing
    startdatetime TIMESTAMP NOT NULL,    -- Use TIMESTAMP for date and time
    enddatetime TIMESTAMP NOT NULL,      -- Use TIMESTAMP for date and time
    slot VARCHAR(10) NOT NULL,           -- The parking slot (foreign key)
    "status" VARCHAR(10) NOT NULL,       -- Use double quotes for reserved keywords like "status"
    created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP  -- Automatically set to current time
);
INSERT INTO parking_slots (slot) VALUES
('Slot1'), ('Slot2'), ('Slot3'), ('Slot4'); -- , ('Slot5'), ('Slot6'), etc.
INSERT INTO parking_bookings (startdatetime, enddatetime, slot, "status", created)
VALUES
('2024-11-19 00:00:01', '2024-11-24 23:00:00', 'Slot1', 'confirmed', NOW()),
('2024-11-21 09:30:00', '2024-11-27 11:30:00', 'Slot2', 'confirmed', NOW()),
('2024-11-19 12:00:00', '2024-11-29 14:00:00', 'Slot3', 'cancelled', NOW()),
('2024-12-19 12:00:00', '2024-12-29 14:00:00', 'Slot3', 'confirmed', NOW()),
('2024-11-19 07:00:00', '2024-12-19 09:00:00', 'Slot4', 'pending', NOW());
SELECT * FROM parking_slots
WHERE slot NOT IN (SELECT slot FROM parking_bookings WHERE
                    startdatetime <= '2024-11-19 10:00:00' AND
                    enddatetime >= '2024-11-27 14:00:00');
--checks avaliability in dated and the status shpows the slots avaliable
					WITH booked_slots AS (
    SELECT DISTINCT slot
    FROM parking_bookings
    WHERE startdatetime < '2024-11-19 14:00:00'  -- Replace with actual enddatetime
      AND enddatetime > '2024-11-27 10:00:00'    -- Replace with actual startdatetime
      AND "status" != 'cancelled'
)
SELECT slot
FROM parking_slots
WHERE slot NOT IN (SELECT slot FROM booked_slots);

INSERT INTO parking_bookings (startdatetime, enddatetime, slot, "status", created)
VALUES
('2024-12-25 00:00:01', '2024-12-30 23:00:00', 'Slot1', 'cancelled', NOW());
DELETE FROM parking_bookings;
--same but checks dates
WITH booked_slots AS (
    SELECT DISTINCT slot, startdatetime, enddatetime
    FROM parking_bookings
    WHERE startdatetime < '2024-11-19 14:00:00'  -- Replace with actual enddatetime
      AND enddatetime > '2024-12-27 10:00:00'    -- Replace with actual startdatetime
      AND "status" != 'cancelled'
)
SELECT ps.slot, bs.startdatetime, bs.enddatetime
FROM parking_slots ps
LEFT JOIN booked_slots bs
    ON ps.slot = bs.slot
WHERE bs.slot IS NULL;

--This query will return the id of parking bookings that are still in a "pending" state and were created more than 24 hours ago
SELECT pb.id
FROM parking_bookings AS pb
WHERE pb."status" = 'pending' 
  AND pb.created < NOW() - INTERVAL '24 hours';

  select * from parking_bookings
  select * from user_bookings
  delete from parking_bookings