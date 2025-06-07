async function loadData() {
    try {
      const res = await fetch('/participants');
      const data = await res.json();

      const familyID = document.getElementById('searchFamilyID').value.trim().toLowerCase();
      const firstName = document.getElementById('searchFirstName').value.trim().toLowerCase();
      const lastName = document.getElementById('searchLastName').value.trim().toLowerCase();

      // Add validation for first name and last name
      if ((firstName && !lastName) || (!firstName && lastName)) {
        alert('Please enter both First Name and Last Name to search by name.');
        return;
      }

      const tbody = document.querySelector('#regTable tbody');
      const emptyState = document.getElementById('emptyState');
      tbody.innerHTML = '';

      const filtered = data.filter(member => {
        const fID = (member['Family ID'] || '').toLowerCase();
        const fName = (member['First Name'] || '').toLowerCase();
        const lName = (member['Last Name'] || '').toLowerCase();

        return (
          (familyID && fID === familyID) ||
          (firstName && lastName && fName === firstName && lName === lastName) ||
          (!familyID && !firstName && !lastName)  // Show all if no search
        );
      });

      if (filtered.length === 0) {
        emptyState.classList.remove('hidden');
        return;
      } else {
        emptyState.classList.add('hidden');
      }

      filtered.forEach((member, index) => {
        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        
        const isCheckedIn = member.checkin === 'checked-in';

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
            loadData(); // Refresh after check-in
          } catch (error) {
            console.error('Check-in failed:', error);
            // Revert checkbox state on error
            checkbox.checked = !checkbox.checked;
          }
        };

        tr.innerHTML = `
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${member['Family ID'] || ''}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${member['First Name'] || ''}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${member['Last Name'] || ''}</td>
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${member['Grade/Age Group Category'] || ''}</td>
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
      });

      // Apply current filter after loading data
      if (currentFilter !== 'all') {
        filterByStatus(currentFilter);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }
  async function resetAllCheckins() {
    if (!confirm('Are you sure you want to clear all check-ins? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/participants');
      const participants = await response.json();

      // Reset each participant's check-in status
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

      loadData(); // Refresh the display
    } catch (error) {
      console.error('Failed to reset check-ins:', error);
      alert('Failed to reset check-ins. Please try again.');
    }
  }

  function resetSearch() {
    document.getElementById('searchFamilyID').value = '';
    document.getElementById('searchFirstName').value = '';
    document.getElementById('searchLastName').value = '';
    // Clear any custom validation messages
    document.getElementById('searchLastName').setCustomValidity('');
    loadData();
  }

  function toggleDropdown() {
  const dropdown = document.getElementById('downloadDropdown');
  dropdown.classList.toggle('hidden');
}

// Optional: close dropdown when clicking elsewhere
window.addEventListener('click', function (e) {
  const dropdown = document.getElementById('downloadDropdown');
  if (!e.target.closest('.relative')) {
    dropdown.classList.add('hidden');
  }
});

  // Add keyboard shortcuts
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

  // Close filter dropdown when clicking elsewhere
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
      const isCheckedIn = statusCell.textContent.includes('Checked In');
      
      if (status === 'all' || 
          (status === 'checked-in' && isCheckedIn) || 
          (status === 'not-checked-in' && !isCheckedIn)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    }
    
    // Hide the dropdown after selection
    document.getElementById('filterDropdown').classList.add('hidden');
  }

  loadData(); // Initial load