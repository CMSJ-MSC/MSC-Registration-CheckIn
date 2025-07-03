function checkPassword() {
  const password = prompt("Please enter the password to access the MSC Check-In App:");
  if (password === APP_PASSWORD) {
    document.getElementById('mainContent').classList.remove('hidden');
    document.getElementById('passwordOverlay').classList.add('hidden');
  } else {
    alert("Incorrect password. Please try again.");
    checkPassword();
  }
}

function checkDownloadPassword(format) {
  const password = prompt("Please enter the password to download the data:");
  if (password === DOWNLOAD_PASSWORD) {
    window.location.href = `/download?format=${format}`;
  } else {
    alert("Incorrect password. Download cancelled.");
  }
}

// Run password check when page loads
window.onload = checkPassword;

tailwind.config = {
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: '#1e40af',
      }
    }
  }
}

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

    // If searching by family ID, find all emails associated with that family ID
    if (familyID) {
      data.forEach(member => {
        const fID = (member['Family ID'] || '').toLowerCase();
        if (fID === familyID) {
          matchingContactEmails.add(member['Email'].toLowerCase());
        }
      });
    }

    // Filter participants based on matching contact emails
    const filtered = data.filter(member => {
      const memberEmail = (member['Email'] || '').toLowerCase();

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
      const gender = member['Gender'] || '';

      // 🌐 Desktop table row
      const tr = document.createElement('tr');

      // Apply background color based on gender
      if (gender === 'M') {
        tr.className = 'bg-blue-50 hover:bg-blue-100';
      } else if (gender === 'F') {
        tr.className = 'bg-pink-50 hover:bg-pink-100';
      } else {
        tr.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
      }

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
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${member['Email'] || ''}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${(member['Contact First Name'] || '')} ${(member['Contact Last Name'] || '')}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${(member['First Name'] || '')} ${(member['Last Name'] || '')}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGradeAgeCategoryColor(member['Category'])}">
    ${formatGradeAgeCategory(member['Category'] || '')}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${gender === 'M' ? 'bg-blue-100 text-blue-800 border border-[0.5px] border-blue-100' : gender === 'F' ? 'bg-pink-100 text-pink-800 border border-[0.5px] border-pink-100' : 'bg-gray-100 text-gray-800 border border-[0.5px] border-gray-800'}">
            ${gender || 'N/A'}
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

      // Apply background color based on gender for mobile cards
      if (gender === 'M') {
        card.className = 'p-4 sm:p-6 bg-blue-50 border-b border-gray-200';
        card.style.backgroundColor = '#eff6ff'; // Fallback blue color
        card.style.borderLeft = '4px solid #3b82f6'; // Blue left border
        console.log('Mobile card created for Male:', member['First Name'], member['Last Name']);
      } else if (gender === 'F') {
        card.className = 'p-4 sm:p-6 bg-pink-50 border-b border-gray-200';
        card.style.backgroundColor = '#fdf2f8'; // Fallback pink color
        card.style.borderLeft = '4px solid #ec4899'; // Pink left border
        console.log('Mobile card created for Female:', member['First Name'], member['Last Name']);
      } else {
        card.className = 'p-4 sm:p-6 bg-white border-b border-gray-200';
        card.style.borderLeft = '4px solid #d1d5db'; // Gray left border
        console.log('Mobile card created for Unknown gender:', member['First Name'], member['Last Name'], 'Gender:', gender);
      }

      // Add gender indicator for debugging
      const genderIndicator = gender ? ` (${gender})` : '';

      const info = `
        <p><strong>Family ID:</strong> ${member['Family ID'] || ''}</p>
        <p><strong>Email:</strong> ${member['Email'] || ''}</p>
        <p><strong>Contact:</strong> ${member['Contact First Name'] || ''} ${member['Contact Last Name'] || ''}</p>
        <p><strong>Name:</strong> ${member['First Name'] || ''} ${member['Last Name'] || ''}</p>
        <p><strong>Category:</strong> <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGradeAgeCategoryColor(member['Category'])}">${formatGradeAgeCategory(member['Category'] || '')}</span></p>
        <p><strong>Gender:</strong> ${gender || 'N/A'}</p>
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

    // Auto-scroll to results section on mobile only
    if (window.innerWidth < 768) { // Mobile breakpoint (sm:768px)
      if (resultsSection && !resultsSection.classList.contains('hidden')) {
        resultsSection.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }
  } catch (error) {
    console.error('Failed to load data:', error);
  }
}

const APP_PASSWORD = "msc2025" || "Msc2025";
const DOWNLOAD_PASSWORD = "msc2025admin ";

async function resetAllCheckins() {
  const password = prompt("Please enter the admin password to reset all check-ins:");
  if (password !== DOWNLOAD_PASSWORD) {
    alert("Incorrect password. Reset cancelled.");
    return;
  }

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

document.addEventListener('click', function (event) {
  const dropdown = document.getElementById('downloadDropdown');
  const button = event.target.closest('[onclick="toggleDropdown()"]');
  if (!button && !dropdown.contains(event.target)) {
    dropdown.classList.add('hidden');
  }
});

document.addEventListener('keydown', function (e) {
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
    const statusCell = row.querySelector('td:nth-child(9)');
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

function getGradeAgeCategoryColor(gradeAgeCategory) {
  switch (gradeAgeCategory) {
    case 'Adult':
      return 'bg-yellow-100 text-yellow-800';
    case 'JCHYK':
      return 'bg-green-100 text-green-800';
    case 'Infant/ShishuVihar':
      return 'bg-pink-100 text-pink-800';
    default:
      return 'bg-purple-100 text-purple-800';
  }
}

function formatGradeAgeCategory(value) {
  // Normalize value for comparison
  const normalized = (value || '').toString().trim().toLowerCase();
  if (/^\d+$/.test(normalized)) {
    return `Grade: ${value}`;
  }
  if (normalized === 'kg' || normalized === 'pre-kg' || normalized === 'prek' || normalized === 'prekg') {
    // Accept common variations for KG and Pre-KG
    return `Grade: ${value}`;
  }
  return value;
}

loadData(); // Initial load
