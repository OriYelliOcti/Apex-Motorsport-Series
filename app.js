const SUPABASE_URL = "https://supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_-N5JX1LBBNUHxnOe9E5R4A_tyqDzvLT";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentSessionUser = null;
let allRaces = [];

document.addEventListener("DOMContentLoaded", () => {
    runIntroCinematic();
    initApp();
    setupAdminTrigger();
});

function runIntroCinematic() {
    const overlay = document.getElementById("intro-overlay");
    const wrapper = document.getElementById("app-wrapper");

    setTimeout(() => {
        if (overlay) overlay.style.opacity = "0";
        
        setTimeout(() => {
            if (overlay) overlay.classList.add("hidden");
            if (wrapper) wrapper.classList.add("shake-trigger");
            
            setTimeout(() => {
                if (wrapper) wrapper.classList.remove("shake-trigger");
            }, 500);
        }, 300);

    }, 1500);
}

function initApp() {
    fetchRaces();
    fetchStandings();
    setupFilters();
    setupLoginForm();
    setupRaceForm();
}

async function fetchRaces() {
    try {
        const { data, error } = await supabaseClient
            .from('races')
            .select('*')
            .order('race_date', { ascending: true });

        if (error) throw error;
        
        allRaces = data || [];
        renderRaces(allRaces);
        startCountdown(allRaces);
    } catch (err) {
        console.error(err.message);
        const list = document.getElementById("races-list");
        if (list) list.innerHTML = `<div class='race-meta'>Failed to load data arrays from Supabase.</div>`;
    }
}

function renderRaces(races) {
    const listContainer = document.getElementById("races-list");
    if (!listContainer) return;

    if (races.length === 0) {
        listContainer.innerHTML = "<p style='color: #666;'>No upcoming events on the grid.</p>";
        return;
    }

    listContainer.innerHTML = races.map(race => {
        const dateObj = new Date(race.race_date);
        const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
        const badgeClass = race.series.toLowerCase().replace(" ", "-");
        
        return `
            <div class="race-card" data-series="${race.series}">
                <span class="badge ${badgeClass}">${race.series.toUpperCase()}</span>
                <div class="track-name">${race.track_name}</div>
                <div class="race-meta">${race.country || ''} // ${formattedDate}</div>
            </div>
        `;
    }).join('');
}

async function fetchStandings() {
    try {
        const { data, error } = await supabaseClient
            .from('standings')
            .select('*')
            .order('series', { ascending: true })
            .order('position', { ascending: true });

        if (error) throw error;
        renderStandings(data || []);
    } catch (err) {
        console.error(err.message);
        const list = document.getElementById("standings-list");
        if (list) list.innerHTML = `<p style='color: #666;'>Standings block array currently unavailable.</p>`;
    }
}

function renderStandings(standings) {
    const listContainer = document.getElementById("standings-list");
    if (!listContainer) return;

    if (standings.length === 0) {
        listContainer.innerHTML = "<p style='color: #666;'>Standings data stack currently uncalculated.</p>";
        return;
    }

    listContainer.innerHTML = standings.map(row => {
        const badgeClass = row.series.toLowerCase().replace(" ", "-");
        return `
            <div class="standing-card">
                <span class="badge ${badgeClass}">${row.series.toUpperCase()}</span>
                <div class="track-name" style="font-size: 1.1rem;">P${row.position} ${row.driver_name}</div>
                <div class="race-meta">${row.team_name || 'PRIVATEER'} — <strong>${row.points} PTS</strong></div>
            </div>
        `;
    }).join('');
}

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

function startCountdown(races) {
    const countdownEl = document.getElementById("countdown");
    if (!countdownEl) return;

    const upcoming = races.find(r => new Date(r.race_date) > new Date());

    if (!upcoming) {
        countdownEl.innerText = "GRID CLEAR / NO RACES";
        return;
    }

    const targetDate = new Date(upcoming.race_date).getTime();

    const interval = setInterval(() => {
        const now = new Date().getTime();
        const difference = targetDate - now;

        if (difference < 0) {
            clearInterval(interval);
            countdownEl.innerText = "SESSION LIVE";
            fetchRaces();
            return;
        }

        const days = String(Math.floor(difference / (1000 * 60 * 60 * 24))).padStart(2, '0');
        const hours = String(Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0');
        const minutes = String(Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
        const seconds = String(Math.floor((difference % (1000 * 60)) / 1000)).padStart(2, '0');

        countdownEl.innerText = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }, 1000);
}

function setupAdminTrigger() {
    const adminLink = document.getElementById("admin-nav");
    const adminSection = document.getElementById("admin-trigger");
    if (adminLink && adminSection) {
        adminLink.addEventListener("click", (e) => {
            e.preventDefault();
            adminSection.classList.toggle("hidden");
            adminSection.scrollIntoView({ behavior: 'smooth' });
        });
    }
}

function setupLoginForm() {
    const form = document.getElementById("login-form");
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("admin-email").value;
            const password = document.getElementById("admin-password").value;

            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                alert("Verification Failed: " + error.message);
            } else {
                currentSessionUser = data.user;
                form.classList.add("hidden");
                const dashboard = document.getElementById("admin-dashboard");
                if (dashboard) dashboard.classList.remove("hidden");
            }
        });
    }
}

function setupRaceForm() {
    const form = document.getElementById("race-form");
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const raceData = {
                series: document.getElementById("race-series").value,
                track_name: document.getElementById("race-track").value,
                country: document.getElementById("race-country").value,
                race_date: new Date(document.getElementById("race-date").value).toISOString()
            };

            const { data, error } = await supabaseClient
                .from('races')
                .insert([raceData]);

            if (error) {
                alert("Database write error: " + error.message);
            } else {
                alert("SUCCESS! Event posted live into the AMS matrix.");
                form.reset();
                fetchRaces();
            }
        });
    }
}
