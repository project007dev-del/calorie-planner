"""Extract the supplied plan's exercise panels; not needed to build the app.

Usage: python tools/extract-workout-diagrams.py /path/to/source-plan.pdf
Requires pdfplumber and pypdfium2. Only illustration panels are exported.
"""
import logging
from pathlib import Path
import sys

import pdfplumber

logging.getLogger('pdfminer').setLevel(logging.ERROR)
rows = [
    ['bench_press', 'incline_db_press', 'db_shoulder_press', 'lateral_raise', 'triceps_pushdown'],
    ['squat', 'rdl', 'leg_press', 'leg_curl', 'calf_raise'],
    ['lat_pulldown', 'seated_row', 'face_pull', 'biceps_curl', 'back_extension'],
    ['hip_thrust', 'bulgarian_split_squat', 'leg_extension', 'plank', 'dead_bug'],
    ['pushup_chest_press', 'one_arm_db_row', 'lunge_leg_press', 'lateral_raise', 'arms_superset'],
]
output = Path(__file__).resolve().parents[1] / 'assets' / 'exercises'
output.mkdir(parents=True, exist_ok=True)
with pdfplumber.open(sys.argv[1]) as pdf:
    for page_index, exercise_ids in enumerate(rows, start=4):
        page = pdf.pages[page_index]
        panels = [c for c in page.curves if abs(c['x0'] - 39.76) < 1 and 90 < c['bottom'] - c['top'] < 100]
        panels.sort(key=lambda c: c['top'])
        if len(panels) != 5:
            raise ValueError(f'Expected 5 diagram rows on page {page_index + 1}')
        for panel, exercise_id in zip(panels, exercise_ids):
            target = output / f'{exercise_id}.png'
            if target.exists():  # Lateral raise appears twice.
                continue
            box = (39.5, panel['top'] - 1, 284, panel['bottom'] + 1)
            page.crop(box).to_image(resolution=288).save(target, quantize=True)
print(f'Extracted {len(list(output.glob("*.png")))} exercise diagrams')
