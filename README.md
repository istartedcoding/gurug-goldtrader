# GuruG GoldTrader 📈

### XAU/USD Risk Management & Trade Journal for MT5

GuruG GoldTrader is a lightweight browser-based trading utility designed for **XAU/USD traders using MetaTrader 5**. It combines position sizing, risk-to-reward calculations, gold-to-INR conversion and trade journaling in a single interface.

The project is intentionally built without a backend or framework, making it easy to run, inspect and adapt.

## Highlights

- **Live XAU/USD ticker** with session high/low tracking
- **Risk-to-reward calculator** for stop-loss and take-profit planning
- **Position sizing** based on percentage or fixed-dollar risk
- **Gold → INR conversion** with configurable import duty and GST inputs
- **Trade journal** with win rate, P&L and equity curve tracking
- **Local browser storage** using `localStorage`
- **CSV export** for trade history
- **Responsive dark-mode interface**

## Live Demo

**[Open GuruG GoldTrader](https://istartedcoding.github.io/gurug-goldtrader)**

## Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 | Application structure |
| CSS3 | Responsive UI and visual design |
| JavaScript | Calculations, state management and UI logic |
| Browser APIs | Local persistence and data export |
| External APIs | Market and currency data |

## Architecture

```text
Market / Currency APIs
        ↓
   JavaScript Logic
        ↓
┌───────────────────────┐
│ Risk Calculator       │
│ Position Sizing       │
│ Gold → INR Converter  │
│ Trade Journal         │
└───────────────────────┘
        ↓
 Browser localStorage
        ↓
      CSV Export
```

## Run Locally

```bash
git clone https://github.com/istartedcoding/gurug-goldtrader.git
cd gurug-goldtrader
```

Open `index.html` in a browser. For live API requests during local development, use a local development server such as VS Code Live Server if required by browser CORS policies.

## Why I Built It

This project started as a practical exercise in turning a trading workflow into a simple, self-contained application. It focuses on **risk management, usability, data handling and client-side automation** without introducing unnecessary infrastructure.

## License

Open source and free to adapt.

---

Built by **Guru Gowda**.