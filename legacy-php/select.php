<?php
require_once 'header.php';
require_once 'config.php';

if ($_SESSION['user_type'] !== 'admin') {
    header("Location: index.php");
    exit();
}

$tables = [
    'Users' => ['Name', 'Email', 'User_Type'],
    'Item' => ['Item_name', 'Department_Code'],
    'Branch' => ['Name', 'City'],
    'Truck' => ['License_Plate', 'Availability'],
    'Trip' => ['Destination_Address'],
    'Orders' => ['Status'],
    'Payment' => ['Status']
];

$results = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $table = $_POST['table'];
    $searchTerm = "%{$_POST['search_term']}%";
    
    try {
        $columns = implode(' LIKE ? OR ', $tables[$table]) . ' LIKE ?';
        $sql = "SELECT * FROM $table WHERE $columns";
        $stmt = $conn->prepare($sql);
        $params = array_fill(0, count($tables[$table]), $searchTerm);
        $stmt->bind_param(str_repeat('s', count($params)), ...$params);
        $stmt->execute();
        $results = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    } catch (Exception $e) {
        $error = "Error: " . $e->getMessage();
    }
}
?>

<div class="container">
    <h2 class="my-4">Search Records</h2>
    
    <form method="POST">
        <div class="row g-3 mb-4">
            <div class="col-md-3">
                <select name="table" class="form-select">
                    <?php foreach ($tables as $name => $columns): ?>
                    <option value="<?= $name ?>"><?= $name ?></option>
                    <?php endforeach; ?>
                </select>
            </div>
            <div class="col-md-7">
                <input type="text" name="search_term" class="form-control" placeholder="Search term">
            </div>
            <div class="col-md-2">
                <button type="submit" class="btn btn-primary">Search</button>
            </div>
        </div>
    </form>

    <?php if (!empty($results)): ?>
    <div class="card">
        <div class="card-body">
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <?php foreach ($results[0] as $col => $val): ?>
                            <th><?= htmlspecialchars($col) ?></th>
                            <?php endforeach; ?>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($results as $row): ?>
                        <tr>
                            <?php foreach ($row as $val): ?>
                            <td><?= htmlspecialchars($val) ?></td>
                            <?php endforeach; ?>
                        </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
    <?php elseif ($_SERVER['REQUEST_METHOD'] === 'POST'): ?>
    <div class="alert alert-info">No records found</div>
    <?php endif; ?>
</div>

<?php require_once 'footer.php'; ?>