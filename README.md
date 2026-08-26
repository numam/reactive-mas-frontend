# MAS Poultry Supply Chain — Complete Dashboard Guide

**HALMAS — Hybrid Adaptive Learning Multi-Agent System**

---

## What Is This System?

This dashboard is the control center for a research system that simulates how a **poultry supply chain** responds when something goes wrong — for example, when a bird flu outbreak hits a farm, or when a slaughterhouse suddenly shuts down.

The supply chain being modeled has **five tiers**, where products flow from one stage to the next:

```
Supplier → Farm → Slaughterhouse → Wholesaler → Retail
```

Each tier is managed by an autonomous software "agent" that monitors its own inventory and communicates with a central coordinator. When a disruption happens at any point in this chain, the system has to decide: how much should each node reduce its output? Should orders be postponed? Should emergency reserves be activated?

The key research question this system tries to answer is:

> **Which decision-making approach keeps chicken products available on shelves most effectively when disruptions occur?**

To answer that, the system runs **100 different disruption scenarios** under **three different operating modes** and compares the results.

---

## Before You Start

The backend server must be running before using any feature on this dashboard.

1. Open a terminal in the `backend/` folder
2. Run: `uvicorn main:app --reload`
3. The backend will be available at `http://localhost:8000`
4. Then open the dashboard at `http://localhost:5173`

If the backend is not running, all pages will show empty data or loading errors.

---

## Navigating the Dashboard

The left sidebar is divided into two sections:

**Main Menu** — General information pages:
- **Dashboard** — Summary statistics and overview
- **Inventory** — Stock levels per node
- **Suppliers** — Supplier profiles in the system

**Analysis** — Simulation and reporting tools:
- **Simulation → Basic** — Simple 5-scenario test run
- **Simulation → HitL** — The main experiment (100 scenarios × 3 modes)
- **Simulation → LLM** — AI agent replaces the human manager
- **Reports → Basic** — View results from Basic simulation
- **Reports → HitL** — View and browse results from HitL simulation

---

## Understanding How a Scenario Works

Before diving into the modes, it helps to understand what actually happens when a simulation runs.

### The Supply Chain in Normal Operation

Under normal conditions, each tier of the supply chain follows a routine: farms receive feed from suppliers, process animals, and send products to slaughterhouses. Slaughterhouses process and forward to wholesalers, and wholesalers distribute to retail. Each node maintains a stock buffer and places orders when inventory drops below a threshold.

### What a "Disruption" Is

A disruption is any event that reduces a node's capacity to operate normally. Examples:
- **Avian influenza outbreak** at a farm — the farm can only operate at 40% capacity for several days
- **Slaughterhouse shutdown** due to equipment failure — processing stops entirely
- **Transport strike** — deliveries between nodes are delayed or blocked
- **Multi-node crisis** — multiple tiers are hit simultaneously (the worst case)

Each scenario specifies:
- **What type of disruption** occurs (disease, logistics, infrastructure, etc.)
- **Where it starts** (the "seed node" — which tier is hit first)
- **How severe** it is (low / medium / high / crisis)
- **How many disruption events** happen and when (the timeline)

### The Simulation Clock

The simulation runs in **ticks**, where **1 tick = 15 minutes** of simulated time. A typical scenario runs for 96–192 ticks (24–48 hours of simulated time). At each tick, every agent checks its stock, sends/receives orders, and the disruption engine updates which nodes are affected.

### What the Orchestrator Does

The heart of the MAS is the **Orchestrator** — a central coordinator that watches all five tiers simultaneously. It uses a set of rules (R1 through R18) to detect disruption patterns and issue coordination signals.

For example:
- If only the Farm is disrupted → Rule R4 triggers → Orchestrator tells Farm to reduce outgoing orders by 20% and buffer reserves
- If both Farm and Slaughterhouse are disrupted → Rule R5 triggers → Stronger action is required across both tiers
- If the entire upstream chain collapses → Rule R11 triggers → Crisis-level emergency instructions go to all nodes

Each rule has an **urgency level** assigned to it:
- `normal` — localized disruption, manageable with minor adjustments
- `high` — multi-tier disruption threatening supply availability
- `crisis` — majority of the chain is disrupted, emergency response needed

When a rule triggers, the orchestrator packages a **coordination signal** — a set of specific instructions such as:
- Reduce outgoing orders by 35%
- Increase reserve stock by 20 units
- Reroute delivery schedule
- Issue emergency reorder request

What happens next with that signal depends entirely on which **mode** the simulation is running in.

---

## The Three Simulation Modes — Explained

This is the most important concept to understand. The same 100 scenarios are run in all three modes so the results can be directly compared.

---

### Mode 1 — Reactive

**The simplest possible approach. No coordination, no intelligence.**

In Reactive mode, the orchestrator does **not** send coordination signals at all. Each node operates purely on its own local rules:

- "If my stock drops below X units, place a reorder"
- "If my stock is above Y units, reduce incoming orders"

Think of it like five separate shops on a street, each only looking at their own shelf. When the farm gets hit by bird flu, the farm reduces output — but the slaughterhouse downstream doesn't know why there's suddenly less supply coming in. It just notices its stock is dropping and eventually places a larger order, but by then it's too late.

**The result:** the disruption cascades slowly and messily down the chain. Stockouts happen. Recovery is slow. This mode acts as the **baseline** — the worst-case "do nothing coordinated" scenario.

**Analogy:** Imagine a fire at a warehouse. Reactive mode is like each employee on the floor just following their personal checklist, without anyone calling the fire brigade or coordinating evacuation.

---

### Mode 2 — Autonomous

**Full MAS coordination. The system handles everything automatically.**

In Autonomous mode, the orchestrator actively monitors all five tiers and sends coordination signals the moment a disruption pattern is detected. Each node **automatically executes** whatever instructions the orchestrator sends — no questions asked, no human review.

When Rule R4 triggers because the farm is disrupted:
1. Orchestrator detects the pattern `Farm=disrupted`
2. Immediately sends instructions: "Farm, reduce outgoing orders by 20%; Slaughterhouse, activate reserve stock"
3. Both nodes execute the instructions at the next tick

The speed here is the key advantage. The system reacts in simulation-seconds. There's no delay, no hesitation, no interpretation — just execution.

**The tradeoff:** The orchestrator's rules are pre-programmed. They cannot account for context that isn't captured in the rule logic. If the situation is unusual or the rule was slightly miscalibrated, the system will execute the wrong action confidently and at full speed.

**Analogy:** This is like having a fully automated fire suppression system. The moment a sensor detects smoke, sprinklers activate everywhere — fast and decisive, but it might drench the wrong room or activate when there's no real fire.

---

### Mode 3 — HitL (Human-in-the-Loop)

**MAS coordination with a human manager reviewing every signal before it executes.**

HitL mode works identically to Autonomous at first — the orchestrator detects disruption patterns, matches rules, and generates coordination signals. The difference is that those signals are **not executed automatically**. Instead, they are sent to a **simulated manager** at the affected tier, who reviews the signal and makes a decision:

| Decision | What it means |
|----------|---------------|
| **Accept** | "The orchestrator's recommendation is correct. Execute as-is." |
| **Modify** | "The direction is right, but I'll adjust the intensity." (e.g. reduce by 15% instead of 20%) |
| **Override** | "I disagree with this recommendation. Don't execute it." |
| **Timeout** | The manager didn't respond in time — the signal expires unexecuted |

Each tier has its own **manager profile** — a behavioral model that reflects how a real supply chain manager at that level typically behaves. For example, a farm manager might be more conservative and frequently modify instructions downward, while a wholesaler manager might be more willing to accept aggressive reorder recommendations.

The manager's decision is logged along with:
- **Why** the orchestrator assigned that urgency level
- **Which tiers** were disrupted at that moment
- **What exactly** was sent as instructions
- **The manager's stated rationale** for the decision

**The result:** HitL mode is slower than Autonomous (the manager takes time to respond) but more adaptive — a good manager can catch cases where the orchestrator's rule was too aggressive or not aggressive enough for the specific context.

**Analogy:** Same fire alarm system, but before the sprinklers activate, a message goes to the building manager: "Fire detected in Room 3B — recommended action: activate suppression. Approve?" The manager looks at the camera feeds and either confirms, adjusts the response, or says "that's just steam from the kitchen, don't activate."

---

### Why Compare All Three?

The research goal is to determine whether human oversight actually improves outcomes — and under what conditions. The three modes answer different questions:

| Question | Answered by comparing |
|----------|----------------------|
| Does MAS coordination help at all? | Reactive vs Autonomous |
| Does human oversight improve over pure automation? | Autonomous vs HitL |
| Is there a cost to human involvement (slower response)? | Look at recovery time in HitL vs Autonomous |
| When does human override help vs hurt? | Decision log analysis in HitL |

The key metric is **Stock Availability Rate (SAR%)** — the percentage of time that stock was available (not at zero) during the disruption window. Higher is better. A SAR of 100% means the supply chain never ran out. A SAR of 60% means stockouts occurred 40% of the time.

---

## The 100 Scenarios

Running just 1 or 5 scenarios would not be enough to draw conclusions — a strategy might perform well on one type of disruption but poorly on another. The 100 scenarios are carefully designed to cover the full space of disruption conditions:

**Disruption types include:**
- Avian influenza H5N1 (local / regional / national spread)
- Newcastle disease outbreak
- Transport and logistics strikes
- Cold chain failure
- Slaughterhouse shutdown (equipment failure, regulatory closure)
- Power outages
- Demand surges and market price crises
- Export bans
- Multi-node simultaneous failures

**Each scenario varies:**
- **Severity level** — low / medium / high / crisis
- **Seed node** — where the disruption originates (supplier, farm, slaughterhouse, wholesaler, or retail)
- **Duration** — how long the disruption lasts
- **Number of events** — how many disruption events occur during the scenario

Running all 100 under all three modes generates statistically robust data that can be analyzed with confidence intervals and significance tests.

---

## Simulation — Basic

**Path:** `Simulation → Basic`

This is a lightweight version using only **5 predefined scenarios** without the HitL framework. It's useful for quickly verifying the system is working or for initial exploration.

The orchestrator runs autonomously (no human review). Results include metrics and an event log.

**How to use:**
1. Click any scenario card (S1–S5) to select it
2. Optionally enable **Verbose** mode for detailed backend logs
3. Click **Run Scenario N** for one scenario, or **Run All 5** to run them sequentially
4. View results and download CSV files from the panel at the bottom

Output is saved to `output/scenario_{id}/`.

---

## Simulation — HitL *(The Main Experiment)*

**Path:** `Simulation → HitL`

This is the core of the research system. It runs the full 100-scenario experiment under any of the three modes.

### Selecting a Mode

At the top of the page, choose which mode to run:

- **Reactive** — No coordination
- **Autonomous** — Full automatic coordination
- **HitL** — Coordination with manager review
- **All 3** — Runs all three modes for the selected scenario and shows a direct comparison table

For the full experiment, select a mode and click **Run All 100**.

### Running a Single Scenario

1. Click any scenario card on the left panel to select it
2. Choose the mode
3. Click **Run S001 [mode]**

The scenario card shows a live pulsing indicator and elapsed time while running. After completion, the card shows the SAR% result.

### Running All 100 Scenarios

1. Select a mode
2. Click **Run All 100 [mode]**
3. The progress banner appears at the top showing:
   - Which scenario is currently running (e.g. "Running Scenario #34")
   - Progress percentage (e.g. 33%)
   - Elapsed time for the current scenario
   - A dot grid showing all 50 visible scenarios (green = done, violet = running, red = error)
4. The page automatically scrolls to the current scenario
5. Click **Stop** at any time to abort — completed scenarios are saved and won't be re-run

The full run can take **several minutes to a few hours** depending on the mode (HitL is slowest because manager response time is simulated).

### Reading the Results

After a scenario completes, click its card to view:

**Metrics Panel** — Key performance indicators:

| Metric | What it measures | Ideal direction |
|--------|-----------------|-----------------|
| Stock Availability Rate (%) | How often stock was above zero during the disruption | Higher is better |
| Time to Recovery (hours) | Simulation hours until the chain returned to normal | Lower is better |
| Stockout Duration (hours) | Total cumulative hours with zero stock | Lower is better |
| Stockout Frequency | How many separate stockout incidents occurred | Lower is better |
| Min Stock During Disruption | The lowest stock level reached | Higher is better |
| Recovery Speed Index (0–1) | Normalized score of how quickly the chain recovered | Higher is better |
| HitL Accept Rate % | Share of manager decisions that accepted the orchestrator signal | Informational |
| HitL Modify Rate % | Share of decisions where the manager adjusted the signal | Informational |
| HitL Override Rate % | Share of decisions where the manager rejected the signal | Informational |
| Mean HRT (hours) | Average time the manager took to respond | Lower means faster |

**3-Way Comparison Table** (visible when mode = "All 3") — Shows the delta (%) between modes for each metric, and a significance marker indicating whether the difference is statistically meaningful.

**HitL Decision Log** — A detailed table of every manager decision during the scenario. Each row is one decision event. Click any row to expand it and see:

- **Urgency Reason** — The orchestrator's explanation for why this urgency level was assigned (e.g. "Local disruption at Farm can still be contained")
- **Disruption Pattern** — A visual display of which tiers were disrupted at that moment (color-coded: red = disrupted, green = normal), for all 5 tiers: Supplier / Farm / SH / Wholesaler / Retail
- **Instructions Sent** — Exactly what the orchestrator told the manager to do (e.g. "outgoing_orders ×0.80; reorder_request +20"), with the number of instruction items
- **Manager Rationale** — The manager's stated reason for accepting, modifying, or overriding

### Downloading Results

The **Saved CSV Files** panel at the bottom lists all output files. Click any filename to download:

| File | Contents |
|------|----------|
| `scenario_metrics_3mode.csv` | All KPIs for all 100 scenarios across all 3 modes |
| `hitl_decision_log.csv` | Every manager decision with full reasoning columns |
| `stock_log_all.csv` | Tick-by-tick stock levels at each node |
| `event_log_all.csv` | All orchestrator rule triggers and events |
| `comparison_3mode.csv` | 3-way statistical comparison table |
| `summary_reactive/autonomous/hitl.csv` | Summary statistics per mode |

Per-scenario files are also available in subdirectories.

---

## Simulation — LLM

**Path:** `Simulation → LLM`

This mode replaces the **simulated human manager** in HitL with a **Large Language Model** running locally via Ollama. The LLM reads the same coordination signal a human manager would receive, reasons about it, and returns a decision (accept / modify / override).

This creates a fourth condition for comparison: instead of asking "does human oversight help?", it asks "does AI oversight help, and how does it compare to humans?"

### Setup Requirements

Before using this page, the following must be ready:

1. **Ollama** must be running: `ollama serve`
2. The desired model must be downloaded:
   - `ollama pull qwen3:4b` (smaller, faster)
   - `ollama pull llama3.1:8b` (larger, more capable)
3. Backend must be running: `uvicorn main:app --reload`

The page shows a warning banner with the exact commands if they haven't been run yet.

### Choosing a Model and Strategy

**Model selection:**

| Model | Parameters | Speed | Notes |
|-------|-----------|-------|-------|
| Qwen3 4B | 4 billion | Moderate | Good reasoning, supports CoT and ToT |
| Llama 3.1 8B | 8 billion | Slower | More capable, better for complex reasoning |

**Prompt strategy:**

| Strategy | How it works | Best for |
|----------|-------------|---------|
| **CoT (Chain-of-Thought)** | The LLM is prompted to reason step by step before giving a final decision. It explains its thinking in sequence: "First I consider the urgency... then the stock level... therefore I accept." | Scenarios where decisions follow clear logic |
| **ToT (Tree-of-Thought)** | The LLM is prompted to explore multiple alternative decision paths (e.g. "What if I accept? What if I modify?") and evaluate each before picking the best one. | Complex scenarios with competing trade-offs |

### How to Run

1. Select a model (Qwen or Llama) by clicking its card
2. Select a strategy (CoT or ToT)
3. Click a scenario card to select a specific scenario
4. Click **Run Scenario #N** for one scenario, or **Run All (100)** for the full batch
5. Use **Stop** to cancel

> **Important:** Each scenario takes 1–10 minutes because the LLM is called once for every coordination signal in the scenario (there can be 5–20 signals per scenario). Do not close the browser tab while running.

### What You See

Each scenario card shows:
- A pulsing dot and live elapsed timer while running
- A colored severity bar at the top (green = low, yellow = medium, orange = high, red = crisis)
- SAR% and completion time after finishing

The **Timing Summary** panel (visible after at least one run) shows:
- Total elapsed time for all completed scenarios
- Average time per scenario
- Fastest and slowest scenarios
- A mini bar chart showing relative time per scenario

### LLM Decision Log

After a scenario run, the decision log shows every LLM decision with:
- Which tick and timestamp the decision was made
- Which tier's manager the LLM was acting as
- The urgency level and which rule triggered
- The LLM's decision (accept / modify / override)
- **Justification** — the LLM's own written explanation for its choice
- Token counts (input and output tokens used)
- API latency (how long the LLM took to respond)

---

## Reports — Basic

**Path:** `Reports → Basic`

A read-only view of completed Basic simulation results. Shows the metrics table and per-scenario CSV data. No new simulations can be triggered from this page — go to Simulation → Basic to run.

---

## Reports — HitL

**Path:** `Reports → HitL`

A read-only analysis view for completed HitL simulation results. Use this page after running simulations to explore results without re-running anything.

**Mode tabs** at the top switch between Reactive, Autonomous, and HitL views.

**Per-Scenario CSV Data** section at the bottom shows all scenarios that have saved output. Click any scenario to expand it and load four data tabs on demand:
- **metrics** — the KPI results for that scenario
- **event log** — all orchestrator events during the run
- **stock log** — tick-by-tick stock levels
- **hitl decision log** — every manager decision with reasoning columns

All data can be downloaded as CSV directly from this page.

---

## Recommended Workflow

### Full Research Run (Main Use Case)

```
Step 1 — Start the backend
  $ uvicorn main:app --reload   (from backend/ folder)

Step 2 — Open the dashboard
  http://localhost:5173

Step 3 — Run HitL simulation for all 100 scenarios
  Go to: Simulation → HitL
  Select mode: "All 3"  (runs Reactive + Autonomous + HitL together)
  Click: "Run All 100 [all]"
  Wait for completion (progress shown in the banner)

Step 4 — Review results
  Click any scenario card to see its metrics and decision log
  The 3-way comparison table shows which mode performed best

Step 5 — Download CSV files
  Use the Saved CSV Files panel at the bottom
  Download: scenario_metrics_3mode.csv, hitl_decision_log.csv

Step 6 — Browse results
  Go to: Reports → HitL
  Use the mode tabs to compare Reactive vs Autonomous vs HitL
  Expand individual scenarios for detailed data
```

### LLM Comparison Run

```
Step 1 — Ensure Ollama is running
  $ ollama serve
  $ ollama pull qwen3:4b

Step 2 — Go to Simulation → LLM
  Select model: Qwen3 4B
  Select strategy: CoT

Step 3 — Run all 100 scenarios
  Click: Run All (100)
  Wait (this takes longer than HitL)

Step 4 — Compare with HitL results
  Download scenario_metrics_cot.csv
  Compare SAR%, recovery time, and decision rates against HitL modes
```

---

## Understanding the Metrics — A Plain-Language Summary

**Stock Availability Rate (SAR%)** is the headline metric. It answers: "During the disruption period, what fraction of the time was there actually stock available in the chain?" A score of 85% means that for 15% of the disruption window, at least one node had run out. Higher is always better.

**Time to Recovery** measures how many simulation hours passed from the start of the disruption until all nodes returned to normal operation. A faster recovery means the coordination strategy was effective at responding quickly.

**Stockout Duration and Frequency** break down the stockout problem: duration measures the total hours of emptiness, frequency counts how many separate incidents occurred. A strategy could have short but frequent stockouts, or one long continuous one — both bad, but for different reasons.

**Recovery Speed Index** compresses the recovery behavior into a single 0–1 score. A score close to 1 means the chain bounced back almost immediately. Close to 0 means it lingered in a degraded state for a long time.

**HitL Accept / Modify / Override Rates** describe the manager's behavior. A high Accept Rate suggests the orchestrator's recommendations were generally good. A high Override Rate suggests the manager frequently disagreed. A high Modify Rate suggests the manager agreed with the direction but wanted to dial back the intensity.

**Mean HRT (Human Response Time)** captures the cost of human involvement — the average delay between when a signal was sent and when the manager decided. In the simulated model this reflects the behavioral profile of each manager tier. In a real system, this would be actual human response latency.

---

## Frequently Asked Questions

**Q: Why are there 100 scenarios and not more or fewer?**  
A: 100 provides sufficient statistical power to detect meaningful differences between modes while keeping computation time manageable. The scenarios are designed to cover the full combinatorial space of disruption types × severities × seed nodes.

**Q: Can I run just a subset of scenarios?**  
A: Yes. In Simulation → HitL, click any individual scenario card and click Run to run just that one. For LLM simulation, the same applies.

**Q: What is a "tick"?**  
A: One tick equals 15 minutes of simulated time. A scenario running for 96 ticks simulates 24 hours. The orchestrator checks conditions and potentially sends signals at every tick.

**Q: Why does HitL sometimes perform worse than Autonomous?**  
A: Because human response takes time (the manager's simulated HRT adds delay), and because managers sometimes override correct recommendations. This is intentional — the system is designed to capture both the benefits and costs of human oversight.

**Q: Why does Reactive perform the worst?**  
A: Because without coordination, each node only reacts to its own local stock signal. By the time a downstream node notices a problem, the disruption has already cascaded. Coordination enables proactive response before stockouts occur.

**Q: What does "seed node" mean?**  
A: The seed node is the tier where the disruption originates. If the seed node is "farm", the disruption starts at the farm and may propagate downstream. Different seed nodes test the system's ability to detect and respond to disruptions at different points in the chain.

**Q: Can I add new scenarios?**  
A: Scenarios are defined in the backend. The frontend fetches them from `GET /hitl/scenarios` and displays whatever the backend provides. To add new scenarios, modify the backend scenario database.

---

## Technical Reference

| Item | Value |
|------|-------|
| Backend URL | `http://localhost:8000` |
| Frontend URL | `http://localhost:5173` |
| Tick resolution | 1 tick = 15 minutes simulated time |
| Scenarios | 100 (IDs 1–100) |
| Simulation modes | Reactive, Autonomous, HitL, All 3 |
| LLM models | Qwen3 4B, Llama 3.1 8B (via Ollama) |
| LLM strategies | CoT (Chain-of-Thought), ToT (Tree-of-Thought) |
| Orchestrator rules | R1–R18 |
| Urgency levels | normal, high, crisis |
| Manager decisions | accept, modify, override, timeout |
| CSV separator (decision log) | Semicolon `;` (for Excel compatibility) |
| Dark mode | Toggle via sun/moon icon in the top bar |
