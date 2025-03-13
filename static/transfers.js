// transfers.js
export async function fetchAndDisplayTransfers() {
  try {
    const response = await fetch("/get_transfers");
    const transfers = await response.json();
    const sortedTransfers = transfers.sort((a, b) => b.amount - a.amount);
    const topDonators = sortedTransfers.slice(0, 3);
    const topDonatorsList = document.getElementById("top-donators-list");
    if (topDonatorsList) {
      topDonatorsList.innerHTML = topDonators.map((transfer, index) => `
        <div class="top-donator ${index < 3 ? 'glow' : ''}">
            <h4>${transfer.sender}</h4>
            <p>Amount: ${transfer.amount}</p>
        </div>
      `).join("");
    }
    const latestTransfersList = document.getElementById("latest-transfers-list");
    if (latestTransfersList) {
      latestTransfersList.innerHTML = transfers.slice(-10).map(transfer => `
        <div class="transfer-item">
            <p><strong>Sender:</strong> ${transfer.sender}</p>
            <p><strong>Receiver:</strong> ${transfer.receiver}</p>
            <p><strong>Amount:</strong> ${transfer.amount}</p>
            <p><strong>Timestamp:</strong> ${new Date(transfer.timestamp).toLocaleString()}</p>
            <hr>
        </div>
      `).join("");
    }
  } catch (error) {
    console.error("Error fetching transfers:", error);
    const transfersList = document.getElementById("transfers-list");
    if (transfersList) transfersList.innerHTML = "<p>Error loading transfer history.</p>";
  }
}
