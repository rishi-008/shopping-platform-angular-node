<?php
require_once 'header.php';
require_once 'config.php';

if (!isset($_SESSION['user_id'])) {
    header("Location: signin.php");
    exit();
}
?>

<div class="container">
    <h2 class="my-4">Your Shopping Cart</h2>
    
    <?php if(!empty($_SESSION['cart'])): ?>
    <div class="row">
        <div class="col-md-8">
            <?php foreach($_SESSION['cart'] as $cartItem): 
                $stmt = $conn->prepare("SELECT * FROM Item WHERE Item_Id = ?");
                $stmt->bind_param("i", $cartItem['id']);
                $stmt->execute();
                $item = $stmt->get_result()->fetch_assoc();
            ?>
            <div class="card mb-3" data-item-id="<?= $item['Item_Id'] ?>" data-price="<?= $item['Price'] ?>">
                <div class="row g-0">
                    <div class="col-md-3">
                        <img src="<?= $item['Image_URL'] ?>" class="img-fluid rounded-start">
                    </div>
                    <div class="col-md-7">
                        <div class="card-body">
                            <h5><?= htmlspecialchars($item['Item_name']) ?></h5>
                            <p class="item-price">$<?= number_format($item['Price'], 2) ?></p>
                            <div class="quantity-controls">
                                <button class="btn btn-sm btn-outline-secondary minus-btn">-</button>
                                <span class="mx-2 quantity"><?= $cartItem['quantity'] ?></span>
                                <button class="btn btn-sm btn-outline-secondary plus-btn">+</button>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-2 d-flex align-items-center">
                        <button class="btn btn-danger remove-btn" 
                                data-item-id="<?= $item['Item_Id'] ?>">Remove</button>
                    </div>
                </div>
            </div>
            <?php endforeach; ?>
        </div>
        <div class="col-md-4">
            <div class="card">
                <div class="card-body">
                    <h5>Order Summary</h5>
                    <p class="h4">Total: <span class="total-price">$<?= number_format(array_reduce($_SESSION['cart'], function($sum, $cartItem) use ($conn) {
                        $stmt = $conn->prepare("SELECT Price FROM Item WHERE Item_Id = ?");
                        $stmt->bind_param("i", $cartItem['id']);
                        $stmt->execute();
                        $price = $stmt->get_result()->fetch_column();
                        return $sum + ($price * $cartItem['quantity']);
                    }, 0), 2) ?></span></p>
                    <a href="delivery.php" class="btn btn-primary w-100 mt-3">Checkout</a>
                </div>
            </div>
        </div>
    </div>
    <?php else: ?>
    <div class="alert alert-info">Your cart is empty</div>
    <?php endif; ?>
</div>

<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script>
$(document).ready(function() {
    function updateTotal() {
        let total = 0;
        $('.card.mb-3').each(function() {
            let price = parseFloat($(this).data('price'));
            let quantity = parseInt($(this).find('.quantity').text());
            total += price * quantity;
        });
        $('.total-price').text(`$${total.toFixed(2)}`);
    }

    $('.plus-btn').off('click').on('click', function() {
        const $span = $(this).siblings('.quantity');
        const itemId = $(this).closest('.card').data('item-id');
        const newQty = parseInt($span.text()) + 1;
        updateCart(itemId, newQty, $span);
    });

    $('.minus-btn').off('click').on('click', function() {
        const $span = $(this).siblings('.quantity');
        const itemId = $(this).closest('.card').data('item-id');
        const currentQty = parseInt($span.text());
        if (currentQty > 1) {
            updateCart(itemId, currentQty - 1, $span);
        }
    });

    $('.remove-btn').off('click').on('click', function() {
        const itemId = $(this).data('item-id');
        if (confirm('Remove this item from cart?')) {
            $.post('remove_from_cart.php', { item_id: itemId }, function(response) {
                let result = JSON.parse(response);
                if (result.status === 'success') {
                    location.reload();
                } else {
                    alert('Failed to remove item.');
                }
            });
        }
    });

    function updateCart(itemId, quantity, $span) {
        $.post('update_cart.php', { 
            item_id: itemId, 
            quantity: quantity 
        }, function(response) {
            let result = JSON.parse(response);
            if (result.status === 'success') {
                $span.text(quantity);
                updateTotal();
            } else {
                alert('Error updating cart.');
            }
        });
    }
});
</script>

<?php require_once 'footer.php'; ?>