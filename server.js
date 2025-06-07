const express = require('express');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const bodyParser = require('body-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(bodyParser.json());

const CSV_PATH = path.join(__dirname, 'data/participants.csv');

// 🔄 Load CSV as array of objects
function loadParticipants() {
  return new Promise((resolve) => {
    const results = [];
    fs.createReadStream(CSV_PATH)
      .pipe(csv({ mapHeaders: ({ header }) => header.trim() }))
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results));
  });
}

// 💾 Write updated array back to CSV
async function saveParticipants(participants) {
  const csvWriter = createCsvWriter({
    path: CSV_PATH,
    header: Object.keys(participants[0]).map(h => ({ id: h, title: h }))
  });
  await csvWriter.writeRecords(participants);
}

// ✅ Update participant's check-in status
app.post('/checkin', async (req, res) => {
  const { firstName, lastName, checkedIn } = req.body;
  const participants = await loadParticipants();

  // Optional: Debug log missing name rows
  participants.forEach((p, i) => {
    if (!p['First Name'] || !p['Last Name']) {
      console.log(`⚠️ Missing name at row ${i + 2}:`, p);
    }
  });

  const updated = participants.map(p => {
    const pFirst = (p['First Name'] || '').trim().toLowerCase();
    const pLast = (p['Last Name'] || '').trim().toLowerCase();
    const reqFirst = (firstName || '').trim().toLowerCase();
    const reqLast = (lastName || '').trim().toLowerCase();

    if (pFirst === reqFirst && pLast === reqLast) {
      console.log(`✅ Checked in: ${p['First Name']} ${p['Last Name']}`);
      return { ...p, checkin: checkedIn ? 'checked-in' : '' };
    }
    return p;
  });

  await saveParticipants(updated);
  res.json({ success: true });
});

// 📋 Serve current participant list as JSON
app.get('/participants', async (req, res) => {
  const participants = await loadParticipants();
  res.json(participants);
});

// 📥 Allow download of the current CSV
app.get('/download', (req, res) => {
  const filePath = path.join(__dirname, 'data/participants.csv');
  res.download(filePath, 'MSC-Checkin.csv', (err) => {
    if (err) {
      console.error("Download error:", err);
      res.status(500).send("Unable to download the file.");
    }
  });
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
