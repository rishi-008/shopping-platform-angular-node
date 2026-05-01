<?php
require_once 'config.php';
session_start();

if(isset($_SESSION['user_id']) && isset($_SESSION['cart'])) {
    foreach($_SESSION['cart'] as $item) {
        $stmt = $conn->prepare("SELECT * FROM Item WHERE Item_Id = ?");
        $stmt->bind_param("i", $item['id']);
        $stmt->execute();
        $itemData = $stmt->get_result()->fetch_assoc();
        ?>
        <div class="cart-item mb-2">
            <?= htmlspecialchars($itemData['Item_name']) ?> 
            (Qty: <?= $item['quantity'] ?>)
        </div>
        <?php
    }
} else {
    echo '<p class="text-muted">No items in cart</p>';
}
?>