#!/usr/bin/env python3
"""
CLI Tool: Sincronizzazione profilo Instagram per Instagram Profile Feed Simulator.
Uso:
    python3 sync_lasertech.py [username] [--limit 12] [--output lasertech_schio_project.json]
"""
import sys
import os
import json
import argparse
from ig_sync import fetch_instagram_profile_and_posts

def main():
    parser = argparse.ArgumentParser(description="Scarica profilo e post da Instagram per Feed Simulator")
    parser.add_argument("username", nargs="?", default="lasertech_schio", help="Username Instagram (default: lasertech_schio)")
    parser.add_argument("--limit", type=int, default=12, help="Numero massimo di post da scaricare (default: 12)")
    parser.add_argument("--output", "-o", default=None, help="File JSON di destinazione")

    args = parser.parse_args()
    username = args.username.strip().lstrip("@")
    out_file = args.output or f"{username}_project.json"

    print(f"🚀 Inizio sincronizzazione per @{username}...")
    try:
        data = fetch_instagram_profile_and_posts(username, max_posts=args.limit)
    except Exception as e:
        print(f"❌ Errore durante il recupero dei dati da Instagram: {e}")
        sys.exit(1)

    if not data.get("success"):
        print("❌ Sincronizzazione fallita.")
        sys.exit(1)

    project_data = {
        "name": username,
        "profile": data["profile"],
        "posts": data["posts"],
        "avatar": data["avatar"]
    }

    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), out_file)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(project_data, f, ensure_ascii=False, indent=2)

    print(f"✅ Sincronizzazione completata con successo!")
    print(f"   - Profilo: {data['profile']['displayName']} (@{data['profile']['username']})")
    print(f"   - Follower: {data['profile']['followersCount']} | Following: {data['profile']['followingCount']}")
    print(f"   - Post estratti: {len(data['posts'])}")
    print(f"   - File esportato: {output_path}")
    print(f"💡 Puoi importare questo file nel simulatore con il pulsante 'Importa Progetto'!")

if __name__ == "__main__":
    main()
