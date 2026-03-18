import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3900;

const PLAN_PATH = process.env.PLAN_PATH ||
  path.join(__dirname, "../docs/superpowers/plans/2026-03-18-dskube-implementation.md");

function parsePlan(content) {
  const tasks = [];
  let currentTask = null;

  for (const line of content.split("\n")) {
    // Task 헤더
    const taskMatch = line.match(/^## (Task \d+\w*): (.+)/);
    if (taskMatch) {
      currentTask = { id: taskMatch[1], title: taskMatch[2], steps: [] };
      tasks.push(currentTask);
      continue;
    }

    // 체크박스 스텝
    const stepMatch = line.match(/^- \[([ x])\] \*\*(.+?)\*\*/);
    if (stepMatch && currentTask) {
      currentTask.steps.push({
        done: stepMatch[1] === "x",
        label: stepMatch[2],
      });
    }
  }

  return tasks;
}

function calcStats(tasks) {
  const totalSteps = tasks.reduce((s, t) => s + t.steps.length, 0);
  const doneSteps = tasks.reduce((s, t) => s + t.steps.filter((st) => st.done).length, 0);
  const doneTasks = tasks.filter((t) => t.steps.length > 0 && t.steps.every((st) => st.done)).length;
  return { totalSteps, doneSteps, doneTasks, totalTasks: tasks.length };
}

app.get("/api/status", (req, res) => {
  try {
    const content = fs.readFileSync(PLAN_PATH, "utf-8");
    const tasks = parsePlan(content);
    const stats = calcStats(tasks);
    res.json({ tasks, stats, updatedAt: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/", (req, res) => {
  res.send(HTML);
});

app.listen(PORT, () => {
  console.log(`dskube status server running on :${PORT}`);
});

const HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>dskube - 구현 진행 현황</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
           background: #0d1117; color: #e6edf3; min-height: 100vh; padding: 32px 24px; }
    h1 { font-size: 1.6rem; font-weight: 700; margin-bottom: 4px; }
    .subtitle { color: #7d8590; font-size: 0.9rem; margin-bottom: 28px; }
    .summary { display: flex; gap: 16px; margin-bottom: 32px; flex-wrap: wrap; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 10px;
            padding: 18px 24px; min-width: 140px; }
    .card .val { font-size: 2rem; font-weight: 700; color: #58a6ff; }
    .card .lbl { font-size: 0.8rem; color: #7d8590; margin-top: 2px; }
    .progress-bar { background: #21262d; border-radius: 6px; height: 10px;
                    margin-bottom: 32px; overflow: hidden; }
    .progress-fill { height: 100%; border-radius: 6px;
                     background: linear-gradient(90deg, #238636, #2ea043);
                     transition: width 0.5s ease; }
    .tasks { display: flex; flex-direction: column; gap: 12px; }
    .task { background: #161b22; border: 1px solid #30363d; border-radius: 10px;
            overflow: hidden; }
    .task-header { display: flex; align-items: center; gap: 12px;
                   padding: 14px 18px; cursor: pointer; user-select: none; }
    .task-header:hover { background: #1c2128; }
    .task-id { font-size: 0.75rem; color: #7d8590; font-weight: 600;
               background: #21262d; padding: 2px 8px; border-radius: 4px; }
    .task-title { flex: 1; font-size: 0.95rem; font-weight: 500; }
    .task-progress { font-size: 0.8rem; color: #7d8590; white-space: nowrap; }
    .task-bar { height: 3px; background: #21262d; }
    .task-bar-fill { height: 100%;
                     background: linear-gradient(90deg, #238636, #2ea043);
                     transition: width 0.5s ease; }
    .steps { padding: 4px 18px 12px; display: none; }
    .steps.open { display: block; }
    .step { display: flex; align-items: center; gap: 10px;
            padding: 6px 0; font-size: 0.85rem; border-bottom: 1px solid #21262d; }
    .step:last-child { border-bottom: none; }
    .step-icon { width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0;
                 display: flex; align-items: center; justify-content: center; font-size: 11px; }
    .done .step-icon { background: #238636; color: white; }
    .pending .step-icon { background: #21262d; border: 1px solid #30363d; color: #7d8590; }
    .done .step-label { color: #e6edf3; }
    .pending .step-label { color: #7d8590; }
    .task.all-done .task-id { background: #1a4a2e; color: #2ea043; }
    .updated { font-size: 0.75rem; color: #484f58; margin-top: 24px; text-align: right; }
    .chevron { font-size: 0.7rem; color: #7d8590; transition: transform 0.2s; }
    .task-header.open .chevron { transform: rotate(90deg); }
  </style>
</head>
<body>
  <h1>⚙ dskube</h1>
  <p class="subtitle">구현 진행 현황 — 자동 갱신 30초</p>
  <div class="summary" id="summary"></div>
  <div class="progress-bar"><div class="progress-fill" id="global-bar" style="width:0%"></div></div>
  <div class="tasks" id="tasks"></div>
  <p class="updated" id="updated"></p>

  <script>
    async function load() {
      const res = await fetch("/api/status");
      const data = await res.json();
      if (data.error) { document.getElementById("tasks").innerHTML = "<p style='color:#f85149'>" + data.error + "</p>"; return; }

      const { tasks, stats, updatedAt } = data;
      const pct = stats.totalSteps ? Math.round(stats.doneSteps / stats.totalSteps * 100) : 0;

      document.getElementById("summary").innerHTML = \`
        <div class="card"><div class="val">\${pct}%</div><div class="lbl">전체 진행률</div></div>
        <div class="card"><div class="val">\${stats.doneSteps} / \${stats.totalSteps}</div><div class="lbl">완료 스텝</div></div>
        <div class="card"><div class="val">\${stats.doneTasks} / \${stats.totalTasks}</div><div class="lbl">완료 태스크</div></div>
      \`;
      document.getElementById("global-bar").style.width = pct + "%";

      document.getElementById("tasks").innerHTML = tasks.map((t, i) => {
        const done = t.steps.filter(s => s.done).length;
        const total = t.steps.length;
        const tpct = total ? Math.round(done / total * 100) : 0;
        const allDone = total > 0 && done === total;
        const steps = t.steps.map(s => \`
          <div class="step \${s.done ? 'done' : 'pending'}">
            <div class="step-icon">\${s.done ? '✓' : '·'}</div>
            <span class="step-label">\${s.label}</span>
          </div>
        \`).join("");
        return \`
          <div class="task \${allDone ? 'all-done' : ''}">
            <div class="task-header" onclick="toggle(\${i})" id="h\${i}">
              <span class="task-id">\${t.id}</span>
              <span class="task-title">\${t.title}</span>
              <span class="task-progress">\${done}/\${total}</span>
              <span class="chevron">▶</span>
            </div>
            <div class="task-bar"><div class="task-bar-fill" style="width:\${tpct}%"></div></div>
            <div class="steps" id="s\${i}">\${steps}</div>
          </div>
        \`;
      }).join("");

      document.getElementById("updated").textContent = "마지막 갱신: " + new Date(updatedAt).toLocaleString("ko-KR");
    }

    function toggle(i) {
      const s = document.getElementById("s" + i);
      const h = document.getElementById("h" + i);
      s.classList.toggle("open");
      h.classList.toggle("open");
    }

    load();
    setInterval(load, 30000);
  </script>
</body>
</html>`;
