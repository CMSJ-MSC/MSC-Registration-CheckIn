// Global variables for autocomplete
let allParticipants = [];
let firstNameDropdown = null;
let lastNameDropdown = null;
let emailDropdown = null;

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
window.onload = function() {
  checkPassword();
  
  // Initialize autocomplete dropdowns
  firstNameDropdown = document.getElementById('firstNameDropdown');
  lastNameDropdown = document.getElementById('lastNameDropdown');
  emailDropdown = document.getElementById('emailDropdown');
  
  // Add event listeners for autocomplete
  const firstNameInput = document.getElementById('searchFirstName');
  const lastNameInput = document.getElementById('searchLastName');
  const emailInput = document.getElementById('searchEmail');
  
  firstNameInput.addEventListener('input', () => showFirstNameAutocomplete());
  lastNameInput.addEventListener('input', () => showLastNameAutocomplete());
  emailInput.addEventListener('input', () => showEmailAutocomplete());
  
  // Clear email when name fields change to maintain independent search
  firstNameInput.addEventListener('input', () => {
    const emailInput = document.getElementById('searchEmail');
    if (emailInput.value) {
      emailInput.value = '';
      hideAllDropdowns();
    }
  });
  
  lastNameInput.addEventListener('input', () => {
    const emailInput = document.getElementById('searchEmail');
    if (emailInput.value) {
      emailInput.value = '';
      hideAllDropdowns();
    }
  });
  
  // Clear name fields when email changes to maintain independent search
  emailInput.addEventListener('input', () => {
    const firstNameInput = document.getElementById('searchFirstName');
    const lastNameInput = document.getElementById('searchLastName');
    if (firstNameInput.value || lastNameInput.value) {
      firstNameInput.value = '';
      lastNameInput.value = '';
      hideAllDropdowns();
    }
  });
  
  // Hide dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.relative')) {
      hideAllDropdowns();
    }
  });
  
  // Load initial data for autocomplete
  loadParticipantsForAutocomplete();
};

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
    
    // Update global participants data for autocomplete
    allParticipants = data;

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
        // Check participant names
        const pFName = (member['First Name'] || '').toLowerCase();
        const pLName = (member['Last Name'] || '').toLowerCase();
        // Check contact names
        const cFName = (member['Contact First Name'] || '').toLowerCase();
        const cLName = (member['Contact Last Name'] || '').toLowerCase();
        
        if ((pFName === firstName && pLName === lastName) || 
            (cFName === firstName && cLName === lastName)) {
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
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 overflow-visible">
          <div class="relative group">
            <svg class="w-5 h-5 text-gray-600 hover:text-gray-800 cursor-help" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
            </svg>
            <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-[9999] text-center">
              ${member['Center'] || 'N/A'}<br>${member['City'] || 'N/A'}
            </div>
          </div>
        </td>
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
        <p><strong>Center:</strong> ${member['Center'] || 'N/A'}</p>
        <p><strong>City:</strong> ${member['City'] || 'N/A'}</p>
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

// async function resetAllCheckins() {
//   const password = prompt("Please enter the admin password to reset all check-ins:");
//   if (password !== DOWNLOAD_PASSWORD) {
//     alert("Incorrect password. Reset cancelled.");
//     return;
//   }

//   if (!confirm('Are you sure you want to clear all check-ins? This cannot be undone.')) return;

//   try {
//     const response = await fetch('/participants');
//     const participants = await response.json();

//     for (const participant of participants) {
//       await fetch('/checkin', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           firstName: participant['First Name'],
//           lastName: participant['Last Name'],
//           checkedIn: false
//         })
//       });
//     }

//     loadData();
//   } catch (error) {
//     console.error('Failed to reset check-ins:', error);
//     alert('Failed to reset check-ins. Please try again.');
//   }
// }

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

// Autocomplete functions
async function loadParticipantsForAutocomplete() {
  try {
    const res = await fetch('/participants');
    allParticipants = await res.json();
  } catch (error) {
    console.error('Failed to load participants for autocomplete:', error);
  }
}

function showFirstNameAutocomplete() {
  const input = document.getElementById('searchFirstName');
  const lastNameInput = document.getElementById('searchLastName');
  const query = input.value.trim().toLowerCase();
  const lastNameQuery = lastNameInput.value.trim().toLowerCase();

  if (query.length < 2 && !lastNameQuery) {
    firstNameDropdown.classList.add('hidden');
    return;
  }

  let filteredParticipants = allParticipants;

  // If a last name is entered, filter participants to only those with that last name
  if (lastNameQuery) {
    filteredParticipants = filteredParticipants.filter(p =>
      (p['Contact Last Name'] && p['Contact Last Name'].toLowerCase().includes(lastNameQuery)) ||
      (p['Last Name'] && p['Last Name'].toLowerCase().includes(lastNameQuery))
    );
  }

  // Get unique first names (both contact and participant) that match the query from the filtered participants
  const matchingNames = [...new Set([
    // Contact first names
    ...filteredParticipants
      .filter(p => p['Contact First Name'] && p['Contact First Name'].toLowerCase().includes(query))
      .map(p => p['Contact First Name']),
    // Participant first names
    ...filteredParticipants
      .filter(p => p['First Name'] && p['First Name'].toLowerCase().includes(query))
      .map(p => p['First Name'])
  ].sort())].slice(0, 10); // Limit to 10 results

  if (matchingNames.length === 0) {
    firstNameDropdown.classList.add('hidden');
    return;
  }

  firstNameDropdown.innerHTML = matchingNames
    .map(name => `<div class="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm" onclick="selectFirstName('${name}')">${name}</div>`)
    .join('');

  firstNameDropdown.classList.remove('hidden');
}

function showLastNameAutocomplete() {
  const input = document.getElementById('searchLastName');
  const firstNameInput = document.getElementById('searchFirstName');
  const query = input.value.trim().toLowerCase();
  const firstNameQuery = firstNameInput.value.trim().toLowerCase();

  if (query.length < 2 && !firstNameQuery) {
    lastNameDropdown.classList.add('hidden');
    return;
  }

  let filteredParticipants = allParticipants;

  // If a first name is entered, filter participants to only those with that first name
  if (firstNameQuery) {
    filteredParticipants = filteredParticipants.filter(p =>
      (p['Contact First Name'] && p['Contact First Name'].toLowerCase() === firstNameQuery) ||
      (p['First Name'] && p['First Name'].toLowerCase() === firstNameQuery)
    );
  }

  // Get unique last names (both contact and participant) that match the query from the filtered participants
  const matchingNames = [...new Set([
    // Contact last names
    ...filteredParticipants
      .filter(p => p['Contact Last Name'] && p['Contact Last Name'].toLowerCase().includes(query))
      .map(p => p['Contact Last Name']),
    // Participant last names
    ...filteredParticipants
      .filter(p => p['Last Name'] && p['Last Name'].toLowerCase().includes(query))
      .map(p => p['Last Name'])
  ].sort())].slice(0, 10); // Limit to 10 results

  if (matchingNames.length === 0) {
    lastNameDropdown.classList.add('hidden');
    return;
  }

  lastNameDropdown.innerHTML = matchingNames
    .map(name => `<div class="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm" onclick="selectLastName('${name}')">${name}</div>`)
    .join('');

  lastNameDropdown.classList.remove('hidden');
}

function selectFirstName(name) {
  document.getElementById('searchFirstName').value = name;
  firstNameDropdown.classList.add('hidden');
  // Do NOT clear last name!
}

function selectLastName(name) {
  document.getElementById('searchLastName').value = name;
  lastNameDropdown.classList.add('hidden');
  // Do NOT clear first name!
}

function showEmailAutocomplete() {
  const input = document.getElementById('searchEmail');
  const query = input.value.trim().toLowerCase();
  
  if (query.length < 2) {
    emailDropdown.classList.add('hidden');
    return;
  }
  
  // Get unique emails that match the query
  const matchingEmails = [...new Set(
    allParticipants
      .filter(p => p['Email'] && p['Email'].toLowerCase().includes(query))
      .map(p => p['Email'])
  )].sort().slice(0, 10); // Limit to 10 results
  
  if (matchingEmails.length === 0) {
    emailDropdown.classList.add('hidden');
    return;
  }
  
  emailDropdown.innerHTML = matchingEmails
    .map(email => `<div class="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm" onclick="selectEmail('${email}')">${email}</div>`)
    .join('');
  
  emailDropdown.classList.remove('hidden');
}

function selectEmail(email) {
  document.getElementById('searchEmail').value = email;
  emailDropdown.classList.add('hidden');
}

function hideAllDropdowns() {
  firstNameDropdown.classList.add('hidden');
  lastNameDropdown.classList.add('hidden');
  emailDropdown.classList.add('hidden');
}

loadData(); // Initial load
