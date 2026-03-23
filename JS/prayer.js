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
let adhanPlayed = {};
let timer = null;

/* =========================================================
   REQUEST NOTIFICATION PERMISSION
========================================================= */
if ("Notification" in window && Notification.permission !== "granted") {
  Notification.requestPermission();
}

/* =========================================================
   START SYSTEM
========================================================= */
init();

async function init() {
  locationEl.textContent = "Detecting location... (allow GPS)";

  const coords = await getLocation();

  await loadPrayerTimes(coords.lat, coords.lon);

  startClock();
}

/* =========================================================
   GET LOCATION (GPS FIRST → FALLBACK → MANUAL)
========================================================= */
function getLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      return resolve(useIPLocation());
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        updateLocationName(lat, lon);

        resolve({ lat, lon });
      },

      async (err) => {
        console.warn("GPS failed:", err.message);

        alert(
          "Location access denied or failed.\nUsing approximate location.\nFor best accuracy, enable GPS.",
        );

        resolve(useIPLocation());
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  });
}

/* =========================================================
   FALLBACK: IP LOCATION (MORE ACCURATE)
========================================================= */
async function useIPLocation() {
  try {
    const res = await fetch("https://ipwho.is/");
    const data = await res.json();

    if (data.success) {
      locationEl.textContent = `${data.city}, ${data.country}`;

      return {
        lat: data.latitude,
        lon: data.longitude,
      };
    } else {
      throw new Error("IP lookup failed");
    }
  } catch {
    locationEl.textContent = "Location not found";

    return askManualLocation();
  }
}

/* =========================================================
   MANUAL LOCATION (FINAL FALLBACK)
========================================================= */
async function askManualLocation() {
  const city = prompt("Enter your city (e.g. London):");
  const country = prompt("Enter your country (e.g. UK):");

  if (!city || !country) {
    locationEl.textContent = "Using default (Lagos, Nigeria)";
    return { lat: 6.5244, lon: 3.3792 };
  }

  locationEl.textContent = `${city}, ${country}`;

  // Use Aladhan city API instead
  const url = `${API_BASE}/timingsByCity?city=${city}&country=${country}&method=${METHOD}`;

  const res = await fetch(url);
  const data = await res.json();

  prayerTimes = data.data.timings;

  displayTimes();

  startClock();

  return null; // prevents lat/lon flow
}

/* =========================================================
   REVERSE GEOCODE (GPS → CITY NAME)
========================================================= */
async function updateLocationName(lat, lon) {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
    );

    const data = await res.json();

    const city =
      data.city ||
      data.locality ||
      data.principalSubdivision ||
      "Your Location";

    const country = data.countryName || "";

    locationEl.textContent = `${city}, ${country}`;
  } catch {
    locationEl.textContent = "Location detected";
  }
}

/* =========================================================
   LOAD PRAYER TIMES (LAT/LON)
========================================================= */
async function loadPrayerTimes(lat, lon) {
  if (!lat || !lon) return;

  const today = new Date();

  const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;

  const url = `${API_BASE}/timings?latitude=${lat}&longitude=${lon}&method=${METHOD}&school=${SCHOOL}&date=${dateStr}`;

  const res = await fetch(url);
  const data = await res.json();

  prayerTimes = data.data.timings;

  displayTimes();
}

/* =========================================================
   DISPLAY TIMES
========================================================= */
function displayTimes() {
  const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

  prayers.forEach((name) => {
    document.getElementById("adhan" + name).textContent = formatTime(
      prayerTimes[name],
    );

    document.getElementById("solat" + name).textContent =
      "Iqamah: " + formatTime(addMinutes(prayerTimes[name], 10));
  });
}

/* =========================================================
   CLOCK LOOP
========================================================= */
function startClock() {
  if (timer) clearInterval(timer);

  updatePrayer();

  timer = setInterval(updatePrayer, 1000);
}

/* =========================================================
   UPDATE PRAYER STATUS
========================================================= */
function updatePrayer() {
  if (!prayerTimes.Fajr) return;

  const now = new Date();

  const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

  let active = null;
  let next = null;

  for (let name of prayers) {
    const time = getTimeObject(prayerTimes[name]);

    if (now >= time) active = name;

    if (now < time && !next) next = name;
  }

  if (!next) next = "Fajr";

  highlightPrayer(active);
  updateCountdown(next);
  playAdhan(active);
}

/* =========================================================
   HIGHLIGHT CURRENT PRAYER
========================================================= */
function highlightPrayer(name) {
  if (!name || currentPrayer === name) return;

  Object.values(prayerCards).forEach((card) => card.classList.remove("active"));

  prayerCards[name].classList.add("active");

  currentPrayer = name;
}

/* =========================================================
   COUNTDOWN
========================================================= */
function updateCountdown(name) {
  let nextTime = getTimeObject(prayerTimes[name]);

  const now = new Date();

  if (nextTime <= now) nextTime.setDate(nextTime.getDate() + 1);

  const diff = nextTime - now;

  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  countdownEl.textContent = `Next: ${name} in ${h}h ${m}m ${s}s`;
}

/* =========================================================
   ADHAN + NOTIFICATION
========================================================= */
function playAdhan(name) {
  if (!name) return;

  const now = new Date();
  const time = getTimeObject(prayerTimes[name]);

  if (Math.abs(now - time) < 1000 && !adhanPlayed[name]) {
    adhanAudio.currentTime = 0;
    adhanAudio.play().catch(() => {});

    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(`Adhan: ${name}`, {
        body: "Iqamah in 10 minutes",
        icon: "masjid.png",
      });
    }

    adhanPlayed[name] = true;
  }
}

/* =========================================================
   TIME HELPERS
========================================================= */
function getTimeObject(time) {
  const [h, m] = time.split(":");

  const d = new Date();

  d.setHours(h, m, 0, 0);

  return d;
}

function addMinutes(time, mins) {
  const d = getTimeObject(time);

  d.setMinutes(d.getMinutes() + mins);

  return d.toTimeString().slice(0, 5);
}

function formatTime(time) {
  const d = getTimeObject(time);

  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
