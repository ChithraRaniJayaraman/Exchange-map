// ===== Exchange Map – working app.js (drop-in replacement) =====

// Basic Leaflet map
const map = L.map('map', {
  worldCopyJump: true,
  zoomSnap: 0.5
}).setView([20, 15], 2.2);

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  subdomains: 'abcd',
  maxZoom: 20
}).addTo(map);

// A3 -> A2 mapping for your allowed countries
const isoA3toA2 = {
  IND: 'IN',
  BEL: 'BE',
  CHN: 'CN',
  CAN: 'CA',
  AUS: 'AU',
  HRV: 'HR',
  FRA: 'FR',
  USA: 'US'
};

// ---------- Load data then run app ----------
Promise.all([
  // Try new media file; if not found, fall back to old countries.json
  (async () => {
    try {
      const r = await fetch('data/countries_with_media.json', { cache: 'no-store' });
      if (!r.ok) throw new Error('no media file yet');
      return await r.json();
    } catch (e) {
      const r2 = await fetch('data/countries.json', { cache: 'no-store' });
      return await r2.json();
    }
  })(),
  fetch('data/world.geo.json', { cache: 'no-store' }).then(r => r.json())
]).then(([CONTENT, WORLD]) => {
  const panelContent = document.querySelector('.panel-content');

  // ----- Render a country card in the right panel -----
  function renderCountryCard(code) {
    const c = CONTENT[code];
    if (!c) {
      panelContent.innerHTML =
        `<div class="card"><h2>No data</h2><p>Coming soon.</p></div>`;
      return;
    }

    // If your structure has .videos (array with {title,url}), grab first
    const vid = (c.videos && c.videos.length) ? c.videos[0] : null;

    panelContent.innerHTML = `
      <div class="card">
        <h2>${c.title || code}</h2>

        <ul>${(c.bullets || []).map(b => `<li>${b}</li>`).join('')}</ul>

        ${c.extras?.directIndirect ? `
          <h3>Direct vs Indirect feedback</h3>
          <ul>
            ${c.extras.directIndirect.map(p =>
              `<li><b>Direct:</b> ${p.direct}<br/><b>Indirect:</b> ${p.indirect}</li>`
            ).join('')}
          </ul>
        ` : ``}

        ${vid ? `
          <h3>Watch: ${vid.title}</h3>
          <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;">
            <iframe
              src="${vid.url}"
              title="${vid.title}"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowfullscreen
              style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;">
            </iframe>
          </div>
        ` : ``}

        ${(c.universities && c.universities.length) ? `
          <h3>Friendly universities</h3>
          <ul>
            ${c.universities.map(u =>
              `<li><a href="${u.url}" target="_blank" rel="noopener">${u.name}</a></li>`
            ).join('')}
          </ul>
        ` : ``}

        <div id="cityPins"></div>
        <button id="zoomBtn">Zoom to ${code}</button>
      </div>
    `;

    // City markers (if any in your data)
    (c.cities || []).forEach(city => {
      const m = L.marker([city.lat, city.lon], { title: city.name }).addTo(map);
      m.bindTooltip(city.name, { permanent: true, direction: 'top', className: 'city-label' });
      m.on('click', () => renderCityCard(code, city));
    });

    document.getElementById('zoomBtn').onclick = () => zoomToCountry(code);
  }

  // ----- Render a city card (when a city marker is clicked) -----
  function renderCityCard(code, city) {
    let cardContent = `<div class="card"><h2>${city.cardTitle || city.name}</h2>`;

    if (city.institutions && city.institutions.length > 0) {
      city.institutions.forEach(inst => {
        cardContent += `
          <div class="institution">
            <h3><a href="${inst.website}" target="_blank" rel="noopener">${inst.name}</a>${inst.type ? ` (${inst.type})` : ''}</h3>
            <div class="institution-details">
              ${inst.cultural?.language_and_vibe ? `<p><strong>Language & Vibe:</strong> ${inst.cultural.language_and_vibe}</p>` : ``}
              ${inst.cultural?.clubs_and_life ? `<p><strong>Clubs & Life:</strong> ${inst.cultural.clubs_and_life}</p>` : ``}
              ${inst.cultural?.hostel_culture ? `<p><strong>Hostel Culture:</strong> ${inst.cultural.hostel_culture}</p>` : ``}
              ${Array.isArray(inst.cultural?.festivals) && inst.cultural.festivals.length
                ? `<p><strong>Festivals:</strong> ${inst.cultural.festivals.map(f => `${f.name} (${f.month})`).join(', ')}</p>`
                : ``}
              ${Array.isArray(inst.tips) && inst.tips.length
                ? `<div class="tips"><strong>Tips:</strong><ul>${inst.tips.map(t => `<li>${t}</li>`).join('')}</ul></div>`
                : ``}
              ${inst.helpful_links
                ? `<div class="helpful-links"><strong>Helpful Links:</strong> ${Object.entries(inst.helpful_links).map(([n,u]) => `<a href="${u}" target="_blank" rel="noopener">${n}</a>`).join(' | ')}</div>`
                : ``}
            </div>
          </div>`;
      });
    } else {
      cardContent += `<ul>${(city.cardBullets || []).map(b => `<li>${b}</li>`).join('')}</ul>`;
    }

    cardContent += `<button id="backBtn">Back to ${ (CONTENT[code]?.title || code).split('—')[0].trim() }</button></div>`;
    panelContent.innerHTML = cardContent;
    document.getElementById('backBtn').onclick = () => renderCountryCard(code);
  }

  // ----- Draw world polygons & wire clicks -----
  const allowed = new Set(['IN','BE','CN','CA','AU','HR','FR','US']);

const layer = L.geoJSON(WORLD, {
  // Style each feature depending on whether it's allowed
  style: (feat) => {
    const code = isoA3toA2[feat.id];
    if (allowed.has(code)) {
      // highlighted countries
      return { color: '#666', weight: 0.8, fillColor: '#8aa9ff', fillOpacity: 0.6 };
    }
    // non-target countries (very faint)
    return { color: '#ccc', weight: 0.4, fillColor: '#eeeeee', fillOpacity: 0.15 };
    // If you want them completely unfilled, use fillOpacity: 0 instead.
  },

  onEachFeature: (feat, lyr) => {
    const code = isoA3toA2[feat.id];
    if (!allowed.has(code)) return; // no interactivity for others
    lyr.on({
      mouseover: () => lyr.setStyle({ fillOpacity: 0.8 }),
      mouseout:  () => lyr.setStyle({ fillOpacity: 0.6 }),
      click:     () => renderCountryCard(code)
    });
  }
}).addTo(map);
  function zoomToCountry(code) {
    layer.eachLayer(l => {
      const a3 = l.feature.id;
      if (isoA3toA2[a3] === code) {
        map.fitBounds(l.getBounds().pad(0.1));
      }
    });
  }

  // Initial hint (optional)
  // panelContent.innerHTML = `<div class="card"><h2>Click a country</h2><p>Select India, Belgium, China, Canada, Australia, Croatia, France, or the USA.</p></div>`;
}); // <— IMPORTANT: closes the .then wrapper
// ===== End app.js =====

