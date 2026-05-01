<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Online Service Platform</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
<nav class="navbar navbar-expand-lg navbar-dark bg-dark">
    <div class="container-fluid">
        <a class="navbar-brand" href="index.php">OSP System</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
            <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav me-auto">
                <li class="nav-item"><a class="nav-link" href="index.php">Home</a></li>
                <li class="nav-item"><a class="nav-link" href="about.php">About Us</a></li>
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" id="servicesDropdown" role="button" data-bs-toggle="dropdown">
                        Types of Services
                    </a>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="shopping.php">Shopping</a></li>
                        <li><a class="dropdown-item" href="delivery.php">Delivery</a></li>
                        <li><a class="dropdown-item" href="payment.php">Payment</a></li>
                    </ul>
                </li>
                <?php if(isset($_SESSION['user_type']) && $_SESSION['user_type'] == 'admin'): ?>
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" id="dbMaintain" role="button" data-bs-toggle="dropdown">
                        DB Maintain
                    </a>
                    <ul class="dropdown-menu">
                        <li><a class="dropdown-item" href="insert.php">Insert</a></li>
                        <li><a class="dropdown-item" href="delete.php">Delete</a></li>
                        <li><a class="dropdown-item" href="select.php">Select</a></li>
                        <li><a class="dropdown-item" href="update.php">Update</a></li>
                    </ul>
                </li>
                <?php endif; ?>
                <li class="nav-item"><a class="nav-link" href="#">Reviews</a></li>
                <!-- Add Search Dropdown -->
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" id="navbarSearch" role="button" 
                       data-bs-toggle="dropdown" aria-expanded="false">
                        Search
                    </a>
                    <div class="dropdown-menu dropdown-menu-end p-3" aria-labelledby="navbarSearch" 
                         style="min-width: 300px; right: 0; left: auto;">
                        <form class="search-form" action="search_results.php" method="GET">
                            <div class="input-group">
                                <input type="text" name="search_term" class="form-control" 
                                       placeholder="Format: UserID, OrderID" 
                                       pattern="\d+,\s*\d*|\d*,\s*\d+" 
                                       title="Enter numeric IDs in format: UserID, OrderID" required>
                                <button type="submit" class="btn btn-primary">
                                    <i class="bi bi-search"></i>
                                </button>
                            </div>
                            <small class="form-text text-muted">Example: "1,5" or "1, " or ",5"</small>
                        </form>
                    </div>
                </li>
            </ul>
            <ul class="navbar-nav">
                <?php if(isset($_SESSION['user_id'])): ?>
                    <li class="nav-item"><a class="nav-link" href="cart.php">Shopping Cart</a></li>
                    <li class="nav-item"><a class="nav-link" href="logout.php">Logout</a></li>
                <?php else: ?>
                    <li class="nav-item"><a class="nav-link" href="signup.php">Sign Up</a></li>
                    <li class="nav-item"><a class="nav-link" href="signin.php">Sign In</a></li>
                <?php endif; ?>
            </ul>
        </div>
    </div>
</nav>
<div class="container mt-4">