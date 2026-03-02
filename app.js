const SUPABASE_URL = "https://tetmchfwcwtsirdghxwo.supabase.co";
const SUPABASE_KEY = "sb_publishable_zpLeYA-F1nhVC4r4O1i_PQ_qnAvtaFi";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


// REGISTER SERVICE WORKER
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js');
}


// LOGIN
async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        console.log(error);
        alert("Login gagal");
        return;
    }

    window.location.href = "dashboard.html";
}


// LOGOUT
async function logout() {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
}


// NAVIGATION
function goToAbsen() {
    window.location.href = "absen.html";
}

function goToAdmin() {
    window.location.href = "admin.html";
}

const OFFICE_LAT = -6.262410;
const OFFICE_LNG = 106.589714;
const MAX_RADIUS = 20; // meter

// ABSEN
async function absen() {
    alert("Absens Clicked");
    const statusText = document.getElementById("status");

    if (!navigator.geolocation) {
        alert("GPS tidak didukung");
        return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {

        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        statusText.innerText = `Lokasi: ${lat}, ${lng}`;

        const user = await supabaseClient.auth.getUser();

        if (!user.data.user) {
            alert("User tidak valid");
            return;
        }

        // VALIDASI RADIUS (contoh)

        const jarak = hitungJarak(lat, lng, OFFICE_LAT, OFFICE_LNG);

        if (jarak > MAX_RADIUS) {
            alert("Di luar area absen");
            return;
        }

        // INSERT DB
        const { error } = await supabaseClient
            .from('attendance')
            .insert([
                {
                    userid: user.data.user.id,
                    latitude: lat,
                    longitude: lng,
                    status: "VALID"
                }
            ]);

        if (error) {
            console.log(error);
            alert("Gagal absen");
        } else {
            alert("Absen berhasil");
        }

    });
}

async function loadHistory() {
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        alert("User tidak login");
        return;
    }

    const { data, error } = await supabaseClient
        .from('attendance')
        .select('*')
        .eq('userid', user.id)
        .order('timestamp', { ascending: false });

    if (error) {
        alert("Gagal load history: " + error.message);
        return;
    }

    const container = document.getElementById("historyList");
    container.innerHTML = "";

    if (data.length === 0) {
        container.innerHTML = "<p>Belum ada data absen</p>";
        return;
    }

    data.forEach(item => {
        const tanggal = new Date(item.timestamp).toLocaleString();
        console.log(tanggal)

        container.innerHTML += `
            <div class="card">
                <b>${tanggal}</b><br>
                Status: ${item.status}<br>
                Lokasi: ${item.latitude}, ${item.longitude}
            </div>
        `;
    });
}

let map;
let markers = [];

//liveloc
let userMarker;
let watchId;

async function loadMap() {

    const { data: { user } } = await supabaseClient.auth.getUser();

    const { data, error } = await supabaseClient
        .from('attendance')
        .select('*')
        .eq('userid', user.id);

    if (error) {
        console.log(error);
        return;
    }

    if (!map) {
        map = L.map('map').setView([-6.3099, 106.672], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map);

        L.circle([OFFICE_LAT, OFFICE_LNG], {
            radius: MAX_RADIUS,
            color: 'green',
            fillOpacity: 0.2
        }).addTo(map);  
    }

    // Hapus marker lama
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    data.forEach(item => {

        console.log(item.latitude, typeof item.latitude);
        console.log(item.longitude, typeof item.longitude);
        const marker = L.marker([item.latitude, item.longitude])
            .addTo(map)
            .bindPopup(`
                <b>${new Date(item.timestamp).toLocaleString()}</b><br>
                Status: ${item.status}
            `);

        markers.push(marker);
    });

    if (data.length > 0) {
        map.setView([data[0].latitude, data[0].longitude], 15);
    }
}

function startLiveLocation() {

    if (!navigator.geolocation) {
        alert("GPS tidak didukung");
        return;
    }

    watchId = navigator.geolocation.watchPosition(
        (position) => {

            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            console.log("Live:", lat, lng);

            const distance = calculateDistance(
                lat,
                lng,
                OFFICE_LAT,
                OFFICE_LNG
            );

            const info = document.getElementById("distanceInfo");

            const accuracy = position.coords.accuracy;
            let statusText = "";
            let statusColor = "";

            // if (distance <= MAX_RADIUS) {
            //     info.innerHTML = `✅ Dalam radius kantor (${distance.toFixed(1)} meter)`;
            //     info.style.color = "green";
            // } else {
            //     info.innerHTML = `❌ Di luar radius (${distance.toFixed(1)} meter)`;
            //     info.style.color = "red";
            // }

            if (distance <= OFFICE_RADIUS) {
                statusText = "✅ Dalam radius kantor";
                statusColor = "green";
            } else {
                statusText = "❌ Di luar radius";
                statusColor = "red";
            }

            info.innerHTML = `
                ${statusText}<br>
                📏 Jarak: ${distance.toFixed(1)} meter<br>
                📡 Akurasi GPS: ±${accuracy.toFixed(1)} meter
            `;

            info.style.color = statusColor;     

            if (!map) {
                map = L.map('map').setView([lat, lng], 16);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap'
                }).addTo(map);
            }

            if (!userMarker) {
                const greenIcon = L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
                    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                });

                userMarker = L.marker([lat, lng], { icon: greenIcon })
                    .addTo(map)
                    .bindPopup("Lokasi Anda Saat Ini")
                    .openPopup();
            } else {
                userMarker.setLatLng([lat, lng]);
            }

            map.setView([lat, lng]);

        },
        (error) => {
            console.log(error);
        },
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 5000
        }
    );
}

function stopLiveLocation() {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // radius bumi dalam meter
    const toRad = (x) => x * Math.PI / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// HITUNG JARAK
function hitungJarak(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}

if (window.location.pathname.includes("absen.html")) {
    loadHistory();
    loadMap();
    startLiveLocation();

    window.addEventListener("beforeunload", () => {
        stopLiveLocation();
    });
}

