var canvas = document.getElementById("compass");
var ctx = canvas.getContext("2d");
var qiblaText = document.getElementById("qiblaText");

var center = canvas.width / 2;
var radius = canvas.width / 2 - 10;

var KAABA_LAT = 21.4225;
var KAABA_LON = 39.8262;

var userLat = 9.082;
var userLon = 8.6753;

var deviceHeading = 0;
var displayRotation = 0;
var needleDisplayAngle = 0;

var isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

if ("geolocation" in navigator) {
  navigator.geolocation.watchPosition(
    function (pos) {
      userLat = pos.coords.latitude;
      userLon = pos.coords.longitude;
    },
    function () {},
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 },
  );
}

function startCompass() {
  function handle(e) {
    if (e.webkitCompassHeading !== undefined) {
      deviceHeading = e.webkitCompassHeading;
    } else if (e.alpha !== null) {
      deviceHeading = 360 - e.alpha;
    }
    deviceHeading = (deviceHeading + 360) % 360;
  }
  window.addEventListener("deviceorientationabsolute", handle, true);
  window.addEventListener("deviceorientation", handle, true);
}

function enableOrientation() {
  if (!("DeviceOrientationEvent" in window)) return;

  if (typeof DeviceOrientationEvent.requestPermission === "function") {
    var btn = document.createElement("button");
    btn.innerText = "Enable Compass";
    btn.style.padding = "10px 20px";
    btn.style.fontSize = "16px";
    btn.style.marginTop = "15px";
    document.body.appendChild(btn);

    btn.onclick = async function () {
      var permission = await DeviceOrientationEvent.requestPermission();
      if (permission === "granted") {
        startCompass();
        btn.remove();
      }
    };
  } else {
    startCompass();
  }
}

enableOrientation();

function calculateQibla(lat, lon) {
  var phiK = (KAABA_LAT * Math.PI) / 180;
  var lambdaK = (KAABA_LON * Math.PI) / 180;
  var phi = (lat * Math.PI) / 180;
  var lambda = (lon * Math.PI) / 180;

  var y = Math.sin(lambdaK - lambda);
  var x =
    Math.cos(phi) * Math.tan(phiK) - Math.sin(phi) * Math.cos(lambdaK - lambda);

  var angle = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return angle;
}

function getCompassDirection(angle) {
  var dirs = [
    "North",
    "North-East",
    "East",
    "South-East",
    "South",
    "South-West",
    "West",
    "North-West",
  ];
  return dirs[Math.round(angle / 45) % 8];
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  var qiblaAngle = calculateQibla(userLat, userLon);

  var targetRotation = isMobile ? deviceHeading : 0;
  var diffDial = targetRotation - displayRotation;
  if (diffDial > 180) diffDial -= 360;
  if (diffDial < -180) diffDial += 360;
  displayRotation += diffDial * 0.1;

  ctx.save();
  ctx.translate(center, center);
  if (isMobile) ctx.rotate((displayRotation * Math.PI) / 180);

  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#228B22";
  ctx.stroke();

  for (var i = 0; i < 360; i += 15) {
    var angle = (i * Math.PI) / 180;
    var len = i % 45 === 0 ? 12 : 6;
    ctx.beginPath();
    ctx.moveTo(
      Math.cos(angle) * (radius - len),
      Math.sin(angle) * (radius - len),
    );
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    ctx.lineWidth = i % 45 === 0 ? 3 : 1;
    ctx.strokeStyle = "#228B22";
    ctx.stroke();
  }

  ctx.fillStyle = "#006400";
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("N", 0, -radius + 25);
  ctx.fillText("S", 0, radius - 25);
  ctx.fillText("E", radius - 25, 0);
  ctx.fillText("W", -radius + 25, 0);
  ctx.restore();

  var targetNeedle = isMobile
    ? (qiblaAngle - deviceHeading + 360) % 360
    : qiblaAngle;
  var diffNeedle = targetNeedle - needleDisplayAngle;
  if (diffNeedle > 180) diffNeedle -= 360;
  if (diffNeedle < -180) diffNeedle += 360;
  needleDisplayAngle += diffNeedle * 0.08;

  ctx.save();
  ctx.translate(center, center);
  ctx.rotate((needleDisplayAngle * Math.PI) / 180);

  ctx.beginPath();
  ctx.moveTo(0, -radius + 20);
  ctx.lineTo(8, 0);
  ctx.lineTo(-8, 0);
  ctx.closePath();
  ctx.fillStyle = "#228B22";
  ctx.fill();

  ctx.fillStyle = "#000";
  ctx.fillRect(-8, -radius + 5, 16, 16);
  ctx.fillStyle = "#FFD700";
  ctx.fillRect(-8, -radius + 5, 16, 5);
  ctx.restore();

  qiblaText.innerText =
    "Qibla: " +
    qiblaAngle.toFixed(1) +
    "° (" +
    getCompassDirection(qiblaAngle) +
    ")";
  requestAnimationFrame(draw);
}

draw();
