set -e
R=raw
# grade: slightly cooler shadows, warm highlights, lower saturation, a touch more contrast
G="eq=contrast=1.08:saturation=0.82:brightness=-0.02,colorbalance=rs=-0.04:bs=0.05:rh=0.05:bh=-0.03"
# plate <name> <src> <start> <dur> <crop-filter> <push 0/1> <extra>
plate () {
  name=$1; src=$2; ss=$3; dur=$4; crop=$5; dark=${6:-}
  ffmpeg -loglevel error -y -ss $ss -t $dur -i $R/$src -an -vf "$crop,scale=2304:1296,fps=30,zoompan=z='1+0.00045*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=30,$G$dark,format=yuv420p" -t $dur -c:v libx264 -crf 17 -preset fast plates/$name.mp4
  echo $name $(ffprobe -v error -show_entries format=duration -of csv=p=0 plates/$name.mp4)
}
plate A 9080222.mp4 1 5.6 "crop=iw:ih"
plate B 8257361.mp4 2 3.6 "crop=1440:810:0:900"
plate C 8196796.mp4 1 4.7 "crop=iw:ih"
plate D 7987514.mp4 1 2.4 "crop=iw:ih"
plate E 4351798.mp4 3 3.2 "crop=iw:ih"
plate F 8196803.mp4 5 2.9 "crop=iw:ih"
plate G 20563164.mp4 1 8.0 "crop=iw:ih" ",eq=brightness=-0.06"
plate H 8196803.mp4 15 4.1 "crop=iw:ih" ",eq=brightness=-0.10:saturation=0.6"
ffmpeg -loglevel error -y -f lavfi -i color=c=0x14171a:s=1920x1080:r=30 -t 10.9 -c:v libx264 -pix_fmt yuv420p plates/I.mp4
printf "file 'plates/%s.mp4'\n" A B C D E F G H I > plates.txt
ffmpeg -loglevel error -y -f concat -safe 0 -i plates.txt -c:v libx264 -crf 17 -preset fast -r 30 base.mp4
ffprobe -v error -show_entries format=duration -of csv=p=0 base.mp4
