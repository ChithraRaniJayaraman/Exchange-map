// Basic Leaflet map
const map = L.map('map', { worldCopyJump:true, 
zoomSnap:0.5 }).setView([20, 15], 2.2);
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
	subdomains: 'abcd',
	maxZoom: 20
}).addTo(map);

const isoA3toA2 = {
    "IND": "IN",
    "BEL": "BE",
    "CHN": "CN",
    "CAN": "CA",
    "AUS": "AU",
    "HRV": "HR",
    "FRA": "FR"
};

// Load content + world polygons, then wire up clicks
Promise.all([
 fetch('data/countries.json').then(r=>r.json()),
 fetch('data/world.geo.json').then(r=>r.json())
]).then(([CONTENT, WORLD]) => {
 const panelContent = document.querySelector('.panel-content');
 // Utility to render a country card
 function renderCountryCard(code){
 const c = CONTENT[code];
 if(!c){ panelContent.innerHTML = `<div class="card"><h2>No 
data</h2><p>Coming soon.</p></div>`; return; }
 panelContent.innerHTML = `
 <div class="card">
 <h2>${c.title}</h2>
 <ul>${(c.bullets||[]).map(b=>`<li>${b}</li>`).join('')}</ul>
 ${(c.extras?.directIndirect) ? `
 <h3>Direct vs Indirect feedback</h3>
 <ul>${c.extras.directIndirect.map(p=>`<li><b>Direct:</b> 
${p.direct}<br/><b>Indirect:</b> ${p.indirect}</li>`).join('')}</ul>
 `:``}
 <div id="cityPins"></div>
 <button id="zoomBtn">Zoom to ${code}</button>
 </div>
 `;
 // Add city markers (if any)
 (c.cities||[]).forEach(city=>{
    const m = L.marker([city.lat, city.lon], { title: city.name }).addTo(map);
    m.bindTooltip(city.name, { permanent: true, direction: 'top', className: 'city-label' }).openTooltip();
    m.on('click', ()=> renderCityCard(code, city));
 });
 document.getElementById('zoomBtn').onclick = ()=> 
zoomToCountry(code);
 }
 function renderCityCard(code, city){
 let cardContent = `<div class="card"><h2>${city.cardTitle || city.name}</h2>`;
 
 // If city has institutions array, display each institution
 if (city.institutions && city.institutions.length > 0) {
   city.institutions.forEach(inst => {
     cardContent += `
       <div class="institution">
         <h3><a href="${inst.website}" target="_blank">${inst.name}</a> (${inst.type})</h3>
         <div class="institution-details">
           <p><strong>Language & Vibe:</strong> ${inst.cultural.language_and_vibe}</p>
           <p><strong>Clubs & Life:</strong> ${inst.cultural.clubs_and_life}</p>
           <p><strong>Hostel Culture:</strong> ${inst.cultural.hostel_culture}</p>
           ${inst.cultural.festivals.length > 0 ? `<p><strong>Festivals:</strong> ${inst.cultural.festivals.map(f => `${f.name} (${f.month})`).join(', ')}</p>` : ''}
           <div class="tips">
             <strong>Tips:</strong>
             <ul>${inst.tips.map(tip => `<li>${tip}</li>`).join('')}</ul>
           </div>
           <div class="helpful-links">
             <strong>Helpful Links:</strong>
             ${Object.entries(inst.helpful_links).map(([name, url]) => `<a href="${url}" target="_blank">${name}</a>`).join(' | ')}
           </div>
         </div>
       </div>`;
   });
 } else {
   // Fallback to old format
   cardContent += `<ul>${(city.cardBullets||[]).map(b=>`<li>${b}</li>`).join('')}</ul>`;
 }
 
 cardContent += `<button id="backBtn">Back to ${CONTENT[code].title.split('—')[0].trim()}</button></div>`;
 panelContent.innerHTML = cardContent;
 document.getElementById('backBtn').onclick = ()=> renderCountryCard(code);
 }
 // Draw world polygons; click to open the country card
 const layer = L.geoJSON(WORLD, {
 style: { color:'#888', weight:0.8, fillColor:'#dfe8ff', 
fillOpacity:0.6 },
 onEachFeature: (feat, lyr) => {
 const codeA3 = feat.id;
 const code = isoA3toA2[codeA3];
 // enable only the countries we care about
 const allowed = ['IN','BE','CN','CA','AU','HR','FR'];
 if(!allowed.includes(code)) return;
 lyr.setStyle({ fillColor:'#8aa9ff' });
 lyr.on({
 mouseover: () => lyr.setStyle({ fillOpacity:0.8 }),
 mouseout: () => lyr.setStyle({ fillOpacity:0.6 }),
 click: () => renderCountryCard(code)
 });
 }
 }).addTo(map);
 function zoomToCountry(code){
 layer.eachLayer(l=>{
 const codeA3 = l.feature.id;
 const layerCode = isoA3toA2[codeA3];
 if(layerCode === code){ map.fitBounds(l.getBounds().pad(0.1)); }
 });
 }
 // Initial hint
 // panelContent.innerHTML = `<div class="card"><h2>Click a country</h2><p>Explore Erasmus info for India, Belgium, China, Canada, Australia, Croatia, or France.</p></div>`;
});
