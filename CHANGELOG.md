# Changelog

All notable changes to the GuruG GoldTrader application will be documented in this file.

## [Unreleased]

### Added feature: Manual Position Sizing
- Added a **Manual Lot Size** selection option to the calculator in addition to `% of Account` and `Fixed $` Risk modes.
- Introduced a precision range slider to easily slide through micro, mini, and standard lots (0.01 - 10.00).
- Selecting a manual lot size automatically back-calculates the maximum dollar risk and risk percentage depending on account balance and stop-loss distance.
- Integrated the manual lot sizing seamlessly so that trading metrics (Take Profit, P&L, Pip Value) and the Trade Journal still receive and log the exact specified risk parameters automatically.

---
*Created automatically to track user-requested feature additions.*
