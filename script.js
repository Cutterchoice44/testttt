const API_KEY = "pk_0b8abc6f834b444f949f727e88a728e0";
const STATION_ID = "cutters-choice-radio";
const BASE_URL = "https://api.radiocult.fm/api";
const FALLBACK_ART = "https://i.imgur.com/qWOfxOS.png";

// 1. Google Calendar link generator
function createGoogleCalLink(title, startUtc, endUtc) {
  if (!startUtc || !endUtc) return "#";
  function fmt(dt) {
    return new Date(dt).toISOString().replace(/[-:]|\.\d{3}/g, "");
  }
  var startStr = fmt(startUtc);
  var endStr = fmt(endUtc);
  var url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", title);
  url.searchParams.set("dates", startStr + "/" + endStr);
  url.searchParams.set("details", "Cutters Choice Radio");
  url.searchParams.set("location", "https://cutterschoiceradio.com");
  return url.toString();
}

// 2. Fetch helper (XHR)
function rcFetch(path, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", BASE_URL + path, true);
  xhr.setRequestHeader("x-api-key", API_KEY);
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var data = JSON.parse(xhr.responseText);
          callback(null, data);
        } catch (e) {
          callback(e);
        }
      } else {
        callback(new Error("rcFetch " + xhr.status));
      }
    }
  };
  xhr.send();
}

// 3. Load “Live Now”
function fetchLiveNow() {
  rcFetch("/station/" + STATION_ID + "/schedule/live", function(err, data) {
    var nowDjEl = document.getElementById("now-dj");
    var nowArtEl = document.getElementById("now-art");
    var archiveEl = document.getElementById("now-archive");
    if (err || !data.result || data.result.status !== "schedule") {
      nowDjEl.textContent = "Off Air";
      nowArtEl.src = FALLBACK_ART;
      archiveEl.textContent = "No live show";
      return;
    }
    var ev = data.result.content;
    nowDjEl.textContent = ev.title;
    nowArtEl.src = ev.imageUrl || FALLBACK_ART;
    archiveEl.innerHTML = '<a href="' + createGoogleCalLink(ev.title, ev.startDateUtc, ev.endDateUtc)
      + '" target="_blank">Add to Calendar</a>';
  });
}

// 4. Load weekly schedule
function fetchWeeklySchedule() {
  var now = new Date();
  var startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  var endDate = new Date(now.getTime() + 7*24*60*60*1000).toISOString();
  rcFetch("/station/" + STATION_ID + "/schedule?startDate=" + startDate + "&endDate=" + endDate,
    function(err, data) {
      var container = document.getElementById("schedule-container");
      container.innerHTML = "";
      if (err || !data.schedules || data.schedules.length === 0) {
        container.innerHTML = "<p>No scheduled shows this week.</p>";
        return;
      }
      var ul = document.createElement("ul");
      data.schedules.forEach(function(ev) {
        var li = document.createElement("li");
        var timeStr = new Date(ev.startDateUtc).toLocaleString();
        li.innerHTML = "<strong>" + timeStr + "</strong>: " + ev.title + " ";
        var link = document.createElement("a");
        link.href = createGoogleCalLink(ev.title, ev.startDateUtc, ev.endDateUtc);
        link.textContent = "Add to Calendar";
        link.target = "_blank";
        li.appendChild(link);
        ul.appendChild(li);
      });
      container.appendChild(ul);
    });
}

// 5. Shuffle archive iframes once per day
function shuffleIframesDaily() {
  var container = document.getElementById("mixcloud-list");
  if (!container) return;
  var iframes = Array.prototype.slice.call(container.querySelectorAll("iframe"));
  var lastShuffle = localStorage.getItem("lastShuffleDate");
  var today = new Date().toISOString().split("T")[0];
  if (lastShuffle === today) return;
  for (var i = iframes.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = iframes[i];
    iframes[i] = iframes[j];
    iframes[j] = tmp;
  }
  container.innerHTML = "";
  iframes.forEach(function(f) { container.appendChild(f); });
  localStorage.setItem("lastShuffleDate", today);
}

// 6. Pop-out player
function setupPopOutPlayer() {
  var btn = document.getElementById("popOutBtn");
  if (!btn) return;
  btn.addEventListener("click", function() {
    var src = document.getElementById("inlinePlayer").src;
    var win = window.open("", "CCRPlayer", "width=400,height=200,resizable=yes");
    win.document.write(
      '<!DOCTYPE html><html lang="en"><head><title>CCR Player</title></head>' +
      '<body style="margin:0">' +
      '<iframe src="' + src + '" allow="autoplay" style="width:100%;height:100%;border:none"></iframe>' +
      '</body></html>'
    );
    win.document.close();
  });
}

// 7. Pop-out chat
function openChatPopup() {
  window.open(
    "https://app.radiocult.fm/embed/chat/cutters-choice-radio?theme=midnight&primaryColor=%235A8785&corners=sharp",
    "CuttersChoiceChat",
    "width=400,height=700,resizable=yes,scrollbars=yes"
  );
}

// 8. Add Mixcloud show
function addMixcloud() {
  var url = document.getElementById("mixcloud-url").value.trim();
  if (!url) return alert("Please paste a valid Mixcloud URL.");
  var iframe = document.createElement("iframe");
  iframe.src = "https://www.mixcloud.com/widget/iframe/?hide_cover=1&light=1&feed=" + encodeURIComponent(url);
  iframe.style.width = "100%";
  iframe.style.height = "120px";
  document.getElementById("mixcloud-list").appendChild(iframe);
  document.getElementById("mixcloud-url").value = "";
  iframe.onload = function() { iframe.scrollIntoView({ behavior: "smooth" }); };
}

// Initialize on DOM ready
function init() {
  fetchLiveNow();
  fetchWeeklySchedule();
  shuffleIframesDaily();
  setupPopOutPlayer();
  setInterval(fetchLiveNow, 30000);
  setInterval(fetchWeeklySchedule, 60000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
