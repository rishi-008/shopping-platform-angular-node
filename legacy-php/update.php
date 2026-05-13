<?php
require_once 'header.php';
require_once 'config.php';

if ($_SESSION['user_type'] !== 'admin') {
    header("Location: index.php");
    exit();
}

$primaryKeys = [
    'Users' => 'User_Id',
    'Item' => 'Item_Id',
    'Branch' => 'Branch_Id',
    'Truck' => 'Truck_Id',
    'Trip' => 'Trip_Id',
    'Orders' => 'Order_Id',
    'Payment' => 'Payment_Id'
];

$tables = [
    'Users' => ['Name', 'Email', 'Address', 'Balance', 'User_Type'],
    'Item' => ['Item_name', 'Price', 'Department_Code'],
    'Branch' => ['Name', 'City', 'Latitude', 'Longitude'],
    'Truck' => ['License_Plate', 'Capacity', 'Availability'],
    'Trip' => ['Destination_Address', 'Distance', 'Estimated_Time'],
    'Orders' => ['Total_Price', 'Status'],
    'Payment' => ['Amount', 'Status']
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $table = $_POST['table'];
    $id = $_POST['id'];
    $column = $_POST['column'];
    $value = $_POST['value'];
    
    try {
        $stmt = $conn->prepare("UPDATE $table SET $column = ? WHERE {$primaryKeys[$table]} = ?");
        $stmt->bind_param('si', $value, $id);
        $stmt->execute();
        
        if ($stmt->affected_rows > 0) {
            $success = "Record updated successfully!";
        } else {
            $error = "No changes made or invalid ID";
        }
    } catch (Exception $e) {
        $error = "Error: " . $e->getMessage();
    }
}
?>

<div class="container">
    <h2 class="my-4">Update Records</h2>
    
    <?php if (isset($success)): ?>
    <div class="alert alert-success"><?= $success ?></div>
    <?php endif; ?>
    
    <?php if (isset($error)): ?>
    <div class="alert alert-danger"><?= $error ?></div>
    <?php endif; ?>

    <form method="POST">
        <div class="row g-3">
            <div class="col-md-3">
                <select name="table" class="form-select" id="tableSelect" required>
                    <?php foreach ($tables as $name => $columns): ?>
                    <option value="<?= $name ?>"><?= $name ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-2">
                <input type="number" name="id" class="form-control" placeholder="ID" required>
            </div>
            <div class="col-md-3">
                <select name="column" class="form-select" id="columnSelect"></select>
            </div>
            <div class="col-md-3">
                <div id="valueInput"></div>
            </div>
            <div class="col-md-1">
                <button type="submit" class="btn btn-primary">Update</button>
            </div>
        </div>
    </form>
</div>

<script>
// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('tableSelect').dispatchEvent(new Event('change'));
});

// Update column definitions
const tableColumns = {
    'Users': ['Name', 'Email', 'Address', 'Balance', 'User_Type'],
    'Item': ['Item_name', 'Price', 'Department_Code'],
    'Branch': ['Name', 'City', 'Latitude', 'Longitude'],
    'Truck': ['License_Plate', 'Capacity', 'Availability'],
    'Trip': ['Destination_Address', 'Distance', 'Estimated_Time'],
    'Orders': ['Total_Price', 'Status'],
    'Payment': ['Amount', 'Status']
};

document.getElementById('tableSelect').addEventListener('change', function() {
    const columns = tableColumns[this.value];
    let html = '';
    columns.forEach(col => {
        html += `<option value="${col}">${col}</option>`;
    });
    document.getElementById('columnSelect').innerHTML = html;
    updateValueInput();
});

document.getElementById('columnSelect').addEventListener('change', updateValueInput);

function updateValueInput() {
    const column = document.getElementById('columnSelect').value;
    let html = '';
    
    if (column === 'User_Type') {
        html = `<select name="value" class="form-select">
                  <option value="user">user</option>
                  <option value="admin">admin</option>
               </select>`;
    } else if (column === 'Availability') {
        html = `<select name="value" class="form-select">
                  <option value="available">available</option>
                  <option value="in_transit">in_transit</option>
                  <option value="maintenance">maintenance</option>
               </select>`;
    } else {
        html = `<input type="${column === 'Price' || column === 'Amount' || column === 'Balance' ? 'number' : 'text'}" 
                      name="value" class="form-control" required
                      ${column === 'Price' || column === 'Amount' ? 'step="0.01"' : ''}>`;
    }
    
    document.getElementById('valueInput').innerHTML = html;
}
</script>

<?php require_once 'footer.php'; ?>