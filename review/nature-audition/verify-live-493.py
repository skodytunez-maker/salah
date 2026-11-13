"""Verify exact published493 bytes, including new binary wallpaper/audio assets."""
import concurrent.futures
import hashlib
import json
import pathlib
import re
import sys
import time
import urllib.parse
import urllib.request
BASE="https://skodytunez-maker.github.io/salah/"
EXPECTED=json.loads("[{\"path\":\"js/quran-nature-audio.js\",\"sha256\":\"912266c9a295116d2b4a296b0691b83a965576f6cdd865352b6d8f1aa01036c1\",\"bytes\":5638},{\"path\":\"js/quran-player-extras.js\",\"sha256\":\"22980f966e48dd5a82b9635380b742281beb5d208863ed6c1f0d3ef4952254d8\",\"bytes\":6782},{\"path\":\"js/quran-nature-recordings.js\",\"sha256\":\"ac2463624703111c9bec1040e170f80372a2974adbefe100f4337405f147e6ad\",\"bytes\":1160},{\"path\":\"quran-player.css\",\"sha256\":\"1a718c62770ac2b57574e845aadb554cef340745f18a44b6d28d0e90ce7074f1\",\"bytes\":37796},{\"path\":\"js/quran-player-bar.js\",\"sha256\":\"24299a57065b5743891b7cb0f080c363c7beac0281484404e2825ac9eab11779\",\"bytes\":14804},{\"path\":\"sw.js\",\"sha256\":\"bf95646e203c8ab8ccf453bb69945bc0d781be589fe78ad862e5a5965daaade6\",\"bytes\":39684},{\"path\":\"js/app-release.js\",\"sha256\":\"d742fa72753f8c116562ea0e4594615d9a30226b025b2cce78987bb58a06fd71\",\"bytes\":581},{\"path\":\"js/release-illustrations.js\",\"sha256\":\"e1a63ba3f1083e3329ab0d1e0fa1676784028713eb32b2a4ff7561ca9d90efe5\",\"bytes\":41862},{\"path\":\"nature-audio-credits.html\",\"sha256\":\"5a3d319223a68c7995b6bd31f8b38102dc71501ad0f58998a4c1beaaf6ed99d9\",\"bytes\":2262},{\"path\":\"data/nature-sources-493.json\",\"sha256\":\"661235a2b3ff93038bc5c5a0a4fc4081736ea16f43ebfa4d85c999c6841d4e78\",\"bytes\":4619},{\"path\":\"css/quran-awards.css\",\"sha256\":\"3354dc4b6b20b5861e7841039cc00ae3f75566bfa5d14a1d30ae84f9afb57a01\",\"bytes\":50002},{\"path\":\"assets/player-nature-493/rain.jpg\",\"sha256\":\"20ee22c0e54e060523e49e17db3730c8302201c86c7be3d59885e9edbd5fad1c\",\"bytes\":198567},{\"path\":\"assets/player-nature-493/fire.jpg\",\"sha256\":\"1d7c99e876c9443d3bdfe0d3d71f683582a80b4abcb1bf0fa88c53c8ff9e78a3\",\"bytes\":252364},{\"path\":\"assets/player-nature-493/forest.jpg\",\"sha256\":\"b1220eff6da331144d12c830a1f41f90ae76472364090e075c3bf1f778cff01f\",\"bytes\":436448},{\"path\":\"assets/player-nature-493/wind.jpg\",\"sha256\":\"168f6e48d6441dc15b713f79cecbaf1a5e1d6464c1789607325f0b708e06bc85\",\"bytes\":289835},{\"path\":\"assets/player-nature-493/ocean.jpg\",\"sha256\":\"cd26ef08bda292b8e31fe32935630696668e082583d1f5769ec8ebb5f00a2976\",\"bytes\":238918},{\"path\":\"assets/player-nature-493/rain.mp3\",\"sha256\":\"e29d48f9be91bad23536c5b2f542a51ec5a2b812dc21f46e8ec960c4c14cd0de\",\"bytes\":1089836},{\"path\":\"assets/player-nature-493/fire.mp3\",\"sha256\":\"06404288985d657e39a6c567510cfb5e8e42e86306dfdcd4bcb9d2f96f1fb123\",\"bytes\":1089836},{\"path\":\"assets/player-nature-493/forest.mp3\",\"sha256\":\"f897077197d08a16bdc60048b1776aa6a0d61b072e2353ae939ef90dde744005\",\"bytes\":1089836},{\"path\":\"assets/player-nature-493/wind.mp3\",\"sha256\":\"ef4877e145b76d8062d40bbc86e7e7371dc29b49de12d0517f13406303bc6dba\",\"bytes\":1089836},{\"path\":\"assets/player-nature-493/ocean.mp3\",\"sha256\":\"243e8b338d683d444951d9ae0ec3696a19d248672ca41856e782339d1922b4a3\",\"bytes\":1089836},{\"path\":\"index.html\",\"sha256\":\"6cba07aa0a3b2f9c35f62903d687260c7585ff56c91546b68800bf944d7b3a94\",\"bytes\":8097},{\"path\":\"js/quran-player-window.js\",\"sha256\":\"0f30a436312b9a26aa0b692e729733037724836733f211f15604d24755ebc6b2\",\"bytes\":6087},{\"path\":\"js/quran-session-recovery.js\",\"sha256\":\"5178b741138c54f462a66d40648a7f2fd39b8bca202a415dfff12ede2c1122ba\",\"bytes\":3640},{\"path\":\"quran.css\",\"sha256\":\"f6f9c470cf74633350e0fdf34743905c63e41984887f46a5c08edf758c745c2c\",\"bytes\":76215},{\"path\":\"assets/awards/adhkar-30-v1.png\",\"bytes\":1954653,\"sha256\":\"36ea89500725b8957da45b8d5527a040b41fb305ff2f4d099cc07fa169f78c0c\"},{\"path\":\"assets/awards/adhkar-7-v1.png\",\"bytes\":1803561,\"sha256\":\"623de9e9c332cf76c756cd03eb21b01ed1d5625e6a8c1d9056b84ea812426433\"},{\"path\":\"assets/awards/founder-gift-closed-v1.png\",\"bytes\":1597826,\"sha256\":\"5ad416e8084c03d5e0cb0a1fc7d0a03714e57e41dd2a373a7f4ee86e127457d9\"},{\"path\":\"assets/awards/founder-gift-open-v1.png\",\"bytes\":1456565,\"sha256\":\"72047333b8ac2b5bf0d98592e58fe69fb411a2b050f16be6d6365ec3c14bc6cf\"},{\"path\":\"assets/awards/founder-v1.png\",\"bytes\":1938526,\"sha256\":\"067a9377a6d26a6a9b6e0d42a0d8c8901a5f1678152420e012abd41515947f46\"},{\"path\":\"assets/awards/leader-month-v1.png\",\"bytes\":1987555,\"sha256\":\"7c1cbc7da66cb9c1cd1e6ac273d5d2211eb57b1feccdaf04c690f07b6165c256\"},{\"path\":\"assets/awards/leader-month-v2.png\",\"bytes\":1118252,\"sha256\":\"6825d98cf2d1bd2656969b07a2b28aa76c24ac6cdbd2e76fda3a86c1faf680dd\"},{\"path\":\"assets/awards/leader-month-v3.png\",\"bytes\":1000025,\"sha256\":\"8752a927e550354d6b08ce9ce740c9d8b2f0d020a72e553be6167e065706ef2e\"},{\"path\":\"assets/awards/leader-month-v4.png\",\"bytes\":581740,\"sha256\":\"2bced501abe7689e6265a1599a9e1beac77bdcec574e888f2b51d4464c6c307d\"},{\"path\":\"assets/awards/leader-week-v1.png\",\"bytes\":1696448,\"sha256\":\"edefc47107b3fbacf5c5178ad6e236acc3de85945afc07812e99814dfc0eea78\"},{\"path\":\"assets/awards/leader-week-v2.png\",\"bytes\":1080406,\"sha256\":\"031608c42fda3aa164c52c8b004bba81b04e8b229c7f497da51d63367993b579\"},{\"path\":\"assets/awards/leader-week-v3.png\",\"bytes\":949021,\"sha256\":\"245b65295284bdc8c0d80e745eb4cca5afeaf2e9f3a9f64221d9b5fe459d652b\"},{\"path\":\"assets/awards/leader-week-v4.png\",\"bytes\":684205,\"sha256\":\"84dfbc766b433f9280711629fb29ac878d147a3d7b7470e4a9ddb29839bc95d6\"},{\"path\":\"assets/awards/reading-juz-1-v1.png\",\"bytes\":1770465,\"sha256\":\"52dd661aa5ae48387a614b9b78ee91ad4674313618ef1850726034a7e5cdfa58\"},{\"path\":\"assets/awards/reading-juz-10-v1.png\",\"bytes\":1754657,\"sha256\":\"90d0665af71e7cda6b93975f6a3352796cbcf3d708e8dc3ccf22c84cecefc794\"},{\"path\":\"assets/awards/reading-khatm-v1.png\",\"bytes\":2058815,\"sha256\":\"fb38bd53548a64040e0db9edcc702e03151dcba5edda2979b5694f555d53aece\"},{\"path\":\"assets/awards/streak-100-v1.png\",\"bytes\":2123020,\"sha256\":\"a3afad289ce4ed78399deef01b955467bdaae98e117d3b9d0b8a1c59063de5c6\"},{\"path\":\"assets/awards/streak-200-v1.png\",\"bytes\":1729636,\"sha256\":\"b94420c16172b8029ae4dd66176a07de3b18f7bc3213107c5ee91892e021ca50\"},{\"path\":\"assets/awards/streak-30-v1.png\",\"bytes\":1785015,\"sha256\":\"cce9cc61b079b19de1747838f75b46907b02be859af0a0b3ae208480c42430f4\"},{\"path\":\"assets/awards/streak-365-v1.png\",\"bytes\":1824405,\"sha256\":\"06bef61a4e4a7dc1b8a513dfa1f6e904f63b11a688289c830c7c6435e7f94969\"},{\"path\":\"assets/awards/streak-7-v1.png\",\"bytes\":1933143,\"sha256\":\"e656738cfcdb329f0acb39553bcfa11fdb9ec859805bd10b2e72c6ba9fb28c90\"},{\"path\":\"assets/prayer-poses.png\",\"bytes\":1177196,\"sha256\":\"67baa193f2d1bdba91d8082dc11b7800e0b3ef25ce0c8ed38497caf767b7debb\"},{\"path\":\"assets/reciters/idrisabkar.png\",\"bytes\":4021660,\"sha256\":\"5b7072621eadd08b9953d73e8a9c3f8085040c042e8e89535b17738872c94223\"},{\"path\":\"assets/reciters/raadalkurdi-v349.png\",\"bytes\":1801393,\"sha256\":\"536e249d1afce9387d9c556c8ce6b589d087b3122f158ce07b4ea96c7eb73391\"},{\"path\":\"assets/reciters/mahermuaiqly.png\",\"bytes\":1100510,\"sha256\":\"bda70c4dd28c1c3283636a9476898003d7a2f00f5c43e6b3c8401d3a30b3d909\"}]")
def verify(item):
    path=item["path"]
    if path.startswith("/") or ".." in path.split("/") or ":" in path:
        raise ValueError("Unsafe runtime path")
    last=""
    for attempt in range(3):
        try:
            url=BASE+urllib.parse.quote(path,safe="/")+"?verify=493-"+str(time.time_ns())
            request=urllib.request.Request(url,headers={"Cache-Control":"no-cache","Accept-Encoding":"identity","User-Agent":"SALAH493-live-integrity"})
            with urllib.request.urlopen(request,timeout=30) as response:
                if response.status!=200 or not response.url.startswith(BASE):
                    raise ValueError("Unexpected public asset response")
                body=response.read(5*1024*1024+1)
            digest=hashlib.sha256(body).hexdigest()
            if len(body)!=item["bytes"] or digest!=item["sha256"]:
                raise ValueError("Published bytes differ from the validated build")
            if path=="js/app-release.js" and re.search(rb"APP_VERSION=(\d+)",body).group(1)!=b"493":
                raise ValueError("Wrong production version")
            return {"path":path,"ok":True,"bytes":len(body),"sha256":digest}
        except Exception as error:
            last=str(error)
            if attempt<2:
                time.sleep(2)
    return {"path":path,"ok":False,"error":last}
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
    results=list(pool.map(verify,EXPECTED))
try:
    request=urllib.request.Request(BASE+"mobile-updates/latest.json?verify=493-"+str(time.time_ns()),headers={"Cache-Control":"no-cache","Accept-Encoding":"identity","User-Agent":"SALAH493-live-integrity"})
    with urllib.request.urlopen(request,timeout=30) as response:
        if response.status!=200 or not response.url.startswith(BASE):
            raise ValueError("Unexpected manifest response")
        manifest=json.loads(response.read(65537))
    if manifest.get("schema")!=1 or manifest.get("version")!=493 or manifest.get("minNativeVersion")!=445 or not 0<manifest.get("bytes",0)<=100*1024*1024:
        raise ValueError("Invalid version or archive size")
    if not re.fullmatch(r"[a-f0-9]{64}",manifest.get("sha256","")) or manifest.get("file")!="web-493-"+manifest["sha256"]+".zip":
        raise ValueError("Invalid archive digest reference")
    results.append({"path":"mobile-updates/latest.json","ok":True,"manifest":manifest})
except Exception as error:
    results.append({"path":"mobile-updates/latest.json","ok":False,"error":str(error)})
report={"version":493,"ok":all(row["ok"] for row in results),"count":len(results),"results":results}
destination=pathlib.Path(sys.argv[1])
destination.parent.mkdir(parents=True,exist_ok=True)
destination.write_text(json.dumps(report,indent=2),encoding="utf-8")
print("SALAH_LIVE_VERIFY "+json.dumps(report))
if not report["ok"]:
    raise SystemExit(1)
