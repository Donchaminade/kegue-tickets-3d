# Walks the full flow with real clicks and saves screenshots: python3 scripts/flow.py URL W H mobile(0/1) outprefix
import asyncio, sys
from playwright.async_api import async_playwright
U, W, H, MOB, OUT = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4] == '1', sys.argv[5]
async def run():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=2 if MOB else 1, is_mobile=MOB, has_touch=MOB)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: m.type == 'error' and errs.append(m.text))
        await pg.goto(U)
        await pg.add_style_tag(content='canvas{filter:none!important}')  # CSS blur is very slow to screenshot in software rendering
        pg.set_default_timeout(90000)
        await pg.wait_for_timeout(8000)
        await pg.evaluate("window.__kg.useApp.getState().set({autoRotate:false})")
        await pg.wait_for_timeout(2500)
        await pg.screenshot(path=f'{OUT}-1-aerial.png')
        if not MOB:
            await pg.evaluate("(()=>{const k=window.__kg;const b=k.BLOCK_BY_ID['A14'];const c={x:0,y:0};k.useApp.getState().set({hover:{id:'A14',x:W/2,y:H/2}})})()".replace('W/2', str(W//2)).replace('H/2', str(H//2)))
            await pg.wait_for_timeout(800)
            await pg.screenshot(path=f'{OUT}-2-hover.png')
        await pg.evaluate("(()=>{const k=window.__kg;k.selectBlock(k.BLOCK_BY_ID['A14'])})()")
        await pg.wait_for_timeout(6000)
        await pg.screenshot(path=f'{OUT}-3-block.png')
        await pg.click('[data-demo="btn-best"]')
        await pg.wait_for_timeout(1500)
        await pg.screenshot(path=f'{OUT}-4-seat-selected.png')
        await pg.click('[data-demo="btn-view"]')
        await pg.wait_for_timeout(7000)
        await pg.screenshot(path=f'{OUT}-5-seat-view.png')
        await pg.click('[data-demo="btn-book"]')
        await pg.wait_for_timeout(2500)
        await pg.click('[data-demo="qty-plus"]')
        await pg.wait_for_timeout(1500)
        await pg.screenshot(path=f'{OUT}-6-recap.png')
        await pg.click('[data-demo="btn-continue"]')
        await pg.wait_for_timeout(1500)
        await pg.fill('[data-demo="phone"]', '90123456')
        await pg.wait_for_timeout(800)
        await pg.screenshot(path=f'{OUT}-7-payment.png')
        await pg.click('[data-demo="btn-pay"]')
        await pg.wait_for_timeout(1500)
        await pg.screenshot(path=f'{OUT}-8-confirm.png')
        await pg.wait_for_timeout(4500)
        await pg.screenshot(path=f'{OUT}-9-ticket.png')
        await pg.click('[data-demo="btn-loges"]') if False else None
        await pg.click('[data-demo="btn-home"]')
        await pg.wait_for_timeout(1000)
        await pg.click('[data-demo="btn-loges"]')
        await pg.wait_for_timeout(6000)
        await pg.screenshot(path=f'{OUT}-10-loges.png')
        # overflow check
        ov = await pg.evaluate("document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight")
        print(OUT, 'errors:', errs[:5], 'overflow:', ov)
        await b.close()
asyncio.run(run())
