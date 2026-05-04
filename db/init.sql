CREATE DATABASE IF NOT EXISTS `osp_db`;
USE `osp_db`;

CREATE TABLE Users (
    User_Id INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Tel_No VARCHAR(20),
    Email VARCHAR(100) UNIQUE NOT NULL,
    Address TEXT NOT NULL,
    City_Code VARCHAR(10),
    Login_Id VARCHAR(50) NULL,
    Password VARCHAR(255) NOT NULL,
    Balance DECIMAL(10,2) DEFAULT 0.00,
    User_Type ENUM('user', 'admin') DEFAULT 'user'
);

CREATE TABLE Item (
    Item_Id INT AUTO_INCREMENT PRIMARY KEY,
    Item_name VARCHAR(255) NOT NULL,
    Price DECIMAL(10,2) NOT NULL,
    Made_in VARCHAR(100),
    Department_Code VARCHAR(20) NOT NULL,
    Image_URL VARCHAR(255)
);

INSERT INTO Item (Item_name, Price, Made_in, Department_Code, Image_URL) VALUES
('IPhone 16 Pro Max', 799.99, 'China', 'ELECTRONICS', 'iphone_16_pro.jpg'),
('HP Spectre', 1299.99, 'South Korea', 'ELECTRONICS', 'hp_spectre.jpg'),
('Sonos Ace', 199.99, 'Japan', 'ELECTRONICS', 'sonos_ace.jpeg');

-- Branch Table (replaces Warehouse)
CREATE TABLE Branch (
    Branch_Id INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Address TEXT NOT NULL,
    City VARCHAR(100),
    Province VARCHAR(100),
    Postal_Code VARCHAR(20),
    Latitude DECIMAL(10,8),
    Longitude DECIMAL(11,8)
);

-- Insert sample branches
INSERT INTO Branch (Name, Address, City, Province, Postal_Code, Latitude, Longitude) VALUES
('Main Electronics Hub', '123 Tech Street', 'Toronto', 'ON', 'M5G 2C3', 43.653225, -79.383186),
('West Distribution Center', '456 Circuit Road', 'Mississauga', 'ON', 'L5N 8H9', 43.589045, -79.644119);

-- Truck Table
CREATE TABLE Truck (
    Truck_Id INT AUTO_INCREMENT PRIMARY KEY,
    License_Plate VARCHAR(20) UNIQUE NOT NULL,
    Capacity DECIMAL(10,2),
    Availability ENUM('available', 'in_transit', 'maintenance') DEFAULT 'available'
);

-- Insert sample trucks
INSERT INTO Truck (License_Plate, Capacity) VALUES
('ONT-EC1', 1500.00),
('ONT-EC2', 2000.00);

-- Trip Table
CREATE TABLE Trip (
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

-- Order Table
CREATE TABLE Orders (
    Order_Id INT AUTO_INCREMENT PRIMARY KEY,
    User_Id INT NOT NULL,
    Trip_Id INT,
    Order_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
    Total_Price DECIMAL(10,2),
    Status ENUM('pending', 'processing', 'shipped') DEFAULT 'pending',
    FOREIGN KEY (User_Id) REFERENCES Users(User_Id),
    FOREIGN KEY (Trip_Id) REFERENCES Trip(Trip_Id)
);

CREATE TABLE Payment (
    Payment_Id INT AUTO_INCREMENT PRIMARY KEY,
    Order_Id INT NOT NULL,
    Amount DECIMAL(10,2) NOT NULL,
    Payment_Method VARCHAR(50) DEFAULT 'Credit Card',
    Transaction_Id VARCHAR(255),
    Status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    Payment_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Order_Id) REFERENCES Orders(Order_Id)
);

-- Auth (JWT refresh tokens)
CREATE TABLE IF NOT EXISTS RefreshToken (
    RefreshToken_Id INT AUTO_INCREMENT PRIMARY KEY,
    User_Id INT NOT NULL,
    Token_Id_Hash CHAR(64) NOT NULL,
    Expires_At DATETIME NOT NULL,
    Revoked_At DATETIME NULL,
    Created_At DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_refresh_token_id_hash (Token_Id_Hash),
    FOREIGN KEY (User_Id) REFERENCES Users(User_Id) ON DELETE CASCADE
);

-- Cart (DB-backed cart instead of PHP session)
CREATE TABLE IF NOT EXISTS CartItem (
    User_Id INT NOT NULL,
    Item_Id INT NOT NULL,
    Quantity INT NOT NULL DEFAULT 1,
    Created_At DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Updated_At DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (User_Id, Item_Id),
    FOREIGN KEY (User_Id) REFERENCES Users(User_Id) ON DELETE CASCADE,
    FOREIGN KEY (Item_Id) REFERENCES Item(Item_Id) ON DELETE CASCADE
);
