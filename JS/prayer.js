// =====================================
// FSSMC MOSQUE PRAYER SYSTEM (FULL)
// Fast, Cached, Reliable Version
// =====================================

// =====================================
// CONFIG
// =====================================

// Default mosque fallback location
const MOSQUE_LAT = 8.4896;
const MOSQUE_LON = 4.5421;

// Prayer API
const API_URL =
  "https://api.aladhan.com/v1/timings?latitude={lat}&longitude={lng}&method=4&school=1";

// Prayers list
const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

// Cache keys
const CACHE_CITY = "mosque_city";
const CACHE_LAT = "mosque_lat";
const CACHE_LON = "mosque_lon";

// Elements
const locationEl = document.getElementById("location");
const countdownEl = document.getElementById("countdown");

// =====================================
// GLOBAL VARIABLES
// =====================================

let prayerTimes = {};
let countdownInterval = null;

let adhanAudio = new Audio("/AUDIO/adhan.mp3");
adhanAudio.preload = "auto";

let audioUnlocked = false;
let adhanPlayedToday = {};
let lastResetDay = new Date().getDate();

// =====================================
// SHOW INITIAL STATE
// =====================================

locationEl.innerText = "Detecting location...";

// =====================================
// AUDIO UNLOCK (Required for browsers)
// =====================================

function unlockAudio() {
  if (audioUnlocked) return;

  adhanAudio
    .play()
    .then(() => {
      adhanAudio.pause();
      adhanAudio.currentTime = 0;
      audioUnlocked = true;
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
    })
    .catch(() => {});
}

document.addEventListener("click", unlockAudio);
document.addEventListener("touchstart", unlockAudio);

// =====================================
// NOTIFICATION PERMISSION
// =====================================

if ("Notification" in window) {
  Notification.requestPermission();
}

// =====================================
// LOCATION HANDLING
// =====================================

async function getLocation() {
  locationEl.innerText = "Detecting location...";

  // Use cached location instantly if available
  const cachedCity = localStorage.getItem(CACHE_CITY);
  const cachedLat = localStorage.getItem(CACHE_LAT);
  const cachedLon = localStorage.getItem(CACHE_LON);

  if (cachedCity && cachedLat && cachedLon) {
    locationEl.innerText = cachedCity;
    fetchPrayerTimes(parseFloat(cachedLat), parseFloat(cachedLon));
  }

  // Update with real GPS location
  if ("geolocation" in navigator) {
    const timeoutPromise = new Promise(
      (resolve) => setTimeout(resolve, 10000, null), // 10s timeout
    );

    const geoPromise = new Promise((resolve) =>
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        (err) => resolve(null),
        { enableHighAccuracy: true, maximumAge: 0 },
      ),
    );

    const position = await Promise.race([geoPromise, timeoutPromise]);

    if (position) {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      fetchPrayerTimes(lat, lon);

      const cityCountry = await getCityFast(lat, lon);
      locationEl.innerText = cityCountry;

      localStorage.setItem(CACHE_CITY, cityCountry);
      localStorage.setItem(CACHE_LAT, lat);
      localStorage.setItem(CACHE_LON, lon);
    } else {
      // Fallback if GPS fails
      locationEl.innerText = "Lagos, Nigeria";
      fetchPrayerTimes(MOSQUE_LAT, MOSQUE_LON);
    }
  } else {
    locationEl.innerText = "Lagos, Nigeria";
    fetchPrayerTimes(MOSQUE_LAT, MOSQUE_LON);
  }
}

// =====================================
// FAST CITY DETECTION
// =====================================

async function getCityFast(lat, lon) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`,
      { headers: { "Accept-Language": "en" } },
    );
    const data = await res.json();
    const addr = data.address || {};

    const state =
      addr.state ||
      addr.region ||
      addr.county ||
      addr.city ||
      addr.town ||
      addr.village ||
      "";
    const country = addr.country || "";

    if (state && country) return state + ", " + country;
    if (country) return country;

    return "Unknown location";
  } catch {
    return "Unknown location";
  }
}

// =====================================
// FETCH PRAYER TIMES
// =====================================

async function fetchPrayerTimes(lat, lon) {
  try {
    const res = await fetch(
      API_URL.replace("{lat}", lat).replace("{lng}", lon),
    );
    const data = await res.json();

    prayerTimes = data.data.timings;

    displayTimes();
    startCountdown();
  } catch {
    locationEl.innerText = "Failed to load prayer times";
  }
}

// =====================================
// DISPLAY PRAYER TIMES
// =====================================

function displayTimes() {
  prayers.forEach((name) => {
    const adhan = prayerTimes[name];
    document.getElementById("adhan" + name).innerText = formatTime(adhan);
    const iqamah = new Date(createDate(adhan).getTime() + 10 * 60000);
    document.getElementById("solat" + name).innerText =
      "Iqamah: " + formatTimeFromDate(iqamah);
  });
}

// =====================================
// PLAY ADHAN
// =====================================

function playAdhan(name) {
  if (!audioUnlocked) return;
  if (adhanPlayedToday[name]) return;

  adhanPlayedToday[name] = true;
  adhanAudio.currentTime = 0;
  adhanAudio.play().catch(() => {});

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Adhan Time", {
      body: name + " prayer time",
      icon: "/IMAGE/FSSMC ICON.jpeg",
    });
  }
}

// =====================================
// COUNTDOWN SYSTEM
// =====================================

function startCountdown() {
  if (countdownInterval) clearInterval(countdownInterval);

  countdownInterval = setInterval(() => {
    const now = new Date();

    // Daily reset
    if (now.getDate() !== lastResetDay) {
      adhanPlayedToday = {};
      lastResetDay = now.getDate();
    }

    let found = false;

    for (let name of prayers) {
      const adhanTime = createDate(prayerTimes[name]);
      const iqamahTime = new Date(adhanTime.getTime() + 10 * 60000);

      if (
        now.getHours() === adhanTime.getHours() &&
        now.getMinutes() === adhanTime.getMinutes() &&
        now.getSeconds() === 0
      ) {
        playAdhan(name);
      }

      if (now < adhanTime) {
        updateCountdown(name + " Adhan in", adhanTime);
        found = true;
        break;
      }

      if (now >= adhanTime && now < iqamahTime) {
        updateCountdown(name + " Iqamah in", iqamahTime);
        found = true;
        break;
      }
    }

    if (!found) {
      const fajr = createDate(prayerTimes["Fajr"]);
      fajr.setDate(fajr.getDate() + 1);
      updateCountdown("Fajr Adhan in", fajr);
    }

    updateActiveCard();
  }, 1000);
}

// =====================================
// UPDATE COUNTDOWN
// =====================================

function updateCountdown(label, target) {
  const now = new Date();
  const diff = target - now;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  countdownEl.innerText = label + " " + pad(h) + ":" + pad(m) + ":" + pad(s);
}

// =====================================
// ACTIVE CARD
// =====================================

function updateActiveCard() {
  document
    .querySelectorAll(".card")
    .forEach((card) => card.classList.remove("active"));
  const current = getCurrentPrayer();
  if (current) document.getElementById(current).classList.add("active");
}

function getCurrentPrayer() {
  const now = new Date();
  let current = null;
  prayers.forEach((name) => {
    const time = createDate(prayerTimes[name]);
    if (now >= time) current = name;
  });
  return current;
}

// =====================================
// HELPERS
// =====================================

function createDate(timeStr) {
  const now = new Date();
  const parts = timeStr.split(":");
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    parseInt(parts[0]),
    parseInt(parts[1]),
    0,
  );
}

function formatTime(timeStr) {
  const parts = timeStr.split(":");
  return pad(parts[0]) + ":" + pad(parts[1]);
}

function formatTimeFromDate(date) {
  return pad(date.getHours()) + ":" + pad(date.getMinutes());
}

function pad(n) {
  return n.toString().padStart(2, "0");
}

// =====================================
// START APP
// =====================================

getLocation();
