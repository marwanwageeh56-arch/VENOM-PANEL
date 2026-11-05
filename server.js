const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'keys.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function loadKeys() {
    if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([]));
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function saveKeys(keys) {
    fs.writeFileSync(DB_FILE, JSON.stringify(keys, null, 2));
}

app.post('/api/login', (req, res) => {
    const { key } = req.body;
    const keys = loadKeys();
    const item = keys.find(k => k.code.trim().toUpperCase() === key.trim().toUpperCase());

    if (!item) return res.json({ success: false, msg: 'المفتاح غير موجود!' });
    if (!item.active) return res.json({ success: false, msg: 'تم إيقاف هذا المفتاح!' });

    const now = Date.now();
    if (!item.usedAt) {
        item.usedAt = now;
        item.expiresAt = now + (item.days * 24 * 60 * 60 * 1000);
        saveKeys(keys);
    }

    if (now > item.expiresAt) {
        return res.json({ success: false, msg: 'انتهت صلاحية هذا المفتاح!' });
    }

    const remainingDays = Math.ceil((item.expiresAt - now) / (1000 * 60 * 60 * 24));
    res.json({ success: true, key: item.code, remainingDays });
});

app.get('/api/admin/keys', (req, res) => {
    res.json(loadKeys());
});

app.post('/api/admin/create', (req, res) => {
    const days = parseInt(req.body.days) || 30;
    const rand = () => Math.random().toString(36).substring(2, 6).toUpperCase();
    const newKey = {
        code: `XREG-${rand()}-${rand()}`,
        days: days,
        active: true,
        usedAt: null,
        expiresAt: null
    };
    const keys = loadKeys();
    keys.push(newKey);
    saveKeys(keys);
    res.json({ success: true, key: newKey });
});

app.listen(PORT, () => {
    console.log(`Server running: http://localhost:${PORT}`);
});