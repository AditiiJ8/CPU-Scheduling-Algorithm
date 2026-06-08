# CPU Scheduler Simulator

A browser-based simulator for CPU scheduling algorithms built as part of an Operating Systems case study. Visualizes process execution using FCFS, SJF, and Round Robin with real-time Gantt charts, performance metrics, and a full test suite covering positive, negative, and floating-point inputs.

---

## Demo

Open `index.html` in any browser — no installation, no dependencies, no build step.

---

## Features

- **Three scheduling algorithms** — FCFS, SJF (non-preemptive), and Round Robin (preemptive)
- **Gantt chart visualization** — color-coded per process with time tick markers
- **Performance metrics** — Average Wait Time, Average Turnaround Time, Throughput, Total Execution Time
- **Input validation** — catches negative values, zero burst times, NaN, invalid quantum before running
- **16 test cases** — organized into positive, negative, float, and edge categories with a pass/fail/warn runner
- **Floating-point support** — handles decimal arrival times, burst times, and time quantum
- **Responsive UI** — works on desktop and mobile browsers

---

## Algorithms

| Algorithm | Type | Description |
|---|---|---|
| FCFS | Non-preemptive | Executes in order of arrival. Simple, may cause convoy effect. |
| SJF | Non-preemptive | Picks the shortest available job. Optimal average wait time but risks starvation. |
| Round Robin | Preemptive | Assigns fixed time quantum to each process cyclically. Fair, suited for time-sharing. |

---

## Getting Started

### Run locally

```bash
cd path/to/OS_project
python -m http.server 8000
```

Then visit `http://localhost:8000` in your browser.

Alternatively, just double-click `index.html` — it works without a server since there are no API calls.

### No dependencies

Pure HTML, CSS, and JavaScript. No frameworks, no npm, no build tools.

---

## Project Structure

```
OS_project/
├── index.html       # Main UI and tab structure
├── style.css        # Styling, theming, Gantt chart layout
└── app.js           # Algorithm logic, rendering, test runner
```

---

## Test Cases

The **Test Cases** tab runs 16 automated tests across all three algorithms.

| Category | Count | What's tested |
|---|---|---|
| Positive | 4 | Standard integer inputs, correct ordering, expected WT/TAT |
| Float | 4 | Decimal burst/arrival times, float quantum, precision checks |
| Negative | 5 | Negative AT/BT, zero BT, zero quantum, NaN — all must error |
| Edge | 3 | CPU idle gaps, single process, extreme burst difference |

Each test shows a PASS / FAIL / WARN status with a detailed reason.

---

## Case Study Context

> *Explores the implementation of CPU scheduling algorithms using Java to understand how operating systems manage process execution efficiently. Also to determine how multiple processes share limited system resources such as the CPU. The way processes are scheduled directly affects overall system performance, responsiveness, throughput, and fairness among users.*

This simulator provides an interactive frontend layer to that case study — letting you observe how each algorithm behaves under different process configurations and understand the trade-offs between them.

---

## Tech Stack

- HTML5
- CSS3 (custom properties, grid, animations)
- Vanilla JavaScript (ES6+)
- Google Fonts — [Syne](https://fonts.google.com/specimen/Syne), [Space Mono](https://fonts.google.com/specimen/Space+Mono)

---

## Author

**Aditi Jaiswal**  
B.Tech Information Technology — Stanley College of Engineering and Technology for Women, Hyderabad  
IT-A


---

## License

MIT
