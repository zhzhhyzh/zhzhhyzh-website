const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());

// // Routes
// app.get('/', (req, res) => {
//   fs.readFile(path.join(__dirname, 'index.html'), 'utf8', (err, html) => {
//     if (err) {
//       return res.status(500).send('Error loading page');
//     }
//     fs.readFile(path.join(__dirname, 'style.css'), 'utf8', (err, css) => {
//       if (err) {
//         return res.status(500).send('Error loading CSS');
//       }
//       fs.readFile(path.join(__dirname, 'script.js'), 'utf8', (err, js) => {
//         if (err) {
//           return res.status(500).send('Error loading JS');
//         }
//         // Replace the link and script tags with inline
//         let modifiedHtml = html.replace('<link rel="stylesheet" href="style.css" />', `<style>${css}</style>`);
//         modifiedHtml = modifiedHtml.replace('<script defer src="script.js"></script>', `<script>${js}</script>`);
//         res.send(modifiedHtml);
//       });
//     });
//   });
// });

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

// Endpoint to authenticate
app.post('/auth', (req, res) => {
  const { password } = req.body;
  if (password === process.env.PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Incorrect password' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});