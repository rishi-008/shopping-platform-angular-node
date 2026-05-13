<?php
require_once 'config.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = $_POST['name'];
    $email = $_POST['email'];
    $password = password_hash($_POST['password'], PASSWORD_DEFAULT);
    $address = $_POST['address'];

    // Check if email exists
    $stmt = $conn->prepare("SELECT * FROM Users WHERE Email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    
    if ($stmt->get_result()->num_rows > 0) {
        die("Email already exists!");
    }

    // Insert new user
    $stmt = $conn->prepare("INSERT INTO Users (Name, Email, Password, Address, User_Type) 
                           VALUES (?, ?, ?, ?, 'user')");
    $stmt->bind_param("ssss", $name, $email, $password, $address);
    
    if ($stmt->execute()) {
        header("Location: signin.php");
    } else {
        echo "Error: " . $conn->error;
    }
}
?>