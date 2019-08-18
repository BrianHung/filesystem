/* =============================================================================
 * Utilities
 * =============================================================================
 */

function getRandomString(length=28) {
    var charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    var values  = new Uint32Array(length)
    window.crypto.getRandomValues(values)
    var result  = ""
    for (i = 0; i < length; i++) {
        result += charset[values[i] % charset.length]
    }
    return result
}

function createMeta(name, id=getRandomString(), isFile=true, file="", parents="") {
    return {name: name, id: id, isFile: isFile, file: file, parents: parents}
}

/* =============================================================================
 * IndexedDB
 * =============================================================================
 */

var database

// Check for indexedDB support.
if (!('indexedDB' in window)) {
   console.log('This browser doesn\'t support indexedDB.')
}

var databaseRequest = indexedDB.open('files', 1.0)
databaseRequest.onupgradeneeded = function(event) {
   database = event.target.result;
   console.log('Creating a new indexedDB instance.');
   if (!database.objectStoreNames.contains('local')) {
        let local = database.createObjectStore('local', {autoIncrement:false})
        local.createIndex('name',    'name',    {unique: false, multiEntry:false})
        local.createIndex('parents', 'parents', {unique: false, multiEntry: true})
   }
}

databaseRequest.onerror   = function(event) {
   console.log("Error establishing a local indexedDB instance.")
}
databaseRequest.onsuccess = function(event) {
   database = event.target.result;
   drawTreeList("")
}

/**
 * Creates a file with meta inside of store.
 * @param store
 * @param store
 */
function createFile(store, meta, file) {
    // Define the database transaction.
    let tx = database.transaction(store, 'readwrite')
    // Get store from transaction.
    let st = tx.objectStore(store)
    st.add(file, meta)
    console.log(`Item created in ${store}.`)
    return tx.complete
}

/**
 * Obtains a file with meta inside of store.
 * @param store
 * @param store
 */
function obtainFile(store, meta) {
    // Define the database transaction.
    let tx = database.transaction(store, 'readwrite')
    // Get store from transaction.
    let st = tx.objectStore(store)
    console.log(`Item obtaind in ${store}.`);
    return st.get(meta)
}

/**
 * Obtains a file with meta inside of store.
 * @param store
 * @param store
 */
function updateFile(store, meta, file) {
    // Define the database transaction.
    let tx = database.transaction(store, 'readwrite')
    // Get store from transaction.
    let st = tx.objectStore(store)
    st.put(file, meta)
    console.log(`Item updated in ${store}.`);
    return tx.complete
}

/**
 * Creates a file with meta inside of store.
 * @param store
 * @param store
 */
function deleteFile(store, meta) {
    // Define the database transaction.
    let tx = database.transaction(store, 'readwrite')
    // Get store from transaction.
    let st = tx.objectStore(store)
    st.delete( meta)
    console.log(`Item deleted in ${store}.`);
    return tx.complete
}

/**
 * Obtains a file with meta inside of store.
 * @param store
 * @param store
 */
function obtainAllFiles(store) {
    // Define the database transaction.
    let tx = database.transaction(store, 'readwrite')
    // Get store from transaction.
    let st = tx.objectStore(store)
    console.log(`Item obtaind in ${store}.`);
    return st.getAll()
}

function obtainIndex(store, index)  {
    // Define the database transaction.
    let tx = database.transaction(store, 'readonly')
    // Get store from transaction.
    let st = tx.objectStore(store)
    console.log(`Item obtaind in ${store}.`);
    return st.index(index)
}



function drawTreeList(treeId) {
    let treeList = document.querySelector(`.tree-list[data-id="${treeId}"]`)
    treeList.innerHTML = ""

    let treeItems= obtainIndex("local", "parents").getAll(`${treeId}`)
    treeItems.onsuccess = function() {
        for(let item of treeItems.result) {
            let temp = document.createElement("div")
            if (item.isFile) {
                temp.innerHTML = `<li class="tree-item" data-id="${item.id}"><img class="tree-file"><span>${item.name}</span></li>`
            } else {
                temp.innerHTML = `<li class="tree-item" data-id="${item.id}"><img class="tree-fold"><span>${item.name}</span><ul class="tree-list" data-id="${item.id}"></ul></li>`
            }
            treeList.appendChild(temp.firstChild)
        }
    }
}

/* =============================================================================
 * Drag-and-Drop
 * =============================================================================
 */

function handleDrop(event) {
    event.stopPropagation()
    event.preventDefault()
    var items  = event.dataTransfer.items;
    for (var i = 0, item; item = items[i]; i++) {
        item   = item.webkitGetAsEntry()
        uploadLocal(item)
    }
    drawTreeList("")
}


async function uploadLocal(item, parents="") {
    if (item.isFile) {
        item.file(function(file) {
        let meta = createMeta(item.name, undefined, item.isFile, file, parents)
        updateFile("local", meta.id, meta)
        })
    } else {

        let meta = createMeta(item.name, undefined, item.isFile, undefined, parents)
        updateFile("local", meta.id, meta)

        var folder = item.createReader()
        readEntries()

        async function readEntries() { folder.readEntries(function(files) {
            if (files.length > 0) { for (var i = 0, file; file = files[i]; i++) {
                uploadLocal(file, [meta.id])
            } readEntries() }
        })}
    }
}


function handleDragOver(event) {
    event.stopPropagation();
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
}

// Setup the dnd listeners.
var droparea = document.body
droparea.addEventListener('dragover', handleDragOver, false);
droparea.addEventListener('drop',     handleDrop,     false);
