// Compatability boilerplate:
window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction || {READ_WRITE: 'readwrite'};
window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

if(!window.indexedDB) {
    console.log('IndexedDB is not available.');
}

/*********************************************************************************/

const DB_VERSION = 1;

var people = [
    {
        id: 1,
        name: 'Alice A. Alvarez',
        favorite_color: 'blue',
        favorite_food: 'pasta'
    }, {
        id: 2,
        name: 'Bobrick B. Branson',
        favorite_color: 'chartreuse',
        favorite_food: 'calamari'
    }, {
        id: 3,
        name: 'Carlos C. Chang',
        favorite_color: 'burnt orange',
        favorite_food: 'bear claws'
    }
]

/*********************************************************************************/

/**
 * Open the database
 * @param {BigInteger}          version             The DB version to open
 * @callback                    cb                  Callback executed after DB initializes
 */
function initDb(version, cb) {
    var db;
    var request = window.indexedDB.open('ExampleDB', version);
    
    request.onerror = function(event) {
        console.error('Database error: ' + event.target.errorCode);

        cb(err);
    }
    
    request.onsuccess = function(event) {
        console.log('DB open');
    
        db = event.target.result;
    
        cb(db);
    }
    
    request.onupgradeneeded = function(event) {
        console.log('DB upgrading');
    
        db = event.target.result;
    
        var objectStore = db.createObjectStore('people', {keyPath: 'id'});
    
        objectStore.createIndex('name', 'name', {unique: false});
    
        people.forEach(function(person) {
            objectStore.add(person);
        });
    
        console.log('DB upgrade complete')
    }
}

/*********************************************************************************/

/**
 * Contruct an interace with which to interact with your IndexedDB
 * @param {IDBDatabase}                 db                  The Database to interact with
 * @callback                            onTableLoaded       Callback executed after table is loaded
 */
function constructDbModel(db, onTableLoaded) {
    var dbModel = {
        db: db,
        /**
         * Load all items from IndexedDB and display in HTML table
         */
        loadTable: function() {
            var objectStore = this.db.transaction(['people'], 'readonly').objectStore('people');
            var dbModel = this;
        
            var personTable = document.getElementById('people_holder');
            personTable.innerHTML = '';
        
            objectStore.openCursor().onsuccess = function(event) {
                var cursor = event.target.result;
                
                if(cursor) {
                    var personRow = document.createElement('tr');
                    personRow.setAttribute('id', 'row-' + cursor.value.id);
                    var personData = '';
                    for(field in cursor.value) {
                        if(field !== 'id') {
                            personData += '<td>' + 
                                            '<input class="hide" type="text" id="edit_' + cursor.value.id + '_' + field +'" value="' + cursor.value[field] + '" />' +
                                            '<p>' + cursor.value[field] + '</p>' +
                                        '</td>';
                        } else {
                            personData += '<td>' + cursor.value[field] + '</td>';
                        }
                    }
                    personData += '<td>' + 
                                    '<button class="edit_button" data-id="' + cursor.value.id + '">✎</button>' + 
                                    '<button class="hide confirm_button" id="confirm_button-' + cursor.value.id  + '" data-id="' + cursor.value.id + '">✓</button>' +
                                '</td>' +
                                '<td><button class="delete_button" data-id="' + cursor.value.id +  '">X</button></td>' ;
                    personRow.innerHTML = personData;
                    personTable.appendChild(personRow);
                    cursor.continue();
                } else {
                    console.log('Done loading people!');
                    onTableLoaded(dbModel);
                }
            }
        },

        /**
         * Add an item to IndexedDB
         * @param {Object}              datum               The values to add
         * @callback                    cb                  Callback executed after item is added (or on error) 
         */
        addToDb: function(datum, cb) {
            if(!datum.id || !datum.name || !datum.favorite_color || !datum.favorite_food) {
                return cb('Improperly formed datum.');
            }

            var objectStore = this.db.transaction(['people'], 'readwrite').objectStore('people');
            var request = objectStore.put(datum);

            request.onerror = function(event) {
                return cb(event.target.errorCode)
            }

            request.onsuccess = function() {
                cb();
            };
        },

        /**
         * Update an item in IndexedDB
         * @param {Number}              id                  The ID of the item to update
         * @param {Object}              updates             The new values to set for the item
         * @callback                    cb                  Callback executed after item is updated (or on error) 
         */
        updateDbItem: function(id, updates, cb) {
            if(!id || isNaN(parseInt(id)) || id < 0 || id > 9) {
                return cb('Invalid ID.');
            }
            if(!updates.id || !updates.name || !updates.favorite_color || !updates.favorite_food) {
                return cb('Invalid update object.');
            }

            var objectStore = this.db.transaction(['people'], 'readwrite').objectStore('people');

            objectStore.openCursor().onsuccess = function(event) {
                var cursor = event.target.result;
                if(cursor) {
                    if(cursor.value.id === id) {
                        var request = cursor.update(updates);

                        request.onerror = function(event) {
                            return cb(event.target.errorCode)
                        }

                        request.onsuccess = function() {
                            cb();
                        }
                    }
                    cursor.continue();
                } else {
                    console.log('Reached end of entries.');
                }
            }
        },

        /**
         * Delete an item in IndexedDB
         * @param {Number}              id                  The ID of the item to delete
         * @callback                    cb                  Callback executed after item is deleted (or on error) 
         */
        deleteFromDb: function(id, cb) {
            if(!id || isNaN(parseInt(id)) || id < 0 || id > 9) {
                return cb('Invalid ID.');
            } 

            var objectStore = this.db.transaction(['people'], 'readwrite').objectStore('people');
            
            objectStore.openCursor().onsuccess = function(event) {
                var cursor = event.target.result;
                if(cursor) {
                    if(cursor.value.id === id) {
                        var request = cursor.delete();

                        request.onerror = function(event) {
                            return cb(event.target.errorCode)
                        }
                        
                        request.onsuccess = function() {
                            cb();
                        };
                    }
                    cursor.continue();
                } else {
                    console.log('Reached end of entries.');
                }
            }
        }
    }

    return dbModel;
}


/*********************************************************************************/

/**
 * Listen for new entries
 * @param {dbModel}             dbModel             The DB model to act on
 */
var addAddEventListener = function(dbModel) {
    document.getElementById('new_person').addEventListener('submit', function(e) {
        e.preventDefault();
    
        var name = document.getElementById('idb_name').value;
        var color = document.getElementById('idb_color').value;
        var food = document.getElementById('idb_food').value;
        
        var newPerson = {
            id: Math.floor(Math.random() * 10),
            name: name,
            favorite_color: color,
            favorite_food: food
        }
    
        var messageEl = document.getElementById('message');
    
        dbModel.addToDb(newPerson, function(err) {
            if(err) {
                messageEl.classList.remove('success');
                messageEl.classList.add('error');
                messageEl.textContent = err;
            } else {
                dbModel.loadTable();
                messageEl.classList.remove('error');
                messageEl.classList.add('success');
                messageEl.textContent = 'Added ' + newPerson.name + ' to the party!'
            }
        })
    });
}

/**
 * Listen for deleting entries
 * @param {dbModel}             dbModel             The DB model to act on
 */
var addDeleteEventListener = function(dbModel) {
    document.querySelectorAll('.delete_button').forEach(function(button) {
        button.addEventListener('click', function() {
            var id = parseInt(this.dataset.id);

            var messageEl = document.getElementById('message');

            dbModel.deleteFromDb(id, function(err) {
                if(err) {
                    console.log(err)
                    messageEl.classList.remove('success');
                    messageEl.classList.add('error');
                    messageEl.textContent = err;
                } else {
                    dbModel.loadTable();
                    messageEl.classList.remove('error');
                    messageEl.classList.add('success');
                    messageEl.textContent = 'Deleted guest with id ' + id + '.';
                }
            });
        });
    })
}

/**
 * Listen for edits to existing entries
 * @param {dbModel}             dbModel             The DB model to act on
 */
var addEditEventListeners = function(dbModel) {
    document.querySelectorAll('.edit_button').forEach(function(button) {
        button.addEventListener('click', function() {
            this.classList.add('hide');

            var id = parseInt(this.dataset.id);

            document.getElementById('confirm_button-' + id).classList.remove('hide');
            
            var inputs = document.querySelectorAll('#row-' + id + ' input');
            var cells = document.querySelectorAll('#row-' + id + ' p');

            inputs.forEach(function(input) {
                input.classList.remove('hide');
            });

            cells.forEach(function(cell) {
                cell.classList.add('hide');
            })
        });
    });

    document.querySelectorAll('.confirm_button').forEach(function(button) {
        button.addEventListener('click', function() {
            var id = parseInt(this.dataset.id);

            var messageEl = document.getElementById('message');

            var name = document.getElementById('edit_' + id + '_name').value;
            var color = document.getElementById('edit_' + id + '_favorite_color').value;
            var food = document.getElementById('edit_' + id + '_favorite_food').value;

            var updates = {
                id: id,
                name: name,
                favorite_color: color,
                favorite_food: food
            }

            dbModel.updateDbItem(id, updates, function(err) {
                if(err) {
                    console.log(err)
                    messageEl.classList.remove('success');
                    messageEl.classList.add('error');
                    messageEl.textContent = err;
                } else {
                    dbModel.loadTable();
                    messageEl.classList.remove('error');
                    messageEl.classList.add('success');
                    messageEl.textContent = 'Updated guest with id ' + id + '.';
                }
            });
        })
    });
}

/*********************************************************************************/

window.onload = function() {
    initDb(DB_VERSION, function(db) {
        var dbModel = constructDbModel(db, function(dbModel) {
            addAddEventListener(dbModel);
            addDeleteEventListener(dbModel);
            addEditEventListeners(dbModel);
        });

        dbModel.loadTable();
    });
}