-- Migration: delivery scheduling schema (Branch/Truck/Trip) + Orders.Trip_Id
-- Safe to run on an existing DB.

CREATE TABLE IF NOT EXISTS Branch (
    Branch_Id INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Address TEXT NOT NULL,
    City VARCHAR(100),
    Province VARCHAR(100),
    Postal_Code VARCHAR(20),
    Latitude DECIMAL(10,8),
    Longitude DECIMAL(11,8)
);

CREATE TABLE IF NOT EXISTS Truck (
    Truck_Id INT AUTO_INCREMENT PRIMARY KEY,
    License_Plate VARCHAR(20) UNIQUE NOT NULL,
    Capacity DECIMAL(10,2),
    Availability ENUM('available', 'in_transit', 'maintenance') DEFAULT 'available'
);

CREATE TABLE IF NOT EXISTS Trip (
    Trip_Id INT AUTO_INCREMENT PRIMARY KEY,
    Branch_Id INT NOT NULL,
    Destination_Address TEXT NOT NULL,
    Distance DECIMAL(10,2),
    Estimated_Time DECIMAL(10,2),
    Truck_Id INT,
    Departure_Time DATETIME,
    Delivery_Date DATE NOT NULL,
    Delivery_Time TIME NOT NULL,
    FOREIGN KEY (Branch_Id) REFERENCES Branch(Branch_Id),
    FOREIGN KEY (Truck_Id) REFERENCES Truck(Truck_Id)
);

-- Add Trip_Id column to Orders if missing
SET @has_trip_id := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Orders'
    AND COLUMN_NAME = 'Trip_Id'
);

SET @add_trip_id_sql := IF(
  @has_trip_id = 0,
  'ALTER TABLE Orders ADD COLUMN Trip_Id INT NULL',
  'SELECT 1'
);

PREPARE stmt FROM @add_trip_id_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Seed defaults only if tables are empty (keeps feature usable on a fresh volume)
INSERT INTO Branch (Name, Address, City, Province, Postal_Code, Latitude, Longitude)
SELECT 'Main Electronics Hub', '123 Tech Street', 'Toronto', 'ON', 'M5G 2C3', 43.653225, -79.383186
WHERE NOT EXISTS (SELECT 1 FROM Branch);

INSERT INTO Branch (Name, Address, City, Province, Postal_Code, Latitude, Longitude)
SELECT 'West Distribution Center', '456 Circuit Road', 'Mississauga', 'ON', 'L5N 8H9', 43.589045, -79.644119
WHERE (SELECT COUNT(*) FROM Branch) = 1;

INSERT INTO Truck (License_Plate, Capacity)
SELECT 'ONT-EC1', 1500.00
WHERE NOT EXISTS (SELECT 1 FROM Truck);

INSERT INTO Truck (License_Plate, Capacity)
SELECT 'ONT-EC2', 2000.00
WHERE (SELECT COUNT(*) FROM Truck) = 1;
