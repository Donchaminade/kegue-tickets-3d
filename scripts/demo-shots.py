import sys, asyncio, time
from playwright.async_api import async_playwright
U = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4317/'
W, H, MOB, TAG = int(sys.argv[2]), int(sys.argv[3]), sys.argv[4] == '1', sys.argv[5]
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=2 if MOB else 1, is_mobile=MOB, has_touch=MOB)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
        await pg.goto(U + '?demo=1')
        t0 = time.time(); i = 0
        while time.time() - t0 < 80:
            await pg.screenshot(path=f'/tmp/kgd/{TAG}-{i:03d}.png')
            i += 1
            st = await pg.evaluate('window.__demo')
            if st == 'done': break
            await pg.wait_for_timeout(1200)
        print('frames', i, 'state', st, 'errs', errs[:5])
        await b.close()
asyncio.run(run())
