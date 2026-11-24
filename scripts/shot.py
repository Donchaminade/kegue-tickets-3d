import sys, asyncio
from playwright.async_api import async_playwright
U = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4317/'
OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp/kg'
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        for name, vp, mob in [('desktop', {'width': 1440, 'height': 900}, False), ('mobile', {'width': 390, 'height': 844}, True)]:
            ctx = await b.new_context(viewport=vp, device_scale_factor=2 if mob else 1, is_mobile=mob, has_touch=mob)
            pg = await ctx.new_page()
            errs = []
            pg.on('console', lambda m: m.type in ('error', 'warning') and errs.append(m.text))
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(U)
            await pg.wait_for_timeout(9000)
            await pg.screenshot(path=f'{OUT}-{name}.png')
            print(name, errs[:5])
            await ctx.close()
        await b.close()
asyncio.run(run())
