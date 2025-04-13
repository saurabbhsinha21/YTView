let chart, data = [], labels = [], interval;
let spikeTimes = [];

function startTracking() {
  interval = setInterval(fetchData, 15000); // fetch every 15 seconds
  fetchData();
}

function stopTracking() {
  clearInterval(interval);
}

async function fetchData() {
  const videoId = document.getElementById("videoId").value;
  const response = await fetch(`https://yt.lemnoslife.com/noKey/videos?part=statistics&id=${videoId}`);
  const json = await response.json();
  const views = parseInt(json.items[0].statistics.viewCount);
  const now = new Date();
  const timeLabel = now.toLocaleTimeString();

  labels.push(timeLabel);
  data.push(views);

  detectSpike(views, now);

  if (chart) chart.destroy();
  chart = new Chart(document.getElementById('viewChart').getContext('2d'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Views',
        data: data,
        borderColor: 'blue',
        fill: true,
        backgroundColor: 'rgba(0,0,255,0.1)'
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: false
        }
      }
    }
  });

  updateStats(views);
}

function detectSpike(currentViews, currentTime) {
  const len = data.length;
  if (len < 2) return;

  const diff = currentViews - data[len - 2];
  if (diff > 5000) { // Define spike threshold
    spikeTimes.push(currentTime);
  }
}

function updateStats(currentViews) {
  const targetViews = parseInt(document.getElementById("targetViews").value);
  const viewsLeft = targetViews - currentViews;
  const viewsLeftEl = document.getElementById("viewsLeft");
  const forecastEl = document.getElementById("forecast");
  const spikeForecastEl = document.getElementById("spikeForecast");
  const timeLeftEl = document.getElementById("timeLeft");
  const viewsPerMinRequiredEl = document.getElementById("viewsPerMinRequired");
  const viewsNext5MinEl = document.getElementById("viewsNext5Min");

  viewsLeftEl.textContent = viewsLeft.toLocaleString();

  // Time Left
  const targetTime = document.getElementById("targetTime").value;
  const now = new Date();
  const [h, m] = targetTime.split(':');
  const future = new Date(now);
  future.setHours(h, m, 0, 0);

  let secondsLeft = (future - now) / 1000;
  if (secondsLeft < 0) secondsLeft = 0;

  const minsLeft = secondsLeft / 60;
  timeLeftEl.textContent = `${Math.floor(minsLeft)}:${String(Math.floor(secondsLeft % 60)).padStart(2, '0')}`;

  const viewsPerMinRequired = (viewsLeft / minsLeft).toFixed(2);
  viewsPerMinRequiredEl.textContent = isFinite(viewsPerMinRequired) ? viewsPerMinRequired : "-";

  const viewsNext5Min = (viewsPerMinRequired * 5).toFixed(0);
  viewsNext5MinEl.textContent = isFinite(viewsNext5Min) ? viewsNext5Min : "-";

  // Spike Forecast
  if (spikeTimes.length >= 2) {
    const intervals = [];
    for (let i = 1; i < spikeTimes.length; i++) {
      intervals.push((spikeTimes[i] - spikeTimes[i - 1]) / 1000 / 60); // in minutes
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const expectedSpikes = Math.floor(minsLeft / avgInterval);
    spikeForecastEl.textContent = `${expectedSpikes} spike(s) expected (avg every ${avgInterval.toFixed(1)} min)`;
  } else {
    spikeForecastEl.textContent = "-";
  }

  forecastEl.textContent = viewsLeft <= 0 ? "Yes" : "No";
}
