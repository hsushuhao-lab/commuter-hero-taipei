from pathlib import Path
import os, tempfile

REPO = Path(__file__).resolve().parents[1]

def target(path):
    out=(REPO/path).resolve()
    if out != REPO and REPO not in out.parents: raise ValueError(f"outside repo: {path}")
    return out

def _write(path, text):
    fd,tmp=tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.", text=True)
    try:
        with os.fdopen(fd,"w",encoding="utf-8",newline="") as f: f.write(text)
        os.replace(tmp,path)
    except Exception:
        os.unlink(tmp); raise

def replace_exact(path, old, new, expected_count=1):
    p=target(Path(path)); s=p.read_text(encoding="utf-8"); n=s.count(old)
    if n != expected_count: raise RuntimeError(f"{path}: expected {expected_count}, found {n}")
    _write(p,s.replace(old,new)); print(f"changed {path}: replacements={n}")

def insert_after(path, marker, text):
    p=target(Path(path)); s=p.read_text(encoding="utf-8"); n=s.count(marker)
    if n != 1: raise RuntimeError(f"{path}: marker count {n}")
    _write(p,s.replace(marker,marker+text)); print(f"changed {path}: inserted after")

def insert_before(path, marker, text):
    p=target(Path(path)); s=p.read_text(encoding="utf-8"); n=s.count(marker)
    if n != 1: raise RuntimeError(f"{path}: marker count {n}")
    _write(p,s.replace(marker,text+marker)); print(f"changed {path}: inserted before")

def assert_contains(path, text):
    if text not in target(Path(path)).read_text(encoding="utf-8"): raise AssertionError(f"missing {text!r} in {path}")
