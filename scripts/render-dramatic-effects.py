#!/usr/bin/env python3
"""Trim freely reusable real recordings into Music Marble sound effects.
Usage: python3 scripts/render-dramatic-effects.py crowd-source.wav beethoven-source.wav output-dir
Sources, performer and licenses are documented in src/assets/audio/ATTRIBUTION.txt.
No synthesis, pitch shifting, time stretching or added orchestration is used.
"""
import array,sys,wave
from pathlib import Path
out=Path(sys.argv[3]);out.mkdir(parents=True,exist_ok=True)
def excerpt(source,name,start,end,fade_in,fade_out):
 with wave.open(source,'rb') as w:
  rate=w.getframerate();channels=w.getnchannels();assert w.getsampwidth()==2
  w.setpos(round(rate*start));raw=array.array('h',w.readframes(round(rate*(end-start))))
  if sys.byteorder!='little':raw.byteswap()
 frames=len(raw)//channels;peak=max(abs(v) for v in raw) or 1;samples=array.array('h')
 for i in range(frames):
  t=i/rate;fade=min(1,t/fade_in,(frames/rate-t)/fade_out)
  samples.extend(round(raw[i*channels+min(c,channels-1)]/peak*.82*32767*fade) for c in range(2))
 if sys.byteorder!='little':samples.byteswap()
 with wave.open(str(out/name),'wb') as w:w.setparams((2,2,rate,0,'NONE','not compressed'));w.writeframes(samples.tobytes())
excerpt(sys.argv[1],'crowd-cheers-applause.wav',.2,5.0,.12,.85)
# Two opening phrases: G G G E-flat, followed by F F F D and its natural release.
excerpt(sys.argv[2],'beethoven-fate-prison.wav',.82,7.8,.025,.35)
