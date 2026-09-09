const SUPABASE_URL = "https://supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_-N5JX1LBBNUHxnOe9E5R4A_tyqDzvLT";

let supabaseClient = null;
let allRaces = [];

document.addEventListener("DOMContentLoaded", () => {
    runIntroCinematic();
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        initApp();
    } else {
        console.error("Supabase library not injected.");
    }
    setupAdminTrigger();
    setupLogout();
    setupSmoothNavigation(); // Aktiviert die fehlerfreien Reiter
});

function setupSmoothNavigation() {
    const navLinks = document.querySelectorAll('nav a, .hero-buttons a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');
            if (targetId.startsWith('#')) {
                e.preventDefault();
                const targetSection = document.querySelector(targetId);
                if (targetSection) {
                    // Entfernt "active" von allen Links und setzt es auf den geklickten
                    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                    if (link.classList.contains('nav-link')) {
                        link.classList.add('active');
                    }
                    targetSection.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });
}

function runIntroCinematic() {
    const overlay = document.getElementById("intro-overlay");
    const wrapper = document.getElementById("app-wrapper");
    setTimeout(() => {
        if (overlay) overlay.style.opacity = "0";
        setTimeout(() => {
            if (overlay) overlay.classList.add("hidden");
            if (wrapper) wrapper.classList.add("shake-trigger");
            setTimeout(() => { if (wrapper) wrapper.classList.remove("shake-trigger"); }, 500);
        }, 300);
    }, 1500);
}

function initApp() {
    fetchRaces();
    fetchStandings();
    fetchLineups();
    setupFilters();
    setupLoginForm();
    setupRaceForm();
}

async function fetchRaces() {
    if (!supabaseClient) return;
    try {
        const { data, error } = await supabaseClient.from('races').select('*').order('race_date', { ascending: true });
        if (error) throw error;
        allRaces = data || [];
        renderRaces(allRaces);
        startCountdown(allRaces);
    } catch (err) { console.error(err.message); }
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
    if (!supabaseClient) return;
    try {
        const { data, error } = await supabaseClient.from('standings').select('*').order('series', { ascending: true }).order('points', { ascending: false });
        if (error) throw error;
        renderStandings(data || []);
    } catch (err) { console.error(err.message); }
}

function renderStandings(standings) {
    const listContainer = document.getElementById("standings-list");
    if (!listContainer) return;
    if (standings.length === 0) {
        listContainer.innerHTML = "<p style='color: #666;'>Standings matrix uncalculated.</p>";
        return;
    }

    const grouped = {};
    standings.forEach(row => {
        if (!grouped[row.series]) grouped[row.series] = [];
        grouped[row.series].push(row);
    });

    let htmlOutput = "";
    for (const seriesName in grouped) {
        const drivers = grouped[seriesName];
        const maxPoints = Math.max(...drivers.map(d => d.points || 1));
        
        // Exakt auf eure Wunsch-Farbpalette abgestimmt
        let seriesAccentColor = "#ff1801"; // F1 = Racing Red
        if(seriesName.toLowerCase() === "formula 2") seriesAccentColor = "#00b0f0";
        if(seriesName.toLowerCase() === "formula 3") seriesAccentColor = "#fcc000";
        if(seriesName.toLowerCase() === "gt3") seriesAccentColor = "#ff007f"; // GT3 = Cyber Pink

        htmlOutput += `
            <div class="series-battle-block">
                <div class="battle-series-title">${seriesName.toUpperCase()} // TITLE FIGHT</div>
                <div class="battle-row">
                    ${drivers.map((driver, index) => {
                        const percentage = (driver.points / maxPoints) * 100;
                        return `
                            <div class="driver-duel-line">
                                <div class="duel-position">P${index + 1}</div>
                                <div class="duel-name-box">
                                    <h5>${driver.driver_name}</h5>
                                    <p>${driver.team_name || 'Privateer'}</p>
                                    <div class="duel-progress-bar-wrapper">
                                        <div class="duel-progress-bar-fill" style="width: ${percentage}%; background-color: ${seriesAccentColor};"></div>
                                    </div>
                                </div>
                                <div class="duel-points-total">${driver.points}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    listContainer.innerHTML = htmlOutput;
}

async function fetchLineups() {
    if (!supabaseClient) return;
    try {
        const { data, error } = await supabaseClient.from('lineups').select('*').order('team_name', { ascending: true });
        if (error) return;
        renderLineups(data || []);
    } catch (err) { console.error(err.message); }
}

function renderLineups(lineups) {
    const listContainer = document.getElementById("lineups-list");
    if (!listContainer) return;
    if (lineups.length === 0) {
        listContainer.innerHTML = "<p style='color: #666;'>No registered teams inside the matrix yet.</p>";
        return;
    }

    const teamGrouped = {};
    lineups.forEach(driver => {
        if (!teamGrouped[driver.team_name]) teamGrouped[driver.team_name] = [];
        teamGrouped[driver.team_name].push(driver);
    });

    let htmlOutput = "";
    for (const teamName in teamGrouped) {
        const drivers = teamGrouped[teamName];
        const teamColor = drivers[0].team_color || "#ff1801";

        htmlOutput += `
            <div class="team-lineup-band">
                <div class="team-band-header">
                    <div class="team-band-color-indicator" style="background-color: ${teamColor};"></div>
                    <span>${teamName.toUpperCase()}</span>
                </div>
                <div class="team-drivers-row-grid">
                    ${drivers.map(driver => `
                        <div class="premium-driver-card" style="background-color: var(--panel-dark-sub);">
                            <div class="premium-driver-card-bg-overlay" style="background-color: ${teamColor};"></div>
                            
                                <div class="driver-card-avatar-circle">
                                    <img src="${driver.avatar_url || ''}" onerror="this.src='https://dicebear.com{driver.driver_name}'">
                                </div>
                                <div class="driver-card-meta-strings">
                                    <span>${driver.series || ''}</span>
                                    <h4>${driver.driver_name}</h4>
                                </div>
                            </div>
                            <div class="driver-card-huge-number" style="color: ${teamColor};">${driver.driver_number || '##'}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    listContainer.innerHTML = htmlOutput;
}

function setupFilters() {
    const buttons = document.querySelectorAll(".filter-node");
    buttons.forEach(btn => {
        btn.addEventListener("click", (e) => {
            buttons.forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");
            const selectedSeries = e.target.getAttribute("data-series");
            if (selectedSeries === "all") { renderRaces(allRaces); } 
            else { renderRaces(allRaces.filter(r => r.series === selectedSeries)); }
        });
    });
}

function startCountdown(races) {
    const countdownEl = document.getElementById("countdown");
    if (!countdownEl) return;
    const upcoming = races.find(r => new Date(r.race_date) > new Date());
    if (!upcoming) { countdownEl.innerText = "00:00:00:00"; return; }
    const targetDate = new Date(upcoming.race_date).getTime();

    const interval = setInterval(() => {
        const now = new Date().getTime();
        const difference = targetDate - now;
        if (difference < 0) { clearInterval(interval); countdownEl.innerText = "00:00:00:00"; fetchRaces(); return; }
        const days = String(Math.floor(difference / (1000 * 60 * 60 * 24))).padStart(2, '0');
        const hours = String(Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0');
        const minutes = String(Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
        const seconds = String(Math.floor((difference % (1000 * 60)) / 1000)).padStart(2, '0');
        countdownEl.innerText = `${days}:${hours}:${minutes}:${seconds}`;
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
            if (!supabaseClient) return;
            const email = document.getElementById("admin-email").value;
            const password = document.getElementById("admin-password").value;
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email: email, password: password });
            if (error) { alert("Verification Failed: " + error.message); } 
            else { form.classList.add("hidden"); const dashboard = document.getElementById("admin-dashboard"); if (dashboard) dashboard.classList.remove("hidden"); }
        });
    }
}

function setupRaceForm() {
    const form = document.getElementById("race-form");
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!supabaseClient) return;
            const raceData = {
                series: document.getElementById("race-series").value,
                track_name: document.getElementById("race-track").value,
                country: document.getElementById("race-country").value,
                race_date: new Date(document.getElementById("race-date").value).toISOString()
            };
            const { error } = await supabaseClient.from('races').insert([raceData]);
            if (error) { alert("Database write error: " + error.message); } 
            else { alert("SUCCESS! Event posted live."); form.reset(); fetchRaces(); }
        });
    }
}

function setupLogout() {
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            if (!supabaseClient) return;
            await supabaseClient.auth.signOut();
            window.location.reload();
        });
    }
}
