
let db;

// create an indexedDB database
const request = indexedDB.open("budget", 1);

// when db is updated to a new version create a object store called pending with keypath to log offline transactions
request.onupgradeneeded = function(event) {
    const db = event.target.result;
    let objectStore = db.createObjectStore("pending", { keyPath: "id", autoIncrement: true });
};

// if request is successful, save result to db variable and check if there is internet connection. If there is run checkDatabase function
request.onsuccess = function(event) {
    db = event.target.result;
    if (navigator.onLine) {
        checkDatabase();
    }
};

// if there was an error with the request, log the error
request.onerror = function(event) {
    console.log("There was an error: ", event.target.errorCode);
};

//save data to pending if no internet detected
function saveRecord(record) {
    // open a transaction and access pending object store
    const transaction = db.transaction(["pending"], "readwrite");
    const pendingStore = transaction.objectStore("pending");

    // add a record to indexDB
    pendingStore.add(record);
};

// called when internet connection is detected
function checkDatabase() {

    // open a transaction and access pending object store
    const transaction = db.transaction(["pending"], "readwrite");
    const pendingStore = transaction.objectStore("pending");

    // get all records from store
    const records = pendingStore.getAll();

    // if at least one record exists in pending store, post it to our mongodb database
    records.onsuccess = function() {
        if (records.result.length > 0) {
            fetch("/api/transaction/bulk", {
                method: "POST",
                body: JSON.stringify(records.result),
                headers: {
                    Accept: "application/json, text/plain, */*",
                    "Content-Type": "application/json"
                }
            })
            .then(response => response.json())
            .then(() => {
                // when successfully posted to mongoDB database, open a transaction and clear records from pending object store
                const transaction = db.transaction(["pending"], "readwrite");
                const pendingStore = transaction.objectStore("pending");
                pendingStore.clear();
            })
        }
    }
};

// listen when internet is back online
window.addEventListener("online", checkDatabase);