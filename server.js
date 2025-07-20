const express = require('express');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const bodyParser = require('body-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const XLSX = require('xlsx');

const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(bodyParser.json());

const CSV_PATH = path.join(__dirname, 'data/participants3_cleaned.csv');

// 🔄 Load CSV as array of objects
function loadParticipants() {
  return new Promise((resolve) => {
    const results = [];
    fs.createReadStream(CSV_PATH)
      .pipe(csv({ mapHeaders: ({ header }) => header.trim() }))
      .on('data', (data) => {
        // Transform the data to match our application's needs
        const transformed = {
          'Family ID': data['Family ID'] || '',
          'First Name': data['Participants.name.first'] || '',
          'Last Name': data['Participants.name.last'] || '',
          'Contact First Name': data['ContactName.first'] || '',
          'Contact Last Name': data['ContactName.last'] || '',
          'Email': data['Email'] || '',
          'Center': data['Center'] || '',
          'City': data['City'] || '',
          'Category': data['Category'] || '',
          'Gender': data['Participants.gender'] || '',
          'PAID': data['PAID'] || '',
          'Decided': data['Decided'] || '',
          'checkin': data['checkin'] || '' // Preserve check-in status if it exists
        };
        results.push(transformed);
      })
      .on('end', () => resolve(results));
  });
}

// 💾 Write updated array back to CSV
async function saveParticipants(participants) {
  const csvWriter = createCsvWriter({
    path: CSV_PATH,
    header: [
      { id: 'Family ID', title: 'Family ID' },
      { id: 'ContactName.last', title: 'ContactName.last' },
      { id: 'ContactName.first', title: 'ContactName.first' },
      { id: 'Email', title: 'Email' },
      { id: 'Center', title: 'Center' },
      { id: 'City', title: 'City' },
      { id: 'Participants.name.last', title: 'Participants.name.last' },
      { id: 'Participants.name.first', title: 'Participants.name.first' },
      { id: 'Participants.gender', title: 'Participants.gender' },
      { id: 'Category', title: 'Category' },
      { id: 'PAID', title: 'PAID' },
      { id: 'Decided', title: 'Decided' },
      { id: 'checkin', title: 'checkin' }
    ]
  });

  // Transform back to original format
  const transformed = participants.map(p => ({
    'Family ID': p['Family ID'],
    'ContactName.last': p['Contact Last Name'],
    'ContactName.first': p['Contact First Name'],
    'Email': p['Email'],
    'Center': p['Center'],
    'City': p['City'],
    'Participants.name.last': p['Last Name'],
    'Participants.name.first': p['First Name'],
    'Participants.gender': p['Gender'],
    'Category': p['Category'],
    'PAID': p['PAID'],
    'Decided': p['Decided'],
    'checkin': p['checkin']
  }));

  await csvWriter.writeRecords(transformed);
}

// ✅ Update participant's check-in status
app.post('/checkin', async (req, res) => {
  const { firstName, lastName, checkedIn } = req.body;
  const participants = await loadParticipants();

  const updated = participants.map(p => {
    const pFirst = (p['First Name'] || '').trim().toLowerCase();
    const pLast = (p['Last Name'] || '').trim().toLowerCase();
    const reqFirst = (firstName || '').trim().toLowerCase();
    const reqLast = (lastName || '').trim().toLowerCase();

    if (pFirst === reqFirst && pLast === reqLast) {
      const status = checkedIn ? 'Checked In' : 'Checked Out';
      const emoji = checkedIn ? '✅' : '❌';
      console.log(`${emoji} ${status}: ${p['First Name']} ${p['Last Name']}`);
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
app.get('/download', async (req, res) => {
    const format = req.query.format || 'csv';
    const participants = await loadParticipants();
  
    if (format === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(participants);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Participants');
  
      const filePath = path.join(__dirname, 'data/MSC-Checkin.xlsx');
      XLSX.writeFile(workbook, filePath);
  
      return res.download(filePath, 'MSC-Checkin.xlsx', err => {
        if (err) {
          console.error('XLSX download error:', err);
          res.status(500).send('Unable to download XLSX.');
        }
      });
    } else {
      // Create a user-friendly CSV with the transformed data
      const csvWriter = createCsvWriter({
        path: path.join(__dirname, 'data/MSC-Checkin-Export.csv'),
        header: [
          { id: 'Family ID', title: 'Family ID' },
          { id: 'Contact First Name', title: 'Contact First Name' },
          { id: 'Contact Last Name', title: 'Contact Last Name' },
          { id: 'Email', title: 'Email' },
          { id: 'Center', title: 'Center' },
          { id: 'City', title: 'City' },
          { id: 'First Name', title: 'First Name' },
          { id: 'Last Name', title: 'Last Name' },
          { id: 'Gender', title: 'Gender' },
          { id: 'Category', title: 'Category' },
          { id: 'PAID', title: 'PAID' },
          { id: 'Decided', title: 'Decided' },
          { id: 'checkin', title: 'Check-in Status' }
        ]
      });

      await csvWriter.writeRecords(participants);
      
      const filePath = path.join(__dirname, 'data/MSC-Checkin-Export.csv');
      return res.download(filePath, 'MSC-Checkin.csv', err => {
        if (err) {
          console.error('CSV download error:', err);
          res.status(500).send('Unable to download CSV.');
        }
      });
    }
  });

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
