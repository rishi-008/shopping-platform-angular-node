<?php
require_once 'header.php';
require_once 'config.php';

// Fetch electronics items
$stmt = $conn->prepare("SELECT * FROM Item WHERE Department_Code = 'ELECTRONICS'");
$stmt->execute();
$result = $stmt->get_result();
?>

<!DOCTYPE html>
<html>
<head>
    <title>Electronics Shopping</title>
    <link rel="stylesheet" href="https://code.jquery.com/ui/1.13.1/themes/base/jquery-ui.css">
    <style>
        .item-card {
            cursor: move;
            margin: 15px;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
            transition: all 0.3s;
        }
        .item-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        #cart-preview {
            position: fixed;
            right: 20px;
            top: 100px;
            width: 300px;
            background: #fff;
            border: 2px dashed #007bff;
            padding: 20px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            z-index: 1000;
        }
        .ui-draggable-dragging {
            opacity: 0.7;
            transform: scale(1.05);
        }
    </style>
</head>
<body>
    <div class="container">
        <h2 class="my-4">Electronics Department</h2>
        <div class="row">
            <?php while($item = $result->fetch_assoc()): ?>
            <div class="col-md-4 mb-4">
                <div class="item-card" data-item-id="<?= $item['Item_Id'] ?>">
                    <img src="<?= $item['Image_URL'] ?>" class="img-fluid mb-3" 
                         alt="<?= htmlspecialchars($item['Item_name']) ?>">
                    <h4><?= htmlspecialchars($item['Item_name']) ?></h4>
                    <p class="text-muted">$<?= number_format($item['Price'], 2) ?></p>
                    <div class="quantity-controls">
                        <button class="btn btn-sm btn-outline-secondary minus-btn">-</button>
                        <span class="mx-2 quantity">1</span>
                        <button class="btn btn-sm btn-outline-secondary plus-btn">+</button>
                    </div>
                </div>
            </div>
            <?php endwhile; ?>
        </div>
    </div>

    <!-- Cart Preview -->
    <div id="cart-preview" class="droppable-area">
        <h4>🛒 Drag Items Here</h4>
        <div id="cart-items-preview" class="mb-3"></div>
        <a href="cart.php" class="btn btn-primary btn-sm">View Full Cart</a>
    </div>

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://code.jquery.com/ui/1.13.1/jquery-ui.min.js"></script>
    <script>
$(document).ready(function() {
    // Initialize draggable items with a custom helper
    $(".item-card").draggable({
        revert: "invalid",
        helper: function() {
            let $original = $(this);
            return $original.clone().css({
                width: "150px", // Standardized size for all dragged items
                height: "150px", // Standardized size
                opacity: "0.8",
                border: "2px solid #007bff",
                background: "#f8f9fa",
                padding: "10px"
            });
        },
        cursor: "move",
        zIndex: 1000
    });

    // Initialize droppable cart
    $("#cart-preview").droppable({
        accept: ".item-card",
        hoverClass: "ui-state-hover",
        drop: function(event, ui) {
            const itemId = ui.draggable.data('item-id');
            const quantity = parseInt(ui.draggable.find('.quantity').text());
            
            $.post('add_to_cart.php', {
                item_id: itemId,
                quantity: quantity
            }, function(response) {
                updateCartPreview();
            });
        }
    });

    // Quantity controls
    $('.plus-btn').click(function(e) {
        e.preventDefault();
        const $span = $(this).siblings('.quantity');
        $span.text(parseInt($span.text()) + 1);
    });

    $('.minus-btn').click(function(e) {
        e.preventDefault();
        const $span = $(this).siblings('.quantity');
        const qty = parseInt($span.text());
        if(qty > 1) $span.text(qty - 1);
    });

    function updateCartPreview() {
        $.get('cart_content.php', function(data) {
            $('#cart-items-preview').html(data);
        });
    }
});
    </script>
</body>
</html>