<?php
require_once 'header.php';
require_once 'config.php';

if ($_SESSION['user_type'] !== 'admin') {
    header("Location: index.php");
    exit();
}

$tables = [
    'Users' => 'User_Id',
    'Item' => 'Item_Id',
    'Branch' => 'Branch_Id',
    'Truck' => 'Truck_Id',
    'Trip' => 'Trip_Id',
    'Orders' => 'Order_Id',
    'Payment' => 'Payment_Id'
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $table = $_POST['table'];
    $id = $_POST['id'];
    
    try {
        $stmt = $conn->prepare("DELETE FROM $table WHERE {$tables[$table]} = ?");
        $stmt->bind_param('i', $id);
        $stmt->execute();
        
        if ($stmt->affected_rows > 0) {
            $success = "Record deleted successfully!";
        } else {
            $error = "No record found with that ID";
        }
    } catch (Exception $e) {
        $error = "Error: " . $e->getMessage();
    }
}
?>

<div class="container">
    <h2 class="my-4">Delete Records</h2>
    
    <?php if (isset($success)): ?>
    <div class="alert alert-success"><?= $success ?></div>
    <?php endif; ?>
    
    <?php if (isset($error)): ?>
    <div class="alert alert-danger"><?= $error ?></div>
    <?php endif; ?>

    <form method="POST">
        <div class="row g-3">
            <div class="col-md-4">
                <select name="table" class="form-select" required>
                    <?php foreach ($tables as $name => $pk): ?>
                    <option value="<?= $name ?>"><?= $name ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-4">
                <input type="number" name="id" class="form-control" placeholder="ID" required>
            </div>
            <div class="col-md-4">
                <button type="submit" class="btn btn-danger">Delete</button>
            </div>
        </div>
    </form>
</div>

<?php require_once 'footer.php'; ?>