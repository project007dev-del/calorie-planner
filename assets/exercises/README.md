# Exercise movement panels

These 24 PNGs contain only the illustration panels from pages 5-9 of the supplied **Lean Muscle & Fat-Loss Plan**. They retain the start/finish numbers and movement arrows; Plank shows a hold position. The full source PDF and its other pages are not included.

The panels are rendered at 288 dpi using `tools/extract-workout-diagrams.py`. The application build uses the committed PNGs and does not require Python or the source PDF. `js/exercise-guides.js` maps exercises to assets; the service worker and Android bundle include all panels.
