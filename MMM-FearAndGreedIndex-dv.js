Module.register("MMM-FearAndGreedIndex-dv", {
    defaults: {
        updateInterval: 3600000, // Update every hour
        header: {}
    },

    start() {
        this.fearAndGreedIndex = {};
        this.cryptoFearAndGreedIndex = {};
        console.log("start");
        this.sendSocketNotification("CONFIG", this.config);
    },

    getDom() {
        console.log("getDom() begin");
        var wrapper = document.createElement("div");

        // Create and append the header
        var header = document.createElement("header");
        header.innerHTML = "Fear and Greed Index";
        wrapper.appendChild(header);

        var table = document.createElement("table");
        wrapper.appendChild(table);
        var tbody = document.createElement("tbody");
        table.appendChild(tbody);

        var createIndexDisplay = (index, title) => {
            var rowWrapper = document.createElement("tr");
            var indexWrapper = document.createElement("td");
            indexWrapper.setAttribute("style", 'font-size: smaller;');
            rowWrapper.appendChild(indexWrapper);
            indexWrapper.innerHTML = title; // "<strong>" + title + "</strong>";
            var valueElement = document.createElement("td");
            valueElement.style.fontSize = "smaller";
            rowWrapper.appendChild(valueElement);
            
            if (index.value) {
                var indexValue = parseFloat(index.value).toFixed(2);
                // Check for 'description' or 'value_classification' depending on index type
                var indexCategory = index.text || "Loading...";
                
                valueElement.innerHTML = indexValue + " (" + indexCategory + ")";
                valueElement.style.color = this.getColorForIndex(parseFloat(indexValue));
            } else {
                valueElement.innerHTML += ": Loading...";
            }
            return rowWrapper;
        };

        try {
            // Append traditional index
            if (this.fearAndGreedIndex) {
                for(var key in this.fearAndGreedIndex) {
                    const index = this.fearAndGreedIndex[key];
                    tbody.appendChild(createIndexDisplay({ value: index.score, text: index.rating }, key.replace(/_/g, " ")));
                }
            }
        }
        catch(ex) {
            console.error(ex);
        }


        try {
            // Append crypto index
            if (this.cryptoFearAndGreedIndex.value) {
                tbody.appendChild(createIndexDisplay(
                    { value: parseFloat(this.cryptoFearAndGreedIndex.value), text: this.cryptoFearAndGreedIndex.value_classification }, 
                    "Crypto"));
            }
        }
        catch(ex) {
            console.error(ex);
        }

        console.log("getDom() end");
        return wrapper;
    },

    // Helper function to interpolate color based on index value
    getColorForIndex: function(value) {
        if (value >= 75) {  // extreme greed
            return "rgb(0, 255, 0)"; // Green
        } else if (value >= 55) { // greed
            return "rgb(255, 255, 0)"; // Yellow
        } else if (value <= 25) {   // extreme fear
            return "rgb(255, 0, 0)"; // Red
        } else if (value <= 45) {       // fear
            return "rgb(255, 165, 0)"; // Orange
        } else {
            return "#999"; // Grey
        }
    },    

    socketNotificationReceived: function(notification, payload) {
        console.log("socketNotificationReceived '" + notification + "'");

        if (notification === "INDEX_DATA") {
            console.log("Received INDEX_DATA:", payload); // Confirm that this data is received
            this.fearAndGreedIndex = payload;
            this.updateDom();
        } else if (notification === "CRYPTO_INDEX_DATA") {
            console.log("Received CRYPTO_INDEX_DATA:", payload); // Confirm that this data is received
            this.cryptoFearAndGreedIndex = payload;
            this.updateDom();
        }
    },    
});
