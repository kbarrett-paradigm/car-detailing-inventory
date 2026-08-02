/* jshint esversion: 8 */
/* CONFIGURATION */

/* Google Apps Script URL here. */
const API_URL = "https://script.google.com/macros/s/AKfycbzw0Xcj2TuDBDEhPFue4aDQc4D6iMrXae1JijtwworMDqLKh0l7ZMrsu48qn1NzOl-3/exec";

/* Stores all inventory data pulled from Google Sheets. */
let inventory = [];

/* LOAD DATA FROM GOOGLE SHEET */
async function loadInventory() {

    try {

        console.log("Loading inventory...");
        const response =
            await fetch(API_URL);
        inventory =
            await response.json();
        console.log("Inventory loaded:");
        console.log(inventory);
        renderDashboard();
        applyCurrentFilter();
    } catch(error) {
        console.error(
            "Inventory load failed:",
            error
        );
    }

try {

    const response =
        await fetch(API_URL);
    inventory =
        await response.json();
    document.getElementById("debug").innerHTML = `
        API Connected ✔️<br>
        Products Loaded: ${inventory.length}<br>
        Last Refresh: ${new Date().toLocaleTimeString()}
    `;
    renderDashboard();
    applyCurrentFilter();
// Use this to render entire inventory    renderProducts(inventory);

} catch(error) {
    document.getElementById("debug").innerHTML = `
        API Connection Failed ❌<br>
        ${error.message}
    `;
    console.error(error);

}
}

/* DASHBOARD STATISTICS */
function renderDashboard() {

    /* Total number of products */
    document.getElementById(
        "productCount"
    ).textContent =
        inventory.length;

    /* Add all purchase prices together */
    const totalValue =
        inventory.reduce((sum, item) => {
            return sum +
                Number(
                    item["Purchase Price"] || 0
                );
        }, 0);

    document.getElementById(
        "inventoryValue"
    ).textContent =
        "$" + totalValue.toFixed(2);

    /* Count products at or below 30% */
    const lowCount =
        inventory.filter(item =>

            Number(
                item["Percent Remaining (Current Bottle)"]
            ) <= 30

        ).length;

    document.getElementById(
        "lowInventory"
    ).textContent =
        lowCount;

    /* Count products with 0 bottle quantity */
    const lowQuantity =
        inventory.filter(item =>

            Number(
                item["Quantity (Bottles)"]
            ) === 0

        ).length;

    document.getElementById(
        "outStock"
    ).textContent =
        lowQuantity;
}

/* PRODUCT CARDS */
function renderProducts(products) {

    const container =
        document.getElementById(
            "products"
        );

    /* Clear old cards before drawing new ones. */
    container.innerHTML = "";

    products.forEach(product => {

        const percent =
            Number(
                product["Percent Remaining (Current Bottle)"]
            ) || 0;

        const card =
            document.createElement("div");

        card.className =
            "product-card";

        /* Product card HTML template. */
        card.innerHTML = `

            <h3><u>${product["Product Name"]}</u></h3>

            <p>
                <strong>Brand:</strong>
                ${product.Brand}
            </p>

            <p>
                <strong>Category:</strong>
                ${product.Category}
            </p>

            <p>
                <strong>Quantity:</strong>
                ${product["Quantity (Bottles)"]} Bottle(s)
            </p>

            <p>
                <strong>Notes:</strong>
                ${product.Notes}
            </p>

            <p>
                <strong>Link to Item:</strong>
                <a href="${product.Link}" target="_blank">Link to purchase.</a>
            </p>

            <p>
                <strong>Remaining (Current Bottle):</strong>
                ${percent}%
            </p>


<div class="button-group">

    <button
        onclick="updateRemaining('${product["Product Id"]}', -10)">
        Use 10%
    </button>

    <button
        onclick="updateRemaining('${product["Product Id"]}', 100)">
        Refill
    </button>

    <br><br>

    <button
        onclick="updateQuantity('${product["Product Id"]}', -1)">
        -
    </button>

    Quantity:
    ${product["Quantity (Bottles)"] || 0}

    <button
        onclick="updateQuantity('${product["Product Id"]}', 1)">
        +
    </button>

</div>


<div class="progress">

    <div
        class="progress-bar"
            style="
                width:${percent}%;

                    background:
                    ${
                        percent <= 40
                        ? '#ff0000;'
                        : percent <= 70
                        ? '#ffbf00;'
                        : '#009900;'
                        };
                    ">
    </div>

</div>

        `;

        container.appendChild(card);

    });

}

/* Search For Products */

document
.getElementById("search")
.addEventListener("input", applyCurrentFilter);

function applyCurrentFilter() {

    const term =
        document
        .getElementById("search")
        .value
        .toLowerCase();

    const filtered = inventory.filter(item => {

        const searchableText = `
            ${item["Product Name"] || ""}
            ${item["Brand"] || ""}
            ${item["Category"] || ""}
        `.toLowerCase();

        return searchableText.includes(term);

    });

    renderProducts(filtered);

}


/*
====================================
UPDATE REMAINING %
Called when:
Use 10%
Refill
Parameters:
productId = Product to update
change =
-10 = subtract 10%
100 = refill to 100%
====================================
*/

async function updateRemaining(productId, change) {

    const formData = new FormData();

    formData.append(
        "payload",
        JSON.stringify({
            action: "updateRemaining",
            productId: productId,
            change: change
        })
    );

    await fetch(API_URL, {
        method: "POST",
        body: formData
    });

    // Find the product we just updated

    const product =
        inventory.find(p =>
            Number(p["Product Id"]) === Number(productId)
        );

    //Update the local copy

    if (product) {

        if (change === 100) {

            product["Percent Remaining (Current Bottle)"] = 100;

        } else {

            product["Percent Remaining (Current Bottle)"] += change;

            product["Percent Remaining (Current Bottle)"] =
                Math.max(
                    0,
                    Math.min(
                        100,
                        product["Percent Remaining (Current Bottle)"]
                    )
                );

        }

    }

    //Refresh the cards using the already-loaded inventory.
    renderDashboard();
    applyCurrentFilter();

}

/*
====================================
UPDATE QUANTITY
Parameters:
productId
change:
+1 = add bottle
-1 = remove bottle
====================================
*/

async function updateQuantity(productId, change) {

    const formData = new FormData();

    formData.append(
        "payload",
        JSON.stringify({

            action: "updateQuantity",

            productId: productId,

            change: change

        })
    );

    await fetch(API_URL, {

        method: "POST",

        body: formData

    });

   const product =
    inventory.find(p =>
        Number(p["Product Id"]) === Number(productId)
    );

if (product) {

    product["Quantity (Bottles)"] += change;

    product["Quantity (Bottles)"] =
        Math.max(
            0,
            product["Quantity (Bottles)"]
        );

}

renderDashboard();
applyCurrentFilter()

}

/* INITIAL PAGE LOAD */

/* Kick everything off. */
loadInventory();