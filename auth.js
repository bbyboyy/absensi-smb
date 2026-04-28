// init supabase
const SUPABASE_URL = "https://tetmchfwcwtsirdghxwo.supabase.co";
const SUPABASE_KEY = "sb_publishable_zpLeYA-F1nhVC4r4O1i_PQ_qnAvtaFi";

window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("auth loaded");

// ==========================================
// LOGOUT BUTTON
// ==========================================
const btnLogout = document.getElementById("btnLogout");

if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
        await logout();
    });
}

// ==========================================
// REQUIRE LOGIN
// ==========================================
window.requireAuth = async function () {
    console.log("requireAuth called");

    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data.user) {
        console.log("User invalid / session expired");

        await supabaseClient.auth.signOut();

        if (!window.location.pathname.includes("login.html")) {
            window.location.replace("login.html");
        }

        return null;
    }

    return data.user;
};

// ==========================================
// REQUIRE ADMIN
// ==========================================
window.requireAdmin = async function () {
    const user = await requireAuth();

    if (!user) return null;

    const { data, error } = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (error || !data || data.role !== "admin") {
        alert("Akses ditolak (admin only)");
        window.location.replace("dashboard.html");
        return null;
    }

    return user;
};

// ==========================================
// LOGOUT
// ==========================================
window.logout = async function () {
    await supabaseClient.auth.signOut();
    window.location.replace("login.html");
};

// ==========================================
// AUTH LISTENER
// Jika session invalid / logout di device lain
// ==========================================
window.listenAuth = function () {
    console.log("listenAuth called");

    supabaseClient.auth.onAuthStateChange(async (event) => {
        console.log("AUTH EVENT:", event);

        if (event === "SIGNED_OUT") {
            if (!window.location.pathname.includes("login.html")) {
                window.location.replace("login.html");
            }
            return;
        }

        if (event === "TOKEN_REFRESHED") {
            const { data } = await supabaseClient.auth.getUser();

            if (!data.user) {
                await supabaseClient.auth.signOut();
            }
        }
    });
};

// ==========================================
// REDIRECT LOGIN PAGE -> DASHBOARD
// Kalau user masih login valid
// ==========================================
window.redirectIfLoggedIn = async function () {
    console.log("redirectIfLoggedIn called");

    const { data, error } = await supabaseClient.auth.getUser();

    if (error || !data.user) {
        return;
    }

    if (!window.location.pathname.includes("dashboard.html")) {
        window.location.replace("dashboard.html");
    }
};