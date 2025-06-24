const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(bodyParser.json());

// ✅ Check-in route (update participant status)
app.post('/checkin', async (req, res) => {
  const { firstName, lastName, checkedIn } = req.body;

  const { data, error } = await supabase
    .from('participants')
    .update({ checkin: checkedIn ? 'checked-in' : '' })
    .match({ first_name: firstName, last_name: lastName });

  if (error) {
    console.error('Check-in error:', error);
    return res.status(500).json({ error });
  }

  const status = checkedIn ? 'Checked In' : 'Checked Out';
  const emoji = checkedIn ? '✅' : '❌';
  console.log(`${emoji} ${status}: ${firstName} ${lastName}`);

  res.json({ success: true });
});

// 🔍 Search participants
app.post('/search', async (req, res) => {
  const { familyID, firstName, lastName } = req.body;
  let familyIdResult = null;

  if (familyID) {
    familyIdResult = familyID;
  } else if (firstName && lastName) {
    const { data, error } = await supabase
      .from('participants')
      .select('family_id')
      .eq('first_name', firstName)
      .eq('last_name', lastName)
      .maybeSingle();

    if (data) familyIdResult = data.family_id;
  }

  if (!familyIdResult) return res.json({ members: [] });

  const { data: members, error } = await supabase
    .from('participants')
    .select('*')
    .eq('family_id', familyIdResult);

  res.json({ familyID: familyIdResult, members });
});

// 📋 Get all participants (for download/export)
app.get('/participants', async (req, res) => {
  const { data, error } = await supabase.from('participants').select('*');

  if (error) {
    console.error('Fetch error:', error);
    return res.status(500).send('Failed to fetch participants.');
  }

  res.json(data);
});

// 📥 Download participants as CSV or XLSX
app.get('/download', async (req, res) => {
  const format = req.query.format || 'csv';
  const { data, error } = await supabase.from('participants').select('*');

  if (error) {
    console.error('Download fetch error:', error);
    return res.status(500).send('Failed to fetch data for export.');
  }

  if (format === 'xlsx') {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Participants');

    const filePath = path.join(__dirname, 'data/MSC-Checkin.xlsx');
    XLSX.writeFile(workbook, filePath);
    return res.download(filePath, 'MSC-Checkin.xlsx');
  } else {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(worksheet);

    res.setHeader('Content-Disposition', 'attachment; filename="MSC-Checkin.csv"');
    res.setHeader('Content-Type', 'text/csv');
    return res.send(csv);
  }
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
