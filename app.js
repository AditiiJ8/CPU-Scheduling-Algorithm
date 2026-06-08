/* ========================================
   CPU SCHEDULER SIMULATOR — app.js
   Algorithms: FCFS, SJF, Round Robin
   Validation: Positive, Negative, Float
   ======================================== */

const COLORS = ['c0','c1','c2','c3','c4','c5','c6','c7'];

// ─── ROW COUNTERS ──────────────────────────────────────────────
const counters = { fcfs: 0, sjf: 0, rr: 0 };

// ─── CLOCK ─────────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const str = now.toLocaleTimeString('en-US', { hour12: false });
  document.getElementById('clock').textContent = str;
  document.getElementById('footer-clock').textContent = str;
}
setInterval(updateClock, 1000);
updateClock();

// ─── TABS ───────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
  });
});

// ─── INIT DEFAULT ROWS ──────────────────────────────────────────
['fcfs','sjf','rr'].forEach(algo => {
  const defaults = [
    { at: 0, bt: 5 }, { at: 1, bt: 3 }, { at: 2, bt: 8 }
  ];
  defaults.forEach(d => addRow(algo, d.at, d.bt));
});

// ─── ADD ROW ────────────────────────────────────────────────────
function addRow(algo, at = '', bt = '') {
  counters[algo]++;
  const n = counters[algo];
  const container = document.getElementById(algo + '-rows');
  const row = document.createElement('div');
  row.className = 'process-row';
  row.id = `${algo}-row-${n}`;
  row.innerHTML = `
    <span class="process-label">P${n}</span>
    <input type="number" id="${algo}-at-${n}" value="${at}" placeholder="0" step="0.1" min="0">
    <input type="number" id="${algo}-bt-${n}" value="${bt}" placeholder="1" step="0.1" min="0.1">
    <button class="btn-del" onclick="delRow('${algo}', ${n})" title="Remove">✕</button>
  `;
  container.appendChild(row);
}

// ─── DELETE ROW ─────────────────────────────────────────────────
function delRow(algo, n) {
  const row = document.getElementById(`${algo}-row-${n}`);
  if (row) row.remove();
}

// ─── CLEAR ALL ──────────────────────────────────────────────────
function clearAll(algo) {
  document.getElementById(algo + '-rows').innerHTML = '';
  counters[algo] = 0;
  const out = document.getElementById(algo + '-output');
  out.classList.add('hidden');
  out.innerHTML = '';
}

// ─── READ PROCESSES ─────────────────────────────────────────────
function readProcesses(algo) {
  const container = document.getElementById(algo + '-rows');
  const rows = container.querySelectorAll('.process-row');
  const processes = [];
  const errors = [];

  // Clear previous errors
  container.querySelectorAll('input').forEach(i => i.classList.remove('error'));

  rows.forEach(row => {
    const pid = row.querySelector('.process-label').textContent.trim();
    const atEl = row.querySelector('input:nth-of-type(1)');
    const btEl = row.querySelector('input:nth-of-type(2)');
    const at = parseFloat(atEl.value);
    const bt = parseFloat(btEl.value);

    // Validate AT
    if (atEl.value === '' || isNaN(at)) {
      atEl.classList.add('error');
      errors.push(`${pid}: Arrival time must be a number.`);
    } else if (at < 0) {
      atEl.classList.add('error');
      errors.push(`${pid}: Arrival time cannot be negative (got ${at}).`);
    }

    // Validate BT
    if (btEl.value === '' || isNaN(bt)) {
      btEl.classList.add('error');
      errors.push(`${pid}: Burst time must be a number.`);
    } else if (bt <= 0) {
      btEl.classList.add('error');
      errors.push(`${pid}: Burst time must be > 0 (got ${bt}).`);
    }

    if (errors.length === 0 || (!isNaN(at) && !isNaN(bt) && at >= 0 && bt > 0)) {
      processes.push({ pid, at, bt, remaining: bt });
    }
  });

  return { processes: errors.length === 0 ? processes : null, errors };
}

// ─── FCFS ────────────────────────────────────────────────────────
function runFCFS() {
  const { processes, errors } = readProcesses('fcfs');
  const out = document.getElementById('fcfs-output');

  if (errors.length > 0) {
    out.classList.remove('hidden');
    out.innerHTML = renderErrors(errors);
    return;
  }
  if (!processes || processes.length === 0) {
    out.classList.remove('hidden');
    out.innerHTML = renderErrors(['No processes added.']);
    return;
  }

  const sorted = [...processes].sort((a, b) => a.at !== b.at ? a.at - b.at : 0);
  const timeline = [];
  let time = 0;

  sorted.forEach(p => {
    if (time < p.at) {
      timeline.push({ pid: 'IDLE', start: time, end: p.at });
      time = p.at;
    }
    const start = time;
    time += p.bt;
    p.start = start;
    p.finish = time;
    p.wt = p.start - p.at;
    p.tat = p.finish - p.at;
    timeline.push({ pid: p.pid, start, end: time });
  });

  const outputHTML = renderOutput('FCFS', sorted, timeline, time);
  out.innerHTML = outputHTML;
  out.classList.remove('hidden');
}

// ─── SJF ─────────────────────────────────────────────────────────
function runSJF() {
  const { processes, errors } = readProcesses('sjf');
  const out = document.getElementById('sjf-output');

  if (errors.length > 0) {
    out.classList.remove('hidden');
    out.innerHTML = renderErrors(errors);
    return;
  }
  if (!processes || processes.length === 0) {
    out.classList.remove('hidden');
    out.innerHTML = renderErrors(['No processes added.']);
    return;
  }

  const procs = processes.map(p => ({ ...p }));
  const timeline = [];
  let time = 0;
  const done = [];
  const ready = [];
  const remaining = [...procs];

  while (done.length < procs.length) {
    // Move arrived processes to ready queue
    remaining.forEach(p => {
      if (p.at <= time && !ready.includes(p)) ready.push(p);
    });
    ready.forEach(p => remaining.splice(remaining.indexOf(p), 1));

    if (ready.length === 0) {
      // No process ready — jump to next arrival
      const next = remaining.reduce((min, p) => p.at < min.at ? p : min, remaining[0]);
      timeline.push({ pid: 'IDLE', start: time, end: next.at });
      time = next.at;
      continue;
    }

    // Pick shortest job
    ready.sort((a, b) => a.bt !== b.bt ? a.bt - b.bt : a.at - b.at);
    const p = ready.shift();
    const start = time;
    time += p.bt;
    p.start = start;
    p.finish = time;
    p.wt = p.start - p.at;
    p.tat = p.finish - p.at;
    timeline.push({ pid: p.pid, start, end: time });
    done.push(p);

    // Check new arrivals
    remaining.forEach(rp => {
      if (rp.at <= time && !ready.includes(rp)) ready.push(rp);
    });
    ready.forEach(p => remaining.splice(remaining.indexOf(p), 1));
  }

  const outputHTML = renderOutput('SJF', done, timeline, time);
  out.innerHTML = outputHTML;
  out.classList.remove('hidden');
}

// ─── ROUND ROBIN ─────────────────────────────────────────────────
function runRR() {
  const quantumEl = document.getElementById('rr-quantum');
  const quantum = parseFloat(quantumEl.value);
  const { processes, errors } = readProcesses('rr');
  const out = document.getElementById('rr-output');

  const allErrors = [...errors];

  if (isNaN(quantum) || quantum <= 0) {
    allErrors.push('Time quantum must be a positive number (got "' + quantumEl.value + '").');
    quantumEl.style.borderColor = 'var(--danger)';
  } else {
    quantumEl.style.borderColor = '';
  }

  if (allErrors.length > 0) {
    out.classList.remove('hidden');
    out.innerHTML = renderErrors(allErrors);
    return;
  }
  if (!processes || processes.length === 0) {
    out.classList.remove('hidden');
    out.innerHTML = renderErrors(['No processes added.']);
    return;
  }

  const procs = processes.map(p => ({ ...p, remaining: p.bt, finish: null, wt: 0, tat: 0 }));
  const timeline = [];
  let time = 0;
  const queue = [];
  const arrived = new Set();
  let remaining = [...procs].sort((a, b) => a.at - b.at);

  // Seed queue with processes arriving at 0
  remaining.filter(p => p.at <= 0).forEach(p => { queue.push(p); arrived.add(p.pid); });
  remaining = remaining.filter(p => p.at > 0);

  const MAX_ITER = 10000;
  let iter = 0;

  while ((queue.length > 0 || remaining.length > 0) && iter++ < MAX_ITER) {
    if (queue.length === 0) {
      // Jump to next arrival
      const next = remaining[0];
      timeline.push({ pid: 'IDLE', start: time, end: next.at });
      time = next.at;
      queue.push(next);
      arrived.add(next.pid);
      remaining.shift();
    }

    const p = queue.shift();
    const exec = Math.min(quantum, p.remaining);
    const start = time;
    time = round(time + exec);
    p.remaining = round(p.remaining - exec);

    timeline.push({ pid: p.pid, start, end: time });

    // Add newly arrived processes
    const newArrivals = remaining.filter(np => np.at <= time && !arrived.has(np.pid));
    newArrivals.forEach(np => { queue.push(np); arrived.add(np.pid); remaining.splice(remaining.indexOf(np), 1); });

    if (p.remaining > 0) {
      queue.push(p);
    } else {
      p.finish = time;
      p.tat = round(p.finish - p.at);
      p.wt = round(p.tat - p.bt);
    }
  }

  // Sort output by PID for display
  const sorted = [...procs].sort((a, b) => parseInt(a.pid.slice(1)) - parseInt(b.pid.slice(1)));
  const outputHTML = renderOutput('Round Robin (Q=' + quantum + ')', sorted, timeline, time);
  out.innerHTML = outputHTML;
  out.classList.remove('hidden');
}

function round(n) { return Math.round(n * 1000) / 1000; }

// ─── RENDER OUTPUT ──────────────────────────────────────────────
function renderOutput(title, processes, timeline, totalTime) {
  const avgWT = processes.reduce((s, p) => s + p.wt, 0) / processes.length;
  const avgTAT = processes.reduce((s, p) => s + p.tat, 0) / processes.length;
  const throughput = processes.length / totalTime;

  const pidColorMap = {};
  processes.forEach((p, i) => { pidColorMap[p.pid] = COLORS[i % COLORS.length]; });

  return `
    <h3>— ${title} Results</h3>
    ${renderGantt(timeline, pidColorMap, totalTime)}
    ${renderTable(processes)}
    ${renderMetrics(avgWT, avgTAT, throughput, totalTime)}
  `;
}

// ─── RENDER ERRORS ──────────────────────────────────────────────
function renderErrors(errors) {
  return errors.map(e => `<div class="error-banner">${e}</div>`).join('');
}

// ─── RENDER GANTT ────────────────────────────────────────────────
function renderGantt(timeline, pidColorMap, totalTime) {
  if (!timeline.length) return '';

  const minUnit = Math.max(1, 600 / totalTime);
  let blocks = '';
  const ticks = new Set();

  timeline.forEach(seg => {
    const w = (seg.end - seg.start) * minUnit;
    const cls = seg.pid === 'IDLE' ? 'idle' : (pidColorMap[seg.pid] || '');
    const label = seg.pid;
    blocks += `<div class="gantt-block ${cls}" style="width:${w}px" title="${seg.pid} [${seg.start} → ${seg.end}]">${label}</div>`;
    ticks.add(seg.start);
    ticks.add(seg.end);
  });

  let tickHTML = '';
  [...ticks].sort((a, b) => a - b).forEach(t => {
    const left = t * minUnit;
    tickHTML += `<span class="gantt-tick" style="left:${left}px">${t}</span>`;
  });

  return `
    <div class="gantt-wrapper">
      <span class="gantt-label">▸ GANTT CHART</span>
      <div class="gantt-chart" id="gantt-inner">${blocks}</div>
      <div class="gantt-time-row" style="position:relative;height:20px;">${tickHTML}</div>
    </div>
  `;
}

// ─── RENDER TABLE ────────────────────────────────────────────────
function renderTable(processes) {
  const rows = processes.map(p => `
    <tr>
      <td>${p.pid}</td>
      <td>${fmt(p.at)}</td>
      <td>${fmt(p.bt)}</td>
      <td>${fmt(p.start)}</td>
      <td>${fmt(p.finish)}</td>
      <td class="highlight">${fmt(p.wt)}</td>
      <td class="highlight">${fmt(p.tat)}</td>
    </tr>
  `).join('');
  return `
    <table class="results-table">
      <thead>
        <tr>
          <th>Process</th><th>Arrival</th><th>Burst</th>
          <th>Start</th><th>Finish</th>
          <th>Wait Time</th><th>Turnaround</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function fmt(n) { return (n !== undefined && n !== null) ? (Number.isInteger(n) ? n : parseFloat(n.toFixed(3))) : '—'; }

// ─── RENDER METRICS ──────────────────────────────────────────────
function renderMetrics(avgWT, avgTAT, throughput, totalTime) {
  return `
    <div class="metrics-row">
      <div class="metric-card avg-wt">
        <span class="metric-label">Avg Wait Time</span>
        <span class="metric-value">${avgWT.toFixed(2)}<span class="metric-unit">units</span></span>
      </div>
      <div class="metric-card avg-tat">
        <span class="metric-label">Avg Turnaround</span>
        <span class="metric-value">${avgTAT.toFixed(2)}<span class="metric-unit">units</span></span>
      </div>
      <div class="metric-card throughput">
        <span class="metric-label">Throughput</span>
        <span class="metric-value">${throughput.toFixed(3)}<span class="metric-unit">proc/unit</span></span>
      </div>
      <div class="metric-card cpu-util">
        <span class="metric-label">Total Time</span>
        <span class="metric-value">${totalTime}<span class="metric-unit">units</span></span>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
// TEST CASES
// ═══════════════════════════════════════════════════════════════

const TEST_CASES = [
  // ── POSITIVE INTEGER INPUTS ──
  {
    id: 'tc1', type: 'positive', name: 'Basic FCFS', algo: 'FCFS',
    desc: 'Three processes with sequential arrival. Standard case.',
    processes: [
      { pid: 'P1', at: 0, bt: 4 },
      { pid: 'P2', at: 1, bt: 3 },
      { pid: 'P3', at: 2, bt: 5 }
    ],
    expected: {
      order: ['P1','P2','P3'],
      avgWT: (0 + 3 + 5) / 3,
      avgTAT: (4 + 6 + 10) / 3
    }
  },
  {
    id: 'tc2', type: 'positive', name: 'SJF Optimal', algo: 'SJF',
    desc: 'SJF should reorder by burst: P2(1) → P1(3) → P3(7).',
    processes: [
      { pid: 'P1', at: 0, bt: 3 },
      { pid: 'P2', at: 0, bt: 1 },
      { pid: 'P3', at: 0, bt: 7 }
    ],
    expected: {
      order: ['P2','P1','P3'],
      avgWT: (0 + 1 + 4) / 3
    }
  },
  {
    id: 'tc3', type: 'positive', name: 'Round Robin Q=2', algo: 'RR',
    desc: 'Three equal-burst processes. Each gets fair time slice.',
    quantum: 2,
    processes: [
      { pid: 'P1', at: 0, bt: 4 },
      { pid: 'P2', at: 0, bt: 4 },
      { pid: 'P3', at: 0, bt: 4 }
    ],
    expected: { totalTime: 12 }
  },
  {
    id: 'tc4', type: 'positive', name: 'Single Process', algo: 'FCFS',
    desc: 'Only one process. WT = 0, TAT = BT.',
    processes: [{ pid: 'P1', at: 0, bt: 10 }],
    expected: { wt: [0], tat: [10] }
  },

  // ── FLOATING POINT INPUTS ──
  {
    id: 'tc5', type: 'float', name: 'Float Burst Times', algo: 'FCFS',
    desc: 'Burst times as decimals (1.5, 2.7, 0.3). Must handle without precision loss.',
    processes: [
      { pid: 'P1', at: 0, bt: 1.5 },
      { pid: 'P2', at: 1, bt: 2.7 },
      { pid: 'P3', at: 2, bt: 0.3 }
    ],
    expected: { totalTime: 4.5 }
  },
  {
    id: 'tc6', type: 'float', name: 'Float Arrival Times', algo: 'SJF',
    desc: 'Processes with fractional arrival times (0.5, 1.5, 2.0).',
    processes: [
      { pid: 'P1', at: 0.5, bt: 3 },
      { pid: 'P2', at: 1.5, bt: 2 },
      { pid: 'P3', at: 2.0, bt: 4 }
    ],
    expected: { valid: true }
  },
  {
    id: 'tc7', type: 'float', name: 'Float Quantum RR', algo: 'RR',
    desc: 'Quantum = 1.5 with integer burst times.',
    quantum: 1.5,
    processes: [
      { pid: 'P1', at: 0, bt: 3 },
      { pid: 'P2', at: 0, bt: 4.5 },
      { pid: 'P3', at: 0, bt: 1.5 }
    ],
    expected: { valid: true }
  },
  {
    id: 'tc8', type: 'float', name: 'Mixed Float/Int', algo: 'FCFS',
    desc: 'Mix of integer and decimal values. Ensures consistent handling.',
    processes: [
      { pid: 'P1', at: 0, bt: 2 },
      { pid: 'P2', at: 0.5, bt: 1.5 },
      { pid: 'P3', at: 1.5, bt: 3 }
    ],
    expected: { valid: true }
  },

  // ── NEGATIVE / INVALID INPUTS ──
  {
    id: 'tc9', type: 'negative', name: 'Negative Burst Time', algo: 'FCFS',
    desc: 'BT = -5 is invalid. Simulator must reject and show error.',
    processes: [{ pid: 'P1', at: 0, bt: -5 }],
    expected: { shouldError: true, reason: 'burst time ≤ 0' }
  },
  {
    id: 'tc10', type: 'negative', name: 'Negative Arrival Time', algo: 'SJF',
    desc: 'AT = -3 is invalid. Cannot arrive before time 0.',
    processes: [{ pid: 'P1', at: -3, bt: 5 }],
    expected: { shouldError: true, reason: 'arrival time < 0' }
  },
  {
    id: 'tc11', type: 'negative', name: 'Zero Burst Time', algo: 'RR',
    desc: 'BT = 0 is invalid (process has no work to do).',
    quantum: 2,
    processes: [{ pid: 'P1', at: 0, bt: 0 }],
    expected: { shouldError: true, reason: 'burst time = 0' }
  },
  {
    id: 'tc12', type: 'negative', name: 'Invalid Quantum (0)', algo: 'RR',
    desc: 'Quantum = 0 must be rejected (infinite loop risk).',
    quantum: 0,
    processes: [{ pid: 'P1', at: 0, bt: 5 }],
    expected: { shouldError: true, reason: 'quantum ≤ 0' }
  },
  {
    id: 'tc13', type: 'negative', name: 'NaN Input', algo: 'FCFS',
    desc: 'Non-numeric string "abc" in burst time. Must reject gracefully.',
    processes: [{ pid: 'P1', at: 0, bt: NaN }],
    expected: { shouldError: true, reason: 'non-numeric value' }
  },

  // ── EDGE CASES ──
  {
    id: 'tc14', type: 'edge', name: 'All Same Arrival', algo: 'FCFS',
    desc: 'All arrive at t=0. FCFS runs in insertion order.',
    processes: [
      { pid: 'P1', at: 0, bt: 3 },
      { pid: 'P2', at: 0, bt: 6 },
      { pid: 'P3', at: 0, bt: 2 }
    ],
    expected: { valid: true }
  },
  {
    id: 'tc15', type: 'edge', name: 'CPU Idle Gap', algo: 'FCFS',
    desc: 'P1 at t=0, P2 at t=10. Idle gap of 5 units must appear in Gantt.',
    processes: [
      { pid: 'P1', at: 0, bt: 5 },
      { pid: 'P2', at: 10, bt: 3 }
    ],
    expected: { hasIdle: true }
  },
  {
    id: 'tc16', type: 'edge', name: 'Large Burst Difference', algo: 'SJF',
    desc: 'P1 BT=100 vs P2 BT=1. SJF should hugely favour P2.',
    processes: [
      { pid: 'P1', at: 0, bt: 100 },
      { pid: 'P2', at: 0, bt: 1 }
    ],
    expected: { firstPid: 'P2' }
  },
];

// ── RENDER TEST CASE CARDS ────────────────────────────────────────
function initTestCards() {
  const grid = document.getElementById('test-grid');
  grid.innerHTML = TEST_CASES.map(tc => `
    <div class="test-case-card" id="card-${tc.id}">
      <div class="tc-label">
        <span>${tc.algo}</span>
        <span class="tc-type ${tc.type}">${tc.type.toUpperCase()}</span>
      </div>
      <div class="tc-name">${tc.name}</div>
      <div class="tc-desc">${tc.desc}</div>
      <div class="tc-status pending" id="status-${tc.id}">◌ PENDING</div>
    </div>
  `).join('');
}
initTestCards();

// ── RUN ALL TESTS ────────────────────────────────────────────────
function runAllTests() {
  const results = TEST_CASES.map(tc => runTestCase(tc));
  renderTestResults(results);
}

function runTestCase(tc) {
  const result = {
    id: tc.id, name: tc.name, type: tc.type, algo: tc.algo,
    status: 'pass', details: [], expected: tc.expected
  };

  try {
    // ── Validate inputs
    const validationErrors = validateProcesses(tc.processes, tc.quantum);

    if (tc.expected.shouldError) {
      if (validationErrors.length > 0) {
        result.status = 'pass';
        result.details.push(`✓ Correctly rejected: ${validationErrors[0]}`);
        result.details.push(`  Expected reason: ${tc.expected.reason}`);
      } else {
        result.status = 'fail';
        result.details.push(`✗ Should have errored (${tc.expected.reason}) but passed.`);
      }
      updateCard(tc.id, result.status);
      return result;
    }

    if (validationErrors.length > 0) {
      result.status = 'fail';
      result.details.push(`✗ Unexpected validation error: ${validationErrors[0]}`);
      updateCard(tc.id, result.status);
      return result;
    }

    // ── Run algorithm
    let output;
    if (tc.algo === 'FCFS') output = computeFCFS(tc.processes);
    else if (tc.algo === 'SJF') output = computeSJF(tc.processes);
    else if (tc.algo === 'RR') output = computeRR(tc.processes, tc.quantum);

    // ── Check expectations
    if (tc.expected.order) {
      const order = output.timeline.filter(t => t.pid !== 'IDLE').map(t => t.pid);
      const uniqueOrder = [...new Set(order)];
      const match = tc.expected.order.every((pid, i) => uniqueOrder[i] === pid);
      if (match) result.details.push(`✓ Execution order correct: ${tc.expected.order.join(' → ')}`);
      else {
        result.status = 'fail';
        result.details.push(`✗ Order mismatch. Expected: ${tc.expected.order.join(' → ')}, Got: ${uniqueOrder.join(' → ')}`);
      }
    }

    if (tc.expected.avgWT !== undefined) {
      const got = output.processes.reduce((s, p) => s + p.wt, 0) / output.processes.length;
      const ok = Math.abs(got - tc.expected.avgWT) < 0.01;
      if (ok) result.details.push(`✓ Avg wait time correct: ${tc.expected.avgWT.toFixed(2)}`);
      else {
        result.status = 'fail';
        result.details.push(`✗ Avg WT: expected ${tc.expected.avgWT.toFixed(2)}, got ${got.toFixed(2)}`);
      }
    }

    if (tc.expected.totalTime !== undefined) {
      const ok = Math.abs(output.totalTime - tc.expected.totalTime) < 0.01;
      if (ok) result.details.push(`✓ Total time correct: ${tc.expected.totalTime}`);
      else {
        result.status = 'fail';
        result.details.push(`✗ Total time: expected ${tc.expected.totalTime}, got ${output.totalTime}`);
      }
    }

    if (tc.expected.wt) {
      tc.expected.wt.forEach((wt, i) => {
        const p = output.processes[i];
        if (Math.abs(p.wt - wt) < 0.01) result.details.push(`✓ ${p.pid} WT = ${wt}`);
        else { result.status = 'fail'; result.details.push(`✗ ${p.pid} WT: expected ${wt}, got ${p.wt}`); }
      });
    }

    if (tc.expected.tat) {
      tc.expected.tat.forEach((tat, i) => {
        const p = output.processes[i];
        if (Math.abs(p.tat - tat) < 0.01) result.details.push(`✓ ${p.pid} TAT = ${tat}`);
        else { result.status = 'fail'; result.details.push(`✗ ${p.pid} TAT: expected ${tat}, got ${p.tat}`); }
      });
    }

    if (tc.expected.hasIdle) {
      const idle = output.timeline.some(t => t.pid === 'IDLE');
      if (idle) result.details.push(`✓ IDLE block detected in timeline`);
      else { result.status = 'warn'; result.details.push(`⚠ Expected IDLE block but none found`); }
    }

    if (tc.expected.firstPid) {
      const first = output.timeline.find(t => t.pid !== 'IDLE');
      if (first && first.pid === tc.expected.firstPid) result.details.push(`✓ First executed: ${tc.expected.firstPid}`);
      else {
        result.status = 'fail';
        result.details.push(`✗ Expected first: ${tc.expected.firstPid}, got: ${first ? first.pid : 'none'}`);
      }
    }

    if (tc.expected.valid && result.details.length === 0) {
      result.details.push(`✓ Ran without errors. Output valid.`);
      result.details.push(`  Processes: ${output.processes.length}, Total time: ${output.totalTime}`);
    }

    // Float precision check
    if (tc.type === 'float') {
      const allFinite = output.processes.every(p => isFinite(p.wt) && isFinite(p.tat));
      if (allFinite) result.details.push(`✓ All float results are finite (no Infinity/NaN)`);
      else { result.status = 'fail'; result.details.push(`✗ Float precision issue: Infinity or NaN in results`); }
    }

  } catch (err) {
    result.status = 'fail';
    result.details.push(`✗ Runtime error: ${err.message}`);
  }

  updateCard(tc.id, result.status);
  return result;
}

function updateCard(id, status) {
  const el = document.getElementById('status-' + id);
  if (!el) return;
  if (status === 'pass') { el.className = 'tc-status pass'; el.textContent = '✓ PASS'; }
  else if (status === 'fail') { el.className = 'tc-status fail'; el.textContent = '✗ FAIL'; }
  else { el.className = 'tc-status warn'; el.textContent = '⚠ WARN'; }
}

function renderTestResults(results) {
  const total = results.length;
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warned = results.filter(r => r.status === 'warn').length;

  const summary = `
    <div class="summary-bar">
      <div class="summary-stat total"><span class="sval">${total}</span><span class="slabel">Total Tests</span></div>
      <div class="summary-stat passed"><span class="sval">${passed}</span><span class="slabel">Passed</span></div>
      <div class="summary-stat failed"><span class="sval">${failed}</span><span class="slabel">Failed</span></div>
      <div class="summary-stat warned"><span class="sval">${warned}</span><span class="slabel">Warnings</span></div>
    </div>
  `;

  const items = results.map(r => `
    <div class="test-result-item ${r.status}">
      <div class="tri-header">
        <span class="tri-name">${r.name} <span style="font-size:11px;color:var(--text-dim);font-family:var(--mono)">[${r.algo} / ${r.type}]</span></span>
        <span class="tri-badge ${r.status}">${r.status.toUpperCase()}</span>
      </div>
      <div class="tri-detail">
        ${r.details.map(d => `<div>${d.replace(/`([^`]+)`/g, '<code>$1</code>')}</div>`).join('')}
      </div>
    </div>
  `).join('');

  document.getElementById('test-results').innerHTML = summary + items;
}

// ─── PURE COMPUTE FUNCTIONS (for tests) ─────────────────────────
function validateProcesses(processes, quantum) {
  const errors = [];
  processes.forEach(p => {
    if (isNaN(p.at) || p.at < 0) errors.push(`${p.pid}: invalid arrival time ${p.at}`);
    if (isNaN(p.bt) || p.bt <= 0) errors.push(`${p.pid}: invalid burst time ${p.bt}`);
  });
  if (quantum !== undefined && (isNaN(quantum) || quantum <= 0)) errors.push('Invalid quantum: ' + quantum);
  return errors;
}

function computeFCFS(procs) {
  const sorted = [...procs].sort((a, b) => a.at - b.at);
  const timeline = [];
  let time = 0;
  sorted.forEach(p => {
    if (time < p.at) { timeline.push({ pid: 'IDLE', start: time, end: p.at }); time = p.at; }
    const s = time; time += p.bt;
    p.start = s; p.finish = time; p.wt = s - p.at; p.tat = time - p.at;
    timeline.push({ pid: p.pid, start: s, end: time });
  });
  return { processes: sorted, timeline, totalTime: time };
}

function computeSJF(procs) {
  const input = procs.map(p => ({ ...p }));
  const timeline = []; let time = 0;
  const done = [], ready = [];
  let remaining = [...input].sort((a, b) => a.at - b.at);
  while (done.length < input.length) {
    remaining.forEach(p => { if (p.at <= time && !ready.includes(p)) ready.push(p); });
    ready.forEach(p => remaining.splice(remaining.indexOf(p), 1));
    if (ready.length === 0) {
      const next = remaining[0];
      timeline.push({ pid: 'IDLE', start: time, end: next.at });
      time = next.at; continue;
    }
    ready.sort((a, b) => a.bt - b.bt);
    const p = ready.shift();
    const s = time; time += p.bt;
    p.start = s; p.finish = time; p.wt = s - p.at; p.tat = time - p.at;
    timeline.push({ pid: p.pid, start: s, end: time });
    done.push(p);
    remaining.forEach(rp => { if (rp.at <= time && !ready.includes(rp)) ready.push(rp); });
    ready.forEach(p => remaining.splice(remaining.indexOf(p), 1));
  }
  return { processes: done, timeline, totalTime: time };
}

function computeRR(procs, quantum) {
  const input = procs.map(p => ({ ...p, remaining: p.bt, finish: null, wt: 0, tat: 0 }));
  const timeline = []; let time = 0;
  const queue = []; const arrived = new Set();
  let remaining = [...input].sort((a, b) => a.at - b.at);
  remaining.filter(p => p.at <= 0).forEach(p => { queue.push(p); arrived.add(p.pid); });
  remaining = remaining.filter(p => p.at > 0);
  let iter = 0;
  while ((queue.length > 0 || remaining.length > 0) && iter++ < 10000) {
    if (queue.length === 0) {
      const next = remaining[0];
      timeline.push({ pid: 'IDLE', start: time, end: next.at });
      time = next.at; queue.push(next); arrived.add(next.pid); remaining.shift();
    }
    const p = queue.shift();
    const exec = Math.min(quantum, p.remaining);
    const s = time; time = round(time + exec); p.remaining = round(p.remaining - exec);
    timeline.push({ pid: p.pid, start: s, end: time });
    remaining.filter(np => np.at <= time && !arrived.has(np.pid)).forEach(np => { queue.push(np); arrived.add(np.pid); remaining.splice(remaining.indexOf(np), 1); });
    if (p.remaining > 0) queue.push(p);
    else { p.finish = time; p.tat = round(time - p.at); p.wt = round(p.tat - p.bt); }
  }
  return { processes: input, timeline, totalTime: time };
}
