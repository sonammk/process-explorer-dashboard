const processes = [
  {
    pid: "P1",
    name: "Kernel Task",
    state: "Ready",
    cpu: 12,
    memory: 384,
    threads: 18,
    priority: 2,
    burst: 9,
    contextSwitches: 4,
    handles: 142,
  },
  {
    pid: "P2",
    name: "Browser Engine",
    state: "Waiting",
    cpu: 22,
    memory: 896,
    threads: 34,
    priority: 4,
    burst: 13,
    contextSwitches: 7,
    handles: 288,
  },
  {
    pid: "P3",
    name: "File Indexer",
    state: "Ready",
    cpu: 8,
    memory: 242,
    threads: 11,
    priority: 5,
    burst: 6,
    contextSwitches: 3,
    handles: 95,
  },
];

const history = {
  process: Array.from({ length: 28 }, () => processes.length),
  thread: Array.from({ length: 28 }, () => total("threads")),
  handle: Array.from({ length: 28 }, () => total("handles")),
};

let contextSwitches = total("contextSwitches");
let schedulerTimer = null;
let runningIndex = -1;
const lastMetrics = { context: null, threads: null, processes: null, handles: null };
let ganttTime = 0;
const ganttHistory = [];

const refs = {
  dashboard: document.getElementById("dashboard"),
  overlay: document.getElementById("overlay"),
  pcbModal: document.getElementById("pcbModal"),
  pcbGrid: document.getElementById("pcbGrid"),
  searchForm: document.getElementById("searchForm"),
  searchInput: document.getElementById("searchInput"),
  processForm: document.getElementById("processForm"),
  pidInput: document.getElementById("pidInput"),
  priorityInput: document.getElementById("priorityInput"),
  burstInput: document.getElementById("burstInput"),
  algorithmSelect: document.getElementById("algorithmSelect"),
  startScheduler: document.getElementById("startScheduler"),
  ganttClock: document.getElementById("ganttClock"),
  ganttTrack: document.getElementById("ganttTrack"),
  readyQueue: document.getElementById("readyQueue"),
  runningQueue: document.getElementById("runningQueue"),
  waitingQueue: document.getElementById("waitingQueue"),
  eventStream: document.getElementById("eventStream"),
  contextMetric: document.getElementById("contextMetric"),
  threadMetric: document.getElementById("threadMetric"),
  processMetric: document.getElementById("processMetric"),
  handleMetric: document.getElementById("handleMetric"),
  charts: {
    process: document.getElementById("processChart"),
    thread: document.getElementById("threadChart"),
    handle: document.getElementById("handleChart"),
  },
};

document.getElementById("modalCloseTop").addEventListener("click", closeModal);
document.getElementById("modalCloseBottom").addEventListener("click", closeModal);
refs.overlay.addEventListener("click", closeModal);

refs.searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = refs.searchInput.value.trim().toLowerCase();
  const found =
    processes.find((item) => item.pid.toLowerCase() === query || item.name.toLowerCase().includes(query)) ||
    processes[0];
  openModal(found);
});

refs.processForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const pid = refs.pidInput.value.trim() || `P${processes.length + 1}`;
  const priority = clamp(Number(refs.priorityInput.value || randomInt(1, 9)), 1, 10);
  const burst = clamp(Number(refs.burstInput.value || randomInt(3, 18)), 1, 30);

  if (processes.some((item) => item.pid.toLowerCase() === pid.toLowerCase())) {
    addEvent("info", `PROCESS EXISTS → ${pid}`, pid);
    return;
  }

  processes.push({
    pid,
    name: `User Process ${pid.replace(/^p/i, "")}`,
    state: "Ready",
    cpu: randomInt(4, 24),
    memory: randomInt(128, 920),
    threads: randomInt(4, 28),
    priority,
    burst,
    contextSwitches: 0,
    handles: randomInt(42, 260),
  });

  refs.processForm.reset();
  addEvent("info", `PROCESS CREATED → ${pid}`, pid);
  renderAll();
});

refs.startScheduler.addEventListener("click", () => {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    refs.startScheduler.textContent = "▶️ Start Scheduler";
    addEvent("info", "SCHEDULER PAUSED", "CPU");
    return;
  }

  refs.startScheduler.textContent = "⏸ Pause Scheduler";
  addEvent("info", `SCHEDULER STARTED → ${refs.algorithmSelect.value || "FCFS"}`, "CPU");
  schedulerTick();
  schedulerTimer = setInterval(schedulerTick, 1800);
});

function total(key) {
  return processes.reduce((sum, process) => sum + process[key], 0);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function nextProcess() {
  const ready = processes.filter((item) => item.state !== "Terminated");
  if (!ready.length) return null;

  const algorithm = refs.algorithmSelect.value || "FCFS";
  if (algorithm === "SJF") {
    return [...ready].sort((a, b) => a.burst - b.burst)[0];
  }
  if (algorithm === "Priority Scheduling") {
    return [...ready].sort((a, b) => a.priority - b.priority)[0];
  }

  runningIndex = (runningIndex + 1) % ready.length;
  return ready[runningIndex];
}

function schedulerTick() {
  const active = nextProcess();
  if (!active) return;

  processes.forEach((process) => {
    if (process === active) {
      process.state = "Running";
      process.cpu = clamp(process.cpu + randomInt(2, 10), 1, 92);
      process.burst = Math.max(1, process.burst - 1);
      process.contextSwitches += 1;
      contextSwitches += 1;
    } else if (Math.random() > 0.72) {
      process.state = "Waiting";
      process.cpu = clamp(process.cpu - randomInt(1, 5), 1, 78);
    } else {
      process.state = "Ready";
      process.cpu = clamp(process.cpu - randomInt(1, 4), 1, 84);
    }

    process.memory = clamp(process.memory + randomInt(-20, 34), 64, 1400);
    process.threads = clamp(process.threads + randomInt(-1, 2), 1, 64);
    process.handles = clamp(process.handles + randomInt(-8, 16), 12, 520);
  });

  addGanttSlice(active);
  addEvent("save", `PCB SAVED → ${active.pid}`, active.pid);
  addEvent("dispatch", `CPU DISPATCH → ${active.pid}`, active.pid);
  addEvent("load", `PCB LOADED → ${active.pid}`, active.pid);
  renderAll(true);
}

function addEvent(type, message, pid = "SYS") {
  const item = document.createElement("div");
  item.className = `event event-${type}`;
  const tag = eventTag(type);
  item.innerHTML = `
    <div class="event-meta">
      <time>[${new Date().toLocaleTimeString()}]</time>
      <span class="event-pid">${pid}</span>
    </div>
    <div class="event-line">
      <span class="event-tag ${type}">${tag}</span>
      <span class="event-message">${message}</span>
    </div>
  `;
  refs.eventStream.appendChild(item);
  while (refs.eventStream.children.length > 36) {
    refs.eventStream.removeChild(refs.eventStream.firstElementChild);
  }
  refs.eventStream.scrollTop = refs.eventStream.scrollHeight;
}

function eventTag(type) {
  const tags = {
    save: "SAVE",
    load: "LOAD",
    dispatch: "DISPATCH",
    info: "INFO",
    wait: "WAIT",
  };
  return `[${tags[type] || "EVENT"}]`;
}

function addGanttSlice(process) {
  ganttTime += 1;
  ganttHistory.push({ pid: process.pid, priority: process.priority, burst: process.burst, state: process.state });
  while (ganttHistory.length > 12) ganttHistory.shift();
  renderGantt();
}

function renderGantt() {
  if (!refs.ganttTrack || !refs.ganttClock) return;
  refs.ganttClock.textContent = `T+${ganttTime}`;
  refs.ganttTrack.innerHTML = ganttHistory
    .map((slice, index) => `<div class="gantt-slice" style="--i: ${index}"><strong>${slice.pid}</strong><span>BT ${slice.burst}</span></div>`)
    .join("");
}
function renderMetrics() {
  updateMetric(refs.contextMetric, "context", contextSwitches);
  updateMetric(refs.threadMetric, "threads", total("threads"));
  updateMetric(refs.processMetric, "processes", processes.length);
  updateMetric(refs.handleMetric, "handles", total("handles"));
}

function updateMetric(element, key, value) {
  if (lastMetrics[key] !== null && lastMetrics[key] !== value) {
    element.parentElement.classList.remove("metric-flash");
    void element.parentElement.offsetWidth;
    element.parentElement.classList.add("metric-flash");
  }
  element.textContent = value;
  lastMetrics[key] = value;
}

function renderQueues(animate = false) {
  refs.readyQueue.innerHTML = "";
  refs.runningQueue.innerHTML = "";
  refs.waitingQueue.innerHTML = "";

  processes.forEach((process) => {
    const pill = document.createElement("span");
    const state = process.state.toLowerCase();
    pill.className = `process-pill ${state}`;
    pill.innerHTML = `
      <strong>${process.pid}</strong>
      <span>Pri ${process.priority}</span>
      <span>BT ${process.burst}</span>
      <small>${process.cpu}% CPU</small>
    `;
    if (animate) {
      pill.classList.add("pulse");
      window.setTimeout(() => pill.classList.remove("pulse"), 420);
    }

    if (process.state === "Running") refs.runningQueue.appendChild(pill);
    else if (process.state === "Waiting") refs.waitingQueue.appendChild(pill);
    else refs.readyQueue.appendChild(pill);
  });
}

function pushHistory() {
  history.process.push(processes.length);
  history.thread.push(total("threads"));
  history.handle.push(total("handles"));

  Object.keys(history).forEach((key) => {
    while (history[key].length > 32) history[key].shift();
  });
}

function drawChart(canvas, values, color, label) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const pad = 22;
  const min = Math.min(...values) - 1;
  const max = Math.max(...values) + 1;
  const range = Math.max(1, max - min);
  const points = values.map((value, index) => ({
    value,
    x: pad + (index / (values.length - 1)) * (width - pad * 2),
    y: height - pad - ((value - min) / range) * (height - pad * 2),
  }));

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#07101d";
  ctx.fillRect(0, 0, width, height);

  const bg = ctx.createRadialGradient(width * 0.78, height * 0.22, 0, width * 0.78, height * 0.22, width * 0.8);
  bg.addColorStop(0, `${color}24`);
  bg.addColorStop(1, "rgba(7,16,29,0)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(145, 164, 189, 0.12)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i += 1) {
    const y = (height / 4) * i;
    ctx.beginPath();
    ctx.moveTo(12, y);
    ctx.lineTo(width - 12, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(94, 234, 212, 0.07)";
  for (let i = 1; i < 6; i += 1) {
    const x = (width / 6) * i;
    ctx.beginPath();
    ctx.moveTo(x, 10);
    ctx.lineTo(x, height - 10);
    ctx.stroke();
  }

  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else {
      const prev = points[index - 1];
      const midX = (prev.x + point.x) / 2;
      ctx.bezierCurveTo(midX, prev.y, midX, point.y, point.x, point.y);
    }
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.stroke();

  const last = points[points.length - 1];
  ctx.shadowBlur = 16;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(last.x, last.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = "rgba(231, 240, 255, 0.88)";
  ctx.font = "700 12px Inter, system-ui, sans-serif";
  ctx.fillText(label, 16, 23);
  ctx.fillStyle = color;
  ctx.font = "900 20px Inter, system-ui, sans-serif";
  ctx.fillText(String(last.value), 16, 47);

  ctx.fillStyle = "rgba(145, 164, 189, 0.72)";
  ctx.font = "700 10px Inter, system-ui, sans-serif";
  ctx.fillText(`max ${Math.max(...values)}`, width - 62, 22);
  ctx.fillText(`min ${Math.min(...values)}`, width - 62, height - 14);
}function renderCharts() {
  drawChart(refs.charts.process, history.process, "#40e0d0", "Processes");
  drawChart(refs.charts.thread, history.thread, "#5aa7ff", "Threads");
  drawChart(refs.charts.handle, history.handle, "#f6d365", "Handles");
}

function renderAll(animate = false) {
  renderMetrics();
  renderQueues(animate);
  pushHistory();
  renderCharts();
}

function openModal(process) {
  const memoryPercent = Math.round((process.memory / 1400) * 100);
  const handlePercent = Math.round((process.handles / 520) * 100);
  const threadPercent = Math.round((process.threads / 64) * 100);
  const stateClass = process.state.toLowerCase();
  const fields = [
    ["PID", process.pid],
    ["Process Name", process.name],
    ["Priority", process.priority],
    ["Burst Time", `undefined ms`],
    ["Thread Count", process.threads],
    ["Handles", process.handles],
    ["Context Switch Count", process.contextSwitches],
  ];

  refs.pcbGrid.innerHTML = `
    <div class="pcb-hero">
      <div>
        <span class="pcb-kicker">PROCESS CONTROL BLOCK</span>
        <strong>${process.pid}</strong>
        <small>${process.name}</small>
      </div>
      <span class="state-badge ${stateClass}">${process.state}</span>
    </div>

    <div class="pcb-section">
      <h3>Scheduling Snapshot</h3>
      <div class="pcb-fields">
        ${fields
          .map(([label, value]) => `<div class="pcb-field"><span>${label}</span><strong>${value}</strong></div>`)
          .join("")}
      </div>
    </div>

    <div class="pcb-section">
      <h3>Resource Usage</h3>
      <div class="usage-stack">
        ${usageBar("CPU Usage", `${process.cpu}%`, process.cpu, "cpu")}
        ${usageBar("Memory Usage", `${process.memory} MB`, memoryPercent, "memory")}
        ${usageBar("Thread Load", `${process.threads} Threads`, threadPercent, "threads")}
        ${usageBar("Handle Load", `${process.handles} Handles`, handlePercent, "handles")}
      </div>
    </div>
  `;
  refs.overlay.classList.add("active");
  refs.dashboard.classList.add("modal-active");
  refs.pcbModal.classList.add("active");
}

function usageBar(label, value, percent, type) {
  return `
    <div class="usage-row">
      <div class="usage-label">
        <span>${label}</span>
        <strong>${value}</strong>
      </div>
      <div class="usage-track" aria-hidden="true">
        <div class="usage-fill ${type}" style="width: ${clamp(percent, 4, 100)}%"></div>
      </div>
    </div>
  `;
}
function closeModal() {
  refs.overlay.classList.remove("active");
  refs.dashboard.classList.remove("modal-active");
  refs.pcbModal.classList.remove("active");
}

function bootstrap() {
  addEvent("info", "OS CONTROL CENTER ONLINE", "SYS");
  addEvent("load", "PCB LOADED → P1", "P1");
  renderGantt();
  renderAll();}

bootstrap();
