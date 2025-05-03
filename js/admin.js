// js/admin.js
import {
  ref, push, onValue, remove, set
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

document.addEventListener('DOMContentLoaded', () => {
  const form      = document.getElementById('homeForm');
  const listDiv   = document.getElementById('homesList');
  const imgInput  = document.getElementById('imgFile');
  const imgPreview= document.getElementById('imgPreview');
  const homesRef  = ref(window.firebaseDb, 'homes');

  // Preview image as base64
  imgInput.addEventListener('change', () => {
    const file = imgInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => imgPreview.src = e.target.result;
    reader.readAsDataURL(file);
  });

  // Save new home
  form.addEventListener('submit', e => {
    e.preventDefault();
    const data = {
      title:   document.getElementById('title').value,
      address: document.getElementById('address').value,
      price:   document.getElementById('price').value,
      desc:    document.getElementById('desc').value,
      phone:   document.getElementById('phone').value,
      email:   document.getElementById('email').value,
      link:    document.getElementById('link').value,
      image:   imgPreview.src
    };
    push(homesRef, data).then(() => {
      form.reset();
      imgPreview.src = '';
    }).catch(console.error);
  });

  // Delete all homes
  document.getElementById('deleteAllHomesBtn')
    .addEventListener('click', () => {
      if (confirm('Delete ALL homes?')) {
        set(homesRef, null);
      }
    });

  // Render list + remove individual
  onValue(homesRef, snapshot => {
    const homes = snapshot.val() || {};
    listDiv.innerHTML = '';
    Object.entries(homes).forEach(([key,h]) => {
      const el = document.createElement('div');
      el.className = 'home-item';
      el.innerHTML = `
        <strong>${h.title} — ${h.price}</strong><br>
        <em>Address:</em> ${h.address || 'none provided'}<br>
        <em>Liaison:</em> ${h.phone || 'none provided'} / ${h.email || 'none provided'}<br>
        ${h.link
          ? `<a href="${h.link}" target="_blank"><button>See Online Listing</button></a>`
          : `<em>No link available</em>`}<br>
        <img src="${h.image}" style="max-width:100px"><br>
        <em>${h.desc}</em><br>
        <button class="remove-btn">Remove</button>
      `;
      el.querySelector('.remove-btn')
        .addEventListener('click', () => remove(ref(window.firebaseDb, 'homes/'+key)));
      listDiv.appendChild(el);
    });
  });
});