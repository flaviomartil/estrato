#!/usr/bin/env python3
"""Exercise a built architecture document in Chromium, offline.

Requires the optional development dependency: pip install playwright
Provide --browser /path/to/chromium or install Playwright's Chromium.
This script does not modify the document. Outputs can contain its private content.
"""
import argparse
import json
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET
from playwright.sync_api import sync_playwright


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("html", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--browser")
    parser.add_argument("--url", help="Optional loopback HTTP URL; otherwise loads file contents offline.")
    args = parser.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    source = args.html.read_text(encoding="utf-8")
    report = {"ok": False, "loading": "loopback-http" if args.url else "set-content", "maps": [], "checks": {}, "errors": [], "external_requests": []}
    data = json.loads(re.search(r'<script id="document-data" type="application/json">(.*?)</script>', source, re.S).group(1))
    with sync_playwright() as p:
        kwargs = {"headless": True}
        if args.browser:
            kwargs["executable_path"] = args.browser
        browser = p.chromium.launch(**kwargs)
        context = browser.new_context(viewport={"width": 1512, "height": 1050}, device_scale_factor=1, accept_downloads=True, reduced_motion="reduce")
        page = context.new_page()
        page.set_default_timeout(6000)
        page.on("pageerror", lambda e: report["errors"].append(str(e)))
        page.on("console", lambda m: report["errors"].append(m.text) if m.type == "error" else None)
        def track(request):
            if request.url.startswith(("http://", "https://")) and not (args.url and request.url.startswith(args.url)):
                report["external_requests"].append(request.url)
        page.on("request", track)
        def save_export(kind: str, name: str):
            page.locator('.export summary').click()
            with page.expect_download() as download:
                page.locator(f'[data-export="{kind}"]').click()
            path = args.out / name
            download.value.save_as(path)
            return path
        try:
            if args.url:
                page.goto(args.url, wait_until="load")
            else:
                page.set_content(source, wait_until="load")
            page.wait_for_timeout(100)
            for i, m in enumerate(data["maps"]):
                page.locator(f'#navigation [data-map-index="{i}"]').first.click()
                page.wait_for_timeout(30)
                nodes = page.locator('.canvas [data-node]')
                assert nodes.count() == len(m["nodes"]), m["id"] + " node count"
                assert page.locator('.canvas [data-edge]').count() == len(m["edges"]), m["id"] + " edge count"
                overflow = page.evaluate("""() => [...document.querySelectorAll('.canvas .node')].flatMap(n => {
                    const r=n.querySelector('.node-box').getBBox(); return [...n.querySelectorAll('text')].filter(t=>{
                    const b=t.getBBox(); return b.x < r.x+3 || b.x+b.width > r.x+r.width-3 || b.y < r.y || b.y+b.height > r.y+r.height-3;
                    }).map(t=>({node:n.dataset.node,text:t.textContent})); })""")
                assert not overflow, {"map": m["id"], "overflow": overflow}
                nodes.first.click()
                assert page.locator('#inspector').is_visible()
                assert page.locator('#inspector-title').inner_text() == m["nodes"][0]["label"]
                page.keyboard.press('Escape')
                assert not page.locator('#inspector').is_visible()
                page.locator('[data-action="fit"]').click()
                svg = save_export('svg', f'{i+1:02d}-{m["id"]}.svg')
                assert ET.parse(svg).getroot().tag.endswith('svg')
                png = save_export('png', f'{i+1:02d}-{m["id"]}.png')
                assert png.read_bytes().startswith(b'\x89PNG\r\n\x1a\n')
                page.locator('[data-action="table"]').click()
                assert page.locator('.node-table tbody tr').count() == len(m["nodes"])
                page.locator('[data-action="table"]').click()
                report["maps"].append({"id": m["id"], "nodes": len(m["nodes"]), "edges": len(m["edges"]), "inspector": True, "table": True, "svg": True, "png": True, "card_text_overflow": overflow})
            page.locator('#navigation [data-map-index="0"]').first.click()
            page.wait_for_timeout(40)
            page.screenshot(path=str(args.out/'desktop.png'), full_page=True)
            # Search resolves an actual component and opens its inspector.
            page.locator('#search').fill(data['maps'][0]['nodes'][0]['label'])
            assert page.locator('.search-hit').count() > 0
            page.locator('.search-hit').first.click()
            assert page.locator('#inspector').is_visible()
            page.keyboard.press('Escape')
            page.locator('#search').fill('')
            report['checks']['search'] = True
            # Directed reachability and shortest path use authored arrows only.
            m=data['maps'][0]
            edge=next((e for e in m['edges'] if e['from']!=e['to']),None)
            if edge:
                page.locator(f'.canvas [data-node="{edge["from"]}"]').click()
                page.locator('[data-reach="downstream"]').click()
                assert page.locator('.canvas .node.selected').count() >= 2
                page.locator(f'.canvas [data-node="{edge["from"]}"]').click()
                page.locator('#route-target').select_option(edge['to'])
                page.locator('[data-action="route"]').click()
                assert page.locator('.canvas .edge.selected').count() >= 1
                report['checks']['reachability_and_path'] = True
            page.locator('[data-action="fit"]').click()
            if page.locator('[data-step]').count():
                page.locator('[data-step]').first.click()
                assert page.locator('.step.active').count()==1
                report['checks']['guided_steps'] = True
            page.locator('[data-action="fit"]').click()
            # Zoom controls change SVG pixel size.
            before=page.locator('.canvas .diagram').evaluate('(e)=>e.getBoundingClientRect().width')
            page.locator('[data-action="zoom-in"]').click()
            assert page.locator('.canvas .diagram').evaluate('(e)=>e.getBoundingClientRect().width') > before
            page.locator('[data-action="fit"]').click()
            report['checks']['zoom'] = True
            exported=json.loads(save_export('json','architecture.json').read_text())
            assert exported == data['source']
            assert save_export('markdown','guia.md').read_text() == data['guideMarkdown']
            report['checks']['source_and_markdown_export'] = True
            for theme in ['limestone','graphite','paper']:
                page.locator('#theme-toggle').click()
                assert page.locator('body').get_attribute('data-theme') == theme
                assert page.locator('.canvas .diagram').get_attribute('data-theme') == theme
                assert page.locator('.print-document .diagram').first.get_attribute('data-theme') == 'paper'
                if theme=='graphite': page.screenshot(path=str(args.out/'graphite.png'),full_page=True)
            report['checks']['three_themes_and_paper_print'] = True
            page.get_by_role('tab',name='Guia do projeto',exact=True).click()
            assert page.locator('#content .document-section').count()==len(data.get('guide',[]))
            page.screenshot(path=str(args.out/'guide.png'))
            page.get_by_role('tab',name='Evidências',exact=True).click()
            assert page.locator('#content .ev-card').count()==len(data.get('evidence',[]))
            page.get_by_role('tab',name='Revisão',exact=True).click()
            assert page.locator('#content .finding').count()==len(data.get('findings',[]))+len(data.get('decisions',[]))
            report['checks']['guide_evidence_review'] = True
            page.get_by_role('tab',name='Mapas',exact=True).click()
            page.set_viewport_size({'width':390,'height':844})
            page.wait_for_timeout(100)
            assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
            page.screenshot(path=str(args.out/'mobile.png'),full_page=True)
            page.locator('#menu-toggle').click()
            assert page.locator('#sidebar').evaluate('(e)=>e.getBoundingClientRect().x') >= 0
            page.locator('#navigation [data-map-index="1"]').first.click()
            assert page.locator('#sidebar').evaluate('(e)=>e.getBoundingClientRect().right') <= 0
            page.locator('.canvas [data-node]').first.click()
            assert page.locator('#inspector').is_visible()
            page.keyboard.press('Escape')
            assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
            report['checks']['mobile_menu_inspector_and_no_page_overflow'] = True
            assert not report['errors'], report['errors']
            assert not report['external_requests'], report['external_requests']
            report['ok'] = True
        except Exception as exc:
            report['failure'] = str(exc)
            page.screenshot(path=str(args.out/'failure.png'),full_page=True)
        finally:
            report['browser'] = browser.version
            report['maps_checked'] = len(report['maps'])
            (args.out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
            browser.close()
    print(json.dumps({k:report[k] for k in ['ok','maps_checked','checks','errors','external_requests']},ensure_ascii=False))
    if not report['ok']:
        print(report.get('failure','Unknown failure'),file=sys.stderr)
        return 1
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
