// ⚠️ SUPABASE CONFIGURATION
// Replace these placeholders with your actual Supabase Project details:
const SUPABASE_URL = "YOUR_SUPABASE_URL_HERE";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY_HERE";

// Initialize Supabase Client
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentSessionUser = null;
let allRaces = [];

// DOM Elements loaded
document.addEventListener("DOMContentLoaded", () => {
    initApp();
    setupAdminTrigger();
});

function initApp() {
    fetchRaces();
    fetchStandings();
    setupFilters();
    setupLoginForm();
    setupRaceForm();
}

// 1. DATA FETCHING (RACES)
async function fetchRaces() {
    try {
        const { data, error } = await supabase
            .from('races')
            .select('*')
            .order('race_date', { ascending: true });

        if (error) throw error;
        
        allRaces = data || [];
        renderRaces(allRaces);
        startCountdown(allRaces);
    } catch (err) {
        console.error("Error fetching races:", err.message);
        document.getElementById("races-list").innerHTML = `<div class='status-msg'>Failed to load schedules. Check Supabase connection.</div>`;
    }
}

function renderRaces(races) {
    const listContainer = document.getElementById("races-list");
    if (races.length === 0) {
        listContainer.innerHTML = "<p style='color: #888;'>No upcoming races scheduled.</p>";
        return;
    }

    listContainer.innerHTML = races.map(race => {
        const dateObj = new Date(race.race_date);
        const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        
        return `
            <div class="race-card" data-series="${race.series}">
                <span class="badge ${race.series.toLowerCase()}">${race.series}</span>
                <div class="track-name">${race.track_name}</div>
                <div class="race-meta">${race.country || ''} | ${formattedDate}</div>
            </div>
        `;
    }).join('');
}

// 2. DATA FETCHING (STANDINGS)
async function fetchStandings() {
    try {
        const { data, error } = await supabase
            .from('standings')
            .select('*')
            .order('series', { ascending: true })
            .order('position', { ascending: true });

        if (error) throw error;
        renderStandings(data || []);
    } catch (err) {
        console.error("Error fetching standings:", err.message);
        document.getElementById("standings-list").innerHTML = `<p style='color: #888;'>Standings table empty or RLS blocked.</p>`;
    }
}

function renderStandings(standings) {
    const listContainer = document.getElementById("standings-list");
    if (standings.length === 0) {
        listContainer.innerHTML = "<p style='color: #888;'>No standings calculated yet.</p>";
        return;
    }

    listContainer.innerHTML = standings.map(row => `
        <div class="standing-card">
            <span class="badge ${row.series.toLowerCase()}">${row.series}</span>
            <div class="track-name" style="font-size: 1.1rem;">P${row.position} ${row.driver_name}</div>
            <div class="race-meta">${row.team_name || 'Privateer'} — <strong>${row.points} PTS</strong></div>
        </div>
    `).join('');
}

// 3. FILTER LOGIC
function setupFilters() {
    const buttons = document.querySelectorAll(".filter-btn");
    buttons.forEach(btn => {
        btn.addEventListener("click", (e) => {
            buttons.forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");
            
            const selectedSeries = e.target.getAttribute("data-series");
            if (selectedSeries === "all") {
                renderRaces(allRaces);
            } else {
                const filtered = allRaces.filter(r => r.series === selectedSeries);
                renderRaces(filtered);
            }
        });
    });
}

// 4. LIVE HERO COUNTDOWN TIMER
function startCountdown(races) {
    const countdownEl = document.getElementById("countdown");
    const upcoming = races.find(r => new Date(r.race_date) > new Date());

    if (!upcoming) {
        countdownEl.innerText = "NO UPCOMING RACES";
        return;
    }

    const targetDate = new Date(upcoming.race_date).getTime();

    const interval = setInterval(() => {
        const now = new Date().getTime();
        const difference = targetDate - now;

        if (difference < 0) {
            clearInterval(interval);
            countdownEl.innerText = "RACE IS LIVE / CONCLUDED";
            fetchRaces();
            return;
        }

        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        countdownEl.innerText = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }, 1000);
}

// 5. HIDDEN ADMIN TOGGLE MECHANISM
function setupAdminTrigger() {
    const adminLink = document.getElementById("admin-nav");
    const adminSection = document.getElementById("admin-trigger");
    adminLink.addEventListener("click", (e) => {
        e.preventDefault();
        adminSection.classList.toggle("hidden");
        adminSection.scrollIntoView({ behavior: 'smooth' });
    });
}

// 6. ADMIN AUTH (LOGIN WITH SUPABASE)
function setupLoginForm() {
    const form = document.getElementById("login-form");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("admin-email").value;
        const password = document.getElementById("admin-password").value;

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            alert("Verification Failed: " + error.message);
        } else {
            currentSessionUser = data.user;
            form.classList.add("hidden");
            document.getElementById("admin-dashboard").classList.remove("hidden");
        }
    });
}

// 7. ADMIN FORM SUBMISSION (ADD NEW RACE)
function setupRaceForm() {
    const form = document.getElementById("race-form");
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const raceData = {
            series: document.getElementById("race-series").value,
            track_name: document.getElementById("race-track").value,
            country: document.getElementById("race-country").value,
            race_date: new Date(document.getElementById("race-date").value).toISOString()
        };

        const { data, error } = await supabase
            .from('races')
            .insert([raceData]);

        if (error) {
            alert("Database write error: " + error.message);
        } else {
            alert("SUCCESS! Race published live to Supabase.");
            form.reset();
            fetchRaces(); // Instantly update view data state
        }
    });
}
