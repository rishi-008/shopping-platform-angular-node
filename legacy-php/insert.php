<?php
require_once 'header.php';
require_once 'config.php';

if ($_SESSION['user_type'] !== 'admin') {
    header("Location: index.php");
    exit();
}

$tables = [
    'Users' => ['Name', 'Email', 'Address', 'Login_Id', 'Password', 'Tel_No', 'City_Code', 'Balance', 'User_Type'],
    'Item' => ['Item_name', 'Price', 'Made_in', 'Department_Code', 'Image_URL'],
    'Branch' => ['Name', 'Address', 'City', 'Province', 'Postal_Code', 'Latitude', 'Longitude'],
    'Truck' => ['License_Plate', 'Capacity', 'Availability'],
    'Trip' => ['Branch_Id', 'Destination_Address', 'Distance', 'Estimated_Time', 'Truck_Id', 'Delivery_Date', 'Delivery_Time'],
    'Orders' => ['User_Id', 'Trip_Id', 'Total_Price', 'Status'],
    'Payment' => ['Order_Id', 'Amount', 'Payment_Method', 'Transaction_Id', 'Status']
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $table = $_POST['table'];
    $data = array_filter($_POST, function($value) {
        return $value !== ''; // Allow 0 values but filter empty strings
    });
    unset($data['table']);
    
    if (empty($data)) {
        $error = "At least one field must be filled";
    } else {
        try {
            $columns = implode(', ', array_keys($data));
            $placeholders = implode(', ', array_fill(0, count($data), '?'));
            $types = str_repeat('s', count($data));
            
            $sql = "INSERT INTO $table ($columns) VALUES ($placeholders)";
            $stmt = $conn->prepare($sql);
            $stmt->bind_param($types, ...array_values($data));
            $stmt->execute();
            $success = "Record inserted successfully!";
        } catch (Exception $e) {
            $error = "Error: " . $e->getMessage();
        }
    }
}
?>

<div class="container">
    <h2 class="my-4">Insert Records</h2>
    
    <?php if (isset($success)): ?>
    <div class="alert alert-success"><?= htmlspecialchars($success) ?></div>
    <?php endif; ?>
    
    <?php if (isset($error)): ?>
    <div class="alert alert-danger"><?= htmlspecialchars($error) ?></div>
    <?php endif; ?>

    <form method="POST">
        <div class="row g-3">
            <div class="col-md-3">
                <select name="table" class="form-select" id="tableSelect" required>
                    <?php foreach ($tables as $name => $fields): ?>
                    <option value="<?= htmlspecialchars($name) ?>"><?= htmlspecialchars($name) ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            
            <div class="col-md-9">
                <div id="inputFields"></div>
                <button type="submit" class="btn btn-primary mt-3">Insert</button>
            </div>
        </div>
    </form>
</div>

<script>
document.getElementById('tableSelect').addEventListener('change', function() {
    const fields = {
        'Users': [
            {name: 'Name', type: 'text', required: true},
            {name: 'Email', type: 'email', required: true},
            {name: 'Address', type: 'text', required: true},
            {name: 'Login_Id', type: 'text', required: true},
            {name: 'Password', type: 'password', required: true},
            {name: 'Tel_No', type: 'text'},
            {name: 'City_Code', type: 'text'},
            {name: 'Balance', type: 'number', step: '0.01'},
            {name: 'User_Type', type: 'select', options: ['user', 'admin']}
        ],
        'Item': [
            {name: 'Item_name', type: 'text', required: true},
            {name: 'Price', type: 'number', step: '0.01', required: true},
            {name: 'Made_in', type: 'text'},
            {name: 'Department_Code', type: 'text', required: true},
            {name: 'Image_URL', type: 'text'}
        ],
        'Branch': [
            {name: 'Name', type: 'text', required: true},
            {name: 'Address', type: 'text', required: true},
            {name: 'City', type: 'text'},
            {name: 'Province', type: 'text'},
            {name: 'Postal_Code', type: 'text'},
            {name: 'Latitude', type: 'number', step: 'any'},
            {name: 'Longitude', type: 'number', step: 'any'}
        ],
        'Truck': [
            {name: 'License_Plate', type: 'text', required: true},
            {name: 'Capacity', type: 'number', step: '0.01'},
            {name: 'Availability', type: 'select', options: ['available', 'in_transit', 'maintenance']}
        ],
        'Trip': [
            {name: 'Branch_Id', type: 'number', required: true},
            {name: 'Destination_Address', type: 'text', required: true},
            {name: 'Distance', type: 'number', step: '0.01'},
            {name: 'Estimated_Time', type: 'number', step: '0.01'},
            {name: 'Truck_Id', type: 'number'},
            {name: 'Delivery_Date', type: 'date', required: true},
            {name: 'Delivery_Time', type: 'time', required: true}
        ],
        'Orders': [
            {name: 'User_Id', type: 'number', required: true},
            {name: 'Trip_Id', type: 'number'},
            {name: 'Total_Price', type: 'number', step: '0.01'},
            {name: 'Status', type: 'select', options: ['pending', 'processing', 'shipped']}
        ],
        'Payment': [
            {name: 'Order_Id', type: 'number', required: true},
            {name: 'Amount', type: 'number', step: '0.01', required: true},
            {name: 'Payment_Method', type: 'text'},
            {name: 'Transaction_Id', type: 'text'},
            {name: 'Status', type: 'select', options: ['pending', 'completed', 'failed']}
        ]
    };

    let html = '';
    const tableFields = fields[this.value];
    
    tableFields.forEach(field => {
        html += `<div class="mb-3">`;
        html += `<label>${field.name}</label>`;
        
        if (field.type === 'select') {
            html += `<select name="${field.name}" class="form-select" ${field.required ? 'required' : ''}>`;
            field.options.forEach(opt => {
                html += `<option value="${opt}">${opt}</option>`;
            });
            html += `</select>`;
        } else {
            html += `<input type="${field.type}" name="${field.name}" 
                     class="form-control" 
                     ${field.required ? 'required' : ''}
                     ${field.step ? `step="${field.step}"` : ''}>`;
        }
        
        html += `</div>`;
    });
    
    document.getElementById('inputFields').innerHTML = html;
});

// Initialize fields on page load
document.getElementById('tableSelect').dispatchEvent(new Event('change'));
</script>

<?php require_once 'footer.php'; ?>