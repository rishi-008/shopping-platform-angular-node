<?php
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "osp_db";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// SQL query to create the event (without DELIMITER)
$sql = "
CREATE EVENT IF NOT EXISTS ResetTruckAvailability 
ON SCHEDULE EVERY 1 HOUR 
DO 
BEGIN 
    UPDATE Truck t 
    JOIN Trip tr ON t.Truck_Id = tr.Truck_Id 
    SET t.Availability = 'available' 
    WHERE 
        (tr.Delivery_Date < CURDATE() OR 
        (tr.Delivery_Date = CURDATE() AND tr.Delivery_Time < CURTIME())) 
    AND t.Availability = 'in_transit'; 
END
";

// Execute the query to create the event
if ($conn->query($sql) === TRUE) {
    echo "Event 'ResetTruckAvailability' created successfully.";
} else {
    echo "Error creating event: " . $conn->error;
}

// Close connection
$conn->close();
?>