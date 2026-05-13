<?php
require_once 'config.php';
session_start();

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Not logged in']);
    exit();
}

$itemId = intval($_POST['item_id']);
$quantity = intval($_POST['quantity']);

if ($quantity <= 0) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid quantity']);
    exit();
}

// Update session cart
if (isset($_SESSION['cart'])) {
    foreach ($_SESSION['cart'] as &$item) {
        if ($item['id'] == $itemId) {
            $item['quantity'] = $quantity;
            echo json_encode(['status' => 'success']);
            exit();
        }
    }
}

echo json_encode(['status' => 'error', 'message' => 'Item not found']);
?>