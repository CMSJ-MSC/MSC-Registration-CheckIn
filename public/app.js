async function loadData() {
  try {
    const res = await fetch('/participants');
    const data = await res.json();

    const familyID = document.getElementById('searchFamilyID').value.trim().toLowerCase();
    const firstName = document.getElementById('searchFirstName').value.trim().toLowerCase();
    const lastName = document.getElementById('searchLastName').value.trim().toLowerCase();
    const email = document.getElementById('searchEmail').value.trim().toLowerCase();
    const resultsSection = document.getElementById('resultsSection');

    if ((firstName && !lastName) || (!firstName && lastName)) {
      alert('Please enter both First Name and Last Name to search by name.');
      return;
    }

    if (!familyID && !firstName && !lastName && !email) {
      resultsSection.classList.add('hidden');
      return;
    }

    resultsSection.classList.remove('hidden');

    const tbody = document.querySelector('#regTable tbody');
    const emptyState = document.getElementById('emptyState');
    const mobileCards = document.getElementById('mobileCards');

    tbody.innerHTML = '';
    mobileCards.innerHTML = '';

    // First, find all unique contact emails that match the search criteria
    let matchingContactEmails = new Set();
    
    // If searching by email, use that directly
    if (email) {
      matchingContactEmails.add(email);
    }
    
    // If searching by name, find the contact email associated with that name
    if (firstName && lastName) {
      data.forEach(member => {
        const fName = (member['First Name'] || '').toLowerCase();
        const lName = (member['Last Name'] || '').toLowerCase();
        if (fName === firstName && lName === lastName) {
          matchingContactEmails.add(member['Email'].toLowerCase());
        }
      });
    }

    // Filter participants based on family ID or matching contact emails
    const filtered = data.filter(member => {
      const fID = (member['Family ID'] || '').toLowerCase();
      const memberEmail = (member['Email'] || '').toLowerCase();

      // If searching by family ID, match that
      if (familyID && fID === familyID) {
        return true;
      }

      // If we have matching contact emails, check if this member's email matches any of them
      if (matchingContactEmails.size > 0) {
        return matchingContactEmails.has(memberEmail);
      }

      return false;
    });

    if (filtered.length === 0) {
      emptyState.classList.remove('hidden');
      return;
    } else {
      emptyState.classList.add('hidden');
    }

    // Sort filtered results by Family ID to group family members together
    filtered.sort((a, b) => (a['Family ID'] || '').localeCompare(b['Family ID'] || ''));

    filtered.forEach((member, index) => {
      const isCheckedIn = member.checkin === 'checked-in';

      // 🌐 Desktop table row
      const tr = document.createElement('tr');
      tr.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = isCheckedIn;
      checkbox.className = 'h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded';

      checkbox.onchange = async () => {
        try {
          await fetch('/checkin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firstName: member['First Name'],
              lastName: member['Last Name'],
              checkedIn: checkbox.checked
            })
          });
          loadData();
        } catch (error) {
          console.error('Check-in failed:', error);
          checkbox.checked = !checkbox.checked;
        }
      };

      tr.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${member['Family ID'] || ''}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${member['First Name'] || ''}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${member['Last Name'] || ''}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${member['Contact First Name'] || ''}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${member['Contact Last Name'] || ''}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${member['Email'] || ''}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAgeGroupColor(member['Age Group'])}">
            ${member['Age Group'] || ''}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isCheckedIn ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
            ${isCheckedIn ? '✅ Checked In' : '❌ Not Checked In'}
          </span>
        </td>
      `;
      const td = document.createElement('td');
      td.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-900';
      td.appendChild(checkbox);
      tr.appendChild(td);
      tbody.appendChild(tr);

      // 📱 Mobile card view
      const card = document.createElement('div');
      card.className = 'p-4 sm:p-6 bg-white';

      const info = `
        <p><strong>Family ID:</strong> ${member['Family ID'] || ''}</p>
        <p><strong>Name:</strong> ${member['First Name'] || ''} ${member['Last Name'] || ''}</p>
        <p><strong>Contact:</strong> ${member['Contact First Name'] || ''} ${member['Contact Last Name'] || ''}</p>
        <p><strong>Email:</strong> ${member['Email'] || ''}</p>
        <p><strong>Age Group:</strong> <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAgeGroupColor(member['Age Group'])}">${member['Age Group'] || ''}</span></p>
        <p><strong>Status:</strong> <span class="${isCheckedIn ? 'text-green-600' : 'text-red-600'}">${isCheckedIn ? '✅ Checked In' : '❌ Not Checked In'}</span></p>
      `;

      const mobileCheckbox = document.createElement('input');
      mobileCheckbox.type = 'checkbox';
      mobileCheckbox.checked = isCheckedIn;
      mobileCheckbox.className = 'mt-2 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded';

      mobileCheckbox.onchange = async () => {
        try {
          await fetch('/checkin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firstName: member['First Name'],
              lastName: member['Last Name'],
              checkedIn: mobileCheckbox.checked
            })
          });
          loadData();
        } catch (error) {
          console.error('Check-in failed:', error);
          mobileCheckbox.checked = !mobileCheckbox.checked;
        }
      };

      card.innerHTML = info;
      card.appendChild(mobileCheckbox);
      mobileCards.appendChild(card);
    });

    if (currentFilter !== 'all') {
      filterByStatus(currentFilter);
    }
  } catch (error) {
    console.error('Failed to load data:', error);
  }
}

async function resetAllCheckins() {
  if (!confirm('Are you sure you want to clear all check-ins? This cannot be undone.')) return;

  try {
    const response = await fetch('/participants');
    const participants = await response.json();

    for (const participant of participants) {
      await fetch('/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: participant['First Name'],
          lastName: participant['Last Name'],
          checkedIn: false
        })
      });
    }

    loadData();
  } catch (error) {
    console.error('Failed to reset check-ins:', error);
    alert('Failed to reset check-ins. Please try again.');
  }
}

function resetSearch() {
  document.getElementById('searchFamilyID').value = '';
  document.getElementById('searchFirstName').value = '';
  document.getElementById('searchLastName').value = '';
  document.getElementById('searchEmail').value = '';
  document.getElementById('searchLastName').setCustomValidity('');
  loadData();
}

function toggleDropdown() {
  const dropdown = document.getElementById('downloadDropdown');
  dropdown.classList.toggle('hidden');
}

document.addEventListener('click', function(event) {
  const dropdown = document.getElementById('downloadDropdown');
  const button = event.target.closest('[onclick="toggleDropdown()"]');
  if (!button && !dropdown.contains(event.target)) {
    dropdown.classList.add('hidden');
  }
});

document.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && (e.target.id.includes('search'))) {
    loadData();
  }
  if (e.key === 'Escape') {
    resetSearch();
  }
});

function toggleFilterDropdown() {
  const dropdown = document.getElementById('filterDropdown');
  dropdown.classList.toggle('hidden');
}

window.addEventListener('click', function (e) {
  const filterDropdown = document.getElementById('filterDropdown');
  const downloadDropdown = document.getElementById('downloadDropdown');
  if (!e.target.closest('.relative')) {
    filterDropdown.classList.add('hidden');
    downloadDropdown.classList.add('hidden');
  }
});

let currentFilter = 'all';

function filterByStatus(status) {
  currentFilter = status;
  const tbody = document.querySelector('#regTable tbody');
  const rows = tbody.getElementsByTagName('tr');
  for (let row of rows) {
    const statusCell = row.querySelector('td:nth-child(5)');
    const isCheckedIn = statusCell?.textContent.includes('Checked In');
    if (status === 'all' || 
        (status === 'checked-in' && isCheckedIn) || 
        (status === 'not-checked-in' && !isCheckedIn)) {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  }
  document.getElementById('filterDropdown').classList.add('hidden');
}

function getAgeGroupColor(ageGroup) {
  switch(ageGroup) {
    case 'Adult':
      return 'bg-green-100 text-green-800';
    case 'Child':
      return 'bg-blue-100 text-blue-800';
    case 'CHYK Working':
      return 'bg-yellow-100 text-yellow-800';
    case 'CHYK Non-working':
      return 'bg-orange-100 text-orange-800';
    case 'Infant/ShishuVihar':
      return 'bg-pink-100 text-pink-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

loadData(); // Initial load
