import concurrent.futures, datetime, hashlib, json, re, urllib.request
BASE = 'https://skodytunez-maker.github.io/salah/'
EXPECTED = {'js/quran-nature-motion.js': {'bytes': 10891, 'sha256': '550a196f09441553779f4e79f4a292fe53017a937d0e1cb5f451f1d8e1a02ce1'}, 'js/quran-player-extras.js': {'bytes': 7755, 'sha256': '7e394e184fddd6d41dc5cfd2601ac891dfc407784aca6f092adcee7aa72059e6'}, 'quran-player.css': {'bytes': 39701, 'sha256': '348f11f77d2ecba51639326acce15ef8825d788bc8e3e01caae067031c5973f5'}, 'js/app-release.js': {'bytes': 578, 'sha256': '84741fd5ea4f05f2b735c31d51056b4fa8f50415a89b371b08c024558bf92666'}, 'sw.js': {'bytes': 39939, 'sha256': '56728008512a38af56823b162686da0edf0ec9396917cd6d612a1cb096be73bb'}, 'js/release-illustrations.js': {'bytes': 42629, 'sha256': '0050b26a57a6a17a912beb384a7ec33832b821b7bd7c6c9f3cb7e87beb6232b7'}, 'css/quran-awards.css': {'bytes': 51080, 'sha256': '1dfe34cd144c69cf439dc92a7e7c814866aa73a9360744c5efc58ca501c6fdcf'}, 'js/quran-session.js': {'bytes': 14641, 'sha256': 'bed3a4b2e47cf18640d54245c9764983b26ab8b7c6e0822f183d70efd968fca3'}, 'js/quran-nature-audio.js': {'bytes': 5638, 'sha256': '912266c9a295116d2b4a296b0691b83a965576f6cdd865352b6d8f1aa01036c1'}, 'js/quran-player-window.js': {'bytes': 6087, 'sha256': '0f30a436312b9a26aa0b692e729733037724836733f211f15604d24755ebc6b2'}, 'js/quran-session-recovery.js': {'bytes': 3640, 'sha256': '5178b741138c54f462a66d40648a7f2fd39b8bca202a415dfff12ede2c1122ba'}, 'js/quran-player-bar.js': {'bytes': 14804, 'sha256': '24299a57065b5743891b7cb0f080c363c7beac0281484404e2825ac9eab11779'}, 'index.html': {'bytes': 8243, 'sha256': '729998b928d898c5715f1df00d867e8558fc8d35b8c0aa6412052f94e9d024e7'}, 'quran.css': {'bytes': 76215, 'sha256': 'f6f9c470cf74633350e0fdf34743905c63e41984887f46a5c08edf758c745c2c'}, 'js/quran-nature-recordings.js': {'bytes': 1160, 'sha256': 'ac2463624703111c9bec1040e170f80372a2974adbefe100f4337405f147e6ad'}, 'data/nature-sources-493.json': {'bytes': 4619, 'sha256': '661235a2b3ff93038bc5c5a0a4fc4081736ea16f43ebfa4d85c999c6841d4e78'}, 'assets/player-nature-493/rain.jpg': {'bytes': 198567, 'sha256': '20ee22c0e54e060523e49e17db3730c8302201c86c7be3d59885e9edbd5fad1c'}, 'assets/player-nature-493/rain.mp3': {'bytes': 1089836, 'sha256': 'e29d48f9be91bad23536c5b2f542a51ec5a2b812dc21f46e8ec960c4c14cd0de'}, 'assets/player-nature-493/wind.jpg': {'bytes': 289835, 'sha256': '168f6e48d6441dc15b713f79cecbaf1a5e1d6464c1789607325f0b708e06bc85'}, 'assets/player-nature-493/wind.mp3': {'bytes': 1089836, 'sha256': 'ef4877e145b76d8062d40bbc86e7e7371dc29b49de12d0517f13406303bc6dba'}, 'assets/player-nature-493/fire.jpg': {'bytes': 252364, 'sha256': '1d7c99e876c9443d3bdfe0d3d71f683582a80b4abcb1bf0fa88c53c8ff9e78a3'}, 'assets/player-nature-493/fire.mp3': {'bytes': 1089836, 'sha256': '06404288985d657e39a6c567510cfb5e8e42e86306dfdcd4bcb9d2f96f1fb123'}, 'assets/player-nature-493/forest.jpg': {'bytes': 436448, 'sha256': 'b1220eff6da331144d12c830a1f41f90ae76472364090e075c3bf1f778cff01f'}, 'assets/player-nature-493/forest.mp3': {'bytes': 1089836, 'sha256': 'f897077197d08a16bdc60048b1776aa6a0d61b072e2353ae939ef90dde744005'}, 'assets/player-nature-493/ocean.jpg': {'bytes': 238918, 'sha256': 'cd26ef08bda292b8e31fe32935630696668e082583d1f5769ec8ebb5f00a2976'}, 'assets/player-nature-493/ocean.mp3': {'bytes': 1089836, 'sha256': '243e8b338d683d444951d9ae0ec3696a19d248672ca41856e782339d1922b4a3'}, 'owner.html': {'bytes': 6643, 'sha256': '4a627188ca263df0757547be847ef265f39286a1bb534c17a074c0da619c2d63'}, 'share.html': {'bytes': 8263, 'sha256': '1b99dcb52f9ae14f3d11f75d83a4d3623253b7981d1f77cbe3c3465d004f422f'}, 'nature-video-credits.html': {'bytes': 3715, 'sha256': '6a14d5a9ab7f807f4176ca1bd3f346ce3e642fcdb565590b28e4b4096e5e4b63'}, 'assets/updates/nature-video-rain-495.jpg': {'bytes': 8826, 'sha256': 'd6bcee32c3ad9c4e658ac07b1f17bc974e4523c4fb071f108fcda8a7f5f49c9c'}, 'assets/updates/nature-video-fire-495.jpg': {'bytes': 30166, 'sha256': '8c13a5d09b747d92ffd5717b11e683a0d65b6e965e0ddef27d0a07f469bd2b0f'}, 'assets/player-nature-video-495/rain.mp4': {'bytes': 386731, 'sha256': 'a2055f584f852d61e6871622019681e35419c7a83c2ac391c1e2df3cec309fa5'}, 'assets/player-nature-video-495/wind.mp4': {'bytes': 1445794, 'sha256': '214d4743ad534d62ebc54770350e2e66fef851ba5ae11d32d16cc33a42d4bf5e'}, 'assets/player-nature-video-495/fire.mp4': {'bytes': 564289, 'sha256': '15922e9836a07e80a9f2e92aadddee93f9bb9a906964b418d86aaec0e37d605e'}, 'assets/player-nature-video-495/forest.mp4': {'bytes': 2241106, 'sha256': 'a8ce6a5908e222a84fa8e761565d8ef53104be9aafeca0f48e8992598933693f'}, 'assets/player-nature-video-495/ocean.mp4': {'bytes': 2270013, 'sha256': '33908f695066d9cfbac48e3481a3844d1fc297bce34a84a1f845b1b9d5adf24b'}, 'js/quran-nature-video-cache.js': {'bytes': 3917, 'sha256': '32cc69370602a3b87e9cfe0616895dc628c39cf2f6f3c97660d53b9f9eaa904f'}, 'js/daily-reminder-messages.js': {'bytes': 8802, 'sha256': '51912757926e8e54298075962763360c2aa8edfe072a0b46e669275110da78f7'}, 'js/dhikr-reminder.js': {'bytes': 2630, 'sha256': 'e9fce98ab83bc4733a09a7666a2fca553860fc29ff0817b52373234a6e13a5c3'}, 'js/reminders.js': {'bytes': 24293, 'sha256': 'f12e3b5976b454c13ed00213e69ac44802d3de2b8e08fc469c074fbd49d34531'}, 'js/push-reminders.js': {'bytes': 17258, 'sha256': 'ba494c5d7b6d409f13d73962b0a6d7082a5a6df2b627d2857b07454fd0759056'}, 'assets/updates/daily-reminder-497.svg': {'bytes': 1619, 'sha256': '2a29a5fdc5981fb17cc61a443ced441f90e282f795bcddd593c3ff92577f67ce'}}
STAMP = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d%H%M%S')
def request(path, headers=None):
    req = urllib.request.Request(BASE + path + '?verify497=' + STAMP, headers={'User-Agent': 'SALAH-release-verifier/497', **(headers or {})})
    return urllib.request.urlopen(req, timeout=60)
def verify(item):
    path, wanted = item
    with request(path) as response:
        data = response.read(wanted['bytes'] + 1)
        assert response.status == 200, (path, response.status)
        assert len(data) == wanted['bytes'], (path, len(data), wanted['bytes'])
        digest = hashlib.sha256(data).hexdigest()
        assert digest == wanted['sha256'], (path, digest, wanted['sha256'])
    result = dict(path=path, ok=True, bytes=len(data), sha256=digest)
    if path.endswith('.mp4'):
        with request(path, {'Range': 'bytes=0-1023'}) as response:
            part = response.read(1025)
            assert response.status == 206, (path, 'range', response.status)
            assert response.headers.get('Content-Range') == 'bytes 0-1023/' + str(len(data))
            assert part == data[:1024]
        result['rangeVerified'] = True
    if path == 'js/app-release.js':
        assert re.search(rb'APP_VERSION\s*=\s*497\b', data)
    return result
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
    results = list(pool.map(verify, EXPECTED.items()))
with request('mobile-updates/latest.json') as response:
    manifest = json.load(response)
assert manifest['version'] == 497 and manifest['minNativeVersion'] == 445
assert manifest['schema'] == 1 and 0 < manifest['bytes'] <= 100 * 1024 * 1024
assert re.fullmatch(r'[a-f0-9]{64}', manifest['sha256'])
assert manifest['file'] == 'web-497-' + manifest['sha256'] + '.zip'
with request('mobile-updates/' + manifest['file']) as response:
    digest = hashlib.sha256()
    size = 0
    while True:
        part = response.read(1024 * 1024)
        if not part: break
        size += len(part)
        assert size <= 100 * 1024 * 1024
        digest.update(part)
assert size == manifest['bytes'] and digest.hexdigest() == manifest['sha256']
results.append(dict(path='mobile-updates/latest.json', ok=True, manifest=manifest, archiveVerified=True))
config_request=urllib.request.Request('https://kbltwszfvphgbxdbczsb.supabase.co/functions/v1/background-reminders/config',headers={'Origin':'https://skodytunez-maker.github.io','User-Agent':'SALAH-release-verifier/497'})
with urllib.request.urlopen(config_request,timeout=60) as response:
    assert response.status==200
    assert response.headers.get('Access-Control-Allow-Origin')=='https://skodytunez-maker.github.io'
    config=json.load(response)
assert config['version']==1 and config['remindersVersion']==5
assert config['features']==['tahajjud','dhikr-inactivity','dhikr-daily']
assert re.fullmatch(r'[A-Za-z0-9_-]{87}',config['publicKey'])
results.append(dict(path='background-reminders/config',ok=True,remindersVersion=config['remindersVersion'],features=config['features'],publicKeyLength=len(config['publicKey'])))
report = dict(version=497, count=len(results), ok=True, results=results, verifiedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(), devicePlaybackVerified=False)
print('SALAH_LIVE_497 ' + json.dumps(report, separators=(',', ':')))
