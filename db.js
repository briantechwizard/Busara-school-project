let db;
let config = { locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}` };

async function initDB() {
    const SQL = await initSqlJs(config);
    db = new SQL.Database();
    
    // Create tables
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            phone TEXT,
            role TEXT,
            student_id TEXT,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            class TEXT NOT NULL,
            age INTEGER,
            gender TEXT,
            assessment_number TEXT UNIQUE NOT NULL,
            date_added DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    
    // Load existing data from IndexedDB
    await loadDBFromStorage();
}

async function loadDBFromStorage() {
    try {
        const data = await getFromStorage('busara_db');
        if (data) {
            const uInt8Array = new Uint8Array(data);
            db = new SQL.Database(uInt8Array);
        }
    } catch (e) {
        console.log('No existing database found');
    }
}

async function saveDBToStorage() {
    const data = db.export();
    await saveToStorage('busara_db', data);
}

// Storage helpers
async function saveToStorage(key, data) {
    const request = indexedDB.open('BusaraDB', 1);
    return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['store'], 'readwrite');
            const store = transaction.objectStore('store');
            store.put(data, key);
            transaction.oncomplete = () => resolve();
        };
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            db.createObjectStore('store');
        };
    });
}

async function getFromStorage(key) {
    const request = indexedDB.open('BusaraDB', 1);
    return new Promise((resolve, reject) => {
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(['store'], 'readonly');
            const store = transaction.objectStore('store');
            const getRequest = store.get(key);
            getRequest.onsuccess = () => resolve(getRequest.result);
        };
    });
}

// User operations
async function registerUser(userData) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO users (name, email, phone, role, student_id, password) VALUES (?, ?, ?, ?, ?, ?)`,
            [userData.name, userData.email, userData.phone, userData.role, userData.student_id, userData.password],
            function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID });
            }
        );
    });
}

async function loginUser(email, password) {
    return new Promise((resolve, reject) => {
        db.get(
            `SELECT * FROM users WHERE email = ? AND password = ?`,
            [email, password],
            (err, row) => {
                if (err) reject(err);
                else resolve(row);
            }
        );
    });
}

// Student operations
async function addStudent(studentData) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO students (name, class, age, gender, assessment_number) VALUES (?, ?, ?, ?, ?)`,
            [studentData.name, studentData.class, studentData.age, studentData.gender, studentData.assessment_number],
            function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID });
            }
        );
    });
}

async function getStudents(searchTerm = '') {
    return new Promise((resolve, reject) => {
        const query = searchTerm 
            ? `SELECT * FROM students WHERE name LIKE ? ORDER BY name` 
            : `SELECT * FROM students ORDER BY name`;
        const params = searchTerm ? [`%${searchTerm}%`] : [];
        
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function saveDatabase() {
    saveDBToStorage();
}
