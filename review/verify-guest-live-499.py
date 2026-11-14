"""Read-only public release499 verification. Never sends capability, auth, push or write packets."""
import concurrent.futures
import datetime
import hashlib
import json
import re
import tempfile
import urllib.error
import urllib.request
import zipfile

BASE = 'https://skodytunez-maker.github.io/salah/'
PAGES_ORIGIN = 'https://skodytunez-maker.github.io'
FUNCTIONS = 'https://kbltwszfvphgbxdbczsb.supabase.co/functions/v1/'
MAX_ARCHIVE = 100 * 1024 * 1024
# BEGIN_GENERATED_499
EXPECTED = {"js/quran-nature-motion.js":{"bytes":10891,"sha256":"550a196f09441553779f4e79f4a292fe53017a937d0e1cb5f451f1d8e1a02ce1"},"js/quran-player-extras.js":{"bytes":7755,"sha256":"7e394e184fddd6d41dc5cfd2601ac891dfc407784aca6f092adcee7aa72059e6"},"quran-player.css":{"bytes":39826,"sha256":"42b37cc75cef33d4a8d0218fa3934a4755ff36382452e17727a66c4970b45812"},"js/app-release.js":{"bytes":936,"sha256":"db726e1987ceb0f37a876c85ee74dc310e1b1b05bb8b01f75585e3c068e0714f"},"sw.js":{"bytes":41144,"sha256":"1a9b39bc69c32cf2bd6bb4d84c4859bebc19553a1ba8f677de79c899bae05709"},"js/release-illustrations.js":{"bytes":45722,"sha256":"3b8dc5eac7881ff013153045fc6ff87830df45b6316085bf43093b2653a96082"},"css/quran-awards.css":{"bytes":51080,"sha256":"1dfe34cd144c69cf439dc92a7e7c814866aa73a9360744c5efc58ca501c6fdcf"},"js/quran-session.js":{"bytes":14641,"sha256":"bed3a4b2e47cf18640d54245c9764983b26ab8b7c6e0822f183d70efd968fca3"},"js/quran-nature-audio.js":{"bytes":5764,"sha256":"e3ab6d3ac3969951f99a202ba51c4ac7e4aefaa759fc3cfc47ebd665f5cc5d62"},"js/quran-player-window.js":{"bytes":7806,"sha256":"069202c0d2105e5e1fdd50780940c67a6ba84f6b320f01c16c6ddd2729e80b35"},"js/quran-session-recovery.js":{"bytes":3640,"sha256":"5178b741138c54f462a66d40648a7f2fd39b8bca202a415dfff12ede2c1122ba"},"js/quran-player-bar.js":{"bytes":14804,"sha256":"24299a57065b5743891b7cb0f080c363c7beac0281484404e2825ac9eab11779"},"index.html":{"bytes":8304,"sha256":"9c4de675186dc392644c4435752aaa5c8d3b0193d9a3fdfd3cdee2be1e14a641"},"quran.css":{"bytes":76215,"sha256":"f6f9c470cf74633350e0fdf34743905c63e41984887f46a5c08edf758c745c2c"},"js/quran-nature-recordings.js":{"bytes":1160,"sha256":"ac2463624703111c9bec1040e170f80372a2974adbefe100f4337405f147e6ad"},"data/nature-sources-493.json":{"bytes":4619,"sha256":"661235a2b3ff93038bc5c5a0a4fc4081736ea16f43ebfa4d85c999c6841d4e78"},"assets/player-nature-493/rain.jpg":{"bytes":198567,"sha256":"20ee22c0e54e060523e49e17db3730c8302201c86c7be3d59885e9edbd5fad1c"},"assets/player-nature-493/rain.mp3":{"bytes":1089836,"sha256":"e29d48f9be91bad23536c5b2f542a51ec5a2b812dc21f46e8ec960c4c14cd0de"},"assets/player-nature-493/wind.jpg":{"bytes":289835,"sha256":"168f6e48d6441dc15b713f79cecbaf1a5e1d6464c1789607325f0b708e06bc85"},"assets/player-nature-493/wind.mp3":{"bytes":1089836,"sha256":"ef4877e145b76d8062d40bbc86e7e7371dc29b49de12d0517f13406303bc6dba"},"assets/player-nature-493/fire.jpg":{"bytes":252364,"sha256":"1d7c99e876c9443d3bdfe0d3d71f683582a80b4abcb1bf0fa88c53c8ff9e78a3"},"assets/player-nature-493/fire.mp3":{"bytes":1089836,"sha256":"06404288985d657e39a6c567510cfb5e8e42e86306dfdcd4bcb9d2f96f1fb123"},"assets/player-nature-493/forest.jpg":{"bytes":436448,"sha256":"b1220eff6da331144d12c830a1f41f90ae76472364090e075c3bf1f778cff01f"},"assets/player-nature-493/forest.mp3":{"bytes":1089836,"sha256":"f897077197d08a16bdc60048b1776aa6a0d61b072e2353ae939ef90dde744005"},"assets/player-nature-493/ocean.jpg":{"bytes":238918,"sha256":"cd26ef08bda292b8e31fe32935630696668e082583d1f5769ec8ebb5f00a2976"},"assets/player-nature-493/ocean.mp3":{"bytes":1089836,"sha256":"243e8b338d683d444951d9ae0ec3696a19d248672ca41856e782339d1922b4a3"},"owner.html":{"bytes":6705,"sha256":"9ce05cc8f4029f21f726eedd4505bd80d1573d867ead68f7ac0f4515f457e9ef"},"share.html":{"bytes":8324,"sha256":"4443bac1c5cb06991e61f3b5212b297dcf4476195e629a05af0c2fb455f33218"},"nature-video-credits.html":{"bytes":3715,"sha256":"6a14d5a9ab7f807f4176ca1bd3f346ce3e642fcdb565590b28e4b4096e5e4b63"},"assets/updates/nature-video-rain-495.jpg":{"bytes":8826,"sha256":"d6bcee32c3ad9c4e658ac07b1f17bc974e4523c4fb071f108fcda8a7f5f49c9c"},"assets/updates/nature-video-fire-495.jpg":{"bytes":30166,"sha256":"8c13a5d09b747d92ffd5717b11e683a0d65b6e965e0ddef27d0a07f469bd2b0f"},"assets/player-nature-video-495/rain.mp4":{"bytes":386731,"sha256":"a2055f584f852d61e6871622019681e35419c7a83c2ac391c1e2df3cec309fa5"},"assets/player-nature-video-495/wind.mp4":{"bytes":1445794,"sha256":"214d4743ad534d62ebc54770350e2e66fef851ba5ae11d32d16cc33a42d4bf5e"},"assets/player-nature-video-495/fire.mp4":{"bytes":564289,"sha256":"15922e9836a07e80a9f2e92aadddee93f9bb9a906964b418d86aaec0e37d605e"},"assets/player-nature-video-495/forest.mp4":{"bytes":2241106,"sha256":"a8ce6a5908e222a84fa8e761565d8ef53104be9aafeca0f48e8992598933693f"},"assets/player-nature-video-495/ocean.mp4":{"bytes":2270013,"sha256":"33908f695066d9cfbac48e3481a3844d1fc297bce34a84a1f845b1b9d5adf24b"},"js/quran-nature-video-cache.js":{"bytes":3917,"sha256":"32cc69370602a3b87e9cfe0616895dc628c39cf2f6f3c97660d53b9f9eaa904f"},"js/daily-reminder-messages.js":{"bytes":8802,"sha256":"51912757926e8e54298075962763360c2aa8edfe072a0b46e669275110da78f7"},"js/dhikr-reminder.js":{"bytes":2630,"sha256":"e9fce98ab83bc4733a09a7666a2fca553860fc29ff0817b52373234a6e13a5c3"},"js/reminders.js":{"bytes":24293,"sha256":"f12e3b5976b454c13ed00213e69ac44802d3de2b8e08fc469c074fbd49d34531"},"js/push-reminders.js":{"bytes":17258,"sha256":"ba494c5d7b6d409f13d73962b0a6d7082a5a6df2b627d2857b07454fd0759056"},"assets/updates/daily-reminder-497.svg":{"bytes":1619,"sha256":"2a29a5fdc5981fb17cc61a443ced441f90e282f795bcddd593c3ff92577f67ce"},"js/guest-context.js":{"bytes":378,"sha256":"37cb623772010e80c9223cc9864f804599d473e5f28ef6a9d17a530601b0bc39"},"js/activity-presence.js":{"bytes":4469,"sha256":"eff26276a746966f7e8361eea10cbd760ecfd474e80436abf3aa634dd32b0984"},"js/home-activity-members.js":{"bytes":3824,"sha256":"3998062630f49f23f4b566154b9ed720c30a9ae4b7a3312606b9d32b96f43074"},"js/reciter-ranking-core.js":{"bytes":2636,"sha256":"82c508580333b5406b7781751db979d64af86f6765e04471479a4e67e1424e61"},"js/listening-credit-core.js":{"bytes":4887,"sha256":"4d07625c10a39babd5195ecd68879ed049f2d1c3a20e920dc30ed15c0206bbec"},"js/listening-credit.js":{"bytes":2730,"sha256":"ed1adf4c3d136f3900d6e38f82b7892ca7d57f79f712bb900c473335da7052a8"},"css/listening-credit.css":{"bytes":945,"sha256":"c2e95167d4e20000951a7bed69a4af82ec5e42e627ea7a89a8515258c6907673"},"js/reciter-popularity.js":{"bytes":16488,"sha256":"84bc01dc23a83dded77058c594c7248ec4cc793f7f288caf2bc3886ca105b16f"},"js/competition-client.js":{"bytes":13082,"sha256":"fb4e5cf8f8a85405966937dfc90f4461123a91ced1136e3c188eee964413334f"},"js/guest-competition-core.js":{"bytes":6861,"sha256":"46398da7a9db71095878b1ff426e63b1625d042f903a7f761d6d6450fefbeab6"},"js/guest-competition.js":{"bytes":2653,"sha256":"d3127518df75c3b916a382e4e231f1bec44ad1a49fed87c951f5d4344299aef1"},"js/guest-registration-nudge.js":{"bytes":7138,"sha256":"a61fbdff8a57dd7e5a1e9722957d66632401c8d25cca4f474faafd7de53f3278"},"assets/updates/night-credit-499.svg":{"bytes":2992,"sha256":"b60c85c45a2082a2fa6070a867a0080dac800a9908b3390686e652a1247ca12c"},"assets/updates/guest-registration-499.svg":{"bytes":2887,"sha256":"e8c2abfc726e772cc0d84862b2aaf0bb09133210d2cb43df4bc71ca8dd7d1d62"},"privacy.html":{"bytes":15852,"sha256":"ba8c4471eff3c78dc5dbb00638b3ceb1a9132bc881e7d84904ba85923fc52d5b"},"js/app.js":{"bytes":78490,"sha256":"af36004060e2059652359db4054d969350f2c99fddf1d5c261999213697da273"},"home-selected.css":{"bytes":17226,"sha256":"b118427b2c909e992cddada351f2c4062ee0ac5a7179084f1a852c499887db90"}}
CHANGED_DIST = ["js/guest-context.js","js/activity-presence.js","js/home-activity-members.js","js/reciter-ranking-core.js","js/listening-credit-core.js","js/listening-credit.js","css/listening-credit.css","js/reciter-popularity.js","js/competition-client.js","js/guest-competition-core.js","js/guest-competition.js","js/guest-registration-nudge.js","assets/updates/night-credit-499.svg","assets/updates/guest-registration-499.svg","js/release-illustrations.js","privacy.html","js/app-release.js","sw.js","js/app.js","index.html","owner.html","share.html","home-selected.css"]
ZIP_FILES = ["assets/updates/guest-registration-499.svg","assets/updates/night-credit-499.svg","css/listening-credit.css","home-selected.css","js/activity-presence.js","js/app-release.js","js/app.js","js/competition-client.js","js/guest-competition-core.js","js/guest-competition.js","js/guest-context.js","js/guest-registration-nudge.js","js/home-activity-members.js","js/listening-credit-core.js","js/listening-credit.js","js/quran-nature-audio.js","js/quran-player-window.js","js/reciter-popularity.js","js/reciter-ranking-core.js","js/release-illustrations.js","owner.html","privacy.html","quran-player.css","share.html","sw.js"]
NATIVE_INDEX_EXPECTED = {"bytes":8313,"sha256":"266260b74d715a0e84eecf618682791e3d317cc5294286801c86ea88600aff08"}
# END_GENERATED_499

STAMP = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d%H%M%S')


def open_url(url, headers=None):
    separator = '&' if '?' in url else '?'
    request = urllib.request.Request(
        url + separator + 'verify499=' + STAMP,
        headers={'User-Agent': 'SALAH-release-verifier/499', **(headers or {})},
        method='GET',
    )
    return urllib.request.urlopen(request, timeout=60)


def request(path, headers=None):
    return open_url(BASE + path, headers)


def json_body(response, limit=2 * 1024 * 1024):
    data = response.read(limit + 1)
    assert len(data) <= limit, 'JSON response exceeds verification limit'
    return json.loads(data.decode('utf-8-sig'))


def verify_file(item):
    path, wanted = item
    with request(path) as response:
        assert response.status == 200, (path, response.status)
        data = response.read(wanted['bytes'] + 1)
        assert len(data) == wanted['bytes'], (path, 'bytes')
        digest = hashlib.sha256(data).hexdigest()
        assert digest == wanted['sha256'], (path, 'sha256')
        if path.endswith('.mp4'):
            assert response.headers.get_content_type() == 'video/mp4', (path, 'mime')
    result = dict(path=path, ok=True, bytes=len(data), sha256=digest)
    if path.endswith('.mp4'):
        with request(path, {'Range': 'bytes=0-1023', 'Origin': 'capacitor://localhost'}) as response:
            part = response.read(1025)
            assert response.status == 206, (path, 'range', response.status)
            assert response.headers.get('Content-Range') == 'bytes 0-1023/' + str(len(data))
            assert response.headers.get('Access-Control-Allow-Origin') == '*', (path, 'native-cors')
            assert part == data[:1024], (path, 'range bytes')
        result.update(rangeVerified=True, nativeCorsVerified=True)
    if path == 'js/app-release.js':
        assert re.search(rb'APP_VERSION\s*=\s*499\b', data), 'Wrong public application version'
    if path == 'sw.js':
        assert re.search(rb"const CACHE=['\"]salah-shell-v499['\"]", data), 'Wrong service worker cache version'
    return result


def no_geography(value):
    forbidden = {
        'selectedcity', 'selectedcountry', 'selectedcontextat', 'city', 'cityname',
        'prayercity', 'country', 'countryname', 'latitude', 'longitude', 'coordinates',
        'location', 'timezone', 'region', 'regionname', 'geography', 'geolocation',
    }
    if isinstance(value, dict):
        for key, child in value.items():
            normalized = re.sub(r'[^a-z0-9]', '', str(key).lower())
            assert normalized not in forbidden and not normalized.startswith(('selectedcity', 'selectedcountry', 'geo')), ('Private geography field in public response', str(key))
            no_geography(child)
    elif isinstance(value, list):
        for child in value:
            no_geography(child)


def verify_archive():
    with request('mobile-updates/latest.json') as response:
        assert response.status == 200
        manifest = json_body(response, 8192)
    assert manifest['version'] == 499 and manifest['minNativeVersion'] == 445
    assert manifest['schema'] == 1 and type(manifest['bytes']) is int and 0 < manifest['bytes'] <= MAX_ARCHIVE
    assert re.fullmatch(r'[a-f0-9]{64}', manifest['sha256'])
    assert manifest['file'] == 'web-499-' + manifest['sha256'] + '.zip'
    with tempfile.TemporaryFile() as archive_file:
        with request('mobile-updates/' + manifest['file']) as response:
            assert response.status == 200
            digest, size = hashlib.sha256(), 0
            while True:
                part = response.read(1024 * 1024)
                if not part:
                    break
                size += len(part)
                assert size <= MAX_ARCHIVE
                digest.update(part)
                archive_file.write(part)
        assert size == manifest['bytes'] and digest.hexdigest() == manifest['sha256'], 'Archive/manifest digest mismatch'
        archive_file.seek(0)
        with zipfile.ZipFile(archive_file) as archive:
            infos = archive.infolist()
            names = {entry.filename for entry in infos}
            assert len(infos) == len(names) <= 5000, 'Duplicate or excessive archive entries'
            assert sum(entry.file_size for entry in infos) <= 180 * 1024 * 1024
            assert all(not name.startswith(('/', '\\\\')) and '\\\\' not in name and '..' not in name.split('/') for name in names)
            assert {'js/native-entry.js', 'js/native-startup-recovery.js', 'js/vendor/capacitor-core.js'} <= names
            assert not any(re.match(r'^assets/player-nature-video-\d+(?:/|$)', name) or name == 'mobile-updates' or name.startswith('mobile-updates/') for name in names), 'Nature videos or nested updates embedded in native archive'
            for path in ZIP_FILES:
                wanted = EXPECTED[path]
                assert archive.getinfo(path).file_size == wanted['bytes'], ('archive', path, 'size')
                data = archive.read(path)
                assert len(data) == wanted['bytes'] and hashlib.sha256(data).hexdigest() == wanted['sha256'], ('archive', path, 'sha256')
            # sync-web intentionally replaces only the public bootstrap with the native entry.
            data = archive.read('index.html')
            assert len(data) == NATIVE_INDEX_EXPECTED['bytes']
            assert hashlib.sha256(data).hexdigest() == NATIVE_INDEX_EXPECTED['sha256'], 'Unexpected native index transform'
    return dict(path='mobile-updates/latest.json', ok=True, manifest=manifest, archiveVerified=True,
                archiveFilesVerified=ZIP_FILES + ['index.html'], excludedNatureVideosVerified=True)


def verify_reminder_config():
    with open_url(FUNCTIONS + 'background-reminders/config', {'Origin': PAGES_ORIGIN}) as response:
        assert response.status == 200
        assert response.headers.get('Access-Control-Allow-Origin') == PAGES_ORIGIN
        config = json_body(response, 8192)
    assert config['version'] == 1 and config['remindersVersion'] == 5
    assert config['features'] == ['tahajjud', 'dhikr-inactivity', 'dhikr-daily']
    assert re.fullmatch(r'[A-Za-z0-9_-]{87}', config['publicKey'])
    return dict(path='background-reminders/config', ok=True, remindersVersion=5,
                features=config['features'], publicKeyLength=len(config['publicKey']))


def verify_public_competition():
    with open_url(FUNCTIONS + 'reciter-competition?period=all', {'Origin': PAGES_ORIGIN}) as response:
        assert response.status == 200
        assert response.headers.get('Access-Control-Allow-Origin') in ('*', PAGES_ORIGIN)
        board = json_body(response)
    assert isinstance(board, dict) and board.get('period') == 'all' and isinstance(board.get('items'), list)
    assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', board.get('day', ''))
    no_geography(board)
    guests = [row for row in board['items'] if row.get('guest') is True]
    aliases = 0
    for row in guests:
        assert re.fullmatch(r'Гость [A-F0-9]{6}', row.get('nickname', '')), 'Legacy guest nickname contract changed'
        assert row.get('hasPhoto') is False, 'Guest cannot expose an account photo'
        if 'guestDisplayName' in row:
            alias = row['guestDisplayName']
            assert isinstance(alias, str) and 0 < len(alias) <= 64
            assert re.fullmatch(r'Гость · [^\x00-\x1f\x7f]{1,40}', alias), 'Invalid guest display name'
            aliases += 1
    return dict(path='reciter-competition?period=all', ok=True, guestRows=len(guests),
                friendlyGuestRows=aliases, legacyWireContractVerified=True, publicGeographyAbsent=True)


def verify_public_activity():
    with open_url(FUNCTIONS + 'listening-now', {'Origin': PAGES_ORIGIN}) as response:
        assert response.status == 200
        assert response.headers.get('Access-Control-Allow-Origin') in ('*', PAGES_ORIGIN)
        counts = json_body(response, 8192)
    assert isinstance(counts, dict) and set(counts) == {'count', 'readers', 'dhikr'}, 'Public activity must contain aggregates only'
    assert all(type(value) is int and value >= 0 for value in counts.values())
    no_geography(counts)
    return dict(path='listening-now', ok=True, aggregates=counts, identityAndGeographyAbsent=True)


def verify_owner_denial():
    # Deliberately send no Authorization, apikey, capability, guest ID or personal query.
    try:
        response = open_url(FUNCTIONS + 'owner-access', {'Origin': PAGES_ORIGIN})
    except urllib.error.HTTPError as error:
        response = error
    with response:
        status = response.status
        body = json_body(response, 8192)
    assert status in (401, 403), ('Unauthenticated owner endpoint', status)
    assert isinstance(body, dict) and body and set(body) <= {'error', 'message', 'code'}, 'Owner denial returned data'
    no_geography(body)
    return dict(path='owner-access (unauthenticated)', ok=True, status=status, noDataReturned=True)


def main():
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        results = list(pool.map(verify_file, EXPECTED.items()))
    results.extend([verify_archive(), verify_reminder_config(), verify_public_competition(),
                    verify_public_activity(), verify_owner_denial()])
    report = dict(version=499, count=len(results), ok=True, expectedPublicFiles=len(EXPECTED),
                  changedPublicFiles=len(CHANGED_DIST), results=results,
                  verifiedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  privacyProbesReadOnly=True, guestCapabilityWritesPerformed=False,
                  devicePlaybackVerified=False)
    print('SALAH_LIVE_499 ' + json.dumps(report, ensure_ascii=False, separators=(',', ':')))


if __name__ == '__main__':
    main()
