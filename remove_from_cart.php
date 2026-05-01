<?php
require_once 'config.php';
session_start();

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Not logged in']);
    exit();
}

$itemId = intval($_POST['item_id']);

if (isset($_SESSION['cart'])) {
    foreach ($_SESSION['cart'] as $index => $item) {
        if ($item['id'] == $itemId) {
            unset($_SESSION['cart'][$index]);
            $_SESSION['cart'] = array_values($_SESSION['cart']); // Re-index array
            echo json_encode(['status' => 'success']);
            exit();
        }
    }
}

echo json_encode(['status' => 'error', 'message' => 'Item not found']);
?>