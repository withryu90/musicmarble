#!/usr/bin/env python3
"""New sample-free performance of Beethoven's public-domain Ode to Joy theme."""
import array, math, sys, wave
from pathlib import Path
RATE=22050
BPM=120
BEAT=60/BPM
# G-major theme, matching the requested fixed-do B B C D ... G G ending.
PHRASE=[(71,1),(71,1),(72,1),(74,1),(74,1),(72,1),(71,1),(69,1),
        (67,1),(67,1),(69,1),(71,1),(71,1.5),(69,.5),(69,2),
        (71,1),(71,1),(72,1),(74,1),(74,1),(72,1),(71,1),(69,1),
        (67,1),(67,1),(69,1),(71,1),(69,1.5),(67,.5),(67,2)]
FRAMES=round((32*BEAT+.65)*RATE)
left=array.array('f',[0])*FRAMES;right=array.array('f',[0])*FRAMES

def voice(midi,beat,beats,volume,pan=0,lead=False):
    start=round(beat*BEAT*RATE);duration=beats*BEAT;hz=440*2**((midi-69)/12)
    count=round(duration*RATE);lg=math.sqrt((1-pan)/2);rg=math.sqrt((1+pan)/2)
    for j in range(count):
        t=j/RATE
        env=min(1,t/(.025 if lead else .065))*min(1,(duration-t)/.09)
        # Soft brass-like harmonics with a quiet detuned string layer, no soundfont.
        phase=2*math.pi*hz*t
        if lead:
            v=sum(g*math.sin(phase*k) for k,g in enumerate([1,.28,.13,.055,.02],1))
            v+=.16*math.sin(phase*1.0007)+.10*math.sin(phase*.9993)
            env*=.92+.08*math.cos(2*math.pi*4.8*t)
        else:v=math.sin(phase)+.15*math.sin(phase*2)+.07*math.sin(phase*3)
        if start+j<FRAMES:
            left[start+j]+=v*env*volume*lg;right[start+j]+=v*env*volume*rg

beat=0
for midi,length in PHRASE:
    voice(midi,beat,length*.94,.22,0,True)
    voice(midi-12,beat,length*.94,.025,-.2)
    beat+=length
# Original, restrained accompaniment; the requested melody remains prominent.
chords=[(43,[55,59,62]),(38,[54,57,62]),(43,[55,59,62]),(38,[54,57,62]),
        (43,[55,59,62]),(38,[54,57,62]),(43,[55,59,62]),(43,[55,59,62])]
for bar,(bass,chord) in enumerate(chords):
    for i,n in enumerate(chord):voice(n,bar*4,3.95,.025,[-.6,0,.6][i])
    voice(bass,bar*4,3.85,.055,.1)
for channel in (left,right):
    dry=channel[:]
    for delay,gain in ((.07,.12),(.14,.075),(.26,.035)):
        shift=round(delay*RATE)
        for i in range(FRAMES-shift):channel[i+shift]+=dry[i]*gain
peak=max(max(map(abs,left)),max(map(abs,right)));scale=.62/peak
pcm=array.array('h')
for i,(l,r) in enumerate(zip(left,right)):
    fade=min(1,(FRAMES-1-i)/(.15*RATE))
    pcm.extend((round(l*scale*fade*32767),round(r*scale*fade*32767)))
if sys.byteorder!='little':pcm.byteswap()
output=Path(sys.argv[1] if len(sys.argv)>1 else 'src/assets/audio/beethoven-ode-concert.wav')
with wave.open(str(output),'wb') as w:
    w.setnchannels(2);w.setsampwidth(2);w.setframerate(RATE);w.writeframes(pcm.tobytes())
print(f'{output}: {FRAMES/RATE:.2f}s, 32 beats at {BPM} BPM, new synthesized performance')
