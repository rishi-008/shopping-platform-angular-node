<?php
require_once 'header.php';
require_once 'config.php';

// Validate search term format
if (!isset($_GET['search_term']) || !preg_match('/^\d*,\s*\d*$/', $_GET['search_term'])) {
    header("Location: index.php");
    exit();
}

// Parse input
list($userId, $orderId) = array_pad(array_map('trim', explode(',', $_GET['search_term'])), 2, '');

// Validate numeric values
$userId = is_numeric($userId) ? (int)$userId : null;
$orderId = is_numeric($orderId) ? (int)$orderId : null;

// Build query
$query = "SELECT o.*, u.Name AS user_name, t.Destination_Address, 
                 p.Transaction_Id, p.Payment_Date 
          FROM Orders o
          JOIN Users u ON o.User_Id = u.User_Id
          LEFT JOIN Trip t ON o.Trip_Id = t.Trip_Id
          LEFT JOIN Payment p ON o.Order_Id = p.Order_Id
          WHERE 1=1";

$params = [];
$types = '';

if ($userId !== null) {
    $query .= " AND o.User_Id = ?";
    $params[] = $userId;
    $types .= 'i';
}

if ($orderId !== null) {
    $query .= " AND o.Order_Id = ?";
    $params[] = $orderId;
    $types .= 'i';
}

// Execute query
$stmt = $conn->prepare($query);
if ($params) {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$result = $stmt->get_result();
?>

<div class="container">
    <h2 class="my-4">Order Search Results</h2>
    
    <?php if ($result->num_rows > 0): ?>
        <?php while ($order = $result->fetch_assoc()): ?>
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <h5>Order #<?= htmlspecialchars($order['Order_Id']) ?></h5>
                            <p class="mb-1">
                                <strong>User:</strong> 
                                <?= htmlspecialchars($order['user_name']) ?> 
                                (ID: <?= $order['User_Id'] ?>)
                            </p>
                            <p class="mb-1">
                                <strong>Total:</strong> 
                                $<?= number_format($order['Total_Price'], 2) ?>
                            </p>
                            <p class="mb-1">
                                <strong>Status:</strong> 
                                <?= htmlspecialchars($order['Status']) ?>
                            </p>
                            <?php if ($order['Transaction_Id']): ?>
                                <p class="mb-1">
                                    <strong>Transaction ID:</strong> 
                                    <?= htmlspecialchars($order['Transaction_Id']) ?>
                                </p>
                            <?php endif; ?>
                        </div>
                        <div class="col-md-4 border-start">
                            <p class="mb-1">
                                <strong>Order Date:</strong> 
                                <?= date('M j, Y g:i A', strtotime($order['Order_Date'])) ?>
                            </p>
                            <?php if ($order['Destination_Address']): ?>
                                <p class="mb-1">
                                    <strong>Destination:</strong> 
                                    <?= htmlspecialchars($order['Destination_Address']) ?>
                                </p>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
            </div>
        <?php endwhile; ?>
    <?php else: ?>
        <div class="alert alert-info">No orders found matching your criteria</div>
    <?php endif; ?>
</div>

<?php require_once 'footer.php'; ?>