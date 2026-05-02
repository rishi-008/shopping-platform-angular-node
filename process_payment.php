<?php
require_once 'config.php';
session_start();

// Validate payment context
if (!isset($_SESSION['current_order']) || !isset($_SESSION['delivery_details'])) {
    header("Location: cart.php");
    exit();
}

// Validate cart contents
if (empty($_SESSION['cart'])) {
    header("Location: cart.php");
    exit();
}

$totalPrice = (float)$_SESSION['current_order']['total_price'];

// Get delivery details from session
$deliveryDetails = $_SESSION['delivery_details'];

// Validate delivery details structure
$requiredKeys = ['branch_id', 'delivery_date', 'delivery_time', 'distance', 'duration', 'destination_address'];
foreach ($requiredKeys as $key) {
    if (!isset($deliveryDetails[$key])) {
        die("Invalid delivery details structure");
    }
}

$deliveryDateTime = $deliveryDetails['delivery_date'] . ' ' . $deliveryDetails['delivery_time'];

try {
    $conn->begin_transaction();

    // 1. Check truck availability with time consideration
    $truckStmt = $conn->prepare("
        SELECT t.Truck_Id 
        FROM Truck t
        WHERE t.Truck_Id NOT IN (
            SELECT tr.Truck_Id 
            FROM Trip tr 
            WHERE tr.Truck_Id = t.Truck_Id 
            AND (
                (tr.Delivery_Date = ? AND tr.Delivery_Time BETWEEN ? - INTERVAL 1 HOUR AND ? + INTERVAL 1 HOUR)
                OR CONCAT(tr.Delivery_Date, ' ', tr.Delivery_Time) > NOW()
            )
        )
        AND (t.Availability = 'available' OR t.Availability = 'in_transit')
        ORDER BY RAND()
        LIMIT 1
    ");

    $truckStmt->bind_param("sss", 
        $deliveryDetails['delivery_date'],
        $deliveryDetails['delivery_time'],
        $deliveryDetails['delivery_time']
    );
    $truckStmt->execute();
    $truck = $truckStmt->get_result()->fetch_assoc();

    if (!$truck) {
        // No trucks available, calculate next availability
        $nextStmt = $conn->prepare("
            SELECT MIN(CONCAT(tr.Delivery_Date, ' ', tr.Delivery_Time)) AS next_available
            FROM Trip tr
            WHERE CONCAT(tr.Delivery_Date, ' ', tr.Delivery_Time) > ?
        ");
        $nextStmt->bind_param("s", $deliveryDateTime);
        $nextStmt->execute();
        $nextAvailable = $nextStmt->get_result()->fetch_assoc();

        $message = "No available trucks for your selected time.\n\n";
        
        if ($nextAvailable['next_available']) {
            $message .= "Next available delivery slot:\n" . 
                        date('M j, Y \a\t g:i A', strtotime($nextAvailable['next_available']));
        } else {
            $message .= "No upcoming availability found.";
        }

        // Store error in session and redirect to no_trucks_available.php
        $_SESSION['truck_error'] = [
            'message' => $message,
            'next_available' => $nextAvailable['next_available'] ?? null
        ];
        header("Location: no_trucks_available.php");
        exit();
    }

    // Convert values to variables first
    $distanceKm = $deliveryDetails['distance'] / 1000;
    $durationHours = $deliveryDetails['duration'] / 3600;

    // 2. Create Trip record
    $tripStmt = $conn->prepare("
        INSERT INTO Trip (
            Branch_Id, 
            Destination_Address, 
            Distance, 
            Estimated_Time,
            Truck_Id,
            Delivery_Date,
            Delivery_Time
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    
    $tripStmt->bind_param(
        "isddiss",
        $deliveryDetails['branch_id'],
        $deliveryDetails['destination_address'],
        $distanceKm,
        $durationHours,
        $truck['Truck_Id'],
        $deliveryDetails['delivery_date'],
        $deliveryDetails['delivery_time']
    );
    $tripStmt->execute();
    $tripId = $conn->insert_id;

    // 3. Create Order record
    $orderStmt = $conn->prepare("
        INSERT INTO Orders (
            User_Id, 
            Trip_Id, 
            Total_Price,
            Status
        ) VALUES (?, ?, ?, 'processing')
    ");
    $orderStmt->bind_param(
        "iid", 
        $_SESSION['user_id'],
        $tripId,
        $totalPrice
    );
    $orderStmt->execute();
    $orderId = $conn->insert_id;

    // 4. Create Payment record
    $paymentStmt = $conn->prepare("
        INSERT INTO Payment (
            Order_Id,
            Amount,
            Transaction_Id,
            Status
        ) VALUES (?, ?, ?, 'completed')
    ");
    
    $transactionId = 'TX-' . uniqid();
    $paymentStmt->bind_param(
        "ids", 
        $orderId,
        $totalPrice,
        $transactionId
    );
    $paymentStmt->execute();

    // 5. Update Truck status to 'in_transit'
    $updateTruck = $conn->prepare("
        UPDATE Truck 
        SET Availability = 'in_transit' 
        WHERE Truck_Id = ?
    ");
    $updateTruck->bind_param("i", $truck['Truck_Id']);
    $updateTruck->execute();

    // Verify the truck is still available (prevent race condition)
    $verifyTruck = $conn->prepare("SELECT Availability FROM Truck WHERE Truck_Id = ?");
    $verifyTruck->bind_param("i", $truck['Truck_Id']);
    $verifyTruck->execute();
    $truckStatus = $verifyTruck->get_result()->fetch_assoc();

    if ($truckStatus['Availability'] !== 'available' && $truckStatus['Availability'] !== 'in_transit') {
        $_SESSION['truck_error'] = [
            'message' => "Truck no longer available. Please reselect delivery time.",
            'next_available' => null
        ];
        header("Location: no_trucks_available.php");
        exit();
    }

    $conn->commit();

    // Set success data
    $_SESSION['payment_success'] = [
        'order_id' => $orderId,
        'amount' => $totalPrice,
        'transaction_id' => $transactionId,
        'delivery_date' => $deliveryDetails['delivery_date'],
        'delivery_time' => $deliveryDetails['delivery_time']
    ];

    // Clear sessions
    unset($_SESSION['cart'], $_SESSION['current_order'], $_SESSION['delivery_details']);
    
    header("Location: payment_success.php");
    exit();

} catch (Exception $e) {
    $conn->rollback();
    $_SESSION['payment_error'] = "An error occurred: " . $e->getMessage();
    header("Location: payment.php");
    exit();
}