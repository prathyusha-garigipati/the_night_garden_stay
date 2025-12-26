const leads = JSON.parse(localStorage.getItem("leads")) || [];
const tbody = document.querySelector("#leadsTable tbody");

leads.forEach(lead => {
  const row = document.createElement("tr");
  const device = lead.device ? String(lead.device).slice(0, 40) + (lead.device.length > 40 ? '...' : '') : '';

  row.innerHTML = `
    <td>${lead.page || ''}</td>
    <td>${lead.time || ''}</td>
    <td>${device}</td>
  `;

  if (tbody) tbody.appendChild(row);
});
