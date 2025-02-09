const NodeHelper = require("node_helper");

// https://github.com/node-fetch/node-fetch/discussions/1579
const fetch = (url, init) => import('node-fetch').then(module => module.default(url, init));
const tls = require('tls');
const fs = require("fs");
const path = require("path");

// const debug = function(s) { };
const debug = function(s) { console.log("[MMM-FearAndGreedIndex-dv] DEBUG " + s); };
const log = function(s, data) { 
    if (data !== undefined) {
        console.log("[MMM-FearAndGreedIndex-dv] " + s, data);
    } 
    else {
        console.log("[MMM-FearAndGreedIndex-dv] " + s); 
    }
};
const logError = function(s, data) { 
    if (data !== undefined) {
        console.error("[MMM-FearAndGreedIndex-dv] ERROR " + s, data);
    } 
    else {
         console.error("[MMM-FearAndGreedIndex-dv] ERROR " + s); 
    }
};

module.exports = NodeHelper.create({
    start() {
        log("node_helper started...");

        debug("fetch " + typeof(fetch));
        debug(JSON.stringify(fetch));

        this.scheduleUpdate();
        this.scheduleCryptoUpdate();
    },
    
    async socketNotificationReceived(notification, payload) {
        debug("socketNotificationReceived " + JSON.stringify(notification));
        debug("socketNotificationReceived " + JSON.stringify(payload));

        if (notification === "CONFIG") {
            this.config = payload;
            log("Configuration received.", this.config);

            if (!this.config.updateInterval) {
                logError("updateInterval not set");
            }
            this.scheduleUpdate(); // Update traditional index
            this.scheduleCryptoUpdate(); // Update crypto index
        }
    },

    scheduleUpdate: function() {
        var self = this;

        if (!this.config) { return; }

        var self = this;
        self.fetchFearAndGreed();
        setInterval(function() {
            self.fetchFearAndGreed();
        }, this.config.updateInterval);
    },
    
    scheduleCryptoUpdate: function() {

        if (!this.config) { return; }

        var self = this;
        self.fetchCryptoIndex();
        setInterval(function() {
            self.fetchCryptoIndex();
        }, this.config.updateInterval);
    },
    
    fetchFearAndGreed: function() {
        var self = this;

        debug("fetchFearAndGreed()");

        const filename = path.resolve(__dirname, "graphdata.json");

        if (fs.existsSync(filename)) {

            debug("fetchFearAndGreed() graphdata.json exists");

            const stats = fs.statSync(filename);
            const seconds = (new Date().getTime() - stats.mtime);

            if (seconds < this.config.updateInterval) {
                fs.readFile(filename, (err, data) => {
                    if (err) {
                        logError("reading data.json:", err);
                        return;
                    }
                    debug("Sending INDEX_DATA:");
                    debug(data);
                    this.sendSocketNotification("INDEX_DATA", JSON.parse(data));
                });
            }
        }

        debug("Attempting to fetch fear-and-greed data.");
        var url = "https://production.dataviz.cnn.io/index/fearandgreed/graphdata";

        tls.DEFAULT_MIN_VERSION = 'TLSv1.3';
        tls.DEFAULT_CIPHERS = 'TLS_AES_256_GCM_SHA384';

        debug("tls set");

        var headers = Object.assign({
            'Host': 'production.dataviz.cnn.io',
        }, this.config.fearandgreedHeaders);

        // avoid "I'm a teapot. You're a bot."
        fetch(url, { headers: headers })
            .then(response =>  response.json())
            .then(data => {
                debug("graphdata is " + typeof(data));

                if (data) {
                    debug("Sending INDEX_DATA:");
                    debug(Object.keys(data));
                    self.sendSocketNotification("INDEX_DATA", data);
                    fs.writeFile(filename, JSON.stringify(data), (err) => {
                        if (err) {
                            logError('writing file ' + filename);
                            logError(err.message);
                        }
                    });
                } else {
                    logError("Unexpected fear-and-greed data format:", data);
                }
            })
            .catch(error => {
                logError("Error fetching fear-and-greed data: ", error);
            });
    },

    fetchCryptoIndex: function() {
        var self = this;

        debug("fetchCryptoIndex()");

        const filename = path.resolve(__dirname, "crypto.json");

        if (fs.existsSync(filename)) {

            debug("fetchCryptoIndex() crypto.json exists");

            const stats = fs.statSync(filename);
            const seconds = (new Date().getTime() - stats.mtime);

            if (seconds < this.config.updateInterval) {
                fs.readFile(filename, (err, data) => {
                    if (err) {
                        logError("Error reading data.json:", err);
                        return;
                    }
                    debug("Sending CRYPTO_INDEX_DATA:");
                    debug(data);
                    this.sendSocketNotification("CRYPTO_INDEX_DATA", JSON.parse(data));
                });
            }
        }

        debug("Attempting to fetch crypto index data.");
        var url = "https://api.alternative.me/fng/";

        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data && data.data && data.data.length > 0) {
                    var indexData = data.data[0];
                    debug("Sending CRYPTO_INDEX_DATA:");
                    debug(indexData);
                    self.sendSocketNotification("CRYPTO_INDEX_DATA", indexData);

                    fs.writeFile(filename, JSON.stringify(indexData), (err) => {
                        if (err) {
                            logError('error writing file ' + filename);
                            logError(err.message);
                        }
                    });
                } else {
                    logError("Unexpected crypto index data format:", data);
                }
            })
            .catch(error => {
                logError("Error fetching crypto index:", error);
            });
    },
});
