# Interactive Scheduler & PCB Visualizer

A dark-themed interactive web dashboard for demonstrating operating system scheduling concepts and Process Control Block (PCB) analysis.

## Project Overview

This project works like an **Operating System Control Center**. It lets users create processes, choose a scheduling algorithm, start or pause the scheduler, observe queue movement, inspect PCB details, and watch live scheduler events.

## Features

- Dark professional OS dashboard interface
- Live metric cards for context switches, threads, processes, and handles
- Process count, thread count, and handle count timeline graphs
- Process creation using PID, priority, and burst time
- Scheduling algorithm selector:
  - FCFS
  - SJF
  - Round Robin
  - Priority Scheduling
- Ready, Running, and Waiting queue visualization
- Terminal-style scheduler event stream
- PCB search popup with process details
- CPU scheduling timeline
- Smooth hover and interaction feedback

## OS Concepts Demonstrated

- Process Control Block (PCB)
- Process states: Ready, Running, Waiting
- CPU scheduling
- Context switching
- Process priority
- Burst time
- Thread count
- Memory usage
- Handles
- Scheduler event flow

## How to Run

Open the project folder and run a local server:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

You can also open `index.html` directly in a browser.

## How to Use

1. Enter a PID, priority, and burst time.
2. Select a scheduling algorithm.
3. Click **Create Process**.
4. Click **Start Scheduler**.
5. Watch processes move between Ready, Running, and Waiting queues.
6. Search for a process like `P1`, `P2`, or `P3` to view PCB details.

## Files

- `index.html` - dashboard structure
- `styles.css` - dark theme and visual design
- `script.js` - scheduler logic, graphs, queues, events, and PCB popup

## Project Title

**Interactive Scheduler & PCB Visualizer**
