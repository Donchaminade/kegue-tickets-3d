# Frame-by-frame recording of the ?demo=1 walkthrough using the virtual clock in public/capture.js
import sys, asyncio, subprocess, time, io
from PIL import Image, ImageFilter
from playwright.async_api import async_playwright
U = sys.argv[1]
W, H = int(sys.argv[2]), int(sys.argv[3])
OUT = sys.argv[4]
MOB = len(sys.argv) > 5 and sys.argv[5] == 'mobile'
MAXF = int(sys.argv[6]) if len(sys.argv) > 6 else 99999
FPS = 30
SCALE = 2 if MOB else 1
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--hide-scrollbars'])
        if MOB:
            ctx = await b.new_context(viewport={'width': W // 2, 'height': H // 2}, device_scale_factor=2, is_mobile=True, has_touch=True)
        else:
            ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=1)
        pg = await ctx.new_page()
        pg.set_default_timeout(120000)
        pg.on('pageerror', lambda e: print('ERR', e))
        await pg.goto(U + ('&' if '?' in U else '?') + 'demo=1&capture=1')
        await pg.wait_for_function('window.__captureMode === true')
        ff = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', str(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-vf', f'scale={W}:{H}:flags=lanczos', OUT], stdin=subprocess.PIPE)
        t0 = time.time(); n = 0; tail = None
        while n < MAXF:
            await pg.evaluate('window.__advance(1000/30)')
            for k in range(3):
                try:
                    buf = await pg.screenshot(type='jpeg', quality=93, timeout=90000); break
                except Exception as e:
                    print('retry screenshot', n, e, flush=True)
            bl = await pg.evaluate('window.__blur || 0')
            if bl > 0.05:  # camera motion blur (applied here, CSS blur is too slow to capture)
                im = Image.open(io.BytesIO(buf)).filter(ImageFilter.GaussianBlur(bl * SCALE))
                o = io.BytesIO(); im.save(o, 'JPEG', quality=93); buf = o.getvalue()
            ff.stdin.write(buf); n += 1
            if n % 60 == 0:
                print(n, round((time.time() - t0) / n, 2), 's/frame', flush=True)
            if tail is None and n % 15 == 0 and await pg.evaluate('window.__demo') == 'done':
                tail = n + 15
            if tail and n >= tail: break
        ff.stdin.close(); ff.wait()
        print('done frames', n, 'secs', n / FPS, 'elapsed', round(time.time() - t0))
        await b.close()
asyncio.run(run())
