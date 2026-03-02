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
                <button onclick="deleteUser('${user.id}')">Hapus</button>
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
        .order('created_at', { ascending: false });

    const container = document.getElementById("attendanceList");
    container.innerHTML = "";

    data.forEach(item => {
        container.innerHTML += `
            <div>
                ${item.user_id} - ${item.status} - ${item.created_at}
            </div>
        `;
    });
}