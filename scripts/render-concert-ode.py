#!/usr/bin/env python3
"""Trim the actual 1923 Seidler-Winkler / Neues Symphonie-Orchester recording.
Usage: python3 scripts/render-concert-ode.py decoded-source.wav [output.wav]
Original recording, publication dates and source links: audio/ATTRIBUTION.txt.
No synthesis, added instruments, pitch shift or time stretch.
"""
import array,sys,wave
from pathlib import Path
START=217.98
END=230.0
with wave.open(sys.argv[1],'rb') as w:
    rate=w.getframerate();channels=w.getnchannels();assert w.getsampwidth()==2
    w.setpos(round(START*rate));raw=array.array('h',w.readframes(round((END-START)*rate)))
if sys.byteorder!='little':raw.byteswap()
# 2:1 conversion uses a two-sample box filter, preserving the historical pitch/timing.
assert rate==44100
rate//=2
samples=array.array('h')
for i in range(0,len(raw)-channels,channels*2):
    for ch in range(2):
        c=min(ch,channels-1)
        samples.append((raw[i+c]+raw[i+channels+c])//2)
frames=len(samples)//2;peak=max(map(abs,samples)) or 1
for i in range(frames):
    fade=max(0,min(1,i/(rate*.025),(frames-1-i)/(rate*.18)))
    for ch in range(2):samples[i*2+ch]=round(samples[i*2+ch]/peak*.7*32767*fade)
if sys.byteorder!='little':samples.byteswap()
output=Path(sys.argv[2] if len(sys.argv)>2 else 'src/assets/audio/beethoven-ode-concert-orchestra.wav')
with wave.open(str(output),'wb') as w:
    w.setparams((2,2,rate,0,'NONE','not compressed'));w.writeframes(samples.tobytes())
print(f'{output}: {frames/rate:.2f}s, real orchestra excerpt {START}–{END}s')
