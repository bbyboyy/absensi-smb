import { OFFICE_CONFIG, TIME_CONFIG } from "./config.js";

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
// loadAttendance();
loadAttendanceTable();


// =================== CRUD USER ===================

async function createUser() {
    try {
        setLoading("btnAddUser", true, "Processing Data...");
        const email = document.getElementById("newEmail").value;
        const password = document.getElementById("newPassword").value;
        const name = document.getElementById("newName").value;
        const role = document.getElementById("newRole").value;

        const { data } = await supabaseClient.auth.getSession();
        if (!data.session) {
            alert("Session habis, silakan login ulang");
            window.location.replace("login.html");
            return;
        }
        const token = data.session.access_token;

        setLoading("btnAddUser",true, "Sending Data...");
        const res = await fetch("https://backend-absensi-0hkl.onrender.com/create-user", {
        // const res = await fetch("http://localhost:3000/create-user", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({ email, password, name, role })
        });

        const result = await res.json();

        if (result.error) {
            alert("Error: " + result.error);
        } else {
            alert("User berhasil dibuat");
            loadUsers();

            window.document.getElementById("newEmail").value = "";
            window.document.getElementById("newPassword").value = "";
            window.document.getElementById("newName").value = "";   
        }
    } catch (err) {
        console.error(err);
        alert("Server error / koneksi bermasalah");
    } finally {
        setLoading("btnAddUser",false);
    }
}

function setLoading(btnId, isLoading, text = "") {
    const btn = document.getElementById(btnId);

    if (isLoading) {
        btn.disabled = true;
        btn.innerText = text;
        btn.classList.add("opacity-70", "cursor-not-allowed");

        btn.classList.remove("bg-green-500", "hover:bg-green-600");
        btn.classList.add("bg-gray-400", "hover:bg-gray-500");

        document.body.classList.add("cursor-wait");
    } else {
        btn.disabled = false;
        btn.innerText = "Tambah User";
        btn.classList.remove("opacity-70", "cursor-not-allowed");

        btn.classList.remove("bg-gray-400", "hover:bg-gray-500");
        btn.classList.add("bg-green-500", "hover:bg-green-600");

        document.body.classList.remove("cursor-wait");
    }
}


async function loadUsers() {
    const { data } = await supabaseClient
        .from('profiles')
        .select('*');

    const container = document.getElementById("userList");
    container.innerHTML = "";

    const userSelect = document.getElementById("userAttendance");
    userSelect.innerHTML = '<option value="">Pilih User</option>';
    data.forEach(user => {
        container.innerHTML += `
            <div class="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm mb-2 hover:shadow transition">
                
                <!-- LEFT -->
                <div>
                    <p class="font-medium text-gray-800">
                        ${user.name}
                    </p>
                    <p class="text-xs text-gray-500">
                        ${user.role}
                    </p>
                </div>

                <!-- RIGHT -->
                <button
                    class="btn-delete flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition"
                        
                        data-id="${user.id}">
                    
                    <svg xmlns="http://www.w3.org/2000/svg" 
                        fill="none" viewBox="0 0 24 24" stroke-width="1.5" 
                        stroke="currentColor" class="w-4 h-4">
                        <path stroke-linecap="round" stroke-linejoin="round" 
                            d="M6 7.5h12M9 7.5v9m6-9v9M4.5 7.5h15m-13.5 0L6.75 5.25A1.5 1.5 0 018.25 4h7.5a1.5 1.5 0 011.5 1.25L18 7.5"/>
                    </svg>

                    <span>Delete</span>
                </button>

            </div>
        `;

        // add user to dropdown for attendance input
        if (userSelect) {
            userSelect.innerHTML += `
                <option value="${user.id}">${user.name}</option>
            `;
        }
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const userId = e.currentTarget.dataset.id;
        // deleteUser(userId);
        console.log("Delete user with ID:", userId);
        if (confirm("Yakin hapus user ini?")) {
            deleteUser(userId);
        }
    });
});
}


async function deleteUser(id) {
    console.log("Delete user with ID:", id);
    if (!confirm("Jika User dihapus, maka data absensi juga akan hilang. Yakin?")) return;

    try {

        const { data } = await supabaseClient.auth.getSession();
        if (!data.session) {
            alert("Session habis, login ulang");
            window.location.replace("login.html");
            return;
        }
        const token = data.session.access_token;

        const res = await fetch(`https://backend-absensi-0hkl.onrender.com/delete-user/${id}`, {
        // const res = await fetch(`http://localhost:3000/delete-user/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": "Bearer " + token
            }
        });

        const result = await res.json();

        if (result.error) {
            alert("Error: " + result.error);
        } else {
            alert("User berhasil dihapus");
            loadUsers(); // refresh list
            loadAttendanceTable(); // refresh attendance table in case there are records related to this user
        }
    } catch (err) {
        console.error(err);
        alert("Server error / koneksi bermasalah");
    } 
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

async function loadAttendanceTable() {
    const { data, error } = await supabaseClient
        .from("attendance_view")
        .select("*")
        .order("tanggal", { ascending: true });

    console.log("DATA:", data);
    console.log("ERROR:", error);

    if (error) {
        alert("ERROR: " + error.message);
        return;
    }

    if (!data) {
        alert("Data kosong");
        return;
    }

    const dateMap = {};

    data.forEach(item => {
        const d = new Date(item.tanggal);
        const month = getMonthName(d);
        const day = getDay(d);

        if (!dateMap[month]) {
            dateMap[month] = new Set();
        }

        dateMap[month].add(day);
    });

    // convert ke array & sort
    for (let m in dateMap) {
        dateMap[m] = Array.from(dateMap[m]).sort((a, b) => a - b);
    }

    const users = {};

    data.forEach(item => {
        const name = item.name || "Unknown";
        const d = new Date(item.tanggal);
        const key = `${getMonthName(d)}-${getDay(d)}`;

        if (!users[name]) users[name] = {};
        users[name][key] = item.status;
    });

    //RENDER TABLE HEADER
    let headHTML = "";

    // ROW 1 (BULAN)
    headHTML += `<tr class="bg-blue-300 text-center font-semibold">
        <th rowspan="2" class="border p-2">No</th>
        <th rowspan="2" class="border p-2">Nama</th>
    `;

    for (let month in dateMap) {
        headHTML += `<th colspan="${dateMap[month].length}" class="border p-2">
            ${month}
        </th>`;
    }

    headHTML += `</tr>`;

    // ROW 2 (TANGGAL)
    headHTML += `<tr class="bg-blue-200 text-center">`;

    for (let month in dateMap) {
        dateMap[month].forEach(day => {
            headHTML += `<th class="border p-2">${day}</th>`;
        });
    }

    headHTML += `</tr>`;

    document.getElementById("rekapHead").innerHTML = headHTML;
    //END RENDER TABLE HEADER

    //RENDER TABLE BODY
    let bodyHTML = "";
    let no = 1;

    for (const name in users) {

        bodyHTML += `<tr class="text-center">
            <td class="border p-2">${no++}</td>
            <td class="border p-2 text-left font-medium">${name}</td>
        `;

        for (let month in dateMap) {
            dateMap[month].forEach(day => {

                const key = `${month}-${day}`;
                const status = users[name][key] || "";

                let color = "";

                if (status === "Hadir") color = "bg-green-200";
                else if (status === "Izin") color = "bg-orange-200";
                else if (status === "Terlambat") color = "bg-yellow-200";

                bodyHTML += `
                    <td class="border p-2 ${color}">
                        ${status}
                    </td>
                `;
            });
        }

        bodyHTML += `</tr>`;
    }

    document.getElementById("rekapBody").innerHTML = bodyHTML;
    //END RENDER TABLE BODY
}

async function addAttendance() {
    const userId = document.getElementById("userAttendance").value;
    const status = document.getElementById("statusAttendance").value;
    const reason = document.getElementById("reasonAttendance").value.trim();

    if (!userId || !status) {
        alert("User dan status wajib diisi");
        return;
    }

    if (status === "Izin" && !reason) {
        alert("Alasan wajib diisi untuk status Izin");
        return;
    }

    setLoading("btnAddAttendance", true, "Processing Data...");

    try {
        const { data } = await supabaseClient.auth.getSession();

        if (!data.session) {
            alert("Session habis");
            return;
        }

        const token = data.session.access_token;

        const res = await fetch("https://backend-absensi-0hkl.onrender.com/add-attendance", {
        // const res = await fetch("http://localhost:3000/add-attendance", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({
                userid: userId,
                latitude: OFFICE_CONFIG.LAT,
                longitude: OFFICE_CONFIG.LNG,
                status: status,
                reason: reason
            })
        });

        const result = await res.json();

        if (result.error) {
            alert(result.error);
        } else {
            alert("Absen berhasil");
            loadAttendanceTable();
            document.getElementById("reasonAttendance").value = "";
        }

    } catch (err) {
        console.error(err);
        alert("Server error");
    } finally {
        setLoading("btnAddAttendance", false);
    }
}

function getMonthName(date) {
    return date.toLocaleString("id-ID", { month: "long" });
}

function getDay(date) {
    return date.getDate();
}

document.addEventListener('DOMContentLoaded', () => {
    const btnAddAttendance = document.getElementById('btnAddAttendance');
    btnAddAttendance.addEventListener('click', addAttendance);

    const btnCreateUser = document.getElementById('btnAddUser');
    btnCreateUser.addEventListener('click', createUser);
});