import hashlib, json, pathlib, zipfile
root = pathlib.Path(__file__).resolve().parents[2] / "dist" / "mobile-updates"
manifest = json.loads((root / "latest.json").read_text())
archive = root / manifest["file"]
data = archive.read_bytes()
assert len(data) == manifest["bytes"]
assert hashlib.sha256(data).hexdigest() == manifest["sha256"]
with zipfile.ZipFile(archive) as bundle:
    assert bundle.testzip() is None
    names = bundle.namelist()
    assert len(names) == len(set(names))
    for required in ["index.html", "js/native-entry.js", "js/app-release.js", "js/app.js", "js/vendor/capacitor-core.js"]:
        assert required in names
    assert b'./js/native-entry.js' in bundle.read("index.html")
    version = str(manifest["version"]).encode()
    assert b"export const APP_VERSION=" + version + b";" in bundle.read("js/app-release.js")
    assert b"SalahLiveUpdate" in bundle.read("js/native-entry.js")
print("PASS: complete native web ZIP opens, every CRC verifies, exact version and native entry match.")
