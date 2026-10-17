from PIL import Image, ImageDraw, ImageFilter, ImageFont
W, H = 1920, 1080
SW, SH = 462, 1000          # phone screen size in the frame (1170x2532 scaled)
SX, SY = (W - SW) // 2, (H - SH) // 2
bg = Image.new("RGB", (W, H), "#f1eee7")
d = ImageDraw.Draw(bg)
for (cx, cy, r, c) in [(300, 220, 260, "#dfe7e2"), (1660, 880, 320, "#f1e3da"), (1620, 170, 150, "#e0e8ec"), (230, 940, 170, "#f1e3da")]:
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=c)
# soft shadow under the phone
sh = Image.new("L", (W, H), 0)
ImageDraw.Draw(sh).rounded_rectangle((SX - 14, SY - 6 + 18, SX + SW + 14, SY + SH + 14 + 18), 56, fill=90)
sh = sh.filter(ImageFilter.GaussianBlur(26))
bg.paste(Image.new("RGB", (W, H), "#2b302d"), (0, 0), sh)
d = ImageDraw.Draw(bg)
# phone body
d.rounded_rectangle((SX - 14, SY - 14 + 4, SX + SW + 14, SY + SH + 14 - 4), 58, fill="#2b302d")
bg.save("bg.png")
# rounded mask for the screen
m = Image.new("L", (SW, SH), 0)
ImageDraw.Draw(m).rounded_rectangle((0, 0, SW - 1, SH - 1), 44, fill=255)
m.save("mask.png")
print(SX, SY)
