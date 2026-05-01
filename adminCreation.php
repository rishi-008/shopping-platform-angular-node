<?php
// Database connection
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "osp_db2";
// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);
// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
// Prepare and bind the INSERT statement
// Only insert the NOT NULL values (Name, Email, Address, Login_Id, Password, User_Type)
$name = "Admin User"; // Example name
$email = "user@example.com"; // Example email
$address = "350 Victoria Street"; // Example address
$login_id = "user123"; // Example login ID
$password = password_hash("admin", PASSWORD_DEFAULT); // Hash the password before storing
// Prepare SQL statement
$sql = "INSERT INTO Users (Name, Email, Address, Login_Id, Password, User_Type)
        VALUES (?, ?, ?, ?, ?, ?)";
$stmt = $conn->prepare($sql);
$stmt->bind_param("ssssss", $name, $email, $address, $login_id, $password, $user_type);
// Set user_type to 'admin'
$user_type = 'user';
// Execute the statement
if ($stmt->execute()) {
    echo "New admin record created successfully!";
} else {
    echo "Error: " . $stmt->error;
}
// Close the statement and connection
$stmt->close();
$conn->close();
?>











