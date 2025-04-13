const apiKey = "AIzaSyCo5NvQZpziJdaCsOjf1H2Rq-1YeiU9Uq8";

let interval, targetViews = 0, targetTime = null, dataPoints = [], viewChart;

const videoIdInput = document.getElementById("videoId");
const targetViewsInput = document.getElementById("targetViews");
const targetTimeInput = document.getElementById("targetTime");

const currentViewsEl = document.getElementById("currentViews");
const forecastEl = document.getElementById("forecast");
const viewsLeftEl = document.getElementById("viewsLeft");
const stopwatchEl = document.getElementById("stopwatch");

const loadingEl = document.getElementById("loading");

const timeBasedStats = {
  "last10Min": document.getElementById("last10Min"),
  "last15Min": document.getElementById("last15Min"),
  "last20Min": document.getElementById("last20Min"),
  "last25Min": document.getElementById("last25Min"),
  "last30Min": document.getElementById("last30Min"),
  "avgPerMin": document.getElementById("avgPerMin")
};

document.getElementById("startBtn").addEventListener("click", () => {
  const videoId = videoIdInput.value.trim();
  const newTargetViews = parseInt(targetViewsInput.value.trim());
  const timeParts = targetTimeInput.value.split(":");

  if (!videoId || !newTargetViews || timeParts.length !== 2) {
    alert("Please enter all fields correctly.");
    return;
  }

  targetViews = newTargetViews;
  const now = new Date();
  const newTargetTime = new Date();
  newTargetTime.setHours(parseInt(timeParts[0]), parseInt(timeParts[1]), 0, 0);
  if (newTargetTime < now) newTargetTime.setDate(newTargetTime.getDate() + 1);
  targetTime = newTargetTime;

  if (!interval) {
    // First time starting
    loadingEl.classList.remove("hidden");

    const ctx = document.getElementById("viewChart").getContext("2d");
    viewChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Live Views',
          data: [],
          borderColor: '#007bff',
          backgroundColor: 'rgba(0, 123, 255, 0.1)',
          fill: true
        }]
      },
      options: {
        scales: {
          x: { display: true },
          y: { beginAtZero: false }
        }
      }
    });

    const fetchLoop = () => {
      fetchAndUpdate(videoId);
    };

    fetchLoop(); // Initial fetch
    interval = setInterval(fetchLoop, 60000); // Repeat every minute
  } else {
    // Tracker is already running, only update stats and forecast
    updateForecastAndStats();
  }
});

document.getElementById("stopBtn").addEventListener("click", () => {
  clearInterval(interval);
  interval = null;
});

function fetchAndUpdate(videoId) {
  fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${apiKey}`)
    .then(res => res.json())
    .then(data => {
      const views = parseInt(data.items?.[0]?.statistics?.viewCount || 0);
      const timestamp = new Date();

      currentViewsEl.textContent = `Current Views: ${views}`;
      dataPoints.push({ timestamp, views });

      if (dataPoints.length > 60) dataPoints.shift();

      updateChart();
      updateForecastAndStats();

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

function updateForecastAndStats() {
  if (dataPoints.length < 2 || !targetTime || !targetViews) return;

  const now = new Date();
  const currentViews = dataPoints[dataPoints.length - 1].views;
  const timeLeftMinutes = Math.max((targetTime - now) / (1000 * 60), 0);
  const viewsLeft = targetViews - currentViews;

  const recent = dataPoints.slice(-15);
  const avgPerMin = recent.length > 1
    ? (recent[recent.length - 1].views - recent[0].views) / (recent.length - 1)
    : 0;

  const projected = currentViews + avgPerMin * timeLeftMinutes;

  forecastEl.textContent = `Forecast: ${projected >= targetViews ? "Yes" : "No"}`;
  viewsLeftEl.textContent = `Views Left to Meet Target: ${viewsLeft.toLocaleString()}`;
  viewsLeftEl.className = viewsLeft <= (avgPerMin * timeLeftMinutes) ? "green" : "red";

  const mins = Math.floor(timeLeftMinutes);
  const secs = Math.floor((targetTime - now) % 60000 / 1000);
  stopwatchEl.textContent = `Time Left: ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  [10, 15, 20, 25, 30].forEach(min => {
    const past = new Date(now.getTime() - min * 60000);
    const filtered = dataPoints.filter(dp => dp.timestamp >= past);
    const views = filtered.length > 1 ? filtered[filtered.length - 1].views - filtered[0].views : "-";
    timeBasedStats[`last${min}Min`].textContent = `Last ${min} Min Views: ${views}`;
  });

  timeBasedStats["avgPerMin"].textContent = `Avg Views/Min (Last 15 min): ${avgPerMin.toFixed(2)}`;
}
