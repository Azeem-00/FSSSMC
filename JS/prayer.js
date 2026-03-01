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
  const coords = await getLocation();
  await loadPrayerTimes(coords.lat, coords.lon);
  startClock();
}

/* =========================================================
   GET GPS LOCATION (HIGH ACCURACY)
========================================================= */

function getLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      return resolve(useIPLocation());
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        updateLocationName(lat, lon);

        resolve({ lat, lon });
      },

      async () => {
        resolve(useIPLocation());
      },

      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      },
    );
  });
}

/* =========================================================
   FALLBACK IP LOCATION
========================================================= */

async function useIPLocation() {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();

    locationEl.textContent = `${data.city}, ${data.country_name}`;

    return {
      lat: data.latitude,
      lon: data.longitude,
    };
  } catch {
    locationEl.textContent = "Lagos, Nigeria";

    return {
      lat: 6.5244,
      lon: 3.3792,
    };
  }
}

/* =========================================================
   GET CITY NAME FROM GPS
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
   LOAD PRAYER TIMES
========================================================= */

async function loadPrayerTimes(lat, lon) {
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
   MAIN CLOCK LOOP
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
  const now = new Date();

  const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

  let active = null;
  let next = null;

  for (let name of prayers) {
    const time = getTimeObject(prayerTimes[name]);

    if (now >= time) active = name;

    if (now < time && !next) next = name;
  }

  /* after Isha → next is Fajr tomorrow */

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
   COUNTDOWN TO NEXT PRAYER
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
   PLAY ADHAN + NOTIFICATION
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
