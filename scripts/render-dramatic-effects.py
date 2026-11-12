#!/usr/bin/env python3
"""Render an original orchestral G-G-G-E-flat sting; trim a CC0 crowd recording.
Usage: python3 scripts/render-dramatic-effects.py source-applause.wav output-dir
The four-note performance uses additive synthesis; no orchestra samples.
"""
import array,math,random,sys,wave
from pathlib import Path
out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
def write(path,samples,rate):
 peak=max(abs(v) for v in samples) or 1
 pcm=array.array('h',(round(max(-1,min(1,v/peak*.82))*32767) for v in samples))
 if sys.byteorder!='little':pcm.byteswap()
 with wave.open(str(path),'wb') as w:w.setparams((2,2,rate,0,'NONE','not compressed'));w.writeframes(pcm.tobytes())
with wave.open(sys.argv[1],'rb') as w:
 rate=w.getframerate();channels=w.getnchannels();assert w.getsampwidth()==2
 w.setpos(int(rate*.2));raw=array.array('h',w.readframes(int(rate*4.8)))
 if sys.byteorder!='little':raw.byteswap()
 frames=len(raw)//channels;applause=[]
 for i in range(frames):
  t=i/rate;fade=min(1,t/.12,(frames/rate-t)/.85)
  applause.extend(raw[i*channels+min(c,channels-1)]/32768*fade for c in range(2))
 write(out/'crowd-cheers-applause.wav',applause,rate)
rate=32000;length=3.8;n=int(rate*length);left=[0.0]*n;right=[0.0]*n
notes=[(.10,196,.19),(.37,196,.19),(.64,196,.19),(.98,155.56349,1.72)]
rng=random.Random(525)
for onset,hz,duration in notes:
 for j in range(int((duration+.25)*rate)):
  t=j/rate;i=int(onset*rate)+j
  if i>=n:break
  env=min(1,t/.018)*min(1,max(0,(duration+.22-t)/.22))*(.75+.25*math.exp(-t*5))
  # Low strings, bright brass and octave reinforcement in unison.
  vibrato=t+.0003*math.sin(2*math.pi*5*t)
  brass=sum(math.sin(2*math.pi*hz*k*vibrato)*math.exp(-k*.19)/k for k in range(1,11))
  strings=sum(math.sin(2*math.pi*hz*k*1.002*vibrato)/k for k in [1,3,5,7])
  bass=math.sin(2*math.pi*hz/2*t)+.23*math.sin(2*math.pi*hz*t)
  top=math.sin(2*math.pi*hz*2*.998*vibrato)
  attack=rng.uniform(-1,1)*math.exp(-t*35)*.05
  value=(brass*.33+strings*.14+bass*.22+top*.07+attack)*env
  left[i]+=value;right[i]+=value*.92+math.sin(2*math.pi*hz*1.003*t)*env*.035
  if onset==.98:
   drum=math.sin(2*math.pi*(hz/2)*t)*math.exp(-t*5)*.26
   left[i]+=drum;right[i]+=drum
# Short stereo hall reflections preserve the three distinct opening attacks.
for channel,echoes in [(left,[(.083,.16),(.169,.12),(.281,.08),(.413,.05)]),(right,[(.101,.16),(.193,.12),(.313,.08),(.457,.05)])]:
 dry=channel[:]
 for delay,level in echoes:
  shift=int(delay*rate)
  for i in range(shift,n):channel[i]+=dry[i-shift]*level
samples=[]
for i in range(n):
 fade=min(1,(length-i/rate)/.32)
 samples.extend((math.tanh(left[i]*1.1)*fade,math.tanh(right[i]*1.1)*fade))
write(out/'beethoven-fate-prison.wav',samples,rate)
