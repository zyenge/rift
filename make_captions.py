from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

OUT = Path('/Users/zhen/Documents/projects/omni/video-assets/captions')
OUT.mkdir(parents=True, exist_ok=True)

font_title_path = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'
font_body_path = '/System/Library/Fonts/Supplemental/Arial.ttf'

ft = ImageFont.truetype(font_title_path, 64)
fb = ImageFont.truetype(font_body_path, 36)

scenes = {
    'v1_s1': (
        'Vision 1  Real Time Utility',
        '6:10 PM in Manhattan. A busy city dweller decides whether',
        'to make a Trader Joes trip based on checkout line length.'
    ),
    'v1_s2': (
        'The Live Answer',
        'An Omni responder nearby sends a fresh visual in minutes.',
        'No guessing. No stale reviews. Just current reality.'
    ),
    'v1_s3': (
        'Decision with Confidence',
        'The line is short, so they go now and finish quickly.',
        'Omni gives back time, energy, and peace of mind.'
    ),
    'v2_s1': (
        'Vision 2  Emotional Presence',
        'A mom in NYC sits with her toddler after dinner.',
        'She wants to show where she grew up, in the present.'
    ),
    'v2_s2': (
        'A Window to Home',
        'A live video arrives from her remote village.',
        'The road, the light, and the place still alive today.'
    ),
    'v2_s3': (
        'Connection Across Generations',
        'Her toddler watches while she tells stories of that village.',
        'Omni becomes a bridge between memory, identity, and family.'
    ),
}

for name, lines in scenes.items():
    img = Image.new('RGBA', (1280, 720), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((60, 430, 1220, 680), radius=24, fill=(0, 0, 0, 150), outline=(255, 210, 125, 230), width=3)
    d.text((90, 465), lines[0], font=ft, fill=(255, 255, 255, 255))
    d.text((90, 552), lines[1], font=fb, fill=(255, 255, 255, 245))
    d.text((90, 602), lines[2], font=fb, fill=(255, 255, 255, 245))
    img.save(OUT / f'{name}.png')
    print('wrote', OUT / f'{name}.png')
