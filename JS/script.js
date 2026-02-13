const DEFAULT_LOCATION = {
  city: "Lagos",
  latitude: 6.5244,
  longitude: 3.3792,
};

const locationText = document.getElementById("location");

function initPrayerTimes() {
  if (!navigator.geolocation) {
    useDefaultLocation("Geolocation not supported");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      fetchPrayerTimes(
        pos.coords.latitude,
        pos.coords.longitude,
        "Your location",
      );
    },
    (err) => {
      console.warn("GPS failed:", err.message);
      useDefaultLocation("Using default location");
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    },
  );
}

function useDefaultLocation(reason) {
  locationText.textContent = `${reason} (Lagos)`;
  fetchPrayerTimes(
    DEFAULT_LOCATION.latitude,
    DEFAULT_LOCATION.longitude,
    DEFAULT_LOCATION.city,
  );
}

function fetchPrayerTimes(lat, lon, label) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const url = `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=5&timezonestring=${tz}`;

  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      const timings = data.data.timings;
      locationText.textContent = `Location: ${label}`;

      updateTable(timings);
      highlightPrayer(timings);
    })
    .catch(() => {
      locationText.textContent = "Failed to load prayer times";
    });
}

function updateTable(times) {
  ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].forEach((p) => {
    const cell = document.querySelector(`tr[data-prayer="${p}"] td:last-child`);
    if (cell) cell.textContent = times[p].split(" ")[0];
  });
}

function highlightPrayer(times) {
  const now = new Date();
  let nextMarked = false;

  Object.entries(times).forEach(([p, time]) => {
    const row = document.querySelector(`tr[data-prayer="${p}"]`);
    if (!row) return;

    row.classList.remove("current", "next");

    const [h, m] = time.split(":").map(Number);
    const t = new Date();
    t.setHours(h, m, 0);

    if (now.getHours() === h && Math.abs(now.getMinutes() - m) <= 5) {
      row.classList.add("current");
    } else if (t > now && !nextMarked) {
      row.classList.add("next");
      nextMarked = true;
    }
  });
}

initPrayerTimes();
