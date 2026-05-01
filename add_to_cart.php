<?php
require_once 'config.php';
session_start();

if (!isset($_SESSION['user_id'])) {
    die(json_encode(['status' => 'error', 'message' => 'Not logged in']));
}

$itemId = $_POST['item_id'];
$quantity = $_POST['quantity'];

// Initialize cart if not exists
if (!isset($_SESSION['cart'])) {
    $_SESSION['cart'] = [];
}

// Check if item already in cart
$found = false;
foreach($_SESSION['cart'] as &$item) {
    if ($item['id'] == $itemId) {
        $item['quantity'] += $quantity;
        $found = true;
        break;
    }
}

if (!$found) {
    $_SESSION['cart'][] = [
        'id' => $itemId,
        'quantity' => $quantity
    ];
}

echo json_encode(['status' => 'success']);
?>