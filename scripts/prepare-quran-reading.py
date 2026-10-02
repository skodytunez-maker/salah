# Python 3.12; install quran-transcript==0.6.4 from PyPI.
# Uses this repository's Arabic; it does not copy the package's Quran corpus.
import sys, json, re
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
root=Path(__file__).resolve().parent
from quran_transcript.phonetics.phonetizer import quran_phonetizer
from quran_transcript.phonetics.moshaf_attributes import MoshafAttributes
m=MoshafAttributes(rewaya='hafs',madd_monfasel_len=4,madd_mottasel_len=4,madd_mottasel_waqf=4,madd_aared_len=2,sakt_iwaja='sakt',sakt_marqdena='sakt')
repo=root.parent
basma='بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ'
letters=dict(zip('ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي'.split(),['б','т','с','дж','х','х','д','з','р','з','с','ш','с','д','т','з','‘','г','ф','қ','к','л','м','н','х','у','й']))
letters.update({'ء':'’','َ':'а','ِ':'и','ُ':'у','ا':'аа','ۦ':'ии','ۥ':'уу','ں':'н','۾':'м','ڇ':'','ۜ':' · ','ؙ':'у','۪':'э','ـ':'ээ','ٲ':'’'})
def render(ph):
    ph=re.sub(r'َ?ا+','аа',ph)
    ph=re.sub(r'ِ?ۦ+','ии',ph)
    ph=re.sub(r'ُ?ۥ+','уу',ph)
    ph=re.sub('ں+','ن',ph)
    ph=re.sub('۾+','م',ph)
    ph=re.sub(r'([منوي])\1{2,}',r'\1\1',ph)
    unknown=set(ph)-set(letters)-set(' аиу')
    if unknown: raise ValueError('Unknown phonemes: '+repr(unknown))
    s=''.join(letters.get(ch,ch) for ch in ph)
    s=re.sub(r'(^|\s)’(?=[аэиу])',r'\1',s)
    s=s.replace('ла','ля').replace('лляах','ллаах').replace('аллаах','алляах')
    # Allah is written consistently with the existing SALAH reading.
    s=s.replace('алляах','аллаах').replace('лляах','ллаах')
    s=s.replace('йу','ю').replace('йа','я')
    words=s.split();out=[]
    for word in words:
        if out and word.startswith('л') and len(word)>1 and word[1] not in 'аэиуоыяюь':
            if word.startswith('ллаах'):out[-1]+=word
            elif word.startswith('лляз'):out[-1]+='л-'+word[1:]
            else:out[-1]+='ль-'+word[1:]
        elif out and re.match(r'^(рр|сс|шш|тт|дд|зз|нн|мм)',word):
            out[-1]+=word[0]+'-'+word[1:]
        else:out.append(word)
    s=' '.join(out).strip(' .·')
    if not s:raise ValueError('Empty reading')
    return s[0].upper()+s[1:]
(repo/'work').mkdir(exist_ok=True)
rows=[];errors=[];counts={}
for n in range(1,115):
    d=json.loads((repo/'dist'/'data'/'quran'/f'{n}.json').read_text('utf-8'));vs=[]
    for v in d['verses']:
        try:
            original=v['arabic'].replace('\ufeff','').strip()
            x=re.sub(r'\s+', ' ', re.sub('[ۖۗۘۙۚۛ۞۩]','',original)).strip()
            prefix=''
            if n!=1 and x.startswith(basma+' '):
                x=x[len(basma):].strip();prefix='Бисмилляахир-рахмаанир-рахиим. '
            out=quran_phonetizer(x,m,sura_idx=n)
            cuts={out.mappings[i].pos[0] for i,c in enumerate(x) if c==' ' and out.mappings[i] is not None}
            # QPS omits some interword spaces during idgham. Normalize input
            # whitespace BEFORE asking for mappings; indices otherwise drift.
            assert len(out.mappings)==len(x)
            chars=list(out.phonemes)
            # A simplified reading keeps the written noon/tanwin before waw/ya.
            # QPS's 3+ waw/ya run encodes nasal duration, not a long vowel.
            # Do not present it as several Cyrillic у/й letters.
            for cut in cuts:
                if cut>0 and cut<len(chars) and chars[cut] in 'وي' and chars[cut-1]==chars[cut]:
                    start=cut-1
                    while start>0 and chars[start-1]==chars[cut]:start-=1
                    end=cut+1
                    while end<len(chars) and chars[end]==chars[cut]:end+=1
                    if end-start>=3:
                        chars[start]='ن'
                        for j in range(start+1,cut):chars[j]=''
                        for j in range(cut+1,end):chars[j]=''
            ph=''.join((' ' if i in cuts else '')+c for i,c in enumerate(chars))
            text=prefix+render(ph)
            vs.append({'ayah':v['ayah'],'text':text,'phonemes':out.phonemes})
        except Exception as e:errors.append({'surah':n,'ayah':v['ayah'],'error':type(e).__name__+': '+str(e)})
    rows.append({'number':n,'verses':vs})
    if n%10==0:print('Prepared surahs:',n,flush=True)
(repo/'work'/'quran-reading-generated.json').write_text(json.dumps({'engine':'quran-transcript@0.6.4','moshaf':m.model_dump(),'surahs':rows,'errors':errors},ensure_ascii=False),'utf-8')
print('Prepared verses:',sum(len(s['verses']) for s in rows),'Errors:',len(errors),flush=True)
