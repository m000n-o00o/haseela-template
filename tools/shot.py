import os
import sys,asyncio
from playwright.async_api import async_playwright
async def main(pages):
    async with async_playwright() as p:
        b = await p.chromium.launch(**({"executable_path": os.environ["CHROME"]} if os.environ.get("CHROME") else {}), args=["--no-sandbox"])
        for path,out,scheme,clicks in pages:
            pg=await b.new_page(viewport={'width':1100,'height':900},color_scheme=scheme)
            errs=[];pg.on('pageerror',lambda e:errs.append(str(e)));pg.on('console',lambda m:m.type=='error' and errs.append(m.text))
            await pg.goto('file://'+path);await pg.wait_for_timeout(600)
            for c in clicks: await pg.click(c);await pg.wait_for_timeout(150)
            await pg.screenshot(path=out,full_page=True);print(out,'errors:',[e for e in errs if 'fonts.g' not in e])
        await b.close()
import json;asyncio.run(main(json.loads(sys.argv[1])))
