# Israk Sarker — Portfolio Website

Personal developer & IT systems portfolio published at [israk-sarker.github.io](https://israk-sarker.github.io/).

Showcases projects in **systems infrastructure**, **cloud virtualization**, **networking coursework**, **PowerShell automation**, and **interactive web applications & mathematical simulations**.

---

## 👨‍💻 About Me

- **Name:** Israk Sarker
- **Education:** 5th Year Computer Science Student at **ITIS Carlo Zuccante** (Mestre, Venice, Italy — Diploma expected 2027)
- **Internship:** IT Infrastructure & Systems Administration Intern at **Logos Technologies**
- **Core Focus:** VMware ESXi, Windows Server 2025, Active Directory, QNAP NAS (iSCSI), Microsoft Entra ID, Veeam Backup for M365, Docker & Linux administration.
- **Languages:** Italian (Native), Bangla (Native), English (Fluent), Hindi (Spoken)

---

## 🚀 Key Highlights & Portfolio Sections

### 1. 🛡️ Featured Project: Veeam M365 Restore Tester
- **Repository:** [`israk101/veeam-m365-export-automation`](https://github.com/israk101/veeam-m365-export-automation)
- Released desktop application (v1.2.4), validated in an isolated lab.
- Extracts one eligible sample per workload from the selected job's latest restore point to the local VB365 host. It does not write to Microsoft 365 or support remote Veeam servers.
- Records file-size and SHA-256 evidence. A sample run does not certify every protected object; JSON reporting is required, with TXT, HTML, and PDF formats optional.
- Packaged with a standalone PySide6 (Qt) desktop application.

### 2. 🖥️ Virtualization and Infrastructure Lab
- Built and documented a lab using VMware ESXi, Windows Server, QNAP iSCSI storage, Active Directory, DNS/DHCP, DFS, and Microsoft Entra Cloud Sync.
- Validation limits are documented for the rebuilt DFS pair, the LAPS pilot, and the final backup destination.

### 3. 🖥️ Self-Hosted Debian Homelab
- Headless **Debian 12 Bookworm** home server with Docker services.
- See the [homelab overview](./projects/homelab.html) for the host and service layout.
- Containerized microservices orchestrated via **Docker & Portainer**:
  - **Pi-hole**: Network-wide DNS sinkhole & ad-blocking.
  - **Vaultwarden**: Self-hosted password management.
  - **Uptime Kuma**: Service monitoring.
  - **Tailscale**: Private remote access.
  - **Homepage**: Service dashboard.

### 4. 🧪 Interactive Live Demos & Simulations
All hosted live directly on the site:
- **[Valorant Tracker](./valorant-tracker/index.html)**: Gaming statistics dashboard with Chart.js performance telemetry.
- **[Weather Station Dashboard](./WeatherStation/index.html)**: Environmental IoT telemetry dashboard; also see the [Lite Version](./WeatherStation-lite/index.html).
- **[Pi Calculator](./pyMonteCarlo.html)**: Stochastic Monte Carlo simulation and Trapezoidal calculus integration visualizer.
- **[Recursive Fractal Tree](./albero.html)**: Real-time geometric recursion simulation on HTML5 Canvas.
- **[Von Koch Snowflake](./trinagles.html)**: Recursive fractal snowflake generator.
- **[Perceptron & Function Drawer](./functionDrwer/index.html)**: Single-layer neural perceptron classifier and function plotter.
- **[Card Fetch API](./FETCH%20EXAMPLE/index.html)**: Modern asynchronous JavaScript Fetch API demo.
- **[Color Temperature Quiz](./Colori/frontEnd/index.html)**: Italian-language color-classification experiment with history stored in the visitor's browser.
- **[3D Rubik's Cube Simulator](./cuborubic/index.html)**: Interactive 3D cube rotation with CSS transforms.

### 5. 📄 Curriculum Vitae (CV)
Visitors can view the Italian-language public CV in an embedded PDF viewer on the [CV page](./cv.html), open it separately, or download it. The public copy omits the home address and date of birth.

---

## 🛠️ Tech Stack of the Website

- **Semantic HTML5** & **Modern CSS3** (CSS Custom Properties, CSS Grid & Flexbox).
- **Vanilla JavaScript (ES6+)** with no application runtime dependencies for GitHub Pages.
- Fully responsive across desktop, tablet, and mobile devices.

---

## 📬 Contact

- **Email:** [israk.sarker08@gmail.com](mailto:israk.sarker08@gmail.com)
- **LinkedIn:** [linkedin.com/in/israk-sarker](https://linkedin.com/in/israk-sarker)
- **GitHub:** [github.com/israk101](https://github.com/israk101)
