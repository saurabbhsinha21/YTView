const apiKey = "AIzaSyCo5NvQZpziJdaCsOjf1H2Rq-1YeiU9Uq8";

let interval, targetViews = 0, targetTime = null, dataPoints = [], viewChart;

const videoIdInput = document.getElementById("videoId");
const targetViewsInput = document.getElementById("targetViews");
const targetTimeInput = document.getElementById("targetTime");

const currentViewsEl = document.getElementById("currentViews");
const forecastEl = document.getElementById("forecast");
const viewsLeftEl = document.getElementById("viewsLeft");
const stopwatchEl = document.getElementById("stopwatch");
const spikeForecastEl = document.getElementById("spikeForecast");

const loadingEl = document.getElementById("loading");

const timeBasedStats = {
  "last5Min": document.getElementById("last5Min"),
  "last10Min": document.getElementById("last10Min"),
  "last15Min": document.getElementById("last15Min"),
  "last20Min": document.getElementById("last20Min"),
  "last25Min": document.getElementById("last25Min"),
  "last30Min": document.getElementById("last30Min"),
  "avgPerMin": document.getElementById("avgPerMin")
};

document.getElementById("startBtn").addEventListener("click", () => {
  const videoId = videoIdInput.value.trim();
  targetViews = parseInt(targetViewsInput.value.trim());
  const timeParts = targetTimeInput.value.split(":");

  if (!videoId || !targetViews || timeParts.length !== 2) {
    alert("Please enter all fields correctly.");
    return;
  }

  const now = new Date();
  targetTime = new Date();
  targetTime.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0, 0);
  if (targetTime < now) targetTime.setDate(targetTime.getDate() + 1);

  clearInterval(interval);

  loadingEl.classList.remove("hidden");

  if (!viewChart) {
    const ctx = document.getElementById("viewChart").getContext("2d");
    viewChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Views',
          data: [],
          borderColor: '#007bff',
          fill: false
        }]
      },
      options: {
        scales: {
          x: { display: true },
          y: { beginAtZero: true }
        }
      }
    });
  }

  fetchAndUpdate(videoId);
  interval = setInterval(() => fetchAndUpdate(videoId), 60 * 1000);
});

document.getElementById("stopBtn").addEventListener("click", () => {
  clearInterval(interval);
});

function fetchAndUpdate(videoId) {
  fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${apiKey}`)
    .then(res => res.json())
    .then(data => {
      const views = parseInt(data.items?.[0]?.statistics?.viewCount || 0);
      const timestamp = new Date();

      currentViewsEl.textContent = `Current Views: ${views}`;
      dataPoints.push({ timestamp, views });

      if (dataPoints.length > 120) dataPoints.shift();

      updateChart();
      updateForecast(views);
      updateStats();
      updateStopwatch();

      loadingEl.classList.add("hidden");
    })
    .catch(err => {
      console.error("Error fetching data", err);
      loadingEl.classList.add("hidden");
    });
}

function updateChart() {
  const labels = dataPoints.map(dp => dp.timestamp.toLocaleTimeString());
  const values = dataPoints.map(dp => dp.views);
  viewChart.data.labels = labels;
  viewChart.data.datasets[0].data = values;
  viewChart.update();
}

function countSpikes(data) {
  let spikes = 0;
  for (let i = 1; i < data.length - 1; i++) {
    const deltaPrev = data[i].views - data[i - 1].views;
    const deltaNext = data[i + 1].views - data[i].views;
    if (deltaPrev > 100 && deltaNext < 20) spikes++;
  }
  return spikes;
}

function updateForecast(currentViews) {
  const now = new Date();
  const timeLeftMinutes = Math.max((targetTime - now) / (1000 * 60), 0);
  const viewsLeft = targetViews - currentViews;
  const recent = dataPoints.slice(-15);
  const avgPerMin = recent.length > 1
    ? (recent[recent.length - 1].views - recent[0].views) / (recent.length - 1)
    : 0;
  const projected = avgPerMin * timeLeftMinutes;

  const spikeRate = countSpikes(dataPoints) / dataPoints.length * 60; // spike per hour-ish
  const forecastedSpikes = Math.floor(timeLeftMinutes / 5); // estimate: 1 spike every ~5 min
  const estimatedSpikeBoost = forecastedSpikes * 100; // ~100 views per spike

  spikeForecastEl.textContent = `Forecasted Spikes Left: ${forecastedSpikes}`;

  const finalProjected = projected + estimatedSpikeBoost;

  forecastEl.textContent = `Forecast: ${finalProjected >= viewsLeft ? "Yes" : "No"}`;
  viewsLeftEl.textContent = `Views Left: ${viewsLeft}`;
  viewsLeftEl.className = viewsLeft <= finalProjected ? "green" : "red";
}

function updateStats() {
  const now = new Date();
  [5, 10, 15, 20, 25, 30].forEach(min => {
    const past = new Date(now.getTime() - min * 60000);
    const filtered = dataPoints.filter(dp => dp.timestamp >= past);
    const views = filtered.length > 1 ? filtered[filtered.length - 1].views - filtered[0].views : "-";
    timeBasedStats[`last${min}Min`].textContent = `Last ${min} Min Views: ${views}`;
  });

  const last15 = dataPoints.filter(dp => dp.timestamp >= new Date(Date.now() - 15 * 60000));
  const avg = last15.length > 1 ? ((last15[last15.length - 1].views - last15[0].views) / (last15.length - 1)) : "-";
  timeBasedStats["avgPerMin"].textContent = `Avg Views/Min (Last 15 min): ${typeof avg === "number" ? avg.toFixed(2) : "-"}`;
}

function updateStopwatch() {
  const now = new Date();
  const diff = targetTime - now;
  if (diff <= 0) {
    stopwatchEl.textContent = "Time Left: 00:00";
    clearInterval(interval);
    return;
  }
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  stopwatchEl.textContent = `Time Left: ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
