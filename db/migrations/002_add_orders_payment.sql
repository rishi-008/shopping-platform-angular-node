-- Migration: add Orders + Payment tables used by checkout
-- Safe to run on an existing DB (uses IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS Orders (
    Order_Id INT AUTO_INCREMENT PRIMARY KEY,
    User_Id INT NOT NULL,
    Order_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
    Total_Price DECIMAL(10,2),
    Status ENUM('pending', 'processing', 'shipped') DEFAULT 'pending',
    FOREIGN KEY (User_Id) REFERENCES Users(User_Id)
);

CREATE TABLE IF NOT EXISTS Payment (
    Payment_Id INT AUTO_INCREMENT PRIMARY KEY,
    Order_Id INT NOT NULL,
    Amount DECIMAL(10,2) NOT NULL,
    Payment_Method VARCHAR(50) DEFAULT 'Credit Card',
    Transaction_Id VARCHAR(255),
    Status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    Payment_Date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Order_Id) REFERENCES Orders(Order_Id)
);
