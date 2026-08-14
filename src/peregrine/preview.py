"""Safe local preview server with an explicit public-path allowlist."""

from __future__ import annotations

import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit


def resolve_preview_path(url: str, root: Path) -> Path | None:
    """Map an allowed preview URL to a local file without exposing repository internals."""
    request_path = PurePosixPath(unquote(urlsplit(url).path))
    parts = tuple(part for part in request_path.parts if part != "/")
    if not parts:
        return root / "site" / "index.html"
    if any(part in {".", ".."} or part.startswith(".") for part in parts):
        return None
    if parts[0] not in {"site", "artifacts"}:
        return None
    candidate = root.joinpath(*parts)
    if candidate.is_dir():
        candidate /= "index.html"
    try:
        candidate.resolve().relative_to(root.resolve())
    except ValueError:
        return None
    return candidate


def make_handler(root: Path) -> type[SimpleHTTPRequestHandler]:
    """Create an HTTP handler bound to one repository root."""

    class PreviewHandler(SimpleHTTPRequestHandler):
        """Serve only the site and generated evidence trees."""

        def translate_path(self, path: str) -> str:
            """Translate allowed URLs and route denied paths to a guaranteed missing file."""
            resolved = resolve_preview_path(path, root)
            return str(resolved if resolved is not None else root / ".preview-denied")

    return PreviewHandler


def main(argv: list[str] | None = None) -> int:
    """Run the loopback-only preview server."""
    parser = argparse.ArgumentParser(prog="peregrine-preview")
    parser.add_argument("--port", type=int, default=8013)
    parser.add_argument("--root", type=Path, default=Path.cwd())
    args = parser.parse_args(argv)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), make_handler(args.root.resolve()))
    print(f"Peregrine preview: http://127.0.0.1:{args.port}/site/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        return 0
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
