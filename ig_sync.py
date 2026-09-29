import urllib.request
import re
import json
import html
import io
import base64
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any, List, Optional

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

def _fetch_url(url: str, user_agent: str = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)') -> str:
    req = urllib.request.Request(
        url,
        headers={
            'User-Agent': user_agent,
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.read().decode('utf-8', errors='ignore')

def _download_and_compress_image(url: str, max_dimension: int = 720, quality: int = 75) -> Optional[str]:
    try:
        req = urllib.request.Request(
            url,
            headers={
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.instagram.com/'
            }
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw_bytes = resp.read()

        if HAS_PIL:
            img = Image.open(io.BytesIO(raw_bytes))
            # Convert palette/RGBA if saving to JPEG
            if img.mode in ('RGBA', 'LA', 'P'):
                bg = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                bg.paste(img, mask=img.split()[3] if 'A' in img.getbands() else None)
                img = bg
            elif img.mode != 'RGB':
                img = img.convert('RGB')

            img.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
            buf = io.BytesIO()
            img.save(buf, format='JPEG', quality=quality, optimize=True)
            compressed_bytes = buf.getvalue()
            return f"data:image/jpeg;base64,{base64.b64encode(compressed_bytes).decode('utf-8')}"
        else:
            # Fallback without compression
            return f"data:image/jpeg;base64,{base64.b64encode(raw_bytes).decode('utf-8')}"
    except Exception as e:
        print(f"Warning: Failed to download/compress image {url[:60]}... : {e}")
        return None

def fetch_instagram_profile_and_posts(username: str = "lasertech_schio", max_posts: int = 12) -> Dict[str, Any]:
    url = f"https://www.instagram.com/{username.strip().lstrip('@')}/"
    page_html = _fetch_url(url)

    # 1. Base metadata extraction from meta tags
    og_title_m = re.search(r'<meta property="og:title" content="([^"]+)"', page_html)
    og_desc_m = re.search(r'<meta property="og:description" content="([^"]+)"', page_html)
    og_img_m = re.search(r'<meta property="og:image" content="([^"]+)"', page_html)

    og_title = html.unescape(og_title_m.group(1)) if og_title_m else ""
    og_desc = html.unescape(og_desc_m.group(1)) if og_desc_m else ""
    raw_avatar_url = html.unescape(og_img_m.group(1)) if og_img_m else None

    # Parse follower / following counts from og_description
    # Format: "292 Followers, 325 Following, 106 Posts - ..."
    followers_count = "0"
    following_count = "0"
    if og_desc:
        fol_m = re.search(r'([\d,KMkm.]+)\s+Followers', og_desc, re.IGNORECASE)
        if fol_m:
            followers_count = fol_m.group(1).replace(',', '')
        fing_m = re.search(r'([\d,KMkm.]+)\s+Following', og_desc, re.IGNORECASE)
        if fing_m:
            following_count = fing_m.group(1).replace(',', '')

    # Default profile values
    display_name = username
    if og_title:
        # e.g. "LASER TECH SCHIO (@lasertech_schio) • Instagram photos and videos"
        dn_match = re.match(r'^(.*?)(?:\s*\(@|\s*•)', og_title)
        if dn_match and dn_match.group(1).strip():
            display_name = dn_match.group(1).strip()

    bio_text = ""
    u_lower = username.lower()
    bio_link = ""
    category = ""
    if "lasertech" in u_lower:
        bio_link = "www.lasertech-srl.it/"
        category = "Impresa industriale"
    elif "sossan" in u_lower:
        bio_link = "www.sossan.it"
        category = "Pavimenti e rivestimenti"

    # 2. Extract detailed user & posts from embedded Relay JSON
    scripts = re.findall(r'<script type="application/json"[^>]*>(.*?)</script>', page_html)
    extracted_posts_raw: List[Dict[str, Any]] = []

    for s in scripts:
        if 'biography' in s and not bio_text:
            try:
                data = json.loads(s)
                def find_bio(obj):
                    nonlocal bio_text, display_name, followers_count, following_count, raw_avatar_url
                    if isinstance(obj, dict):
                        if 'biography' in obj:
                            bio_text = obj.get('biography') or bio_text
                            if obj.get('full_name'):
                                display_name = obj.get('full_name')
                            if obj.get('follower_count'):
                                followers_count = str(obj.get('follower_count'))
                            if obj.get('following_count'):
                                following_count = str(obj.get('following_count'))
                            if obj.get('profile_pic_url') and not raw_avatar_url:
                                raw_avatar_url = obj.get('profile_pic_url')
                            return True
                        for v in obj.values():
                            if find_bio(v): return True
                    elif isinstance(obj, list):
                        for it in obj:
                            if find_bio(it): return True
                    return False
                find_bio(data)
            except Exception:
                pass

        if 'image_versions2' in s:
            try:
                data = json.loads(s)
                def collect_media(obj):
                    if isinstance(obj, dict):
                        if 'image_versions2' in obj and 'caption' in obj and isinstance(obj.get('caption'), dict):
                            pid = str(obj.get('id') or obj.get('pk') or len(extracted_posts_raw))
                            if not any(p.get('id') == pid for p in extracted_posts_raw):
                                extracted_posts_raw.append(obj)
                        for v in obj.values():
                            collect_media(v)
                    elif isinstance(obj, list):
                        for it in obj:
                            collect_media(it)
                collect_media(data)
            except Exception:
                pass

    # 3. Plan post images and collect all URLs to download concurrently
    post_image_plan = []
    urls_to_download = set()
    if raw_avatar_url:
        urls_to_download.add(raw_avatar_url)

    for raw_post in extracted_posts_raw[:max_posts]:
        post_urls = []
        carousel = raw_post.get('carousel_media')
        if carousel and isinstance(carousel, list) and len(carousel) > 0:
            for item in carousel:
                img_url = item.get('display_uri')
                if not img_url and 'image_versions2' in item:
                    candidates = item['image_versions2'].get('candidates', [])
                    if candidates:
                        img_url = candidates[0].get('url')
                if img_url:
                    post_urls.append(img_url)
                    urls_to_download.add(img_url)
        else:
            img_url = raw_post.get('display_uri')
            if not img_url and 'image_versions2' in raw_post:
                candidates = raw_post['image_versions2'].get('candidates', [])
                if candidates:
                    img_url = candidates[0].get('url')
            if img_url:
                post_urls.append(img_url)
                urls_to_download.add(img_url)
        post_image_plan.append((raw_post, post_urls))

    # Download all images concurrently
    url_to_b64 = {}
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {
            executor.submit(_download_and_compress_image, u, 256 if u == raw_avatar_url else 800, 80 if u == raw_avatar_url else 75): u
            for u in urls_to_download
        }
        for fut in futures:
            u = futures[fut]
            try:
                b64 = fut.result()
                if b64:
                    url_to_b64[u] = b64
            except Exception:
                pass

    avatar_b64 = url_to_b64.get(raw_avatar_url)

    # 4. Format Posts
    location_default = ""
    if "lasertech" in u_lower:
        location_default = "Schio, Italy"
    elif "sossan" in u_lower:
        location_default = "Vicenza, Italy"

    formatted_posts = []
    for idx, (raw_post, post_urls) in enumerate(post_image_plan):
        images = [url_to_b64[u] for u in post_urls if u in url_to_b64]
        if not images:
            continue

        caption_dict = raw_post.get('caption') or {}
        caption_text = caption_dict.get('text', '') if isinstance(caption_dict, dict) else str(caption_dict)
        pid = str(raw_post.get('id') or raw_post.get('pk') or f"ig-{Date_now_fallback(idx)}")

        formatted_posts.append({
            "id": pid,
            "username": username,
            "userAvatar": avatar_b64,
            "location": location_default,
            "images": images,
            "caption": caption_text,
            "likes": 0,
            "likedByMe": False,
            "timeAgo": "RECENT" if idx > 0 else "JUST NOW"
        })

    # Fallback to HTML img/alt parsing if JSON didn't return posts
    if not formatted_posts:
        for m in re.finditer(r'<img[^>]+>', page_html):
            if len(formatted_posts) >= max_posts:
                break
            tag = m.group(0)
            alt_m = re.search(r'alt="([^"]*)"', tag)
            src_m = re.search(r'src="([^"]*)"', tag)
            if alt_m and src_m:
                alt = html.unescape(alt_m.group(1))
                src = html.unescape(src_m.group(1))
                if "profile picture" in alt.lower():
                    continue
                if "cdninstagram.com" in src:
                    b64 = _download_and_compress_image(src, max_dimension=800, quality=75)
                    if b64:
                        formatted_posts.append({
                            "id": f"ig-post-{len(formatted_posts)+1}",
                            "username": username,
                            "userAvatar": avatar_b64,
                            "location": location_default,
                            "images": [b64],
                            "caption": alt,
                            "likes": 0,
                            "likedByMe": False,
                            "timeAgo": "RECENT"
                        })

    profile_data = {
        "username": username,
        "displayName": display_name,
        "category": category,
        "bioText": bio_text,
        "bioLink": bio_link,
        "followersCount": followers_count,
        "followingCount": following_count
    }

    return {
        "success": True,
        "profile": profile_data,
        "avatar": avatar_b64,
        "posts": formatted_posts
    }

def Date_now_fallback(offset: int = 0) -> str:
    import time
    return str(int(time.time() * 1000) - offset * 60000)
