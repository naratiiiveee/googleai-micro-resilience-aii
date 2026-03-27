// ====== Harita İşlemleri (Leaflet) ======
let map = L.map('map').setView([39.0, 35.2], 6);
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);

let currentMarker = null;
const provinceSelect = document.getElementById('provinceSelect');
const districtSelect = document.getElementById('districtSelect');
const coordsDisplay = document.getElementById('coords');
let currentDistricts = [];

const customIcon = L.divIcon({
    className: 'custom-div-icon',
    html: "<div style='background-color:#22c55e;width:15px;height:15px;border-radius:50%;box-shadow: 0 0 15px #22c55e;border:2px solid #fff'></div>",
    iconSize: [15, 15], iconAnchor: [7.5, 7.5]
});

provincesData.forEach(p => { provinceSelect.appendChild(new Option(p.name, p.id)); });

function loadDistricts() {
    const selectedId = provinceSelect.value;
    districtSelect.innerHTML = '<option value="">İlçe Seçin...</option>';
    if (selectedId) {
        const province = provincesData.find(p => p.id == selectedId);
        currentDistricts = generateMockDistricts(province.name);
        currentDistricts.forEach(d => { districtSelect.appendChild(new Option(d.name, d.id)); });
        districtSelect.disabled = false;
        updateMapAndCoords(province.lat, province.lng, province.name);
    } else {
        districtSelect.disabled = true;
        if(currentMarker) map.removeLayer(currentMarker);
        map.setView([39.0, 35.2], 6);
        coordsDisplay.textContent = 'Enlem: -, Boylam: -';
    }
}

function focusDistrict() {
    const pId = provinceSelect.value, dId = districtSelect.value;
    if (pId && dId) {
        const province = provincesData.find(p => p.id == pId);
        const district = currentDistricts.find(d => d.id == dId);
        const lat = province.lat + district.latOffset;
        const lng = province.lng + district.lngOffset;
        updateMapAndCoords(lat, lng, `${province.name}, ${district.name}`);
        document.getElementById('resultLocation').textContent = `${province.name}, ${district.name}`;
    }
}

function updateMapAndCoords(lat, lng, popupText) {
    if(currentMarker) map.removeLayer(currentMarker);
    currentMarker = L.marker([lat, lng], {icon: customIcon}).addTo(map)
        .bindPopup(`<b>${popupText}</b>`).openPopup();
    map.setView([lat, lng], 10);
    coordsDisplay.textContent = `Enlem: ${lat.toFixed(4)}, Boylam: ${lng.toFixed(4)}`;
}

// ====== Sayfa Yönlendirme (SPA Aktiviteleri) ======
function navigateTo(sectionId) {
    document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active-section'));
    document.getElementById(sectionId).classList.add('active-section');
    window.scrollTo(0,0);
    
    // Eğer Harita paneline geçildiyse, gizli haldeyken yüklenen Leaflet'in kendini tekrar çizmesi gerekir
    if(sectionId === 'analysis') {
        setTimeout(() => { map.invalidateSize(); }, 300);
    }
}

// ====== Sekme (Tab) Değiştirme ======
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId + 'Tab').style.display = 'block';
    event.currentTarget.classList.add('active');
}

// ====== Analiz İşlemleri (Sürükle-Bırak & Anket) ======
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => dropZone.addEventListener(e, (ev) => { ev.preventDefault(); ev.stopPropagation(); }));
['dragenter', 'dragover'].forEach(e => dropZone.addEventListener(e, () => dropZone.classList.add('dragover')));
['dragleave', 'drop'].forEach(e => dropZone.addEventListener(e, () => dropZone.classList.remove('dragover')));
dropZone.addEventListener('drop', handleDrop, false);
fileInput.addEventListener('change', handleFiles, false);

function handleDrop(e) { handleFiles({target: {files: e.dataTransfer.files}}); }
function handleFiles(e) {
    if(e.target.files.length > 0) {
        startAnalysis('file');
    }
}

function startAnalysis(method) {
    if(provinceSelect.value === "") { alert("Lütfen haritadan analiz edilecek ili seçin!"); return; }
    
    // Girdi parametrelerini toplama (Soru Cevap)
    let analysisData = {};
    if (method === 'survey') {
        analysisData = {
            soil: document.getElementById('q-soil').value,
            crop: document.getElementById('q-crop').value || 'Belirtilmedi',
            climate: document.getElementById('q-climate').value,
            fert: document.getElementById('q-fert').value,
            type: 'Anket'
        }
    } else {
        analysisData = { type: 'Dosya (Laboratuvar PDF/CSV)' };
    }

    document.getElementById('inputSteps').classList.remove('active');
    document.getElementById('loadingStep').classList.add('active');
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 15) + 5;
        if(progress > 100) progress = 100;
        document.getElementById('progressFill').style.width = progress + '%';
        if(progress === 100) { clearInterval(interval); setTimeout(() => showResults(analysisData), 800); }
    }, 300);
}

function showResults(data) {
    document.getElementById('loadingStep').classList.remove('active');
    document.getElementById('resultStep').classList.add('active');
    document.getElementById('progressFill').style.width = '0%';
    
    // Rastgele Temel Veri Hesaplamaları
    const isDrought = data.climate?.includes('Kurak');
    let baseScore = isDrought ? Math.floor(Math.random() * 20) + 40 : Math.floor(Math.random() * 20) + 65;
    
    // DOM'u güncelle
    const scoreEl = document.getElementById('overallScore');
    const statusEl = document.getElementById('scoreStatus');
    
    scoreEl.textContent = baseScore;
    statusEl.className = 'status ' + (baseScore < 50 ? 'danger' : baseScore < 75 ? 'warning' : 'success');
    statusEl.textContent = baseScore < 50 ? 'Kritik Seviye' : baseScore < 75 ? 'Gelişime Açık' : 'Optimal Sağlık';
    
    document.getElementById('resStress').textContent = isDrought ? 'Yüksek Kuraklık ve Tuzlanma' : 'Nitrojen Eksikliği İhtimali';
    document.getElementById('resEnzyme').textContent = isDrought ? 'Lipaz (Baskılanmış)' : 'Protez (Aktif)';

    // Resmi Rapor Üretimi
    let locationStr = document.getElementById('resultLocation').textContent;
    let summaryHtml = `
        <p>${locationStr} bölgesi için gerçekleştirilen mikrobiyom adaptasyon ve toprak sağlığı analizleri tamamlanmıştır.</p>
        <p>Bölgedeki ${isDrought ? 'şiddetli kuraklık etkileri' : 'mevcut iklim koşulları'}, toprak florasındaki faydalı enzimlerin aktivasyonunu <strong>%${Math.floor(Math.random()*30)+15} oranında etkilemektedir</strong>. Hesaplanan kümülatif İklim Direnç Skorunuz <strong>${baseScore}/100</strong> olarak ölçülmüştür.</p>
        <p>Araştırma sonuçları, ilgili toprağın uzun vadeli sürdürülebilirliği için mikrobiyotal floranın spesifik inokülantlar (bakteri aşıları) ile desteklenmesi gerektiğine işaret etmektedir.</p>
    `;
    
    let reportHtml = `
        <p><strong>RAPOR ÖZETİ - ${new Date().toLocaleDateString('tr-TR')}</strong></p>
        <p>Analiz tipi: <em>${data.type} verileri baz alınmıştır.</em></p>
        ${summaryHtml}
    `;
    document.getElementById('reportText').innerHTML = reportHtml;

    // AI Önerileri
    let recs = `
        <li><strong>Biyoteknolojik Müdahale:</strong> Pseudomonas kökenli ACC deaminaz aktivitesi yüksek rhizobakteriler toprağa aşılanmalıdır.</li>
        <li><strong>Stres Yönetimi:</strong> Toprak yapısı göz önüne alındığında, yüzey buharlaşmasını önleyici organik malçlama uygulaması tavsiye edilir.</li>
        <li><strong>Mikrobiyal Çeşitlilik:</strong> Phyto-ekstraksiyon kapasitesini artırmak için düşük dozlu leonardit (Hümik Fulvik asit) takviyesi yapın.</li>
    `;
    document.getElementById('recommendationsList').innerHTML = recs;

    if(currentMarker) currentMarker.setPopupContent(`<b>Analiz Tamamlandı</b><br>Skor: ${baseScore}/100`).openPopup();

    // Rapor İndirme İçin Arka Plan Verilerini Besle
    document.getElementById('pdf-date').textContent = new Date().toLocaleDateString('tr-TR');
    document.getElementById('pdf-id').textContent = "MR-" + Math.floor(Math.random() * 90000 + 10000);
    document.getElementById('pdf-location').textContent = locationStr;
    document.getElementById('pdf-type').textContent = data.type + " üzerinden";
    document.getElementById('pdf-score').textContent = baseScore;
    document.getElementById('pdf-score').style.color = baseScore < 50 ? "#ef4444" : baseScore < 75 ? "#f59e0b" : "#22c55e";
    document.getElementById('pdf-stress').textContent = isDrought ? 'Yüksek Kuraklık ve Tuzlanma' : 'Ortalama Stres, Olası Nitrojen Açığı';
    document.getElementById('pdf-ai-summary').innerHTML = summaryHtml;
    document.getElementById('pdf-recs').innerHTML = recs;
}

// ====== PDR (Resmi Rapor) İndirme İşlemi ======
function downloadPDF() {
    const element = document.getElementById('printable-report');
    const opt = {
        margin:       10,
        filename:     'MicroResilience_Zirai_Rapor.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
}

function resetAnalysis() {
    document.getElementById('resultStep').classList.remove('active');
    document.getElementById('inputSteps').classList.add('active');
}

// ====== Chatbot İşlemleri ======
const chatWindow = document.getElementById('chatWindow');
const chatBody = document.getElementById('chatBody');
const chatInput = document.getElementById('chatInput');
let chatOpen = false;

function toggleChat() {
    chatOpen = !chatOpen;
    chatWindow.style.display = chatOpen ? 'flex' : 'none';
    if(chatOpen) document.querySelector('.chat-badge').style.display = 'none'; // Unread badge'i gizle
}

function handleChatPress(e) {
    if(e.key === 'Enter') sendChatMessage();
}

function sendChatMessage() {
    const text = chatInput.value.trim();
    if(!text) return;
    
    // Kullanıcı mesajını ekle
    addMessage(text, 'user-message');
    chatInput.value = '';
    
    // Bot Simülasyonu
    setTimeout(() => {
        let lowerText = text.toLowerCase();
        let reply = "MicroResilience AI sistemine göre tarımsal verimliliği artırmak için öncelikle resmi raporunuzdaki bio-belirteçlere odaklanmalısınız.";
        
        if(lowerText.includes("tuz") || lowerText.includes("çorak")) {
            reply = "Toprakta tuzlanma stresi tespit edilirse, sodyum toksisitesini kırmak esastır. Biyoteknolojik olarak halotolerant (tuza dayanıklı) <b>Bacillus subtilis</b> ve <b>Pseudomonas putida</b> suşlarıyla toprağı aşılamanızı tavsiye ederim. Bu bakteriler ACC deaminaz enzimi üreterek bitkinin etilen stresini kırar.";
        } else if(lowerText.includes("rapor") || lowerText.includes("sonuç")) {
            reply = "Raporunuz, seçtiğiniz bölgedeki iklim verileri, arazi formunuz ve algoritmik enzim-skor eşleştirmeleri ile hesaplanmıştır. 75 altı skorlarda mutlak suretle toprağa biyolojik müdahale gerekir.";
        } else if(lowerText.includes("merhaba") || lowerText.includes("selam")) {
            reply = "Merhaba! Ben Ziraat Asistanınız Mico. Arazinizin stres profilini, rapor detaylarını veya toprağınızda hangi faydalı mikroorganizmalara ihtiyacınız olduğunu bana sorabilirsiniz.";
        } else if(lowerText.includes("mikroorganizma") || lowerText.includes("tür") || lowerText.includes("hangi tür") || lowerText.includes("bakteri") || lowerText.includes("tavsiye")) {
            reply = "🌿 Toprağınızı zenginleştirmek ve direncini artırmak için şu faydalı türleri (PGPR) kesinlikle tavsiye ederim:<br><br>• <b>Azotobacter & Rhizobium:</b> Havadaki azotu toprağa bağlayarak kimyasal gübre ihtiyacını bitirir.<br>• <b>Mycorrhizal Fungi (Mikoriza):</b> Bitki kökleriyle ağ kurarak su ve fosfor alımını devasa boyutta artırır.<br>• <b>Trichoderma harzianum:</b> Zararlı patojenlere karşı kalkan görevi görür.<br><br>Eğer kuraklık riskiniz varsa ek olarak mutlaka mikoriza aşılamalısınız!";
        } else if(lowerText.includes("kurak") || lowerText.includes("su")) {
            reply = "Kuraklık kaynaklı su stresi (Drought Stress) toprak mikrobiyotasını kurutur. Nem tutma kapasitesini humik asitler (leonardit) ile artırmalı ve toprağı <i>Glomus intraradices</i> (mikorizal mantar) ekstratıyla desteklemelisiniz. Bu sayede bitki kök yüzeyi genişler.";
        } else {
            reply = "Bu harika bir soru. Genel bitki fizyolojisi uyarınca, topraktaki florayı iyileştirmek için inorganik (N-P-K) yüklemesini azaltıp kompost çayları (compost tea) ve canlı mikrobiyal gübreler (Biyostimülantlar) kullanmanız, uzun vadede ürün rekoltesini artıracaktır.";
        }
        
        addMessage(reply, 'ai-message');
    }, Math.random() * 800 + 400);
}

function addMessage(text, className) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${className}`;
    msgDiv.innerHTML = text;
    chatBody.appendChild(msgDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
}
