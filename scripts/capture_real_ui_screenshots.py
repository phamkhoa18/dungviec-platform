from __future__ import annotations
import asyncio
import base64
import json
import shutil
import subprocess
import tempfile
import time
import urllib.request
from pathlib import Path
import aiohttp

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "filebaocao" / "report_assets"
ASSETS.mkdir(exist_ok=True)

CHROME_BIN = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


class CDPClient:
    def __init__(self, ws):
        self.ws = ws
        self.msg_id = 0

    async def send(self, method: str, params: dict | None = None):
        self.msg_id += 1
        cur_id = self.msg_id
        await self.ws.send_json({"id": cur_id, "method": method, "params": params or {}})
        while True:
            msg = await self.ws.receive()
            if msg.type == aiohttp.WSMsgType.TEXT:
                data = json.loads(msg.data)
                if data.get("id") == cur_id:
                    return data.get("result", {})
            elif msg.type in (aiohttp.WSMsgType.CLOSED, aiohttp.WSMsgType.ERROR):
                raise RuntimeError(f"WebSocket closed/error: {msg}")


async def capture_public_page(
    port: int,
    url: str,
    out_name: str,
    js_after: str | None = None,
    height: int = 980,
):
    print(f"Capturing public UI {url} -> {out_name} ...", flush=True)
    user_data_dir = tempfile.mkdtemp(prefix="dv_chrome_")
    proc = subprocess.Popen(
        [
            CHROME_BIN,
            "--headless=new",
            "--disable-gpu",
            "--no-sandbox",
            f"--remote-debugging-port={port}",
            f"--user-data-dir={user_data_dir}",
            f"--window-size=1440,{height}",
            "--force-device-scale-factor=2",
            "--hide-scrollbars",
            "about:blank",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        ws_url = None
        for _ in range(30):
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{port}/json") as resp:
                    targets = json.loads(resp.read().decode())
                    for t in targets:
                        if t.get("type") == "page":
                            ws_url = t["webSocketDebuggerUrl"]
                            break
                if ws_url:
                    break
            except Exception:
                pass
            time.sleep(0.2)

        if not ws_url:
            raise RuntimeError("Could not connect to Chrome DevTools")

        async with aiohttp.ClientSession() as session:
            async with session.ws_connect(ws_url, max_msg_size=50 * 1024 * 1024) as ws:
                cdp = CDPClient(ws)
                await cdp.send("Page.navigate", {"url": url})

                start = time.time()
                while time.time() - start < 12.0:
                    res = await cdp.send(
                        "Runtime.evaluate",
                        {
                            "expression": """
                            (() => {
                                if (document.readyState !== 'complete') return 'loading_doc';
                                const txt = document.body ? document.body.innerText : '';
                                if (!txt || txt.trim().length < 120) return 'empty:' + txt.trim().length;
                                if (txt.includes('Đang tải...')) return 'loading_text';
                                return 'ready';
                            })()
                            """,
                            "returnByValue": True,
                        },
                    )
                    val = res.get("result", {}).get("value", "")
                    if val == "ready":
                        break
                    await asyncio.sleep(0.35)
                await asyncio.sleep(1.0)

                if js_after:
                    eval_res = await cdp.send(
                        "Runtime.evaluate",
                        {"expression": js_after, "awaitPromise": True, "returnByValue": True},
                    )
                    print("  js_after:", eval_res.get("result", {}).get("value"), flush=True)
                    await asyncio.sleep(0.8)

                res = await cdp.send("Page.captureScreenshot", {"format": "png"})
                img_bytes = base64.b64decode(res["data"])
                out_path = ASSETS / out_name
                out_path.write_bytes(img_bytes)
                print(f"  Saved {out_path.name} ({len(img_bytes) // 1024} KB)", flush=True)
    finally:
        proc.kill()
        proc.wait()
        shutil.rmtree(user_data_dir, ignore_errors=True)


async def main():
    subprocess.run(["pkill", "-f", "remote-debugging-port=92"], stderr=subprocess.DEVNULL)
    time.sleep(0.2)

    await capture_public_page(9271, "http://localhost:3000/", "ui_home_hero.png", height=1040)
    await capture_public_page(9272, "http://localhost:3000/viec-lam", "ui_candidate_jobs.png", height=1040)
    await capture_public_page(9273, "http://localhost:3000/dang-nhap", "ui_login_page.png", height=920)
    await capture_public_page(9274, "http://localhost:3000/dang-ky", "ui_register_page.png", height=980)


if __name__ == "__main__":
    asyncio.run(main())
