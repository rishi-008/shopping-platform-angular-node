<?php
require_once 'header.php';
require_once 'config.php';

// Verify valid success context and user session
if (!isset($_SESSION['payment_success']) || !isset($_SESSION['user_id'])) {
    header("Location: cart.php");
    exit();
}

// Get payment details and user ID
$details = $_SESSION['payment_success'];
$userId = $_SESSION['user_id'];
unset($_SESSION['payment_success']); // Clear success data but keep user session
?>

<div class="container text-center">
    <div class="alert alert-success mt-5">
        <h2>Payment Successful! 🎉</h2>
        <p class="lead">Thank you for your purchase</p>
        
        <div class="mt-4">
            <p><strong>Order ID:</strong> <?= htmlspecialchars($details['order_id']) ?></p>
            <p><strong>User ID:</strong> <?= htmlspecialchars($userId) ?></p>
            <p><strong>Scheduled Delivery:</strong><br>
                <?= htmlspecialchars($details['delivery_date']) ?> 
                at <?= htmlspecialchars($details['delivery_time']) ?>
            </p>
        </div>

        <a href="index.php" class="btn btn-primary mt-4">
            Return to Home
        </a>
    </div>
</div>

<?php require_once 'footer.php'; ?>