// Database Network Credentials
const SUPABASE_URL = "https://supabase.co";
// TODO: Replace this string with your original sb_publishable_... token
const SUPABASE_ANON_KEY = "DEIN_ECHTER_PUBLISHABLE_KEY_HIER"; 

let supabaseClient = null;

// UI Operational State Controllers
function toggleModal(show) {
    const modalElement = document.getElementById('adminModal');
    if (modalElement) {
        modalElement.style.display = show ? 'flex' : 'none';
    }
}

// Data Pipeline Configuration (GET)
async function fetchChampionships() {
    const listContainer = document.getElementById('championships-list');
    
    if (!window.supabase) {
        setTimeout(fetchChampionships, 100);
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
            listContainer.innerHTML = `<p style="color: var(--text-muted)">No active racing tiers deployed yet.</p>`;
            return;
        }

        championships.forEach(item => {
            listContainer.innerHTML += `
                <div class="series-card">
                    <span class="badge">${item.tier}</span>
                    <h3>${item.code}</h3>
                    <p style="color: var(--text-muted); font-size: 0.9rem;">Grid Lineup: ${item.drivers} Drivers</p>
                </div>
            `;
        });
    } catch (err) {
        console.error("Database extraction error:", err.message);
        listContainer.innerHTML = `<p style="color: #e8186d">Failed to sync with track control network.</p>`;
    }
}

// Administrative Form Handler Engine (POST)
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

    if (!adminEmail || !adminPassword) {
        alert("Transaction aborted. Verification data missing.");
        return;
    }

    try {
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
            email: adminEmail,
            password: adminPassword,
        });

        if (authError) throw new Error("Verification failed: " + authError.message);

        const { error: insertError } = await supabaseClient
            .from('championships')
            .insert([
                { code: seriesCode, tier: seriesTier, drivers: seriesDrivers }
            ]);

        if (insertError) throw insertError;

        alert("Successfully published to live database!");
        await supabaseClient.auth.signOut();

        fetchChampionships();
        toggleModal(false);
        document.getElementById('db-control-form').reset();
    } catch (err) {
        alert("Operation failed: " + err.message);
        console.error(err);
    }
}

// Bootstrap Hook Initialization
window.addEventListener('load', () => {
    // Attach Event Listeners to UI Elements safely
    document.getElementById('adminBtn').addEventListener('click', () => toggleModal(true));
    document.getElementById('closeAdminBtn').addEventListener('click', () => toggleModal(false));
    document.getElementById('db-control-form').addEventListener('submit', handleAdminSubmit);
    
    // Execute live database fetch
    fetchChampionships();
});
