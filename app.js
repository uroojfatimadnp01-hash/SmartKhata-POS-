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

let currentCart = [];

function getFullKhataDB() {
    let db = localStorage.getItem('fullKhataDatabase');
    return db ? JSON.parse(db) : {};
}

function loadCustomerHistory() {
    let name = customerInput.value.trim().toLowerCase();
    if (name === "") {
        historyContainer.innerHTML = `<p style="color: #94a3b8;">Type customer name to view previous history...</p>`;
        clearCurrentBill();
        return;
    }

    let db = getFullKhataDB();
    let customerData = db[name];

    if (!customerData || customerData.transactions.length === 0) {
        historyContainer.innerHTML = `<p style="color: #facc15;">No previous record found. New account will be created.</p>`;
    } else {
        let lastTxn = customerData.transactions[customerData.transactions.length - 1];
        let hasRemaining = parseFloat(lastTxn.remainingBalance) > 0;

        let statusBadge = hasRemaining 
            ? `<span style="color: #ef4444; font-weight: bold; float: right;">🔴 Remaining: Rs ${lastTxn.remainingBalance}</span>` 
            : `<span style="color: #22c55e; font-weight: bold; float: right;">🟢 Clear / Paid</span>`;

        let html = `<strong>Previous History:</strong> ${statusBadge}<br><hr style="border-color: #334155; margin: 8px 0;">`;
        
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

function updateCurrentBillPreview() {
    let customerName = customerInput.value.trim();
    billCustomerName.innerText = customerName === "" ? "---" : customerName;

    let db = getFullKhataDB();
    let lowerName = customerName.toLowerCase();
    
    let prevBalance = 0;
    if (db[lowerName] && db[lowerName].transactions.length > 0) {
        let lastTxn = db[lowerName].transactions[db[lowerName].transactions.length - 1];
        prevBalance = parseFloat(lastTxn.remainingBalance) || 0;
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

function deleteCartItem(index) {
    currentCart.splice(index, 1);
    updateCurrentBillPreview();
}

function clearCurrentBill() {
    currentCart = [];
    updateCurrentBillPreview();
}

function saveTransaction() {
    let customerName = customerInput.value.trim();
    if (customerName === "") {
        alert("Please enter customer name!");
        return;
    }

    let paid = parseFloat(amountPaidInput.value) || 0;

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
        prevBalance = parseFloat(db[lowerName].transactions[db[lowerName].transactions.length - 1].remainingBalance) || 0;
    }

    let currentTotal = currentCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    let payable = currentTotal + prevBalance;
    let remaining = payable - paid;

    let itemsSummary = currentCart.length > 0 
        ? currentCart.map(i => `${i.qty}x ${i.name} (Rs ${i.price * i.qty})`).join(', ') 
        : "Bill Payment Only (Khata Clear)";

    let newTxn = {
        date: new Date().toLocaleDateString(),
        timestamp: new Date().getTime(),
        customerName: customerName,
        itemsSummary: itemsSummary,
        totalBill: payable.toFixed(2),
        paid: paid.toFixed(2),
        remainingBalance: remaining
    };

    // 1. Save to active customer ledger
    db[lowerName].transactions.push(newTxn);

    // 2. Save to permanent Sales Archive for Monthly Reports
    let salesArchive = localStorage.getItem('salesArchiveDB');
    salesArchive = salesArchive ? JSON.parse(salesArchive) : [];
    salesArchive.push(newTxn);
    localStorage.setItem('salesArchiveDB', JSON.stringify(salesArchive));

    // 3. Auto delete/reset active customer account if remaining balance is 0 or less
    if (remaining <= 0) {
        delete db[lowerName];
        localStorage.setItem('fullKhataDatabase', JSON.stringify(db));
        alert(`Transaction saved! Bill fully cleared. Account for ${customerName} has been automatically reset.`);
    } else {
        localStorage.setItem('fullKhataDatabase', JSON.stringify(db));
        alert(`Transaction saved successfully! Remaining Balance: Rs ${remaining.toFixed(2)}`);
    }
    
    currentCart = [];
    amountPaidInput.value = "";
    loadCustomerHistory();
}

// Monthly Report Logic using Sales Archive (Updated with Remaining Balance display)
function showMonthlyReport() {
    let salesArchive = localStorage.getItem('salesArchiveDB');
    salesArchive = salesArchive ? JSON.parse(salesArchive) : [];

    let currentDate = new Date();
    let currentMonth = currentDate.getMonth(); 
    let currentYear = currentDate.getFullYear();

    let totalSalesThisMonth = 0;
    let totalCashCollectedThisMonth = 0;
    let transactionCount = 0;
    let reportHtml = "";

    salesArchive.forEach(txn => {
        let txnDate = txn.timestamp ? new Date(txn.timestamp) : new Date();
        
        if (txnDate.getMonth() === currentMonth && txnDate.getFullYear() === currentYear) {
            totalSalesThisMonth += parseFloat(txn.totalBill) || 0;
            totalCashCollectedThisMonth += parseFloat(txn.paid) || 0;
            transactionCount++;

            let remainingVal = parseFloat(txn.remainingBalance) || 0;
            let remainingBadge = remainingVal > 0 
                ? `<span style="color: #ef4444;">Remaining: Rs ${remainingVal.toFixed(2)} 🔴</span>` 
                : `<span style="color: #22c55e;">Cleared 🟢</span>`;

            reportHtml += `
                <div style="border-bottom:1px dashed #334155; padding:8px 0;">
                    <small style="color:#38bdf8;">${txn.date} - Customer: <b>${txn.customerName}</b></small><br>
                    Bill: Rs ${txn.totalBill} | Paid: Rs ${txn.paid} | ${remainingBadge}
                </div>
            `;
        }
    });

    let summaryBox = `
        <div style="background:#0f172a; padding:15px; border-radius:8px; margin-bottom:15px;">
            <p><strong>Total Transactions:</strong> ${transactionCount}</p>
            <p><strong>Total Cumulative Sales:</strong> Rs ${totalSalesThisMonth.toFixed(2)}</p>
            <p><strong>Total Cash Collected:</strong> Rs ${totalCashCollectedThisMonth.toFixed(2)}</p>
        </div>
        <h4>All Transactions This Month:</h4>
        <div style="max-height:200px; overflow-y:auto; margin-top:10px;">
            ${reportHtml === "" ? "<p style='color:#94a3b8;'>No transactions recorded for this month yet.</p>" : reportHtml}
        </div>
    `;

    document.getElementById('report-content').innerHTML = summaryBox;
    document.getElementById('report-modal').style.display = 'flex';
}

function closeMonthlyReport() {
    document.getElementById('report-modal').style.display = 'none';
}

amountPaidInput.addEventListener('input', updateCurrentBillPreview);
