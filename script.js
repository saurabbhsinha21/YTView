let chart, interval, dataPoints = [], timeLabels = [];
const apiKey = 'AIzaSyCo5NvQZpziJdaCsOjf1H2Rq-1YeiU9Uq8';

function fetchViews(videoId) {
  return fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${apiKey}`)
    .then(res => res.json())
    .then(data => parseInt(data.items[0].statistics.viewCount || 0));
}

function startTracking() {
  const videoId = document.getElementById('videoId').value;
  const targetViews = parseInt(document.getElementById('targetViews').value);
  const targetTime = document.getElementById('targetTime').value;
  if (!videoId || !targetViews || !targetTime) return alert('Please fill in all fields');

  clearInterval(interval);
  interval = setInterval(async () => {
    const currentViews = await fetchViews(videoId);
    const now = new Date();
    const formattedTime = now.toLocaleTimeString();
    const viewsLeft = targetViews - currentViews;

    // Store data
    dataPoints.push(currentViews);
    timeLabels.push(formattedTime);
    if (dataPoints.length > 30) {
      dataPoints.shift();
      timeLabels.shift();
    }

    // Time calculations
    const [hh, mm] = targetTime.split(':').map(Number);
    const deadline = new Date();
    deadline.setHours(hh, mm, 0, 0);
    const msLeft = deadline - now;
    const minLeft = Math.max(0, Math.floor(msLeft / 60000));

    // Stats
    const views5 = calcDelta(5);
    const views10 = calcDelta(10);
    const views15 = calcDelta(15);
    const views20 = calcDelta(20);
    const views25 = calcDelta(25);
    const views30 = calcDelta(30);
    const avgViews = (views15 / 15).toFixed(2);
    const viewsPerMinReq = minLeft > 0 ? Math.ceil(viewsLeft / minLeft) : '-';
    const viewsNext5Min = minLeft > 5 ? viewsPerMinReq * 5 : viewsLeft;

    const spikeIntervals = getSpikeIntervals(dataPoints, timeLabels);
    const avgSpikeGapMin = spikeIntervals.length ? (
      spikeIntervals.reduce((a, b) => a + b, 0) / spikeIntervals.length
    ) : null;
    const forecastedSpikes = avgSpikeGapMin ? Math.floor(minLeft / avgSpikeGapMin) : '-';
    const spikeBasedForecast = forecastedSpikes !== '-' ? forecastedSpikes * getAvgSpikeHeight(dataPoints) : '-';

    updateText('currentViews', currentViews.toLocaleString());
    updateText('viewsLeft', viewsLeft.toLocaleString(), viewsLeft > 0 ? 'red' : 'green');
    updateText('timeLeft', minLeft + ' min');
    updateText('views5', views5);
    updateText('views10', views10);
    updateText('views15', views15);
    updateText('views20', views20);
    updateText('views25', views25);
    updateText('views30', views30);
    updateText('avgViews', avgViews);
    updateText('viewsPerMinRequired', viewsPerMinReq);
    updateText('viewsNext5Min', viewsNext5Min);
    updateText('forecastStatus', viewsLeft > 0 ? 'No' : 'Yes');
    updateText('spikeForecast', spikeBasedForecast !== '-' ? spikeBasedForecast.toLocaleString() : '-');

    drawChart();
  }, 60000); // every minute
}

function stopTracking() {
  clearInterval(interval);
}

function calcDelta(minutes) {
  if (dataPoints.length < minutes) return 0;
  return dataPoints[dataPoints.length - 1] - dataPoints[dataPoints.length - minutes] || 0;
}

function updateText(id, text, color) {
  const el = document.getElementById(id);
  el.textContent = text;
  if (color) el.style.color = color;
}

function drawChart() {
  const ctx = document.getElementById('viewsChart').getContext('2d');
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: timeLabels,
      datasets: [{
        label: 'Views',
        data: dataPoints,
        fill: true,
        borderColor: 'blue',
        tension: 0.3
      }]
    },
    options: {
      scales: {
        y: { beginAtZero: false }
      }
    }
  });
}

// --- Spike Detection ---
function getSpikeIntervals(data, labels) {
  let spikes = [], lastSpikeIndex = null;
  for (let i = 1; i < data.length; i++) {
    if (data[i] - data[i - 1] > 1000) {
      if (lastSpikeIndex !== null) {
        const t1 = new Date('1970/01/01 ' + labels[lastSpikeIndex]);
        const t2 = new Date('1970/01/01 ' + labels[i]);
        const diff = (t2 - t1) / 60000;
        spikes.push(diff);
      }
      lastSpikeIndex = i;
    }
  }
  return spikes;
}

function getAvgSpikeHeight(data) {
  let total = 0, count = 0;
  for (let i = 1; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    if (diff > 1000) {
      total += diff;
      count++;
    }
  }
  return count ? total / count : 0;
}
