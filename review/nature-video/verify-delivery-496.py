import concurrent.futures, hashlib, json, urllib.request
BASE='https://skodytunez-maker.github.io/salah/'
ORIGIN='capacitor://localhost'
EXPECTED={"assets/player-nature-video-495/rain.mp4":{"bytes":386731,"sha256":"a2055f584f852d61e6871622019681e35419c7a83c2ac391c1e2df3cec309fa5"},"assets/player-nature-video-495/wind.mp4":{"bytes":1445794,"sha256":"214d4743ad534d62ebc54770350e2e66fef851ba5ae11d32d16cc33a42d4bf5e"},"assets/player-nature-video-495/fire.mp4":{"bytes":564289,"sha256":"15922e9836a07e80a9f2e92aadddee93f9bb9a906964b418d86aaec0e37d605e"},"assets/player-nature-video-495/forest.mp4":{"bytes":2241106,"sha256":"a8ce6a5908e222a84fa8e761565d8ef53104be9aafeca0f48e8992598933693f"},"assets/player-nature-video-495/ocean.mp4":{"bytes":2270013,"sha256":"33908f695066d9cfbac48e3481a3844d1fc297bce34a84a1f845b1b9d5adf24b"}}
def check(item):
    path, wanted=item
    def get(headers):
        req=urllib.request.Request(BASE+path,headers={'Origin':ORIGIN,'User-Agent':'SALAH-delivery-preflight/496',**headers})
        return urllib.request.urlopen(req,timeout=60)
    with get({}) as r:
        assert r.status==200,(path,r.status)
        assert r.headers.get('Access-Control-Allow-Origin') in ('*',ORIGIN),(path,'CORS',dict(r.headers))
        assert r.headers.get_content_type()=='video/mp4',(path,r.headers.get('Content-Type'))
        assert int(r.headers['Content-Length'])==wanted['bytes']
        assert not r.headers.get('Content-Range')
        data=r.read(wanted['bytes']+1)
        assert len(data)==wanted['bytes'] and hashlib.sha256(data).hexdigest()==wanted['sha256']
    with get({'Range':'bytes=0-1023'}) as r:
        assert r.status==206 and r.headers.get('Content-Range')=='bytes 0-1023/'+str(wanted['bytes'])
        assert r.headers.get('Access-Control-Allow-Origin') in ('*',ORIGIN)
        assert r.read(1025)==data[:1024]
    return dict(path=path,ok=True,nativeCors=True,wholeBytes=len(data),range206=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
    results=list(pool.map(check,EXPECTED.items()))
print('SALAH_DELIVERY_496 '+json.dumps(dict(ok=True,count=len(results),results=results),separators=(',',':')))
