#!/usr/bin/env python3
"""Render public-domain K.525 MIDI into a fresh retro console-style performance.
Usage: python3 scripts/render-chiptune.py [output.wav]
No sampled recording, soundfont or external Python dependency is used.
"""
import array, bisect, math, struct, sys, wave
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
raw=(ROOT/'src/assets/audio/mozart-k525-source.mid').read_bytes()
assert raw[:4]==b'MThd'
fmt,track_count,division=struct.unpack('>HHH',raw[8:14]);assert not division&0x8000
pos=8+int.from_bytes(raw[4:8],'big');notes=[];tempos=[(0,500000)];names={}
def vlq(data,p):
 value=0
 while True:
  b=data[p];p+=1;value=(value<<7)|(b&127)
  if not b&128:return value,p
for track in range(track_count):
 assert raw[pos:pos+4]==b'MTrk'
 size=int.from_bytes(raw[pos+4:pos+8],'big');data=raw[pos+8:pos+8+size];pos+=8+size
 p=0;tick=0;running=None;active={}
 while p<len(data):
  delta,p=vlq(data,p);tick+=delta;status=data[p]
  if status&128:p+=1
  else:status=running
  if status==255:
   kind=data[p];p+=1;length,p=vlq(data,p);payload=data[p:p+length];p+=length
   if kind==81:tempos.append((tick,int.from_bytes(payload,'big')))
   if kind==3:names[track]=payload.decode('latin1')
   continue
  if status in (240,247):length,p=vlq(data,p);p+=length;running=None;continue
  running=status;kind=status>>4;channel=status&15
  size=1 if kind in (12,13) else 2
  values=data[p:p+size];p+=size
  if kind not in (8,9):continue
  pitch,velocity=values;key=(channel,pitch)
  if kind==9 and velocity:
   active.setdefault(key,[]).append((tick,velocity))
  elif active.get(key):
   start,vel=active[key].pop(0);notes.append((track,pitch,start,tick,vel))
tempo_map=dict(tempos);tempo_ticks=sorted(tempo_map);tempo_seconds=[0.0]
for i in range(1,len(tempo_ticks)):
 prev=tempo_ticks[i-1];tempo_seconds.append(tempo_seconds[-1]+(tempo_ticks[i]-prev)*tempo_map[prev]/division/1000000)
def seconds(tick):
 i=bisect.bisect_right(tempo_ticks,tick)-1
 return (tempo_seconds[i]+(tick-tempo_ticks[i])*tempo_map[tempo_ticks[i]]/division/1000000)/1.12
voices=sorted({n[0] for n in notes});print('Voices:',[(i,names.get(i,'')) for i in voices],flush=True)
RATE=32000;TABLE=2048;end=max(seconds(n[3]) for n in notes)+.08
left=array.array('f',[0])*int((end+.05)*RATE);right=array.array('f',[0])*len(left)
tables=[]
for duty in [.5,.25,None,None]:
 table=[]
 for i in range(TABLE):
  phase=2*math.pi*i/TABLE
  if duty is None:value=sum(((-1)**((n-1)//2))*math.sin(n*phase)/(n*n) for n in (1,3,5,7))
  else:value=sum(2*math.sin(math.pi*n*duty)*math.cos(n*phase)/(math.pi*n) for n in range(1,9))
  table.append(value)
 peak=max(abs(v) for v in table);tables.append([v/peak for v in table])
for track,pitch,start,stop,velocity in notes:
 voice=voices.index(track)%4;start=seconds(start);duration=max(.018,seconds(stop)-start)
 if voice==3:pitch-=12
 frequency=440*2**((pitch-69)/12);step=frequency*TABLE/RATE;table=tables[voice]
 attack=int(.005*RATE);release=int(.025*RATE);hold=int(duration*RATE);count=hold+release
 pan=[-.22,.25,-.12,0][voice];level=[.19,.13,.12,.21][voice]*(velocity/100)**.6
 base=int(start*RATE)
 for j in range(min(count,len(left)-base)):
  envelope=min(1,j/max(1,attack))*max(0,min(1,(count-j)/release))
  envelope*=.78+.22*math.exp(-j/(RATE*.10))
  sample=table[int(j*step)%TABLE]*envelope*level
  left[base+j]+=sample*(1-pan);right[base+j]+=sample*(1+pan)
# Short seeded noise ticks create a discreet retro pulse without covering the melody.
seed=525;beat=0.5/1.12
for index in range(int(end/(beat/2))):
 base=int(index*beat/2*RATE);length=int(.016*RATE);level=.012 if index%2 else .020
 for j in range(min(length,len(left)-base)):
  seed=(1664525*seed+1013904223)&0xffffffff
  sample=(1 if seed&0x80000000 else -1)*level*(1-j/length)**2
  left[base+j]+=sample;right[base+j]+=sample
peak=max(max(abs(v) for v in left),max(abs(v) for v in right));scale=.82*32767/max(peak,.001)
output=array.array('h')
for i,(l,r) in enumerate(zip(left,right)):
 fade=min(1,i/(RATE*.01),(len(left)-1-i)/(RATE*.04))
 output.extend((int(max(-32767,min(32767,l*scale*fade))),int(max(-32767,min(32767,r*scale*fade)))))
if sys.byteorder!='little':output.byteswap()
path=Path(sys.argv[1] if len(sys.argv)>1 else '/private/tmp/musicmarble-chiptune.wav')
with wave.open(str(path),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(RATE);w.writeframes(output.tobytes())
print(f'Rendered {end:.1f}s stereo chiptune to {path}',flush=True)
