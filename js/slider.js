// js/slider.js
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js";

document.addEventListener('DOMContentLoaded', () => {
  const homesRef = ref(window.firebaseDb, 'homes');
  const container= document.querySelector('.home-scroller-container');
  if (!container) return;

  onValue(homesRef, snapshot => {
    const data  = snapshot.val() || {};
    const homes = Object.values(data);
    if (!homes.length) {
      container.innerHTML = '<p>No homes available.</p>';
      return;
    }

    container.innerHTML = `
      <div class="custom-slider"></div>
      <div class="slider-desc"></div>
    `;
    const slider  = container.querySelector('.custom-slider');
    const descBox = container.querySelector('.slider-desc');

    homes.forEach((h,i) => {
      let img = document.createElement('img');
      img.src          = h.image;
      img.dataset.index= i;
      img.style.display= i ? 'none' : 'block';
      slider.appendChild(img);
    });

    // Insert your slider CSS or rely on style.css
    let idx = 0;
    function showSlide(n) {
      const imgs = slider.querySelectorAll('img');
      imgs[idx].style.display = 'none';
      imgs[n].style.display   = 'block';
      descBox.innerHTML = `
        <h3>${homes[n].title} — ${homes[n].price}</h3>
        <p><strong>Address:</strong> ${homes[n].address || 'none provided'}</p>
        <p><strong>Liaison:</strong> ${homes[n].phone || 'none provided'} / ${homes[n].email || 'none provided'}</p>
        ${homes[n].link
          ? `<a href="${homes[n].link}" target="_blank"><button>See Online Listing</button></a>`
          : `<p><em>No link available</em></p>`}
        <p>${homes[n].desc}</p>
      `;
      idx = n;
    }
    showSlide(0);
    setInterval(() => showSlide((idx+1)%homes.length), 5000);
  });
});