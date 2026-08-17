const customerInput = document.getElementById('customer-name');
const historyContainer = document.getElementById('history-container');
const itemNameInput = document.getElementById('item-name');
const itemPriceInput = document.getElementById('item-price');
const itemQtyInput = document.getElementById('item-qty');
const amountPaidInput = document.getElementById('amount-paid');

const billCustomerName = document.getElementById('bill-customer-name');
const receiptItems = document.getElementById('receipt-items');
const currentItemsTotalSpan = document.getElementById('current-items-total');
const billPrevBalanceSpan = document.getElementById('bill-prev-balance');
const totalPayableSpan = document.getElementById('total-payable');
const billAmountPaidSpan = document.getElementById('bill-amount-paid');
const finalRemainingSpan = document.getElementById('final-remaining');
const receiptDate = document.getElementById('receipt-date');

receiptDate.innerText = new Date().toLocaleDateString();

// Today's current cart items
let currentCart = [];

// Get database from localStorage
function getFullKhataDB() {
    let db = localStorage.getItem('fullKhataDatabase');
    return db ? JSON.parse(db) : {};
}

// Load customer history when name is typed
function loadCustomerHistory() {
    let name = customerInput.value.trim().toLowerCase();
    if (name === "") {
        historyContainer.innerHTML = `<p style="color: #94a3b8;">Type customer name to view previous history...</p>`;
        clearCurrentBill();
        return;
    }

    let db = getFullKhataDB();
    let customerData = db[name]; // Contains transactions array

    if (!customerData || customerData.transactions.length === 0) {
        historyContainer.innerHTML = `<p style="color: #facc15;">No previous record found for this customer. New account will be created.</p>`;
    } else {
        let html = `<strong>Previous History:</strong><br>`;
        customerData.transactions.forEach((txn) => {
            html += `
                <div class="history-record">
                    <small style="color: #38bdf8;">Date: ${txn.date}</small><br>
                    - Items: ${txn.itemsSummary}<br>
                    - Total Bill: Rs ${txn.totalBill} | Paid: Rs ${txn.paid}
                </div>
            `;
        });
        historyContainer.innerHTML = html;
    }

    updateCurrentBillPreview();
}

// Add item to today's cart
function addItemToCurrentCart() {
    let name = itemNameInput.value.trim();
    let price = parseFloat(itemPriceInput.value);
    let qty = parseInt(itemQtyInput.value);

    if (name === "" || isNaN(price) || price < 0 || isNaN(qty) || qty <= 0) {
        alert("Please enter valid item details!");
        return;
    }

    currentCart.push({ name, price, qty });
    updateCurrentBillPreview();

    itemNameInput.value = "";
    itemPriceInput.value = "";
    itemQtyInput.value = "1";
    itemNameInput.focus();
}

// Update bill calculations and tables
function updateCurrentBillPreview() {
    let customerName = customerInput.value.trim();
    billCustomerName.innerText = customerName === "" ? "---" : customerName;

    let db = getFullKhataDB();
    let lowerName = customerName.toLowerCase();
    
    // Calculate previous balance from last transaction or default to 0
    let prevBalance = 0;
    if (db[lowerName] && db[lowerName].transactions.length > 0) {
        let lastTxn = db[lowerName].transactions[db[lowerName].transactions.length - 1];
        prevBalance = lastTxn.remainingBalance;
    }

    billPrevBalanceSpan.innerText = prevBalance.toFixed(2);

    receiptItems.innerHTML = "";
    let currentTotal = 0;

    currentCart.forEach((item, index) => {
        let total = item.price * item.qty;
        currentTotal += total;

        let row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.name}</td>
            <td>${item.qty}</td>
            <td>Rs ${item.price.toFixed(2)}</td>
            <td>Rs ${total.toFixed(2)}</td>
            <td><button class="delete-btn" onclick="deleteCartItem(${index})">X</button></td>
        `;
        receiptItems.appendChild(row);
    });

    currentItemsTotalSpan.innerText = currentTotal.toFixed(2);

    let payable = currentTotal + prevBalance;
    totalPayableSpan.innerText = payable.toFixed(2);

    let paid = parseFloat(amountPaidInput.value) || 0;
    billAmountPaidSpan.innerText = paid.toFixed(2);

    let finalRemaining = payable - paid;
    finalRemainingSpan.innerText = finalRemaining.toFixed(2);
}

// Delete item from today's cart
function deleteCartItem(index) {
    currentCart.splice(index, 1);
    updateCurrentBillPreview();
}

// Clear preview when no name
function clearCurrentBill() {
    currentCart = [];
    updateCurrentBillPreview();
}

// Save today's transaction into permanent history database
function saveTransaction() {
    let customerName = customerInput.value.trim();
    if (customerName === "") {
        alert("Please enter customer name!");
        return;
    }

    let paid = parseFloat(amountPaidInput.value) || 0;

    // Check if both cart is empty and no payment is made
    if (currentCart.length === 0 && paid === 0) {
        alert("Please add items or enter payment amount!");
        return;
    }

    let db = getFullKhataDB();
    let lowerName = customerName.toLowerCase();

    if (!db[lowerName]) {
        db[lowerName] = { transactions: [] };
    }

    let prevBalance = 0;
    if (db[lowerName].transactions.length > 0) {
        prevBalance = db[lowerName].transactions[db[lowerName].transactions.length - 1].remainingBalance;
    }

    let currentTotal = currentCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    let payable = currentTotal + prevBalance;
    let remaining = payable - paid;

    // Create summary string of items taken today or payment only
    let itemsSummary = currentCart.length > 0 
        ? currentCart.map(i => `${i.qty}x ${i.name} (Rs ${i.price * i.qty})`).join(', ') 
        : "Bill Payment Only (Khata Clear)";

    // Push new transaction object
    let newTxn = {
        date: new Date().toLocaleDateString(),
        itemsSummary: itemsSummary,
        totalBill: payable.toFixed(2),
        paid: paid.toFixed(2),
        remainingBalance: remaining
    };

    db[lowerName].transactions.push(newTxn);
    localStorage.setItem('fullKhataDatabase', JSON.stringify(db));

    alert(`Transaction saved successfully for ${customerName}! New Remaining: Rs ${remaining.toFixed(2)}`);
    
    // Reset current cart and inputs
    currentCart = [];
    amountPaidInput.value = "";
    loadCustomerHistory();
}

// Reset / Clear Customer Khata history
function resetCustomerKhata() {
    let customerName = customerInput.value.trim();
    if (customerName === "") {
        alert("Please enter a customer name first!");
        return;
    }

    if (confirm(`Are you sure you want to clear ALL history for ${customerName}?`)) {
        let db = getFullKhataDB();
        let lowerName = customerName.toLowerCase();
        
        delete db[lowerName];
        localStorage.setItem('fullKhataDatabase', JSON.stringify(db));
        
        alert("Khata has been reset successfully!");
        loadCustomerHistory();
    }
}

// Listen to amount paid changes for live preview update
amountPaidInput.addEventListener('input', updateCurrentBillPreview);