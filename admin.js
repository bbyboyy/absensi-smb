// Cek apakah admin
async function checkAdmin() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    console.log("USER ID:", user.id);

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const { data } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    console.log("Profile data:", data);
    console.log("Error:", error);

    if (!data || data.role !== 'admin') {
        alert("Bukan admin");
        window.location.href = "dashboard.html";
    }
}

checkAdmin();
loadUsers();
loadAttendance();


// =================== CRUD USER ===================

async function createUser() {
    const email = document.getElementById("newEmail").value;
    const password = document.getElementById("newPassword").value;
    const name = document.getElementById("newName").value;
    const role = document.getElementById("newRole").value;

    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password
    });

    if (error) {
        alert("Gagal buat user");
        return;
    }

    await supabaseClient.from('profiles').insert([
        {
            id: data.user.id,
            name: name,
            role: role
        }
    ]);

    alert("User berhasil dibuat");
    loadUsers();
}


async function loadUsers() {
    const { data } = await supabaseClient
        .from('profiles')
        .select('*');

    const container = document.getElementById("userList");
    container.innerHTML = "";

    data.forEach(user => {
        container.innerHTML += `
            <div>
                ${user.name} (${user.role})
                
                <button onclick="deleteUser(${user.id})" class=" p-2 text-red-600 rounded-full hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50">
                    <svg xmlns="http://www.w3.org" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
                        <path fill-rule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512A48.91 48.91 0 0122.5 6.99v.234l-1.406 7.03a3 3 0 01-2.964 2.526H7.964a3 3 0 01-2.964-2.526L3.5 7.224V6.99a48.91 48.91 0 011.89-2.278 48.817 48.817 0 013.879-.512V4.478c0-1.41 1.28-2.617 2.67-2.617h1.442c1.39 0 2.67 1.207 2.67 2.617zm-6.6 9.61a.75.75 0 01-.9 1.026.75.75 0 01-1.026-.9l1.026-.9zm4.2-.9a.75.75 0 01.9-1.026.75.75 0 011.026.9l-1.026.9zM12 4.5v.001h-.001V4.5H12z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
        `;
    });
}


async function deleteUser(id) {
    await supabaseClient.from('profiles').delete().eq('id', id);
    alert("User dihapus (auth tetap ada, untuk full delete perlu admin API)");
    loadUsers();
}


// =================== ATTENDANCE ===================

async function loadAttendance() {
    const { data } = await supabaseClient
        .from('attendance')
        .select('*')
        .order('timestamp', { ascending: false });

    const container = document.getElementById("attendanceList");
    container.innerHTML = "";

    for (const item of data) {
        const displayName = await getUserProfiles(item.userid); 

        const tanggal = new Date(item.timestamp).toLocaleString();

        container.innerHTML += `
            <div>
                ${displayName} - ${item.status} - ${tanggal}
            </div>
        `;
    }
}

async function getUserProfiles(userid) {
    const { data: profile, error } = await supabaseClient
            .from("profiles")
            .select("name")
            .eq("id", userid)
            .single();
    
    console.log("Profiles : ", profile);   
    console.log("Error : ", error);  
    if (profile && profile.name) {
        return profile.name;
    }
    else return "Unknown"
}