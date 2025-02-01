/**
 * @template {string} StorageNames
 */
export default class IndexedDB {
    /**
     * @param {string} name 
     * @param {StorageNames[]} storageNames 
     */
    constructor(name, storageNames) {
        this.name = name;
        this.storageNames = Array.from(new Set(storageNames));
        this.db = null;
    }

    /**
     * @private
     * @returns {Promise<IDBDatabase>} 
     */
    async _openDB() {
        if (this.db) return this.db; // Lấy từ cache

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.name, 1);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                for (const storeName of this.storageNames) {
                    if (!db.objectStoreNames.contains(storeName)) {
                        db.createObjectStore(storeName);
                    }
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onerror = (event) => reject(event.target.error);
        });
    }

    /**
     * Đóng kết nối đến database.
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    /**
     * Xóa database.
     * @returns {Promise<void>}
     */
    async destroy() {
        this.close(); // Đảm bảo kết nối hiện tại đã đóng
        return new Promise((resolve, reject) => {
            const deleteRequest = indexedDB.deleteDatabase(this.name);

            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = (event) => reject(event.target.error);
            deleteRequest.onblocked = () => reject(new Error('Delete blocked database.'));
        });
    }

    /**
     * Lưu dữ liệu vào một object store.
     * @param {StorageNames} objStoreName - Tên object store.
     * @param {string} key - Khóa để lưu trữ dữ liệu.
     * @param {any} data - Dữ liệu cần lưu.
     * @returns {Promise<void>}
     */
    async set(objStoreName, key, data) {
        try {
            const db = await this._openDB();
            const transaction = db.transaction([objStoreName], 'readwrite');
            const store = transaction.objectStore(objStoreName);
            store.put(data, key);

            return new Promise((resolve, reject) => {
                transaction.oncomplete = resolve;
                transaction.onerror = () => reject(transaction.error);
            });
        } catch (error) {
            throw new Error(`Error when saving data to IndexedDB: ${error.message}`);
        }
    }

    /**
     * Lấy dữ liệu từ một object store.
     * @param {StorageNames} objStoreName - Tên object store.
     * @param {string} key - Khóa của dữ liệu cần lấy.
     * @returns {Promise<any>} - Dữ liệu từ IndexedDB.
     */
    async get(objStoreName, key) {
        try {
            const db = await this._openDB();
            const transaction = db.transaction([objStoreName], 'readonly');
            const store = transaction.objectStore(objStoreName);

            return new Promise((resolve, reject) => {
                const dataRequest = store.get(key);
                dataRequest.onsuccess = () => resolve(dataRequest.result);
                dataRequest.onerror = () => reject(dataRequest.error);
            });
        } catch (error) {
            throw new Error(`Error while retrieving data from IndexedDB: ${error.message}`);
        }
    }

    /**
     * Xóa một mục trong object store.
     * @param {StorageNames} objStoreName - Tên object store.
     * @param {string} key - Khóa của dữ liệu cần xóa.
     * @returns {Promise<void>}
     */
    async delete(objStoreName, key) {
        try {
            const db = await this._openDB();
            const transaction = db.transaction([objStoreName], 'readwrite');
            const store = transaction.objectStore(objStoreName);
            store.delete(key);

            return new Promise((resolve, reject) => {
                transaction.oncomplete = resolve;
                transaction.onerror = () => reject(transaction.error);
            });
        } catch (error) {
            throw new Error(`Error while deleting data from IndexedDB: ${error.message}`);
        }
    }
}
