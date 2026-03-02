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


// ABSEN
async function absen() {
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
        const OFFICE_LAT = -6.2000;
        const OFFICE_LNG = 106.8166;
        const MAX_RADIUS = 100; // meter

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
                    user_id: user.data.user.id,
                    latitude: lat,
                    longitude: lng,
                    status: "VALID"
                }
            ]);

        if (error) {
            alert("Gagal absen");
        } else {
            alert("Absen berhasil");
        }

    });
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