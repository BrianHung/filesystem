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

function searchStore(store, query) {
    // Define the database transaction.
    let tx = database.transaction(store, 'readonly')
    // Get store from transaction.
    let st = tx.objectStore(store)
    let cr = st.openCursor()

    let results = []
    cr.onsuccess = function(event) {
        let cursor = event.target.result
        if (cursor) {
            if (cursor.value.name.includes(query)) {
                results.push(cursor.value)
            }
            cursor.continue()
        }
    }
    return results
}

/* =============================================================================
 * Utilities for rendering FileTree.
 * =============================================================================
 */

function drawFileTree(treeList, result)  {
    treeList.innerHTML = ""
    for(let item of result) {
        let temp = document.createElement("div")
        if (item.isFile) {
            temp.innerHTML = `<li class="tree-item" data-id="${item.id}" draggable="true"><img class="tree-file"><span>${item.name}</span></li>`
        } else {
            temp.innerHTML = `<li class="tree-item" data-id="${item.id}" draggable="true"><img class="tree-fold"><span>${item.name}</span><ul class="tree-list" data-id="${item.id}"></ul></li>`
        }
        treeList.appendChild(temp.firstChild)
    }
}

function drawTreeList(treeId) {
    let treeList = document.querySelector(`.tree-list[data-id="${treeId}"]`)
    let treeItems= obtainIndex("local", "parents").getAll(`${treeId}`)
    treeItems.onsuccess = function() {
        drawFileTree(treeList, treeItems.result)
    }
}

async function search(query) {
    let treeList = document.querySelector(`.tree-find`)
    let store = await obtainAllFiles("local")
    store.onsuccess = function() {
        console.log(store.result)
        let fuse = new Fuse(store.result, {
            caseSensitive: false,
            shouldSort: true,
            threshold: 0.1,
            keys: ["name", "text"]
        })

        let items= fuse.search(query)
        console.log(items)
        drawFileTree(treeList, items)
    }
}

/**
 * Updates the parents for a given fileId.
 * @param fileId      fileId of folder to update
 * @param oldParentId fileId of parent to remove
 * @param newParentId fileId of parent to append
 */
async function updateParent(fileId, oldParentId, newParentId) {
    let file = obtainFile("local", fileId)
    file.onsuccess = function() {
        file = file.result
        Object.assign(file, {parents: file.parents.map(x => x == oldParentId ? newParentId : x)})
        drawTreeList(oldParentId)
        drawTreeList(newParentId)
    }
}

/* =============================================================================
 * Drag-and-Drop
 * =============================================================================
 */

function handleDrop(event) {
    event.stopPropagation()
    event.preventDefault()

    if (dragImage) {
        document.body.removeChild(dragImage)
    }
    console.log(dragTarget)

    if (dragTarget) {

        dragTarget = ""
    } else {
        let items  = event.dataTransfer.items;
        console.log(event.target)
        let uploads= []
        for (var i = 0, item; item = items[i]; i++) {
            item   = item.webkitGetAsEntry()
            uploads.push(uploadLocal(item))
        }
        // Render tree list when all first-level files have finished uploading.
        Promise.all(uploads).then(function() {
            console.log("Tree refreshed.")
            drawTreeList("")
        })
    }
}


async function uploadLocal(item, parents=[""]) {
    console.log(item)
    if (item.isFile) {
        item.file(async function(file) {
        console.log(file)
        let meta = createMeta(item.name, undefined, item.isFile, file, parents)
        if (file.type.includes("text")) {
            let text = await file.text()
            Object.assign(meta, {text: text, lastModified: file.lastModified})
        }
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

    // console.log("dragover")
    event.dataTransfer.dropEffect = 'copy';
}

function handleDragEnter(event) {
    event.stopPropagation();
    event.preventDefault();
    let target = event.target.closest(".tree-item")
    console.log(event.target, target, target.querySelector(".tree-list"))
    if (target && target != dragTarget && target.querySelector(".tree-list")) {
        console.log("dragenter")
        target.classList.toggle("droparea", true)
    }
}

function handleDragLeave(event) {
    event.stopPropagation();
    event.preventDefault();
    let target = event.target.closest(".tree-item")
    if (target && target != dragTarget && target.querySelector(".tree-list")) {
        console.log("dragleave")
        target.classList.toggle("droparea",!true)
    }
}

var dragImage, dragTarget
function handleDragStart(event) {
    console.log("dragstart")
    dragTarget= event.target
    dragImage = event.target.cloneNode(true)

    let treeList = dragImage.querySelector(".tree-list")
    if (treeList) {
        dragImage.removeChild(treeList)
    }
    Object.assign(dragImage.style, { backgroundColor: "transparent", paddingLeft: "1em",
        width: "fit-content", position: "absolute", top: "-200px",
    })
    document.body.appendChild(dragImage)
    console.log(event.dataTransfer)
    event.dataTransfer.setDragImage(dragImage, 0, 0);
}

// Setup the dnd listeners.
var droparea = document.body
droparea.addEventListener('dragstart', handleDragStart, false);
droparea.addEventListener('dragenter', handleDragEnter, false);
droparea.addEventListener('dragleave', handleDragLeave, false);
droparea.addEventListener('dragover' , handleDragOver , false);
droparea.addEventListener('drop'     , handleDrop     , false);
