<?php
require_once 'header.php';
require_once 'config.php';

// Display any payment errors
if (isset($_SESSION['payment_error'])) {
    echo '<script>alert("'.htmlspecialchars($_SESSION['payment_error']).'");</script>';
    unset($_SESSION['payment_error']);
}

// Check valid context: user, cart, delivery details
if (!isset($_SESSION['user_id'], $_SESSION['cart'], $_SESSION['delivery_details']) || empty($_SESSION['cart'])) {
    header("Location: cart.php");
    exit();
}

// Fetch delivery details and branch info
$delivery = $_SESSION['delivery_details'];
$stmt = $conn->prepare("SELECT Name FROM Branch WHERE Branch_Id = ?");
$stmt->bind_param("i", $delivery['branch_id']);
$stmt->execute();
$branch = $stmt->get_result()->fetch_assoc();

// Calculate total price from cart and generate temporary order ID
$totalPrice = 0;
foreach ($_SESSION['cart'] as $item) {
    $stmt = $conn->prepare("SELECT Price FROM Item WHERE Item_Id = ?");
    $stmt->bind_param("i", $item['id']);
    $stmt->execute();
    $price = $stmt->get_result()->fetch_column();
    $totalPrice += $price * $item['quantity'];
}

// Generate temporary reference ID (actual order ID will be created after payment)
$tempOrderId = 'TMP-' . strtoupper(uniqid());

// Store total for process_payment.php
$_SESSION['current_order'] = ['total_price' => $totalPrice];
?>

<!DOCTYPE html>
<html>
<head>
    <title>Payment Processing</title>
    <style>
        .invoice-box {
            max-width: 800px;
            margin: 2rem auto;
            padding: 2rem;
            border: 1px solid #eee;
            box-shadow: 0 0 10px rgba(0,0,0,0.15);
        }
        .payment-form input {
            margin: 0.5rem 0;
            padding: 0.5rem;
            width: 100%;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="invoice-box">
            <h2 class="text-center mb-4">Order Invoice</h2>
            
            <!-- Order Summary -->
            <div class="mb-4">
                <h4>Order Details</h4>
                <p><strong>Order Reference:</strong> Pending Payment Confirmation</p>
                <p><strong>Delivery Branch:</strong> <?= htmlspecialchars($branch['Name']) ?></p>
                <p><strong>Delivery Address:</strong> <?= htmlspecialchars($delivery['destination_address']) ?></p>
                <p><strong>Delivery Distance:</strong> <?= number_format($delivery['distance'] / 1000, 2) ?> km</p>
                <p><strong>Scheduled Delivery:</strong> <?= $delivery['delivery_date'] ?> at <?= $delivery['delivery_time'] ?></p>
                <div class="alert alert-info mt-3">
                    Your official Order ID will be generated after successful payment.
                </div>
            </div>

            <!-- Payment Form -->
            <form id="payment-form" action="process_payment.php" method="POST">
                <h4 class="mb-3">Payment Information</h4>
                
                <div class="form-group">
                    <label>Card Number</label>
                    <input type="text" name="card_number" 
                           pattern="[0-9]{16}" 
                           placeholder="4111111111111111" required>
                </div>

                <div class="row">
                    <div class="col-md-6">
                        <label>Expiration Date</label>
                        <input type="month" name="exp_date" required>
                    </div>
                    <div class="col-md-6">
                        <label>CVV</label>
                        <input type="text" name="cvv" 
                               pattern="[0-9]{3}" 
                               placeholder="123" required>
                    </div>
                </div>

                <button type="submit" class="btn btn-success btn-lg mt-4 w-100">
                    Confirm Payment - $<?= number_format($totalPrice, 2) ?>
                </button>
            </form>
        </div>
    </div>
</body>
</html>

<?php require_once 'footer.php'; ?>