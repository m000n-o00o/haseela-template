"""Print HTML files to PDF with a running header and page numbers (Haseela file template).

Usage: python3 pdf.py jobs.json
jobs.json: [{"html": "...", "pdf": "...", "header": "حصيلة · DEMO · Chapter 1", "landscape": false}]
"""
import asyncio
import os
import json
import sys

from playwright.async_api import async_playwright

FOOT = """<div style="width:100%;font:7px 'IBM Plex Sans','IBM Plex Sans Arabic',sans-serif;color:#566064;
padding:0 12mm;display:flex;justify-content:space-between;direction:ltr">
<span>{header}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>"""


async def main(jobs):
    async with async_playwright() as p:
        browser = await p.chromium.launch(**({"executable_path": os.environ["CHROME"]} if os.environ.get("CHROME") else {}), args=["--no-sandbox"])
        page = await browser.new_page()
        for job in jobs:
            await page.goto("file://" + job["html"], wait_until="networkidle")
            await page.evaluate("document.fonts.ready")
            await page.pdf(
                path=job["pdf"],
                prefer_css_page_size=True,
                print_background=True,
                display_header_footer=True,
                header_template="<span></span>",
                footer_template=FOOT.format(header=job.get("header", "")),
            )
        await browser.close()


if __name__ == "__main__":
    asyncio.run(main(json.load(open(sys.argv[1], encoding="utf-8"))))
