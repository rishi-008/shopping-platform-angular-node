<?php
// process_delivery.php (updated)
require_once 'config.php';
session_start();

// Validate request method and user session
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_SESSION['user_id']) || empty($_SESSION['cart'])) {
    header("Location: delivery.php");
    exit();
}

// Validate required fields
$required = ['branch_id', 'delivery_date', 'delivery_time', 'distance', 'duration', 'destination_address'];
foreach ($required as $field) {
    if (empty($_POST[$field])) {
        die("Missing required field: $field");
    }
}

// Sanitize and store delivery details in session
$_SESSION['delivery_details'] = [
    'branch_id' => (int)$_POST['branch_id'],
    'delivery_date' => $_POST['delivery_date'],
    'delivery_time' => $_POST['delivery_time'],
    'distance' => (float)$_POST['distance'], // meters
    'duration' => (float)$_POST['duration'], // seconds
    'destination_address' => htmlspecialchars($_POST['destination_address'])
];

header("Location: payment.php");
exit();
?>