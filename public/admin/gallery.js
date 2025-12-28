/* Admin gallery management (single, consistent implementation)
   - Stores images in localStorage under 'gallery'
   - Falls back to Storage helper if available
*/

const ADMIN_GALLERY_KEY = 'gallery';

function getGallery() {
  try {
    if (typeof Storage !== 'undefined' && Storage.get) return Storage.get(ADMIN_GALLERY_KEY);
  } catch (e) {}
  return JSON.parse(localStorage.getItem(ADMIN_GALLERY_KEY)) || [];
}

function setGallery(g) {
  try {
    if (typeof Storage !== 'undefined' && Storage.set) return Storage.set(ADMIN_GALLERY_KEY, g);
  } catch (e) {}
  localStorage.setItem(ADMIN_GALLERY_KEY, JSON.stringify(g));
}

function renderAdminGallery() {
  const list = document.getElementById('galleryAdminList');
  if (!list) return;
  const gallery = getGallery();
  list.innerHTML = '';

  gallery.forEach((item, index) => {
    const div = document.createElement('div');
    div.style.border = '1px solid #444';
    div.style.padding = '10px';
    div.style.marginBottom = '10px';

    div.innerHTML = `
      <img src="${item.image}" width="120"><br>
      <strong>${item.title}</strong><br>
      Status: ${item.status}<br>
      <button onclick="toggleStatus(${index})">
        ${item.status === 'active' ? 'Hide' : 'Show'}
      </button>
      <button onclick="deleteImage(${index})">Delete</button>
    `;

    list.appendChild(div);
  });
}

function addImage() {
  const fileInput = document.getElementById('imageInput');
  const titleInput = document.getElementById('imageTitle');
  if (!fileInput || !titleInput) return alert('Upload elements missing');
  const title = titleInput.value.trim();

  if (!fileInput.files[0] || !title) {
    alert('Select image and enter title');
    return;
  }

  const reader = new FileReader();
  reader.onload = function () {
    const gallery = getGallery();
    gallery.push({ image: reader.result, title, status: 'active' });
    setGallery(gallery);
    renderAdminGallery();
    fileInput.value = '';
    titleInput.value = '';
  };
  reader.readAsDataURL(fileInput.files[0]);
}

function toggleStatus(index) {
  const gallery = getGallery();
  if (!gallery[index]) return;
  gallery[index].status = gallery[index].status === 'active' ? 'inactive' : 'active';
  setGallery(gallery);
  renderAdminGallery();
}

function deleteImage(index) {
  if (!confirm('Delete this image?')) return;
  const gallery = getGallery();
  gallery.splice(index, 1);
  setGallery(gallery);
  renderAdminGallery();
}

// initial render
renderAdminGallery();

