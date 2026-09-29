#!/usr/bin/env python3
"""
Local Dev & Sync Server for Instagram Profile Feed Simulator.
Serves static web files and provides the /api/sync-instagram endpoint.

Uso:
    python3 server.py [porta] (default: 8080)
"""
import sys
import os
import json
import http.server
import socketserver
from ig_sync import fetch_instagram_profile_and_posts

PORT = 8080
if len(sys.argv) > 1:
    try:
        PORT = int(sys.argv[1])
    except ValueError:
        pass

DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class SimulatorRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def _send_json_response(self, status_code, data):
        try:
            response_bytes = json.dumps(data, ensure_ascii=False).encode('utf-8')
            self.send_response(status_code)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(response_bytes)))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            self.wfile.write(response_bytes)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/sync-instagram':
            try:
                content_len = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_len).decode('utf-8') if content_len > 0 else '{}'
                payload = json.loads(body) if body else {}

                username = payload.get('username', 'lasertech_schio').strip().lstrip('@')
                limit = int(payload.get('limit', 12))

                print(f"[API] Ricevuta richiesta sincronizzazione per @{username} (limite: {limit})...")
                result = fetch_instagram_profile_and_posts(username=username, max_posts=limit)

                print(f"[API] Sincronizzazione completata: {len(result['posts'])} post estratti.")
                self._send_json_response(200, result)
            except Exception as e:
                print(f"[API] Errore sincronizzazione: {e}")
                self._send_json_response(500, {
                    "success": False,
                    "error": str(e)
                })
        else:
            self._send_json_response(404, {"error": "Endpoint non trovato"})

class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True

def run():
    global PORT
    httpd = None
    for p in range(PORT, PORT + 20):
        try:
            httpd = ReusableTCPServer(("", p), SimulatorRequestHandler)
            PORT = p
            break
        except OSError:
            continue

    if not httpd:
        print(f"Errore: impossibile trovare una porta libera a partire da {PORT}")
        return

    with httpd:
        print("=" * 60)
        print(" 📸 Instagram Feed Simulator - Local Server")
        print("=" * 60)
        print(f" Web App disponibile su : http://localhost:{PORT}")
        print(f" Endpoint sincronizzazione: http://localhost:{PORT}/api/sync-instagram")
        print(" Premi CTRL+C per fermare il server.")
        print("=" * 60)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer arrestato.")

if __name__ == "__main__":
    run()
