// init supabase
const SUPABASE_URL = "https://tetmchfwcwtsirdghxwo.supabase.co";
const SUPABASE_KEY = "sb_publishable_zpLeYA-F1nhVC4r4O1i_PQ_qnAvtaFi";

window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("auth loaded");

document.getElementById("btnLogout")
    .addEventListener("click", async () => {
        await logout();
});

// 🔐 cek login
window.requireAuth = async function () {
    const { data } = await supabaseClient.auth.getSession();

    if (!data.session) {
        window.location.replace("login.html");
        return null;
    }

    return data.session.user;
};

// 🔐 cek admin
window.requireAdmin = async function () {
    const user = await window.requireAuth();
    if (!user) return;

    const { data } = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!data || data.role !== "admin") {
        alert("Akses ditolak (admin only)");
        window.location.replace("dashboard.html");
    }
};

// 🚪 logout
window.logout = async function () {
    await supabaseClient.auth.signOut();
    window.location.replace("login.html");
};

// 🔁 auto logout listener
window.listenAuth = function () {
    supabaseClient.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") {
            window.location.replace("login.html");
        }
    });
};

// 🔁 redirect kalau sudah login
window.redirectIfLoggedIn = async function () {
    const { data } = await supabaseClient.auth.getSession();

    if (data.session) {
        window.location.replace("dashboard.html");
    }
};