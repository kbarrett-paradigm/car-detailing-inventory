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
                <b>Brand:</b>
                <b>${product.Brand}</b>
            </p>

            <p>
                <b>Category:</b>
                <b>${product.Category}</b>
            </p>

            <p>
                <b>Quantity:</b>
                <b>${product["Quantity (Bottles)"]} Bottle(s)</b>
            </p>

            <p>
                <b>Notes:</b>
                <b>${product.Notes}</b>
            </p>

            <p>
                <b>Link to Item:</b>
                <b><a href="${product.Link}" target="_blank">Link to purchase.</a></b>
            </p>

            <p>
                <b>Remaining (Current Bottle):</b>
                <b>${percent}%</b>
            </p>


<div class="button-group">

    <button
        onclick="updateRemaining('${product["Product Id"]}', -10)">
        <b>Use 10%</b>
    </button>

    <button
        onclick="updateRemaining('${product["Product Id"]}', 100)">
        <b>Refill</b>
    </button>

    <br><br>

    <button
        onclick="updateQuantity('${product["Product Id"]}', -1)">
        <b>-</b>
    </button>

    <b>Quantity:</b>
    <b>${product["Quantity (Bottles)"] || 0}</b>

    <button
        onclick="updateQuantity('${product["Product Id"]}', 1)">
        <b>+</b>
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

/* == JAVASCRIPT FOR MODAL == */

// Get the modal
var modal = document.getElementById("myModal");

// Get the button that opens the modal
var btn = document.getElementById("myBtn");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close")[0];

// When the user clicks on the button, open the modal
btn.onclick = function() {
  modal.style.display = "block";
}

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
  modal.style.display = "none";
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}



/* == JAVASCRIPT FOR FORM == */

/* SHOW ADD PRODUCT FORM Displays the form used to create a new inventory item. */

function showAddProductForm() {

    document.getElementById(
        "addProductForm"
    ).style.display = "block";

}

/* HIDE ADD PRODUCT FORM Hides the form and clears all fields after cancelling. */

function hideAddProductForm() {

    document.getElementById(
        "addProductForm"
    )
    {modal.style.display = "none";}
}


/* ADD NEW PRODUCT Collects the information entered into the form and sends it to Google Apps Script. Apps Script will create the new row and assign the Product ID. */

async function addNewProduct() {

/* Collect information from form */

    const category =
        document.getElementById(
            "newCategory"
        ).value.trim();

    const productName =
        document.getElementById(
            "newProductName"
        ).value.trim();

    const brand =
        document.getElementById(
            "newBrand"
        ).value.trim();

    const quantity =
        Number(
            document.getElementById(
                "newQuantity"
            ).value
        ) || 0;

    const percent =
        Number(
            document.getElementById(
                "newPercent"
            ).value
        );

    const purchasePrice =
        Number(
            document.getElementById(
                "newPurchasePrice"
            ).value
        ) || 0;

    const notes =
        document.getElementById(
            "newNotes"
        ).value.trim();

    const link =
        document.getElementById(
            "newLink"
        ).value.trim();


    /* Basic validation */

    if (!productName) {

        alert(
            "Please enter a Product Name."
        );

        return;

    }


    /* Create the data we will send to Google Apps Script. */

    const formData =
        new FormData();

    formData.append(
        "payload",
        JSON.stringify({

            action: "addProduct",

            category: category,

            productName: productName,

            brand: brand,

            quantity: quantity,

            percent: percent,

            purchasePrice: purchasePrice,

            notes: notes,

            link: link

        })
    );


    /* Send new product to Google Sheet */

    try {

        const response =
            await fetch(API_URL, {

                method: "POST",

                body: formData

            });


    /* Read the new product returned by Apps Script. */

        const newProduct =
            await response.json();


    /* Add the new product to our local inventory array. */

        inventory.push(
            newProduct
        );


    /* Update dashboard statistics. */

        renderDashboard();


    /* Redisplay products using the current search/filter. */

        applyCurrentFilter();


    /* Clear and hide the form. */

        hideAddProductForm();


        document.getElementById(
            "newCategory"
        ).value = "";

        document.getElementById(
            "newProductName"
        ).value = "";

        document.getElementById(
            "newBrand"
        ).value = "";

        document.getElementById(
            "newQuantity"
        ).value = "1";

        document.getElementById(
            "newPercent"
        ).value = "100";

        document.getElementById(
            "newPurchasePrice"
        ).value = "0";
        
        document.getElementById(
            "newNotes"
        ).value = "";

        document.getElementById(
            "newLink"
        ).value = "";

        alert(
            "Product added successfully!"
        );


    } catch (error) {

        console.error(
            "Add product failed:",
            error
        );

        alert(
            "There was a problem adding the product."
        );

    }

}




/* INITIAL PAGE LOAD */

/* Kick everything off. */
loadInventory();