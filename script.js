const API_KEY = "AIzaSyCo5NvQZpziJdaCsOjf1H2Rq-1YeiU9Uq8";
let chart;
let timestamps = [];
let viewCounts = [];

function getLiveViews(videoId) {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,statistics&id=${videoId}&key=${API_KEY}`;
    return fetch(url)
        .then(res => res.json())
        .then(data => {
            if (data.items.length === 0) return null;
            return parseInt(data.items[0].statistics.viewCount);
        });
}

function formatTimeLeft(diffMs) {
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function calculateStats(targetTime, targetViews) {
    const now = new Date();
    const diffMs = targetTime - now;
    const timeLeftMins = diffMs / 60000;

    const viewsLeft = targetViews - viewCounts[viewCounts.length - 1];
    const rateRequired = (viewsLeft / timeLeftMins).toFixed(2);
    const forecast = avgViewsPerMin(15) >= rateRequired;
    const requiredNext5 = Math.ceil(rateRequired * 5);

    document.getElementById("requiredRate").textContent = rateRequired;
    document.getElementById("viewsLeft").innerHTML = `<span style="color:${forecast ? 'green' : 'red'}">${viewsLeft.toLocaleString()}</span>`;
    document.getElementById("requiredNext5").textContent = requiredNext5;
    document.getElementById("projectedViews").textContent = (avgViewsPerMin(15) * timeLeftMins + viewCounts[viewCounts.length - 1]).toFixed(0);
    document.getElementById("forecast").textContent = forecast ? "Yes" : "No";
    document.getElementById("timeLeft").textContent = formatTimeLeft(diffMs);
}

function avgViewsPerMin(minutes) {
    const now = Date.now();
    const cutoff = now - minutes * 60000;
    let total = 0, count = 0;
    for (let i = viewCounts.length - 1; i > 0; i--) {
        if (timestamps[i] >= cutoff) {
            total += viewCounts[i] - viewCounts[i - 1];
            count++;
        }
    }
    return count > 0 ? (total / count).toFixed(2) : 0;
}

function updateChart() {
    chart.data.labels = timestamps.map(ts => new Date(ts).toLocaleTimeString());
    chart.data.datasets[0].data = viewCounts;
    chart.update();
}

function startTracking() {
    const videoId = document.getElementById("videoId").value.trim();
    const targetViews = parseInt(document.getElementById("targetViews").value.trim());
    const targetTimeStr = document.getElementById("targetTime").value;
    const [targetHour, targetMinute] = targetTimeStr.split(":").map(Number);
    const now = new Date();
    const targetTime = new Date();
    targetTime.setHours(targetHour, targetMinute, 0, 0);

    document.getElementById("stats").style.display = "block";

    const ctx = document.getElementById("viewChart").getContext("2d");
    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: [],
            datasets: [{
                label: "Live Views",
                data: [],
                borderColor: "blue",
                backgroundColor: "blue",
                fill: false,
                tension: 0.1
            }]
        }
    });

    setInterval(async () => {
        const count = await getLiveViews(videoId);
        if (!count) return;
        const now = Date.now();
        viewCounts.push(count);
        timestamps.push(now);
        if (viewCounts.length > 60) {
            viewCounts.shift();
            timestamps.shift();
        }

        document.getElementById("liveCount").textContent = count.toLocaleString();
        document.getElementById("last5").textContent = getDeltaViews(5);
        document.getElementById("last10").textContent = getDeltaViews(10);
        document.getElementById("last15").textContent = getDeltaViews(15);
        document.getElementById("last20").textContent = getDeltaViews(20);
        document.getElementById("last25").textContent = getDeltaViews(25);
        document.getElementById("last30").textContent = getDeltaViews(30);
        document.getElementById("avg").textContent = avgViewsPerMin(15);
        updateChart();
        calculateStats(targetTime, targetViews);
    }, 60000);
}

function getDeltaViews(minutes) {
    const now = Date.now();
    const cutoff = now - minutes * 60000;
    for (let i = timestamps.length - 1; i >= 0; i--) {
        if (timestamps[i] < cutoff) {
            return (viewCounts[viewCounts.length - 1] - viewCounts[i]).toLocaleString();
        }
    }
    return "Collecting data...";
}
