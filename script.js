
const API_KEY = "AIzaSyCo5NvQZpziJdaCsOjf1H2Rq-1YeiU9Uq8";
let chart, viewData = [], timeData = [], startTime, interval, targetViews, targetTime;

function startTracking() {
    const videoId = document.getElementById("videoId").value;
    targetViews = parseInt(document.getElementById("targetViews").value);
    targetTime = parseInt(document.getElementById("targetTime").value) * 60 * 1000;
    startTime = new Date().getTime();

    if (interval) clearInterval(interval);
    viewData = []; timeData = [];

    document.getElementById("spinner").classList.remove("hidden");

    interval = setInterval(() => fetchViews(videoId), 60000);
    fetchViews(videoId);
}

async function fetchViews(videoId) {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${API_KEY}`);
    const data = await response.json();
    const views = parseInt(data.items[0].statistics.viewCount);

    const currentTime = new Date();
    timeData.push(currentTime);
    viewData.push(views);

    if (viewData.length > 30) {
        viewData.shift();
        timeData.shift();
    }

    updateChart(currentTime, views);
    updateStats(currentTime, views);
}

function updateChart(time, views) {
    if (!chart) {
        const ctx = document.getElementById('viewChart').getContext('2d');
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: timeData.map(t => t.toLocaleTimeString()),
                datasets: [{
                    label: 'Live Views',
                    data: viewData,
                    borderColor: 'blue',
                    backgroundColor: 'blue',
                    fill: false,
                    tension: 0.1
                }]
            }
        });
    } else {
        chart.data.labels = timeData.map(t => t.toLocaleTimeString());
        chart.data.datasets[0].data = viewData;
        chart.update();
    }
}

function updateStats(currentTime, views) {
    document.getElementById("spinner").classList.add("hidden");

    document.getElementById("liveViews").innerText = `Live View Count: ${views.toLocaleString()}`;
    
    const minsAgo = (m) => viewData.length >= m ? views - viewData[viewData.length - m] : "-";

    document.getElementById("viewsLast5").innerText = `Last 5 min Views: ${minsAgo(5)}`;
    document.getElementById("viewsLast10").innerText = `Last 10 min Views: ${minsAgo(10)}`;
    document.getElementById("viewsLast15").innerText = `Last 15 min Views: ${minsAgo(15)}`;
    document.getElementById("viewsLast20").innerText = `Last 20 min Views: ${minsAgo(20)}`;
    document.getElementById("viewsLast25").innerText = `Last 25 min Views: ${minsAgo(25)}`;
    document.getElementById("viewsLast30").innerText = `Last 30 min Views: ${minsAgo(30)}`;

    const avgViews15 = viewData.length >= 15 ? (viewData[viewData.length - 1] - viewData[viewData.length - 15]) / 15 : "-";
    const timeRemaining = targetTime - (currentTime.getTime() - startTime);
    const timeLeftMin = timeRemaining / 60000;

    const viewsLeft = targetViews - views;
    const requiredRate = viewsLeft / timeLeftMin;

    const forecastViews = avgViews15 !== "-" ? Math.round(views + avgViews15 * timeLeftMin) : "-";
    const willMeetTarget = forecastViews !== "-" && forecastViews >= targetViews;

    document.getElementById("avgViewsPerMin").innerText = `Avg Views/Min (Last 15 min): ${avgViews15 === "-" ? "-" : avgViews15.toFixed(2)}`;
    document.getElementById("viewsPerMinRequired").innerText = `Views/min Required: ${requiredRate.toFixed(2)}`;
    document.getElementById("viewsNext5Min").innerText = `Views Required in next 5 min: ${Math.round(requiredRate * 5)}`;
    document.getElementById("projectedViews").innerText = `Projected Views: ${forecastViews.toLocaleString()}`;
    document.getElementById("forecast").innerText = `Forecast: ${willMeetTarget ? "Yes" : "No"}`;
    document.getElementById("timeLeft").innerText = `Time Left: ${Math.floor(timeLeftMin)}:${String(Math.floor((timeLeftMin % 1) * 60)).padStart(2, '0')}`;
    
    const viewsLeftElem = document.getElementById("viewsLeft");
    viewsLeftElem.innerHTML = `Views Left to Meet Target: <span style="color:${willMeetTarget ? 'green' : 'red'}">${viewsLeft.toLocaleString()}</span>`;
}
