#!/usr/bin/env python3
"""Original gentle board-game loop; no sampled or copied music is used."""
import math, array, wave, sys
from pathlib import Path
RATE=44100; BPM=84; BEAT=60/BPM; BARS=16; FRAMES=round(BARS*4*BEAT*RATE)
left=array.array('f',[0])*FRAMES;right=array.array('f',[0])*FRAMES

def note(midi,beat,duration,volume,pan=0,timbre='pluck'):
    hz=440*2**((midi-69)/12);start=round(beat*BEAT*RATE);seconds=duration*BEAT
    count=round(seconds*RATE);lg=math.sqrt((1-pan)/2);rg=math.sqrt((1+pan)/2)
    for j in range(count):
        t=j/RATE;attack=min(1,t/.018)
        if timbre=='pad':
            env=math.sin(math.pi*j/count)**2
            value=math.sin(2*math.pi*hz*t)+.07*math.sin(2*math.pi*hz*2*t)
        else:
            env=attack*math.exp(-t/(.48 if timbre=='melody' else .28))*min(1,(seconds-t)/.12)
            value=math.sin(2*math.pi*hz*t)+.16*math.sin(2*math.pi*hz*2*t)+.035*math.sin(2*math.pi*hz*3*t)
        k=(start+j)%FRAMES;v=value*env*volume;left[k]+=v*lg;right[k]+=v*rg

# Warm extended chords and a short, original pentatonic tune with breathing spaces.
chords=[(48,[60,64,67,71]),(48,[60,64,67,71]),(45,[57,60,64,67]),(45,[57,60,64,67]),
        (41,[57,60,64,65]),(41,[57,60,64,65]),(43,[55,59,62,64]),(43,[55,59,62,64]),
        (40,[55,59,62,64]),(45,[57,60,64,67]),(38,[57,60,62,65]),(43,[55,59,62,64]),
        (41,[57,60,64,65]),(43,[55,59,62,64]),(48,[60,64,67,71]),(48,[60,64,67,69])]
melodies=[[(0,76,1),(1.5,79,1),(3,76,.7)],[(.5,74,.8),(2,72,1.6)],
          [(0,72,1),(1.5,76,1),(3,79,.7)],[(.5,76,1),(2,74,1.5)],
          [(0,72,1.5),(2,69,1)],[(.5,72,.8),(2,76,1.4)],
          [(0,74,1),(1.5,71,1),(3,69,.7)],[(.5,67,1),(2.5,72,1)],
          [(0,71,1),(1.5,74,1)],[(.5,72,1),(2,76,1.4)],
          [(0,77,1.2),(2,76,1)],[(.5,74,1),(2.5,71,1)],
          [(0,72,1),(1.5,76,1),(3,77,.7)],[(.5,74,1),(2,71,1.4)],
          [(0,72,1.7),(2.5,76,.8)],[(.5,74,.8),(2,72,1.5)]]
for bar,((root,chord),melody) in enumerate(zip(chords,melodies)):
    at=bar*4
    for i,pitch in enumerate(chord):note(pitch,at,4,.017,(-.6,-.2,.2,.6)[i],'pad')
    for b in (0,2):note(root,at+b,2,.075,0)
    for i in range(4):note(chord[(i*2+bar%2)%4],at+i+.08,1.1,.040,(-.3,.3)[i%2])
    for b,pitch,length in melody:note(pitch,at+b,length+.7,.095,.08,'melody')
# Quiet stereo room echoes wrap across the loop boundary for a continuous join.
for channel in (left,right):
    original=channel[:]
    for delay,gain in ((.13,.12),(.27,.07)):
        shift=round(delay*RATE)
        for i in range(FRAMES):channel[(i+shift)%FRAMES]+=original[i]*gain
peak=max(max(abs(x) for x in left),max(abs(x) for x in right));scale=.68/peak
pcm=array.array('h')
for l,r in zip(left,right):pcm.extend((round(max(-1,min(1,l*scale))*32767),round(max(-1,min(1,r*scale))*32767)))
if sys.byteorder!='little':pcm.byteswap()
output=Path(sys.argv[1] if len(sys.argv)>1 else '/private/tmp/musicmarble-game-garden.wav')
with wave.open(str(output),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(RATE);w.writeframes(pcm.tobytes())
print(f'{output}: {FRAMES/RATE:.2f}s, original 16-bar stereo loop, {BPM} BPM')
