#!/usr/bin/env python3
"""
Lê cookies em formato JSON do stdin e escreve o binário pickle no stdout.
Chamado pelo CookieController.js via child_process.
"""
import pickle
import json
import sys


def convert(cookies_json):
    result = []
    for cookie in cookies_json:
        c = {
            "name": cookie.get("name", ""),
            "value": cookie.get("value", ""),
            "domain": cookie.get("domain", ".mercadolivre.com.br"),
            "path": cookie.get("path", "/"),
            "secure": cookie.get("secure", True),
            "httpOnly": cookie.get("httpOnly", False),
        }
        if "expirationDate" in cookie:
            c["expiry"] = int(cookie["expirationDate"])
        result.append(c)
    return result


try:
    raw = sys.stdin.read()
    cookies_json = json.loads(raw)
    cookies_selenium = convert(cookies_json)
    sys.stdout.buffer.write(pickle.dumps(cookies_selenium))
except Exception as e:
    sys.stderr.write(f"Erro ao converter cookies: {e}\n")
    sys.exit(1)
