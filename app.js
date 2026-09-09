// Database Network Configuration Context Setup
const SUPABASE_URL = "https://supabase.co";

// ATTENTION: Paste your original active token inside the quotes below!
const SUPABASE_ANON_KEY = "DEIN_ECHTER_PUBLISHABLE_KEY_HIER"; 

let supabaseClient = null;

// UI Overlay Controller
function toggleModal(show) {
    const modalElement = document.getElementById('adminModal');
    if (modalElement) {
        modalElement.style.display = show ? 'flex' : 'none';
    }
}

// Real-Time Countdown Timer Logic Engine
function initializeCountdown() {
    // Setting up target race timing data marker (e.g. Next Saturday)
    const targetRaceDate = new Date();
    targetRaceDate.setDate(targetRaceDate.getDate() + (6 - targetRaceDate.getDay()) % 7);
    targetRaceDate.setHours(11, 0, 0, 0); 

    function updateClock() {
        const now = new Date().getTime();
        const difference = targetRaceDate.getTime() - now;

        if (difference <= 0) {
            document.getElementById('countdown').innerHTML = "<span style='color: #e8186d; font-weight:700;'>RACE WEEKEND LIVE</span>";
            clearInterval(clockInterval);
            return;
        }

        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        document.getElementById('days').innerText = String(days).padStart(2, '0');
        document.getElementById('hours').innerText = String(hours).padStart(2, '0');
        document.getElementById('mins').innerText = String(minutes).padStart(2, '0');
        document.getElementById('secs').innerText = String(seconds).padStart(2, '0');
    }

    updateClock();
    const clockInterval = setInterval(updateClock, 1000);
}

// Asynchronous Data Query Layer (GET)
async function fetchChampionships() {
    const listContainer = document.getElementById('championships-list');
    
    if (!window.supabase) {
        setTimeout(fetchChampionships, 150);
        return;
    }

    if (!supabaseClient) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    try {
        let { data: championships, error } = await supabaseClient
            .from('championships')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;
        listContainer.innerHTML = '';

        if (championships.length === 0) {
            listContainer.innerHTML = `<p style="color: var(--text-gray)">No active championships deployed to grid database matrix.</p>`;
            return;
        }

        championships.forEach(item => {
            listContainer.innerHTML += `
                <div class="series-card">
                    <span class="badge">${item.tier}</span>
                    <h3>${item.code}</h3>
                    <p style="color: var(--text-gray); font-size: 0.9rem; font-weight:600;">Lineup Capacity: ${item.drivers} Slots Registered</p>
                </div>
            `;
        });
    } catch (err) {
        console.error(err);
        listContainer.innerHTML = `<p style="color: #e8186d">Failed to extract active championship data grids.</p>`;
    }
}

// Secured Transaction Interceptor (POST)
async function handleAdminSubmit(e) {
    e.preventDefault();
    
    if (!supabaseClient && window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    const seriesCode = document.getElementById('seriesCode').value;
    const seriesTier = document.getElementById('seriesTier').value;
    const seriesDrivers = parseInt(document.getElementById('seriesDrivers').value);

    const adminEmail = prompt("Enter Authorized Admin Email:");
    const adminPassword = prompt("Enter Administrative Access Password:");

    if (!adminEmail || !adminPassword) return;

    try {
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
            email: adminEmail,
            password: adminPassword,
        });

        if (authError) throw new Error(authError.message);

        const { error: insertError } = await supabaseClient
            .from('championships')
            .insert([{ code: seriesCode, tier: seriesTier, drivers: seriesDrivers }]);

        if (insertError) throw insertError;

        alert("Database row updated successfully!");
        await supabaseClient.auth.signOut();

        fetchChampionships();
        toggleModal(false);
        document.getElementById('db-control-form').reset();
    } catch (err) {
        alert("Transaction Aborted: " + err.message);
    }
}

// App Initialization Hooks
window.addEventListener('load', () => {
    document.getElementById('adminBtn').addEventListener('click', () => toggleModal(true));
    document.getElementById('closeAdminBtn').addEventListener('click', () => toggleModal(false));
    document.getElementById('db-control-form').addEventListener('submit', handleAdminSubmit);
    
    initializeCountdown();
    fetchChampionships();
});
