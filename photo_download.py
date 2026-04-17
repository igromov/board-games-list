import json
import os
import re
import subprocess
from pathlib import Path

# Таблица транслитерации
TRANSLIT = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
}


def normalize_name(name: str) -> str:
    result = []
    for ch in name.lower():
        if ch in TRANSLIT:
            result.append(TRANSLIT[ch])
        elif ch.isascii() and ch.isalnum():
            result.append(ch)
        else:
            result.append('_')
    return re.sub(r'_+', '_', ''.join(result)).strip('_')


def get_extension(url: str) -> str:
    path = url.split('?')[0]
    ext = os.path.splitext(path)[1]
    return ext if ext else '.jpg'


def curl_download(url: str, filepath: str) -> bool:
    result = subprocess.run(
        [
            'curl', '--silent', '--show-error', '--fail',
            '--max-time', '30',
            '--retry', '3', '--retry-delay', '2',
            '-o', filepath,
            url,
        ],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        print(f"      curl error: {result.stderr.strip()}")
        return False
    return True


def download_images(json_path: str, output_dir: str = 'images'):
    with open(json_path, encoding='utf-8') as f:
        data = json.load(f)

    games = data.get('games', [])
    Path(output_dir).mkdir(exist_ok=True)

    changed = False

    for game in games:
        name = game.get('name', 'unknown')
        url = game.get('photoUrl')

        if not url:
            print(f"[SKIP] {name} — нет photoUrl")
            continue

        if not url.startswith('http'):
            print(f"[SKIP] {name} — уже локальный: {url}")
            continue

        filename = normalize_name(name) + get_extension(url)
        filepath = os.path.join(output_dir, filename)

        if not os.path.exists(filepath):
            print(f"[GET]  {name} ...")
            if not curl_download(url, filepath):
                print(f"[ERROR] {name}: не удалось скачать")
                continue
            print(f"[OK]   {name} → {filepath}")
        else:
            print(f"[EXISTS] {filepath}")

        game['photoUrl'] = filepath
        changed = True

    if changed:
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"\n[SAVED] JSON обновлён: {json_path}")


if __name__ == '__main__':
    import sys
    json_file = sys.argv[1] if len(sys.argv) > 1 else 'games_database.json'
    download_images(json_file)