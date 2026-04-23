import { TIME_CONFIG, OFFICE_CONFIG } from "./config.js";
// const SUPABASE_URL = "https://tetmchfwcwtsirdghxwo.supabase.co";
// const SUPABASE_KEY = "sb_publishable_zpLeYA-F1nhVC4r4O1i_PQ_qnAvtaFi";

// const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
// const supabaseClient = window.supabaseClient;
const VAPID_PUBLIC_KEY = "BCHuq5vOKK4XuEGmRc_zRR2NK4upygWqJ2llXgg913hgP12CeB75hMh5TUEA3fwhbxlkdPZsKA2o3BjUr7f5F74";
console.log("OFFICE_CONFIG:", OFFICE_CONFIG);
console.log("TIME_CONFIG:", TIME_CONFIG);

let currentLat = null;
let currentLng = null;
let currentAccuracy = null;

// const ABSEN_START = 6;   // buka jam 06:00
// const LATE_START = 10;   // terlambat mulai 10:00
// const ABSEN_END = 18;    // tutup jam 12:00

// const OFFICE_LAT = -6.262410;
// const OFFICE_LNG = 106.589714;
// const MAX_RADIUS = 20; // meter

// REGISTER SERVICE WORKER
// if ('serviceWorker' in navigator) {
//     navigator.serviceWorker.register('/service-worker.js');
// }

// REGISTER SERVICE WORKER

if ('serviceWorker' in navigator) {
//   navigator.serviceWorker.register('/service-worker.js')
    navigator.serviceWorker.register('/absensi-smb/service-worker.js')
    .then(reg => {
      debugLog("✅ SW Registered");
      console.log("SW Registered", reg);
    })
    .catch(err => {
      debugLog("❌ SW Register Error: " + err.message);
      console.error(err);
    });
}

// CHECK ROLE ADMIN
async function checkRole() {

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const { data, error } = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (error) {
        console.log(error);
        return;
    }

    if (data?.role === "admin") {
        document.getElementById("btnAdmin").style.display = "block";
    }
}

// LOGIN
async function login() {
    console.log("Login Clicked");
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
// async function logout() {
//     await supabaseClient.auth.signOut();
//     window.location.href = "login.html";
// }


// NAVIGATION
function goToAbsen() {
    window.location.href = "absen.html";
}

function goToAdmin() {
    window.location.href = "admin.html";
}

// BTN LISTENER
const btnLogin = document.getElementById("btnLogin");
if (btnLogin) {
    btnLogin.addEventListener("click", login);
}

const btnAbsen = document.getElementById("btnAbsen");
if (btnAbsen) {
    btnAbsen.addEventListener("click", absen);
}

const btnAdmin = document.getElementById("btnAdmin");
if (btnAdmin) {
    btnAdmin.addEventListener("click", goToAdmin);
}

const btnIzin = document.getElementById("btnIzin");
if (btnIzin) {
    btnIzin.addEventListener("click", kirimIzin);
}

// document.getElementById("btnAbsen")
//     .addEventListener("click", async () => {
//         await absen();
// })

// document.getElementById("btnAdmin")
//     .addEventListener("click", async () => {
//         await goToAdmin();
// })

// document.getElementById("btnLogout")
//     .addEventListener("click", async () => {
//         await logout();
// })

// document.getElementById("btnIzin")
//     .addEventListener("click", async () => {
//         await kirimIzin();
// })

// INIT HEADER
async function initHeader() {
    console.log("initHeader called");
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    // ambil profile dari table
    const { data: profile, error } = await supabaseClient
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();

    const now = new Date();

    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };

    let displayName = user.email;

    if (profile && profile.name) {
        displayName = profile.name;
    }

    // document.getElementById("greeting").innerText =
    //     `Selamat Datang, ${displayName} 🙏`;

    document.getElementById("userName").innerText = 
        displayName;

    document.getElementById("todayDate").innerText =
        now.toLocaleDateString("id-ID", options);
}

async function checkTodayAttendance() {

    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) return;

    const today = new Date();
    const day = today.getDay(); // 0 = Minggu
    const hour = today.getHours();

    const statusElement = document.getElementById("attendanceStatus");
    const btnAbsen = document.getElementById("btnAbsen");

    // Default disable dulu
    btnAbsen.disabled = true;

    // Kalau bukan Minggu
    // if (day !== 0) {
    //     statusElement.innerHTML = "⛔ Bukan Hari Absensi";
    //     statusElement.style.color = "gray";
    //     btnAbsen.innerText = "ABSEN TIDAK TERSEDIA";
    //     return;
    // }

    if (hour < TIME_CONFIG.ABSEN_START) {
        statusElement.innerHTML = "⏳ Absensi dibuka pukul 06:00";
        statusElement.style.color = "orange";
        btnAbsen.innerText = "BELUM WAKTU";
        btnAbsen.classList.remove("bg-green-500", "hover:bg-green-600");
        btnAbsen.classList.add("bg-gray-400", "hover:bg-gray-500");
        return;
    }

    if (hour >= TIME_CONFIG.ABSEN_END) {
        statusElement.innerHTML = "⌛ Absensi sudah ditutup (12:00)";
        statusElement.style.color = "red";
        btnAbsen.innerText = "ABSEN DITUTUP";
        btnAbsen.classList.remove("bg-green-500", "hover:bg-green-600");
        btnAbsen.classList.add("bg-gray-400", "hover:bg-gray-500");
        return;
    }

    // Ambil tanggal hari ini format YYYY-MM-DD
    const todayStr = today.toISOString().split("T")[0];

    const { data, error } = await supabaseClient
        .from("attendance")
        .select("*")
        .eq("userid", user.id)
        .gte("timestamp", todayStr + "T00:00:00")
        .lte("timestamp", todayStr + "T23:59:59");

    if (error) {
        console.log(error);
        return;
    }

    if (data.length > 0) {
        statusElement.innerHTML = "✅ Sudah Absen Hari Ini";
        statusElement.style.color = "green";
        btnAbsen.innerText = "SUDAH ABSEN";
        btnAbsen.disabled = true;
    } else {
        statusElement.innerHTML = "❌ Belum Absen Hari Ini";
        statusElement.style.color = "red";
        btnAbsen.innerText = "ABSEN HADIR";
        btnAbsen.disabled = false;
    }

    if (btnAbsen.disabled) {
        btnAbsen.classList.remove("bg-green-500", "hover:bg-green-600");
        btnAbsen.classList.add("bg-gray-400", "hover:bg-gray-500");
    }
    else {
        btnAbsen.classList.remove("bg-gray-400", "hover:bg-gray-500");
        btnAbsen.classList.add("bg-green-500", "hover:bg-green-600");
    }
}

// ABSEN
// async function absen() {
//     // alert("Absen Clicked");
//     const statusText = document.getElementById("status");

//     if (!navigator.geolocation) {
//         alert("GPS tidak didukung");
//         return;
//     }

//     navigator.geolocation.getCurrentPosition(async (position) => {

//         const lat = position.coords.latitude;
//         const lng = position.coords.longitude;
        
//         console.log("OFFICE:", OFFICE_LAT, OFFICE_LNG);
//         console.log("USER:", lat, lng);

//         // statusText.innerText = `Lokasi: ${lat}, ${lng}`;

//         const user = await supabaseClient.auth.getUser();

//         if (!user.data.user) {
//             alert("User tidak valid");
//             return;
//         }

//         // VALIDASI JAM
//         const hour = new Date().getHours();
//         let status = "Hadir";
//         if (hour >= LATE_START) {
//             status = "Terlambat";
//         }

//         const jarak = hitungJarak(lat, lng, OFFICE_LAT, OFFICE_LNG);

//         if (jarak > MAX_RADIUS) {
//             alert("Di luar area absen");
//             return;
//         }

//         // INSERT DB
//         const { error } = await supabaseClient
//             .from('attendance')
//             .insert([
//                 {
//                     userid: user.data.user.id,
//                     latitude: lat,
//                     longitude: lng,
//                     status: status
//                 }
//             ]);

//         if (error) {
//             alert("Gagal absen");
//             console.log(error);
//             return;
//         }

//         alert("Absen berhasil (" + status + ")");
//         await checkTodayAttendance();

//     });
// }

async function absen() {
    // console.log("Absen Clicked");
    try {

        setLoading(true, "📍 Getting Location...");

        // const position = await getLocation();
        // const position = await getLocationSmart();

        if (!currentLat || !currentLng) {
            alert("Location not available, please wait a moment...");
            return;
        }

        const lat = currentLat;
        const lng = currentLng;

        setLoading(true, "📏 Calculating Distance...");

        const jarak = hitungJarak(lat, lng, OFFICE_CONFIG.LAT, OFFICE_CONFIG.LNG);

        if (jarak > OFFICE_CONFIG.MAX_RADIUS) {
            throw new Error("Di luar area absen");
        }

        setLoading(true, "📡 Validating User...");

        const { data } = await supabaseClient.auth.getUser();

        if (!data.user) throw new Error("User tidak valid");

        setLoading(true, "📡 Sending Data...");
        const hour = new Date().getHours();
        let status = hour >= TIME_CONFIG.LATE_START ? "Terlambat" : "Hadir";

        const { error } = await supabaseClient
            .from('attendance')
            .insert([{
                userid: data.user.id,
                latitude: lat,
                longitude: lng,
                status: status
            }]);

        if (error) throw error;

        alert("Absen berhasil (" + status + ")");

        await checkTodayAttendance();
        loadMyAttendance();
        loadMySummary();
    } catch (err) {

        console.error(err);
        alert(err.message || err);

    } finally {
        setLoading(false);
    }
}

function setLoading(isLoading, text = "⏳ Memproses...") {

    const btn = document.getElementById("btnAbsen");

    if (isLoading) {
        btn.disabled = true;
        btn.innerText = text;
        btn.classList.add("opacity-70", "cursor-not-allowed");

        document.body.classList.add("cursor-wait");
    } else {
        // btn.disabled = false;
        // btn.innerText = "Absen Sekarang";
        checkTodayAttendance();
        btn.classList.remove("opacity-70", "cursor-not-allowed");

        document.body.classList.remove("cursor-wait");
    }
}

// IZIN
async function kirimIzin() {

    const reason = document.getElementById("izinReason").value.trim();

    if (!reason) {
        alert("Isi alasan terlebih dahulu.");
        return;
    }

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const { error } = await supabaseClient
        .from("attendance")
        .insert([
            {
                userid: user.id,
                latitude: null,
                longitude: null,
                status: "Izin",
                reason: reason
            }
        ]);

    if (error) {
        alert("Gagal kirim izin.");
        console.log(error);
        return;
    }

    alert("Izin berhasil dikirim 🙏");

    document.getElementById("izinReason").value = "";

    await checkTodayAttendance();
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

    const container = document.getElementById("riwayatList");
    container.innerHTML = "";

    if (data.length === 0) {
        container.innerHTML = "<p>Belum ada data absen</p>";
        return;
    }

    data.forEach(item => {
        // let statusClass = "";
        // let statusIcon = "";

        // if (item.status === "Hadir") {
        //     statusClass = "status-hadir";
        //     statusIcon = "✅";
        // }

        // if (item.status === "Terlambat") {
        //     statusClass = "status-terlambat";
        //     statusIcon = "⏰";
        // }

        // if (item.status === "Izin") {
        //     statusClass = "status-izin";
        //     statusIcon = "📝";
        // }

        // const tanggal = new Date(item.timestamp).toLocaleString();
        // console.log(tanggal)

        container.innerHTML += `
            <div class="bg-white border-l-4 ${getStatusColor(item.status)}
                        p-3 rounded-lg shadow-sm">

                <div class="font-medium">${item.status}</div>
                <div class="text-sm text-gray-500">
                    ${new Date(item.timestamp).toLocaleString()}
                </div>
                ${item.reason ? `<div class="text-sm mt-1">🗒️ ${item.reason}</div>` : ""}
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

        L.circle([OFFICE_CONFIG.LAT, OFFICE_CONFIG.LNG], {
            radius: OFFICE_CONFIG.MAX_RADIUS,
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

async function loadMyAttendance() {
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        alert("User tidak login");
        return;
    }

    const { data, error } = await supabaseClient
        .from("attendance_user_view")
        .select("*")
        .order("timestamp", { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    renderMyAttendance(data);
    initScrollShadow();
}

function renderMyAttendance(data) {

    let html = "";

    data.forEach(item => {

        let bg = "bg-gray-50";
        let badge = "";

        if (item.status === "Hadir") {
            bg = "bg-green-50";
            badge = "bg-green-500";
        }
        else if (item.status === "Izin") {
            bg = "bg-orange-50";
            badge = "bg-orange-500";
        }
        else if (item.status === "Terlambat") {
            bg = "bg-yellow-50";
            badge = "bg-yellow-500";
        }


        html += `
        <div class="p-3 rounded-xl shadow-sm ${bg}">
            
            <div class="flex justify-between items-center">
                <span class="px-2 py-1 text-white text-xs rounded ${badge}">
                    ${item.status}
                </span>

                <span class="text-xs text-gray-500">
                    ${new Date(item.timestamp).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                    })}
                </span>
            </div>

            <div class="text-sm text-gray-700 mt-1">
                ${new Date(item.timestamp).toLocaleTimeString()}
            </div>

            ${item.reason ? `
                <div class="text-xs text-gray-500 mt-1">
                    📝 ${item.reason}
                </div>
            ` : ""}
        </div>
        `;
    });

    document.getElementById("riwayatList").innerHTML = html;
}

async function loadMySummary() {
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
        alert("User tidak login");
        return;
    }

    const { data, error } = await supabaseClient
        .from("attendance_user_view")
        .select("status");

    if (error) {
        console.error(error);
        return;
    }

    renderSummary(data);
}

function renderSummary(data) {

    let hadir = 0;
    let izin = 0;
    let terlambat = 0;

    data.forEach(item => {
        if (item.status === "Hadir") hadir++;
        else if (item.status === "Izin") izin++;
        else if (item.status === "Terlambat") terlambat++;
    });

    document.getElementById("totalHadir").innerText = hadir;
    document.getElementById("totalIzin").innerText = izin;
    document.getElementById("totalTelat").innerText = terlambat;
}

function initScrollShadow() {

    const list = document.getElementById("riwayatList");
    const topShadow = document.getElementById("topShadow");
    const bottomShadow = document.getElementById("bottomShadow");

    function updateShadow() {

        const scrollTop = list.scrollTop;
        const scrollHeight = list.scrollHeight;
        const clientHeight = list.clientHeight;

        // TOP shadow
        if (scrollTop > 5) {
            topShadow.style.opacity = "1";
        } else {
            topShadow.style.opacity = "0";
        }

        // BOTTOM shadow
        if (scrollTop + clientHeight < scrollHeight - 5) {
            bottomShadow.style.opacity = "1";
        } else {
            bottomShadow.style.opacity = "0";
        }
    }

    list.addEventListener("scroll", updateShadow);

    // trigger awal
    updateShadow();
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
                OFFICE_CONFIG.LAT,
                OFFICE_CONFIG.LNG
            );

            // const info = document.getElementById("distanceInfo");
            const box = document.getElementById("distanceInfo");
            box.classList.remove("hidden");

            const accuracy = position.coords.accuracy;
            let statusText = "";
            let statusColor = "";

            //SET GLOBAL VARIABLE
            currentLat = lat;
            currentLng = lng;
            currentAccuracy = accuracy;

            // if (distance <= MAX_RADIUS) {
            //     info.innerHTML = `✅ Dalam radius kantor (${distance.toFixed(1)} meter)`;
            //     info.style.color = "green";
            // } else {
            //     info.innerHTML = `❌ Di luar radius (${distance.toFixed(1)} meter)`;
            //     info.style.color = "red";
            // }

            if (distance <= OFFICE_CONFIG.MAX_RADIUS) {
                box.className = "mt-3 p-3 rounded-xl text-sm font-medium bg-green-50 text-green-700";
                statusText = "✅ Dalam radius vihara";
            } else {
                box.className = "mt-3 p-3 rounded-xl text-sm font-medium bg-red-50 text-red-700";
                statusText = "❌ Di luar radius";
            }

            box.innerHTML = `
                ${statusText}<br>
                📏 Jarak: ${distance.toFixed(1)} meter<br>
                📡 Akurasi GPS: ±${accuracy.toFixed(1)} meter
            `;   

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

function getStatusColor(status) {
    if (status === "Hadir")
        return "border-green-500";

    if (status === "Terlambat")
        return "border-orange-500";

    if (status === "Izin")
        return "border-blue-500";

    return "border-gray-400";
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

async function subscribePush() {
  console.log("Subscribing to push notifications...");
  alert("Start subscribe");

  const permission = await Notification.requestPermission();
  alert("Permission: " + permission);
  if (permission !== "granted") return;

  const reg = await navigator.serviceWorker.register("/service-worker.js");

  let sub = await reg.pushManager.getSubscription();

  if (!sub) {
    try {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      alert("Berhasil subscribe!");
    } catch (err) {
      alert("Subscribe error: " + err.message);
      return;
    }
  }

  if (!sub) {
    alert("Subscription gagal dibuat");
    return;
  }

  const { data } = await supabaseClient.auth.getUser();

  const { error } = await supabaseClient.from("push_subscriptions").upsert({
    user_id: data.user.id,
    endpoint: sub.endpoint,
    p256dh: sub.toJSON().keys.p256dh,
    auth: sub.toJSON().keys.auth,
    is_active: true
  }, {
    onConflict: "endpoint,user_id"
  });

  if (error) {
    console.error("Failed to upsert subscription:", error);
    alert("Gagal menyimpan subscription: " + error.message);
  }
}

// Toggle Notification Subscription
const toggle = document.getElementById("notifToggle");
const circle = document.getElementById("notifCircle");

let notifOn = false;
if (toggle) {
  toggle.addEventListener("click", async (e) => {
    e.stopPropagation();
    notifOn = !notifOn;

    // UI update
    if (notifOn) {
      toggle.classList.remove("bg-gray-300");
      toggle.classList.add("bg-green-500");

      circle.classList.remove("translate-x-1");
      circle.classList.add("translate-x-6");

      // subscribe ke push
      await subscribePush();

    } else {
      toggle.classList.remove("bg-green-500");
      toggle.classList.add("bg-gray-300");

      circle.classList.remove("translate-x-6");
      circle.classList.add("translate-x-1");

      // ❗ update hanya device ini
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      const { data } = await supabaseClient.auth.getUser();

      if (sub) {
        const { error } = await supabaseClient
          .from("push_subscriptions")
          .update({ is_active: false })
          .eq("endpoint", sub.endpoint)
          .eq("user_id", data.user.id);

        if (error) {
          console.error("Failed to update subscription:", error);
          alert("Gagal update subscription: " + error.message);
        }
      }
    }

    // save ke DB
    // const { data } = await supabaseClient.auth.getUser();

    // await supabaseClient
    //   .from("push_subscriptions")
    //   .update({ is_active: notifOn })
    //   .eq("endpoint", sub.endpoint)
    //   .eq("user_id", data.user.id);

    // // auto subscribe kalau ON
    // if (notifOn) {
    //   await subscribePush();
    // }
  });
}

function debugLog(msg) {
  console.log(msg);
  alert(msg);
}

async function loadNotifState() {
  alert("Standalone: " + window.navigator.standalone);
  debugLog("🔵 loadNotifState start");

  const { data } = await supabaseClient.auth.getUser();

  if (!data.user) {
    debugLog("❌ User tidak ditemukan");
    return;
  }

  debugLog("✅ User OK: " + data.user.id);

  // cek service worker
  if (!('serviceWorker' in navigator)) {
    debugLog("❌ Service Worker tidak support");
    setToggle(false);
    return;
  }

  debugLog("✅ Service Worker supported");

//   const reg = await navigator.serviceWorker.ready;

  let reg;

  try {
    reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error("SW ready timeout")), 5000)
        )
    ]);

    debugLog("✅ Service Worker ready");
  } catch (err) {
    debugLog("❌ SW READY ERROR: " + err.message);
    setToggle(false);
    return;
  }  

  debugLog("✅ Service Worker ready");

  // cek pushManager
  if (!reg.pushManager) {
    debugLog("❌ PushManager tidak tersedia (iOS belum support / belum PWA)");
    setToggle(false);
    return;
  }

  debugLog("✅ PushManager tersedia");

  let sub = null;

  try {
    sub = await reg.pushManager.getSubscription();
    debugLog("📡 getSubscription result: " + (sub ? "ADA" : "NULL"));
  } catch (err) {
    debugLog("❌ Error getSubscription: " + err.message);
    setToggle(false);
    return;
  }

  if (!sub) {
    debugLog("⚠️ Belum ada subscription di device ini");
    setToggle(false);
    return;
  }

  debugLog("✅ Endpoint: " + sub.endpoint);

  // query DB
  const { data: dbSub, error } = await supabaseClient
    .from("push_subscriptions")
    .select("is_active")
    .eq("endpoint", sub.endpoint)
    .eq("user_id", data.user.id)
    .single();

  if (error) {
    debugLog("❌ DB Error: " + error.message);
    setToggle(false);
    return;
  }

  if (!dbSub) {
    debugLog("⚠️ Tidak ditemukan di DB");
    setToggle(false);
    return;
  }

  debugLog("✅ DB is_active: " + dbSub.is_active);

  setToggle(dbSub.is_active);

  debugLog("🟢 Toggle updated");
}

function setToggle(isOn) {
  const toggle = document.getElementById("notifToggle");
  const circle = document.getElementById("notifCircle");

  if (!toggle || !circle) return;

  if (isOn) {
    toggle.classList.add("bg-green-500");
    toggle.classList.remove("bg-gray-300");

    circle.classList.add("translate-x-6");
    circle.classList.remove("translate-x-1");
  } else {
    toggle.classList.add("bg-gray-300");
    toggle.classList.remove("bg-green-500");

    circle.classList.add("translate-x-1");
    circle.classList.remove("translate-x-6");
  }
}

const profileBtn = document.getElementById("profileBtn");
const dropdown = document.getElementById("profileDropdown");

if (profileBtn && dropdown) {
    profileBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("hidden");
    });

    document.addEventListener("click", () => {
        dropdown.classList.add("hidden");
    });

    profileBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("show");
    });

    document.addEventListener("click", () => {
        dropdown.classList.remove("show");
    });
}

if (window.location.pathname.includes("absen.html")) {
    loadHistory();
    loadMap();
    startLiveLocation();

    window.addEventListener("beforeunload", () => {
        stopLiveLocation();
    });
}

// document.addEventListener("DOMContentLoaded", async () => {

//     if (window.location.pathname.includes("dashboard.html")) {
//         await initHeader();
//         await checkTodayAttendance();
//         await checkRole();
//         loadMap();
//         startLiveLocation();
//         // loadHistory();
//         loadMyAttendance();
//         loadMySummary();
//     }
// });

window.addEventListener("load", async () => {
    const path = window.location.pathname;

    if (path.includes("dashboard.html")) {
        try {
            await initHeader();
            await checkTodayAttendance();
            await checkRole();
            await loadNotifState();
            loadMap();
            startLiveLocation();
            loadMyAttendance();
            loadMySummary();
        } catch (err) {
            console.error(err);
            alert("Error: " + (err.message || err));
        }
    }
});
