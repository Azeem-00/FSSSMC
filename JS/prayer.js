/* =========================================================
   FSSSMC MOSQUE PRAYER SYSTEM — FINAL VERSION WITH NOTIFICATIONS
========================================================= */

const API_BASE = "https://api.aladhan.com/v1";
const METHOD = 1;
const SCHOOL = 0;

const locationEl = document.getElementById("location");
const countdownEl = document.getElementById("countdown");
const adhanAudio = document.getElementById("adhanAudio");

const prayerCards = {
  Fajr: document.getElementById("Fajr"),
  Dhuhr: document.getElementById("Dhuhr"),
  Asr: document.getElementById("Asr"),
  Maghrib: document.getElementById("Maghrib"),
  Isha: document.getElementById("Isha"),
};

let prayerTimes = {};
let currentPrayer = null;
let adhanPlayed = false;

/* =========================================================
   REQUEST NOTIFICATION PERMISSION
========================================================= */

if ("Notification" in window && Notification.permission !== "granted") {
  Notification.requestPermission();
}

/* =========================================================
   LOCATION DETECTION
========================================================= */

async function detectLocation() {
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      loadPrayerTimes(lat, lon);

      try {
        const geoRes = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
        );
        const data = await geoRes.json();
        const city =
          data.city ||
          data.locality ||
          data.principalSubdivision ||
          "Unknown location";
        const country = data.countryName || "";
        locationEl.textContent = `${city}, ${country}`;
      } catch {
        locationEl.textContent = "Location detected";
      }
    },
    async () => {
      try {
        const ipRes = await fetch("https://ipapi.co/json/");
        const data = await ipRes.json();
        const lat = data.latitude;
        const lon = data.longitude;
        locationEl.textContent = `${data.city}, ${data.country_name}`;
        loadPrayerTimes(lat, lon);
      } catch {
        locationEl.textContent = "Lagos, Nigeria";
        loadPrayerTimes(6.5244, 3.3792);
      }
    },
    { timeout: 5000, maximumAge: 600000 },
  );
}

/* =========================================================
   LOAD PRAYER TIMES
========================================================= */

async function loadPrayerTimes(lat, lon) {
  const now = new Date();
  const dateStr = `${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`;
  const url = `${API_BASE}/timings?latitude=${lat}&longitude=${lon}&method=${METHOD}&school=${SCHOOL}&date=${dateStr}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    prayerTimes = data.data.timings;

    displayTimes();
    updateActivePrayer();
    setInterval(updateActivePrayer, 1000);
  } catch {
    countdownEl.textContent = "Failed to load prayer times";
  }
}

/* =========================================================
   DISPLAY PRAYER TIMES
========================================================= */

function displayTimes() {
  ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].forEach(setPrayer);
}

function setPrayer(name) {
  const time = prayerTimes[name];
  document.getElementById("adhan" + name).textContent = formatTime(time);
  document.getElementById("solat" + name).textContent =
    "Iqamah: " + formatTime(addMinutes(time, 10));
}

/* =========================================================
   TIME HELPERS
========================================================= */

function addMinutes(time, mins) {
  const d = getTimeObject(time);
  d.setMinutes(d.getMinutes() + mins);
  return (
    d.getHours().toString().padStart(2, "0") +
    ":" +
    d.getMinutes().toString().padStart(2, "0")
  );
}

function formatTime(time) {
  const d = getTimeObject(time);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getTimeObject(time) {
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

/* =========================================================
   UPDATE ACTIVE PRAYER
========================================================= */

function updateActivePrayer() {
  const now = new Date();
  const order = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

  let active = null;
  let next = null;

  for (let name of order) {
    const t = getTimeObject(prayerTimes[name]);
    if (now >= t) active = name;
    if (now < t && !next) next = name;
  }

  if (!active) active = "Isha";

  highlight(active);
  updateCountdown(next);
  playAdhan(active);
}

/* =========================================================
   HIGHLIGHT ACTIVE PRAYER
========================================================= */

function highlight(name) {
  if (currentPrayer === name) return;
  Object.values(prayerCards).forEach((c) => c.classList.remove("active"));
  prayerCards[name].classList.add("active");
  currentPrayer = name;
}

/* =========================================================
   COUNTDOWN
========================================================= */

function updateCountdown(next) {
  if (!next) return;
  const now = new Date();
  const nextTime = getTimeObject(prayerTimes[next]);
  const diff = nextTime - now;

  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  countdownEl.textContent = `Next: ${next} in ${h}h ${m}m ${s}s`;
}

/* =========================================================
   PLAY ADHAN + NOTIFICATION
========================================================= */

function playAdhan(name) {
  const now = new Date();
  const t = getTimeObject(prayerTimes[name]);

  if (Math.abs(now - t) < 1000 && !adhanPlayed) {
    // Play adhan audio
    adhanAudio.play().catch(() => {});

    // Show browser notification if allowed
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(`Time for ${name} prayer`, {
        body: "Iqamah in 10 minutes",
        icon: "/path/to/masjid-icon.png", // optional
      });
    }

    adhanPlayed = true;
    setTimeout(() => (adhanPlayed = false), 60000);
  }
}

/* =========================================================
   START
========================================================= */

detectLocation();
