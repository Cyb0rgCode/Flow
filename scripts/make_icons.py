#!/usr/bin/env python3
"""Generate the Flow app icons (the 〰️ wave mark on a dark tile)."""
import math
from PIL import Image, ImageDraw

SS = 4  # supersample factor for antialiasing


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def diagonal_bg(size, c1, c2):
    """Diagonal gradient from top-left (c1) to bottom-right (c2)."""
    img = Image.new("RGB", (size, size))
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * (size - 1))
            px[x, y] = lerp(c1, c2, t)
    return img


def wave_points(x0, x1, amplitude, periods, phase, y_center):
    """A wavy dash spanning x0..x1, like the 〰️ emoji next to the title."""
    pts = []
    span = x1 - x0
    steps = int(span)
    for i in range(steps + 1):
        frac = i / steps
        x = x0 + span * frac
        y = y_center + amplitude * math.sin(2 * math.pi * periods * frac + phase)
        pts.append((x, y))
    return pts


def stroke_mask(size, pts, width):
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.line(pts, fill=255, width=width, joint="curve")
    # round the caps
    r = width // 2
    for (x, y) in (pts[0], pts[-1]):
        d.ellipse([x - r, y - r, x + r, y + r], fill=255)
    return mask


def horizontal_gradient(size, stops):
    """stops: list of (pos 0..1, color)."""
    img = Image.new("RGB", (size, size))
    px = img.load()
    row = []
    for x in range(size):
        t = x / (size - 1)
        # find segment
        for j in range(len(stops) - 1):
            p0, c0 = stops[j]
            p1, c1 = stops[j + 1]
            if p0 <= t <= p1:
                lt = (t - p0) / (p1 - p0) if p1 > p0 else 0
                row.append(lerp(c0, c1, lt))
                break
        else:
            row.append(stops[-1][1])
    for y in range(size):
        for x in range(size):
            px[x, y] = row[x]
    return img


def make_master(size):
    s = size * SS
    # Flat solid background (matches the app theme color).
    bg = Image.new("RGB", (s, s), (14, 17, 22))

    # Flat wavy dash matching the 〰️ next to the title, in the app accent blue.
    wave_color = (88, 166, 255)  # --accent

    amp = s * 0.13
    width = int(s * 0.115)
    pts = wave_points(s * 0.16, s * 0.84, amp, 1.5, 0, s * 0.5)

    main_mask = stroke_mask(s, pts, width)
    solid = Image.new("RGB", (s, s), wave_color)
    img = Image.composite(solid, bg, main_mask)

    return img.resize((size, size), Image.LANCZOS)


def rounded(img, radius_frac=0.225):
    """Apply rounded corners (for the maskable/manifest variants)."""
    size = img.width
    r = int(size * radius_frac)
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0))
    out.putalpha(mask)
    return out


master = make_master(1024)

# iOS apple-touch-icon: full-bleed square, iOS adds the rounding itself.
master.resize((180, 180), Image.LANCZOS).save("icons/apple-touch-icon.png")

# PWA manifest icons (square, full-bleed works for "any").
master.resize((192, 192), Image.LANCZOS).save("icons/icon-192.png")
master.resize((512, 512), Image.LANCZOS).save("icons/icon-512.png")

# Rounded variant for favicon / general use.
rounded(master).resize((512, 512), Image.LANCZOS).save("icons/icon-rounded-512.png")
master.resize((32, 32), Image.LANCZOS).save("icons/favicon-32.png")

print("icons written")
