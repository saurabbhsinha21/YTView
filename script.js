const apiKey = "AIzaSyCo5NvQZpziJdaCsOjf1H2Rq-1YeiU9Uq8";
let interval, targetViews = 0, targetTime = null, dataPoints = [], viewChart;

const videoIdInput = document.getElementById("videoId");
const targetViewsInput = document.getElementById("targetViews");
const targetTimeInput = document.getElementById("targetTime");

const loadingEl = document.getElementById("loading");

const currentViewsEl = document.getElementById("currentViews");
const forecastEl = document.getElementById("forecast");
const viewsLeftEl = document.getElementById("viewsLeft");
const stopwatchEl = document.getElementById("stopwatch");
const spikesForecastEl = document.getElementById("spikesForecast");
const viewsPerMinRequiredEl = document.getElementById("viewsPerMinRequired");
const viewsNext5MinEl = document.getElementById("viewsNext5Min");

const timeBasedStats = {
  last5Min: document.getElementById("last5Min"),
  last10Min: document.getElementById("last10Min"),
  last15Min: document.getElementById("last15Min"),
  last20Min: document.getElementById("last20Min"),
  last25Min: document.getElementById("last25Min"),
  last30Min: document.getElementById("last30Min"),
  avgPerMin: document.getElementById("avgPerMin")
};

document.getElementById("startBtn").addEventListener("click", () => {
  const videoId = videoIdInput.value.trim();
  targetViews = parseInt(targetViewsInput.value.trim());
  const timeParts = targetTimeInput.value.split(":");
  if (!videoId || !targetViews || timeParts.length !== 2) return alert("Enter all fields correctly");

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
      data: { labels: [], datasets: [{ label: 'Views', data: [], borderColor: '#007bff', fill: false }] },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: false }
        }
      }
    });
  }

  fetchAndUpdate(videoId);
  interval = setInterval(() => fetchAndUpdate(videoId), 60000);
});

document.getElementById("stopBtn").addEventListener("click", () => clearInterval(interval));

function fetchAndUpdate(videoId) {
  fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${apiKey}`)
    .then(res => res.json())
    .then(data => {
      const views = parseInt(data.items?.[0]?.statistics?.viewCount || 0);
      const timestamp = new Date();
      dataPoints.push({ timestamp, views });
      if (dataPoints.length > 120) dataPoints.shift();
      updateChart();
      updateStats(views);
      loadingEl.classList.add("hidden");
    });
}

function updateChart() {
  viewChart.data.labels = dataPoints.map(dp => dp.timestamp.toLocaleTimeString());
  viewChart.data.datasets[0].data = dataPoints.map(dp => dp.views);
  viewChart.options.scales.y.suggestedMin = Math.min(...viewChart.data.datasets[0].data);
  viewChart.options.scales.y.suggestedMax = Math.max(...viewChart.data.datasets[0].data);
  viewChart.update();
}

function updateStats(currentViews) {
  const now = new Date();
  const viewsLeft = targetViews - currentViews;
  const timeLeftMin = Math.max((targetTime - now) / 60000, 0);
  const avg15Min = getAvgViewsInMinutes(15);
  const spikes = Math.floor(timeLeftMin / 5);

  currentViewsEl.textContent = `Current Views: ${currentViews}`;
  viewsLeftEl.textContent = `Views Left: ${viewsLeft}`;
  forecastEl.textContent = `Forecast: ${avg15Min * timeLeftMin >= viewsLeft ? 'Yes' : 'No'}`;
  stopwatchEl.textContent = `Time Left: ${Math.floor(timeLeftMin)}:${String(Math.floor(timeLeftMin * 60) % 60).padStart(2, '0')}`;
  spikesForecastEl.textContent = `Forecasted Spikes Left: ${spikes}`;
  viewsPerMinRequiredEl.textContent = `Views/Min Required: ${(viewsLeft /
