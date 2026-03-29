# GuruG GoldTrader 📈🪙
**Professional XAUUSD Trading Calculator & Trade Journal for MT5**

GuruG GoldTrader is a premium, web-based trading calculator and journaling application designed specifically for XAU/USD (Gold) traders utilizing MetaTrader 5 on USD accounts. It simplifies risk management and provides real-time spot gold prices natively without any backend or database setups.

![GoldTrader Preview](https://via.placeholder.com/800x400.png?text=GuruG+GoldTrader+Preview)

## ✨ Core Features
- **Live Gold Spot Ticker:** Real-time fetching of XAU/USD prices directly from CORS-friendly internet endpoints. Features session high/low tracking.
- **Risk to Reward Calculator:** Input your Stop Loss (SL) and Take Profit (TP) to automatically calculate necessary Lot Sizes, Pip Value, and exact USD risk.
- **Risk Management Profiles:** Choose between risking a fixed percentage (%) of your account balance or a flat dollar amount ($).
- **Gold → INR Converter:** A dedicated tool for converting Troy Ounces into Indian Gram weights (10g, 1g, Tola) with real-time USD/INR exchange rates, custom Import Duty (%), and GST (%).
- **Interactive Trade Journal:** Log your calculated setups directly into an internal journal.
  - Track Win Rate & Net Strategy P&L
  - Visualize your performance via an Equity Curve Chart
  - All logs are saved locally directly in your browser (`localStorage`).
- **Data Export:** Instantly download your full trading history to a nicely formatted `.csv` file.

## 🚀 Live Demo
You can access the live version of this tool instantly without the need to download anything:
👉 **[View GuruG GoldTrader Live](https://istartedcoding.github.io/gurug-goldtrader)**

## 🛠 Tech Stack
GuruG GoldTrader was purposely built to be universally accessible, lightning-fast, and completely independent of complex frameworks.
- **HTML5:** Clean, semantic structure.
- **Vanilla CSS3:** Highly responsive, dark-mode focused UI containing modern CSS pseudo-elements, glass-morphism, and custom variable-based theming.
- **Vanilla JavaScript:** Zero dependencies. Handles all business logic, local data persistence, algorithmic DOM rendering, and API polling.

## 📥 Local Installation
If you wish to modify the calculator or run it completely on your own machine:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/istartedcoding/gurug-goldtrader.git
   ```
2. **Open the project directory:**
   ```bash
   cd gurug-goldtrader
   ```
3. **Run the app:**
   Simply double-click on `index.html` to open it in your default web browser. No `npm install`, Node.js, or local servers are required!

*(Note: While running directly from a `file://` local state, strict browser CORS policies may block live ticker API fetches. To view live prices locally, consider right-clicking `index.html` in VS Code and selecting "Open with Live Server".)*

## 📝 License
This project is open-source and free to be adapted by traders.

---
*Built to manage risk. Designed to win.*
