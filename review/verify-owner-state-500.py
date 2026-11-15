"""Read-only public release500 verifier template.

Run only after root replaces/finalizes the generated snapshot against the release500
commit. All network calls are unauthenticated GET; no participant identifier, auth
token, capability, push registration or write packet is accepted or transmitted.
ZIP_ALL_EXPECTED can carry a final CI artifact entry map for exhaustive ZIP comparison.
"""
import argparse
import concurrent.futures
import datetime
import hashlib
import json
import re
import stat
import tempfile
import urllib.error
import urllib.request
import zipfile

BASE = 'https://skodytunez-maker.github.io/salah/'
PAGES_ORIGIN = 'https://skodytunez-maker.github.io'
FUNCTIONS = 'https://kbltwszfvphgbxdbczsb.supabase.co/functions/v1/'
MAX_ARCHIVE = 100 * 1024 * 1024
# BEGIN_GENERATED_500
# Frozen against the prepared500 local snapshot; this is not a publication/approval record.
SNAPSHOT_FINAL = True
PREPARATION_STATUS = 'prepared_not_published'
PREPARED_BASE = '5e784d5092e1c17cd5ea0f9768f18c861187823f'
EXPECTED = {"js/quran-nature-motion.js":{"bytes":10891,"sha256":"550a196f09441553779f4e79f4a292fe53017a937d0e1cb5f451f1d8e1a02ce1"},"js/quran-player-extras.js":{"bytes":7755,"sha256":"7e394e184fddd6d41dc5cfd2601ac891dfc407784aca6f092adcee7aa72059e6"},"quran-player.css":{"bytes":39826,"sha256":"42b37cc75cef33d4a8d0218fa3934a4755ff36382452e17727a66c4970b45812"},"js/app-release.js":{"bytes":936,"sha256":"ee44ee075a253b13432c52c39468876c7cd166e15d706181ac5b651d4872b17d"},"sw.js":{"bytes":41257,"sha256":"3b915846ee200beb5ef949877d31f06bf6a682ca9e880e97aa2df8c160221a83"},"js/release-illustrations.js":{"bytes":45722,"sha256":"3b8dc5eac7881ff013153045fc6ff87830df45b6316085bf43093b2653a96082"},"css/quran-awards.css":{"bytes":51080,"sha256":"1dfe34cd144c69cf439dc92a7e7c814866aa73a9360744c5efc58ca501c6fdcf"},"js/quran-session.js":{"bytes":14641,"sha256":"bed3a4b2e47cf18640d54245c9764983b26ab8b7c6e0822f183d70efd968fca3"},"js/quran-nature-audio.js":{"bytes":5764,"sha256":"e3ab6d3ac3969951f99a202ba51c4ac7e4aefaa759fc3cfc47ebd665f5cc5d62"},"js/quran-player-window.js":{"bytes":7806,"sha256":"069202c0d2105e5e1fdd50780940c67a6ba84f6b320f01c16c6ddd2729e80b35"},"js/quran-session-recovery.js":{"bytes":3640,"sha256":"5178b741138c54f462a66d40648a7f2fd39b8bca202a415dfff12ede2c1122ba"},"js/quran-player-bar.js":{"bytes":14804,"sha256":"24299a57065b5743891b7cb0f080c363c7beac0281484404e2825ac9eab11779"},"index.html":{"bytes":8367,"sha256":"15e7a48db8da40d70f065a3aca55267dc26589fddd26f0a927881e7a9cb7cb69"},"quran.css":{"bytes":76215,"sha256":"f6f9c470cf74633350e0fdf34743905c63e41984887f46a5c08edf758c745c2c"},"js/quran-nature-recordings.js":{"bytes":1160,"sha256":"ac2463624703111c9bec1040e170f80372a2974adbefe100f4337405f147e6ad"},"data/nature-sources-493.json":{"bytes":4619,"sha256":"661235a2b3ff93038bc5c5a0a4fc4081736ea16f43ebfa4d85c999c6841d4e78"},"assets/player-nature-493/rain.jpg":{"bytes":198567,"sha256":"20ee22c0e54e060523e49e17db3730c8302201c86c7be3d59885e9edbd5fad1c"},"assets/player-nature-493/rain.mp3":{"bytes":1089836,"sha256":"e29d48f9be91bad23536c5b2f542a51ec5a2b812dc21f46e8ec960c4c14cd0de"},"assets/player-nature-493/wind.jpg":{"bytes":289835,"sha256":"168f6e48d6441dc15b713f79cecbaf1a5e1d6464c1789607325f0b708e06bc85"},"assets/player-nature-493/wind.mp3":{"bytes":1089836,"sha256":"ef4877e145b76d8062d40bbc86e7e7371dc29b49de12d0517f13406303bc6dba"},"assets/player-nature-493/fire.jpg":{"bytes":252364,"sha256":"1d7c99e876c9443d3bdfe0d3d71f683582a80b4abcb1bf0fa88c53c8ff9e78a3"},"assets/player-nature-493/fire.mp3":{"bytes":1089836,"sha256":"06404288985d657e39a6c567510cfb5e8e42e86306dfdcd4bcb9d2f96f1fb123"},"assets/player-nature-493/forest.jpg":{"bytes":436448,"sha256":"b1220eff6da331144d12c830a1f41f90ae76472364090e075c3bf1f778cff01f"},"assets/player-nature-493/forest.mp3":{"bytes":1089836,"sha256":"f897077197d08a16bdc60048b1776aa6a0d61b072e2353ae939ef90dde744005"},"assets/player-nature-493/ocean.jpg":{"bytes":238918,"sha256":"cd26ef08bda292b8e31fe32935630696668e082583d1f5769ec8ebb5f00a2976"},"assets/player-nature-493/ocean.mp3":{"bytes":1089836,"sha256":"243e8b338d683d444951d9ae0ec3696a19d248672ca41856e782339d1922b4a3"},"owner.html":{"bytes":6768,"sha256":"a2f2a0e641934f97596abd41246be8e1e3a3c71de07deac399bae161a02b0607"},"share.html":{"bytes":8387,"sha256":"a3a935d40f2a1792adc3dac4578975f0331d3a11641e7b9c16d003bd3a05bba9"},"nature-video-credits.html":{"bytes":3715,"sha256":"6a14d5a9ab7f807f4176ca1bd3f346ce3e642fcdb565590b28e4b4096e5e4b63"},"assets/updates/nature-video-rain-495.jpg":{"bytes":8826,"sha256":"d6bcee32c3ad9c4e658ac07b1f17bc974e4523c4fb071f108fcda8a7f5f49c9c"},"assets/updates/nature-video-fire-495.jpg":{"bytes":30166,"sha256":"8c13a5d09b747d92ffd5717b11e683a0d65b6e965e0ddef27d0a07f469bd2b0f"},"assets/player-nature-video-495/rain.mp4":{"bytes":386731,"sha256":"a2055f584f852d61e6871622019681e35419c7a83c2ac391c1e2df3cec309fa5"},"assets/player-nature-video-495/wind.mp4":{"bytes":1445794,"sha256":"214d4743ad534d62ebc54770350e2e66fef851ba5ae11d32d16cc33a42d4bf5e"},"assets/player-nature-video-495/fire.mp4":{"bytes":564289,"sha256":"15922e9836a07e80a9f2e92aadddee93f9bb9a906964b418d86aaec0e37d605e"},"assets/player-nature-video-495/forest.mp4":{"bytes":2241106,"sha256":"a8ce6a5908e222a84fa8e761565d8ef53104be9aafeca0f48e8992598933693f"},"assets/player-nature-video-495/ocean.mp4":{"bytes":2270013,"sha256":"33908f695066d9cfbac48e3481a3844d1fc297bce34a84a1f845b1b9d5adf24b"},"js/quran-nature-video-cache.js":{"bytes":3917,"sha256":"32cc69370602a3b87e9cfe0616895dc628c39cf2f6f3c97660d53b9f9eaa904f"},"js/daily-reminder-messages.js":{"bytes":8802,"sha256":"51912757926e8e54298075962763360c2aa8edfe072a0b46e669275110da78f7"},"js/dhikr-reminder.js":{"bytes":2630,"sha256":"e9fce98ab83bc4733a09a7666a2fca553860fc29ff0817b52373234a6e13a5c3"},"js/reminders.js":{"bytes":24293,"sha256":"f12e3b5976b454c13ed00213e69ac44802d3de2b8e08fc469c074fbd49d34531"},"js/push-reminders.js":{"bytes":17258,"sha256":"ba494c5d7b6d409f13d73962b0a6d7082a5a6df2b627d2857b07454fd0759056"},"assets/updates/daily-reminder-497.svg":{"bytes":1619,"sha256":"2a29a5fdc5981fb17cc61a443ced441f90e282f795bcddd593c3ff92577f67ce"},"js/guest-context.js":{"bytes":378,"sha256":"37cb623772010e80c9223cc9864f804599d473e5f28ef6a9d17a530601b0bc39"},"js/activity-presence.js":{"bytes":4674,"sha256":"ea9859b750449a25c151693f302951e81cc53853715744ac1fd60d591b81eccc"},"js/home-activity-members.js":{"bytes":3824,"sha256":"3998062630f49f23f4b566154b9ed720c30a9ae4b7a3312606b9d32b96f43074"},"js/reciter-ranking-core.js":{"bytes":2968,"sha256":"9c4d3c21b35a4c4e32066eedf0502c4f866debc541e29624d36d55a932e67e19"},"js/listening-credit-core.js":{"bytes":4887,"sha256":"4d07625c10a39babd5195ecd68879ed049f2d1c3a20e920dc30ed15c0206bbec"},"js/listening-credit.js":{"bytes":2945,"sha256":"f56f77b5fa4d6d61ce08fa30ccd32e6a361b686dca26fc9f1a76c46f017f8962"},"css/listening-credit.css":{"bytes":945,"sha256":"c2e95167d4e20000951a7bed69a4af82ec5e42e627ea7a89a8515258c6907673"},"js/reciter-popularity.js":{"bytes":16610,"sha256":"ca95547d07b8695ff9f8df764986b2a918b9bf7eaa758a15c6da90c3c1d16e4e"},"js/competition-client.js":{"bytes":13082,"sha256":"fb4e5cf8f8a85405966937dfc90f4461123a91ced1136e3c188eee964413334f"},"js/guest-competition-core.js":{"bytes":6861,"sha256":"46398da7a9db71095878b1ff426e63b1625d042f903a7f761d6d6450fefbeab6"},"js/guest-competition.js":{"bytes":2653,"sha256":"d3127518df75c3b916a382e4e231f1bec44ad1a49fed87c951f5d4344299aef1"},"js/guest-registration-nudge.js":{"bytes":7138,"sha256":"a61fbdff8a57dd7e5a1e9722957d66632401c8d25cca4f474faafd7de53f3278"},"assets/updates/night-credit-499.svg":{"bytes":2992,"sha256":"b60c85c45a2082a2fa6070a867a0080dac800a9908b3390686e652a1247ca12c"},"assets/updates/guest-registration-499.svg":{"bytes":2887,"sha256":"e8c2abfc726e772cc0d84862b2aaf0bb09133210d2cb43df4bc71ca8dd7d1d62"},"privacy.html":{"bytes":18140,"sha256":"b64ec691c82d4ca38be2ce9f41ccef7057352c47be4ca0b09678ac2dc964392c"},"js/app.js":{"bytes":78690,"sha256":"86c942c41dd09f4e7754f0fa1c8e725cceda26e9b60200083f13ad2faffe7882"},"home-selected.css":{"bytes":17226,"sha256":"b118427b2c909e992cddada351f2c4062ee0ac5a7179084f1a852c499887db90"},"js/app-state.js":{"bytes":4567,"sha256":"a087c4814e09c882e7a36bd4855bf6000b9f6bff8bea82f60fcd4ae8c1db7c4b"},"js/app-state-core.js":{"bytes":5018,"sha256":"aa6ca44417e9b4ca7511068560957286b58e4f101aeb61001d783c8b29bfa62d"},"js/owner-current-activity.js":{"bytes":9096,"sha256":"bf0757fd517390125232ca343ba0f2d1f5e7c55f1709285add857f9337aa4183"},"css/owner-current-activity.css":{"bytes":2292,"sha256":"eda51e20017f09458c1920ec26ebaf5e8d1fb2f8aee1b32fec647f616282498f"},"js/owner-auth.js":{"bytes":14223,"sha256":"777c00a4a9cc4da53ddcbd0f13dca3784f9450f3b9abc2755d86cc78a2711be1"},"js/admin.js":{"bytes":29637,"sha256":"3ad1f9c26444f84321022164015ec4e2a67de8f65284534565f6da5eef103ca1"},"js/owner-workspace.js":{"bytes":8726,"sha256":"4a89ad43efe911e53c2a44e18bd42ee47eebcc31d496199cf9d5ef9c6a817043"},"js/qibla.js":{"bytes":18587,"sha256":"dae6b4451cec380d333bb7e0138c790aaf0edead92f142dfdb7e523792746b6a"},"js/qibla-access.js":{"bytes":6267,"sha256":"a92860dd4a6f7814e13f574dfd2ae77c2cbe9c2fd08b6a58b39cc86eeb013d55"},"js/qibla-view.js":{"bytes":7744,"sha256":"bb2ff6dda71cabd6bc4b6d1802a888ea0610b782df2b0ce0b2aa403527ec75b3"},"js/qibla-math.js":{"bytes":4783,"sha256":"79d2ada249afa309e69f7e83155686682a218037619c0faaa5f58697f76fb704"},"js/qibla-map.js":{"bytes":15378,"sha256":"31e3828fb36e83e530ddf2ef5b1181ca69660baa4501faadbdf893f30b2973a2"},"js/qibla-map-fallback.js":{"bytes":9198,"sha256":"f8026b16bc34de5fd30d55a3d47288c6e4ac0a740d7a09736a5f34fcfc5482f3"},"qibla.css":{"bytes":8675,"sha256":"2252cf381dffa547a998760ff5d5eae64a38e484d9c8771ac58351e627f85f06"},"data/tyumen-november-2026.json":{"bytes":25871,"sha256":"ac439ccccf29fd0a03324cf59a38801490d377a0832cfc174068861b01211128"},"assets/tyumen-november-source-2026.jpg":{"bytes":144951,"sha256":"e3f96afeee76514874f814c21b4be9eb339f1e2769e21f86b2c6e9986a17d3ce"},"js/tyumen-source.js":{"bytes":684,"sha256":"7d4157a39d213b2090280534286daa504ea419fc3dc2104d929cd95b5328cea4"},"js/prayers.js":{"bytes":9500,"sha256":"b528ed087049aa6ff5aa7cb57c70e300de28a128e80432e03b7c1c956f1eea63"},"js/listener-presence-core.js":{"bytes":2744,"sha256":"54b40a0b6f3eb17417b10167d9b6a8bab530608a84c6dd3654b429dbf7b8feb3"},"js/listener-presence.js":{"bytes":1473,"sha256":"066e218e4698a07c8f4164d63ed5d3ea577df915cfb9a07cd01452aeea14ff77"}}
CHANGED_DIST = ["assets/tyumen-november-source-2026.jpg","css/owner-current-activity.css","data/tyumen-november-2026.json","index.html","js/activity-presence.js","js/admin.js","js/app-release.js","js/app-state-core.js","js/app-state.js","js/app.js","js/listener-presence-core.js","js/listener-presence.js","js/listening-credit.js","js/owner-auth.js","js/owner-current-activity.js","js/owner-workspace.js","js/prayers.js","js/qibla-access.js","js/qibla-map-fallback.js","js/qibla-map.js","js/qibla-math.js","js/qibla-view.js","js/qibla.js","js/reciter-popularity.js","js/reciter-ranking-core.js","owner.html","privacy.html","qibla.css","share.html","sw.js"]
ZIP_FILES = ["js/quran-nature-motion.js","js/quran-player-extras.js","quran-player.css","js/app-release.js","sw.js","js/release-illustrations.js","css/quran-awards.css","js/quran-session.js","js/quran-nature-audio.js","js/quran-player-window.js","js/quran-session-recovery.js","js/quran-player-bar.js","quran.css","js/quran-nature-recordings.js","data/nature-sources-493.json","assets/player-nature-493/rain.jpg","assets/player-nature-493/rain.mp3","assets/player-nature-493/wind.jpg","assets/player-nature-493/wind.mp3","assets/player-nature-493/fire.jpg","assets/player-nature-493/fire.mp3","assets/player-nature-493/forest.jpg","assets/player-nature-493/forest.mp3","assets/player-nature-493/ocean.jpg","assets/player-nature-493/ocean.mp3","owner.html","share.html","nature-video-credits.html","assets/updates/nature-video-rain-495.jpg","assets/updates/nature-video-fire-495.jpg","js/quran-nature-video-cache.js","js/daily-reminder-messages.js","js/dhikr-reminder.js","js/reminders.js","js/push-reminders.js","assets/updates/daily-reminder-497.svg","js/guest-context.js","js/activity-presence.js","js/home-activity-members.js","js/reciter-ranking-core.js","js/listening-credit-core.js","js/listening-credit.js","css/listening-credit.css","js/reciter-popularity.js","js/competition-client.js","js/guest-competition-core.js","js/guest-competition.js","js/guest-registration-nudge.js","assets/updates/night-credit-499.svg","assets/updates/guest-registration-499.svg","privacy.html","js/app.js","home-selected.css","js/app-state.js","js/app-state-core.js","js/owner-current-activity.js","css/owner-current-activity.css","js/owner-auth.js","js/admin.js","js/owner-workspace.js","js/qibla.js","js/qibla-access.js","js/qibla-view.js","js/qibla-math.js","js/qibla-map.js","js/qibla-map-fallback.js","qibla.css","data/tyumen-november-2026.json","assets/tyumen-november-source-2026.jpg","js/tyumen-source.js","js/prayers.js","js/listener-presence-core.js","js/listener-presence.js"]
NATIVE_INDEX_EXPECTED = {"bytes":8376,"sha256":"05b61ef92fc5c2918c55dde9a528d8edb600c0b589421585ad602f4d59605e99"}
NOVEMBER_ROWS = [["05:52","07:48","12:25","14:22","14:59","16:54","18:42"],["05:54","07:51","12:25","14:21","14:57","16:51","18:40"],["05:56","07:53","12:25","14:19","14:55","16:49","18:38"],["05:58","07:55","12:25","14:17","14:53","16:47","18:36"],["06:00","07:57","12:25","14:15","14:51","16:45","18:34"],["06:01","07:59","12:25","14:14","14:49","16:43","18:32"],["06:03","08:02","12:26","14:12","14:47","16:41","18:31"],["06:05","08:04","12:26","14:11","14:45","16:38","18:29"],["06:07","08:06","12:26","14:09","14:43","16:36","18:27"],["06:09","08:08","12:26","14:08","14:41","16:34","18:26"],["06:11","08:11","12:26","14:06","14:40","16:32","18:24"],["06:13","08:13","12:26","14:05","14:38","16:30","18:22"],["06:14","08:15","12:26","14:03","14:36","16:28","18:21"],["06:16","08:17","12:26","14:02","14:34","16:27","18:19"],["06:18","08:19","12:26","14:01","14:33","16:25","18:18"],["06:20","08:22","12:27","13:59","14:31","16:23","18:17"],["06:21","08:24","12:27","13:58","14:30","16:21","18:15"],["06:23","08:26","12:27","13:57","14:28","16:19","18:14"],["06:25","08:28","12:27","13:56","14:27","16:18","18:13"],["06:26","08:30","12:27","13:55","14:25","16:16","18:12"],["06:28","08:32","12:28","13:53","14:24","16:15","18:10"],["06:30","08:34","12:28","13:52","14:22","16:13","18:09"],["06:31","08:36","12:28","13:51","14:21","16:12","18:08"],["06:33","08:38","12:28","13:50","14:20","16:10","18:07"],["06:34","08:40","12:29","13:50","14:19","16:09","18:06"],["06:36","08:42","12:29","13:49","14:18","16:07","18:05"],["06:37","08:44","12:29","13:48","14:17","16:06","18:05"],["06:39","08:46","12:30","13:47","14:15","16:05","18:04"],["06:40","08:48","12:30","13:46","14:15","16:04","18:03"],["06:42","08:50","12:30","13:46","14:14","16:03","18:02"]]
# CI exhaustive map remains optional; never claim complete payload matching without it.
ZIP_ALL_EXPECTED = None
# END_GENERATED_500

STAMP = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d%H%M%S')


def open_url(url, headers=None, *, cache_bust=True):
    separator = '&' if '?' in url else '?'
    request = urllib.request.Request(
        url + separator + 'verify500=' + STAMP if cache_bust else url,
        headers={'User-Agent': 'SALAH-release-verifier/500', **(headers or {})},
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
        assert re.search(rb'APP_VERSION\s*=\s*500\b', data), 'Wrong public application version'
        assert re.search(rb'APP_ANNOUNCEMENT\s*=\s*\{version:499\b', data), 'Release500 must retain announcement499'
        assert b'\xd0\x9d\xd0\xbe\xd1\x87\xd0\xbd\xd0\xbe\xd0\xb9 \xd1\x83\xd1\x87\xd1\x91\xd1\x82:' in data and b'\xd0\xa0\xd0\xb5\xd0\xb3\xd0\xb8\xd1\x81\xd1\x82\xd1\x80\xd0\xb0\xd1\x86\xd0\xb8\xd1\x8f \xd0\xb4\xd0\xbb\xd1\x8f \xd0\xb3\xd0\xbe\xd1\x81\xd1\x82\xd0\xb5\xd0\xb9:' in data, 'Original499 features missing'
    if path == 'sw.js':
        assert re.search(rb"const CACHE=['\"]salah-shell-v500['\"]", data), 'Wrong service worker cache version'
        assets_match = re.search(rb'const ASSETS=(\[[^\n]+\]);', data)
        assert assets_match, 'Missing worker precache inventory'
        precache = json.loads(assets_match.group(1))
        assert './assets/tyumen-november-source-2026.jpg' in precache and './data/tyumen-november-2026.json' in precache
        assert './assets/tyumen-november-source-2025.jpg' not in precache, 'Retired source remains in precache'
        assert not any(re.match(r'^\./assets/player-nature-video-\d+(?:/|$)', path) for path in precache), 'Nature videos entered precache'
    if path == 'data/tyumen-november-2026.json':
        verify_november_table(json.loads(data.decode('utf-8-sig')))
        result['timetableValuesVerified'] = 210
    if path == 'assets/tyumen-november-source-2026.jpg':
        assert data[:2] == b'\xff\xd8' and data[-2:] == b'\xff\xd9', 'Raw2026 source is not a complete JPEG'
        assert len(data) == 144951 and digest == 'e3f96afeee76514874f814c21b4be9eb339f1e2769e21f86b2c6e9986a17d3ce', 'Raw user photo changed'
        result['rawSourceVerified'] = True
    return result


def verify_november_table(value):
    assert value['source'] == './assets/tyumen-november-source-2026.jpg'
    assert value['sourceType'] == 'user-provided-monthly-table' and value['sourceYear'] == value['targetYear'] == 2026
    assert value['range'] == ['2026-11-01', '2026-11-30'] and value['timezone'] == 'Asia/Yekaterinburg'
    dates = ['2026-11-%02d' % day for day in range(1, 31)]
    assert set(value['days']) == set(dates) and len(NOVEMBER_ROWS) == 30
    for date, expected in zip(dates, NOVEMBER_ROWS):
        row = value['days'][date]
        assert row['sourceYear'] == 2026 and row['sourceUrl'] == value['source']
        assert row['asrFirstKind'] == 'published' and row['asrFirstSourceUrl'] == value['source']
        actual = [row['timings']['Fajr'], row['timings']['Sunrise'], row['timings']['Dhuhr'], row['asrFirst'], row['timings']['Asr'], row['timings']['Maghrib'], row['timings']['Isha']]
        assert len(expected) == 7 and actual == [date + 'T' + clock + ':00+05:00' for clock in expected], ('November210 values', date)


def verify_november_ready():
    # Probe the canonical public object and exactly the dated URL used by the scheduler.
    # No app-shell version requirement: this gate may run before the full500 rollout.
    table_path = 'data/tyumen-november-2026.json'
    photo_path = 'assets/tyumen-november-source-2026.jpg'
    targets = [(table_path, table_path), (table_path + '?source=2026-11-15', table_path), (photo_path, photo_path)]
    checked = []
    for public_path, expected_path in targets:
        wanted = EXPECTED[expected_path]
        with open_url(BASE + public_path, cache_bust=False) as response:
            assert response.status == 200, ('November-ready', public_path, response.status)
            data = response.read(wanted['bytes'] + 1)
        digest = hashlib.sha256(data).hexdigest()
        assert len(data) == wanted['bytes'] and digest == wanted['sha256'], ('November-ready', public_path, 'exact bytes/hash')
        if expected_path == table_path:
            verify_november_table(json.loads(data.decode('utf-8-sig')))
        else:
            assert len(data) == 144951 and digest == 'e3f96afeee76514874f814c21b4be9eb339f1e2769e21f86b2c6e9986a17d3ce', 'Raw2026 image changed'
        checked.append(dict(path=public_path, bytes=len(data), sha256=digest))
    return dict(path='November2026 public-readiness', ok=True, valuesVerified=210, raw2026SourceVerified=True,
                canonicalAndSchedulerDatedURLVerified=True, appShellVersionRequired=False, checked=checked)


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
    assert manifest['version'] == 500 and manifest['minNativeVersion'] == 445
    assert manifest['schema'] == 1 and type(manifest['bytes']) is int and 0 < manifest['bytes'] <= MAX_ARCHIVE
    assert re.fullmatch(r'[a-f0-9]{64}', manifest['sha256'])
    assert manifest['file'] == 'web-500-' + manifest['sha256'] + '.zip'
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
            assert all(entry.orig_filename == entry.filename and '\x00' not in entry.orig_filename for entry in infos), 'ZIP filename was truncated or contains NUL'
            assert sum(entry.file_size for entry in infos) <= 180 * 1024 * 1024
            assert all(re.fullmatch(r'[a-zA-Z0-9_./@ -]+', name) and all(part not in ('', '.', '..') for part in name.split('/')) for name in names), 'Unsafe or noncanonical archive path'
            assert not any(re.search(r'\.(apk|aab|dex|jar|class|so|jks|keystore|p12|pfx)$', name, re.I) or name.rsplit('/', 1)[-1].startswith('.env') for name in names), 'Native/private payload in web archive'
            assert all(not ((entry.external_attr >> 16) & 0o170000) == stat.S_IFLNK and not (entry.flag_bits & 1) for entry in infos), 'Symlink/encrypted archive entries forbidden'
            assert 'third-party/Android-NOTICES.txt' not in names, 'Android-only notice entered live web update'
            assert 'assets/tyumen-november-source-2025.jpg' not in names, 'Retired November2025 photo remains in archive'
            assert {'js/native-entry.js', 'js/native-startup-recovery.js', 'js/vendor/capacitor-core.js'} <= names
            assert not any(re.match(r'^assets/player-nature-video-\d+(?:/|$)', name) or name == 'mobile-updates' or name.startswith('mobile-updates/') for name in names), 'Nature videos or nested updates embedded in native archive'
            for path in ZIP_FILES:
                wanted = EXPECTED[path]
                assert archive.getinfo(path).file_size == wanted['bytes'], ('archive', path, 'size')
                data = archive.read(path)
                assert len(data) == wanted['bytes'] and hashlib.sha256(data).hexdigest() == wanted['sha256'], ('archive', path, 'sha256')
            verify_november_table(json.loads(archive.read('data/tyumen-november-2026.json').decode('utf-8-sig')))
            if ZIP_ALL_EXPECTED is not None:
                assert names == set(ZIP_ALL_EXPECTED), 'Unexpected/missing ZIP entry versus final CI inventory'
                for path, wanted in ZIP_ALL_EXPECTED.items():
                    assert archive.getinfo(path).file_size == wanted['bytes'], ('archive-full', path, 'size')
                    digest, size = hashlib.sha256(), 0
                    with archive.open(path) as entry:
                        while True:
                            part = entry.read(1024 * 1024)
                            if not part:
                                break
                            size += len(part)
                            assert size <= wanted['bytes'], ('archive-full', path, 'excess bytes')
                            digest.update(part)
                    assert size == wanted['bytes'] and digest.hexdigest() == wanted['sha256'], ('archive-full', path, 'sha256')
            # sync-web intentionally replaces only the public bootstrap with the native entry.
            data = archive.read('index.html')
            assert len(data) == NATIVE_INDEX_EXPECTED['bytes']
            assert hashlib.sha256(data).hexdigest() == NATIVE_INDEX_EXPECTED['sha256'], 'Unexpected native index transform'
    return dict(path='mobile-updates/latest.json', ok=True, manifest=manifest, archiveVerified=True,
                archiveFilesVerified=ZIP_FILES + ['index.html'], excludedNatureVideosVerified=True,
                allArchiveEntriesVerified=ZIP_ALL_EXPECTED is not None, timetableValuesVerified=210, raw2026SourceVerified=True)


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
    denials = []
    for path in ('owner-access', 'owner-access?mode=app-state&page=1'):
        try:
            response = open_url(FUNCTIONS + path, {'Origin': PAGES_ORIGIN})
        except urllib.error.HTTPError as error:
            response = error
        with response:
            status = response.status
            body = json_body(response, 8192)
        assert status == 401, ('Unauthenticated owner endpoint', path, status)
        assert body == {'error': 'sign_in_required'}, 'Owner denial returned unexpected fields or data'
        no_geography(body)
        denials.append(dict(path=path, status=status))
    return dict(path='owner-access (unauthenticated)', ok=True, denials=denials, noDataReturned=True)


def main():
    assert SNAPSHOT_FINAL, 'Template only: freeze the final release500 file inventory/hashes before public verification'
    assert set(CHANGED_DIST) <= set(EXPECTED), 'Final changed-public inventory is incomplete'
    assert {'js/app-release.js', 'sw.js', 'data/tyumen-november-2026.json', 'assets/tyumen-november-source-2026.jpg'} <= set(EXPECTED)
    assert sum(path.endswith('.mp4') for path in EXPECTED) == 5, 'Retain all five nature video delivery probes'
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        results = list(pool.map(verify_file, EXPECTED.items()))
    results.extend([verify_november_ready(), verify_archive(), verify_reminder_config(), verify_public_competition(),
                    verify_public_activity(), verify_owner_denial()])
    report = dict(version=500, count=len(results), ok=True, expectedPublicFiles=len(EXPECTED),
                  changedPublicFiles=len(CHANGED_DIST), results=results,
                  verifiedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                  privacyProbesReadOnly=True, guestCapabilityWritesPerformed=False,
                  devicePlaybackVerified=False, announcementVersion=499, authenticatedOwnerDataRead=False)
    print('SALAH_LIVE_500 ' + json.dumps(report, ensure_ascii=False, separators=(',', ':')))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Unauthenticated read-only SALAH500 public verification')
    parser.add_argument('--november-ready-only', action='store_true', help='Verify only canonical/dated November JSON and raw2026 JPG before scheduler rollout')
    options = parser.parse_args()
    if options.november_ready_only:
        assert SNAPSHOT_FINAL, 'Finalize the prepared500 snapshot first'
        print('SALAH_NOVEMBER_READY_500 ' + json.dumps(verify_november_ready(), ensure_ascii=False, separators=(',', ':')))
    else:
        main()
