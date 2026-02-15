const API_URL =
  "https://api.aladhan.com/v1/timings?latitude={lat}&longitude={lng}&method=1";

const locationEl = document.getElementById("location");
const countdownEl = document.getElementById("countdown");

const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

let prayerTimes = {};
let adhanPlayed = {};
let adhanAudio = new Audio("/AUDIO/adhan.mp3");
adhanAudio.preload = "auto";

let audioUnlocked = false;
let countdownInterval = null;

// AUDIO UNLOCK SYSTEM (required for phone & laptop)
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
      console.log("Adhan audio unlocked");
    })
    .catch(() => {});
}

document.addEventListener("click", unlockAudio);
document.addEventListener("touchstart", unlockAudio);

// GET LOCATION
function getLocation() {
  if (!navigator.geolocation) {
    locationEl.innerText = "Location not supported";
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      fetchPrayerTimes(lat, lng);
      getCity(lat, lng);
    },
    () => {
      locationEl.innerText = "Location not found";
    },
  );
}

// GET CITY & COUNTRY
async function getCity(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
    );
    const data = await res.json();

    const city =
      data.address.city ||
      data.address.town ||
      data.address.village ||
      data.address.state ||
      "Location detected";

    const country = data.address.country || "";

    locationEl.innerText = country ? `${city}, ${country}` : city;
  } catch {
    locationEl.innerText = "Location detected";
  }
}

// FETCH PRAYER TIMES
async function fetchPrayerTimes(lat, lng) {
  try {
    const res = await fetch(
      API_URL.replace("{lat}", lat).replace("{lng}", lng),
    );
    const data = await res.json();

    prayerTimes = data.data.timings;

    displayTimes();
    startCountdown();
  } catch {
    locationEl.innerText = "Failed to load prayer times";
  }
}

// DISPLAY TIMES
function displayTimes() {
  prayers.forEach((name) => {
    const time = prayerTimes[name];

    document.getElementById("adhan" + name).innerText = formatTime(time);

    let adhanDate = createDate(time);
    let iqamahDate = new Date(adhanDate.getTime() + 10 * 60000);

    document.getElementById("solat" + name).innerText =
      "Iqamah: " + formatTimeFromDate(iqamahDate);
  });
}

// COUNTDOWN SYSTEM
function startCountdown() {
  if (countdownInterval) clearInterval(countdownInterval);

  countdownInterval = setInterval(() => {
    const now = new Date();

    let nextPrayer = null;
    let nextTime = null;

    for (let name of prayers) {
      let time = createDate(prayerTimes[name]);
      if (time > now) {
        nextPrayer = name;
        nextTime = time;
        break;
      }
    }

    if (!nextPrayer) {
      nextPrayer = "Fajr";
      nextTime = createDate(prayerTimes["Fajr"]);
      nextTime.setDate(nextTime.getDate() + 1);
    }

    updateCountdown(nextPrayer, nextTime);
    updateActiveCard();
    checkAdhan(now);
  }, 1000);
}

// UPDATE COUNTDOWN DISPLAY
function updateCountdown(name, time) {
  const now = new Date();
  const diff = time - now;

  const hours = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);

  countdownEl.innerText =
    name + " Adhan in " + pad(hours) + ":" + pad(mins) + ":" + pad(secs);
}

// PLAY ADHAN EXACTLY ON TIME
function checkAdhan(now) {
  prayers.forEach((name) => {
    const time = createDate(prayerTimes[name]);

    if (
      now.getHours() === time.getHours() &&
      now.getMinutes() === time.getMinutes() &&
      now.getSeconds() === 0 &&
      !adhanPlayed[name]
    ) {
      playAdhan();
      adhanPlayed[name] = true;
    }
  });
}

// PLAY ADHAN
function playAdhan() {
  if (!audioUnlocked) return;

  adhanAudio.currentTime = 0;
  adhanAudio.play().catch(() => {});

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Adhan Time", {
      body: "It's time for prayer",
      icon: "/IMAGE/FSSMC ICON.jpeg",
    });
  }
}

// ACTIVE PRAYER CARD
function updateActiveCard() {
  document.querySelectorAll(".card").forEach((card) => {
    card.classList.remove("active");
  });

  const current = getCurrentPrayer();

  if (current) {
    document.getElementById(current).classList.add("active");
  }
}

// GET CURRENT PRAYER
function getCurrentPrayer() {
  const now = new Date();

  let current = null;

  prayers.forEach((name) => {
    const time = createDate(prayerTimes[name]);
    if (now >= time) current = name;
  });

  return current;
}

// HELPERS
function createDate(timeStr) {
  const now = new Date();
  const [h, m] = timeStr.split(":");
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0);
}

function formatTime(timeStr) {
  const [h, m] = timeStr.split(":");
  return pad(h) + ":" + pad(m);
}

function formatTimeFromDate(date) {
  return pad(date.getHours()) + ":" + pad(date.getMinutes());
}

function pad(n) {
  return n.toString().padStart(2, "0");
}

// REQUEST NOTIFICATION PERMISSION
if ("Notification" in window) {
  Notification.requestPermission();
}

// START
getLocation();
