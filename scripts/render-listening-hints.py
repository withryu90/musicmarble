#!/usr/bin/env python3
# coding:utf-8
"""Rebuild licensed five-second listening hints. Requires imageio-ffmpeg.
Usage: python3 scripts/render-listening-hints.py [work-id ...]
Full source files are cached outside the repository in the system temp folder.
Respects provider Retry-After responses; downloads sequentially.
"""
import json,sys,tempfile,time,urllib.request,urllib.error,subprocess,wave
from pathlib import Path
import imageio_ffmpeg
ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'src/assets/audio/hints'
ROWS=json.loads((DEST/'ATTRIBUTION.json').read_text())['recordings']
CACHE=Path(tempfile.gettempdir())/'musicmarble-hint-originals'
CACHE.mkdir(exist_ok=True)
LOCAL={'beethoven-5':'beethoven-fate-prison.wav','beethoven-9':'beethoven-ode-concert-orchestra.wav'}
for key in sys.argv[1:] or ROWS:
 row=ROWS[key]
 if key in LOCAL:original=DEST.parent/LOCAL[key]
 else:
  original=CACHE/(key+'.audio')
  if not original.exists():
   request=urllib.request.Request(row['url'].split('?utm_')[0],headers={'User-Agent':'MusicMarble/1.0 (educational licensed audio excerpts)'})
   try:
    with urllib.request.urlopen(request,timeout=120) as response:original.write_bytes(response.read())
   except urllib.error.HTTPError as error:
    if error.code==429:raise SystemExit('Provider rate limit: retry after '+error.headers.get('Retry-After','600')+' seconds. Existing files are preserved.')
    raise
   time.sleep(15)
 target=DEST/(key+'.wav')
 subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-v','error','-y','-ss',str(row['start']),'-i',str(original),'-t','5','-af','afade=t=in:d=0.02,afade=t=out:st=4.92:d=0.08,loudnorm=I=-18:TP=-2:LRA=7','-ar','22050','-ac','1','-c:a','pcm_s16le',str(target)],check=True)
 with wave.open(str(target),'rb') as audio:params=audio.getparams();frames=audio.readframes(audio.getnframes())
 needed=22050*5*2
 if len(frames)<needed-2205:raise ValueError('Source does not contain five seconds: '+key)
 with wave.open(str(target),'wb') as audio:audio.setparams(params);audio.writeframes((frames+b'\0'*max(0,needed-len(frames)))[:needed])
 print(key,'5 seconds',flush=True)
