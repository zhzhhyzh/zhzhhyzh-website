const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

// Routes
app.get('/pnc', (req, res) => {
  res.sendFile(path.join(__dirname, 'pnc.html'));
});

// Serve static files from the root directory
app.use(express.static('.'));

// Ensure the directory exists
const csvDir = path.join(__dirname, 'assets', 'pnc');
if (!fs.existsSync(csvDir)) {
  fs.mkdirSync(csvDir, { recursive: true });
}

const csvFile = path.join(csvDir, 'index.csv');

// Initialize CSV if it doesn't exist
if (!fs.existsSync(csvFile)) {
  fs.writeFileSync(csvFile, 'IP,Region,DateTime,LongLat\n');
}

// Endpoint to capture visitor data
app.post('/capture', (req, res) => {
  const { ip, region, dateTime, tempLongLat } = req.body;
  if (!ip || !region || !dateTime || !tempLongLat) {
    return res.status(400).json({ error: 'Missing data' });
  }

  const currentDate = dateTime.split('T')[0];

  // Read the CSV to check for duplicates in the same day
  fs.readFile(csvFile, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading CSV:', err);
      return res.status(500).json({ error: 'Failed to read data' });
    }

    const lines = data.trim().split('\n');
    let duplicateFound = false;
    for (let i = 1; i < lines.length; i++) { // Skip header
      const parts = lines[i].split(',');
      const existingIp = parts[0];
      const existingDateTime = parts[2];
      const existingDate = existingDateTime.split('T')[0];

      if (existingIp === ip && existingDate === currentDate) {
        duplicateFound = true;
        break;
      }
    }

    if (duplicateFound) {
      // Same IP and same day, skip saving
      return res.json({ success: true, message: 'Data already exists for today' });
    }

    // Append new data
    const line = `${ip},${region},${dateTime},${tempLongLat}\n`;
    fs.appendFile(csvFile, line, (appendErr) => {
      if (appendErr) {
        console.error('Error writing to CSV:', appendErr);
        return res.status(500).json({ error: 'Failed to save data' });
      }
      res.json({ success: true });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});