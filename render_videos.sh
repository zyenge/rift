#!/usr/bin/env bash
set -euo pipefail

FFMPEG=/opt/homebrew/bin/ffmpeg
BASE=/Users/zhen/Documents/projects/omni
ASSETS="$BASE/video-assets"
CAP="$ASSETS/captions"
TMP="$ASSETS/tmp"
mkdir -p "$TMP"

make_segment () {
  local in_img="$1"
  local caption_png="$2"
  local out_mp4="$3"

  "$FFMPEG" -y -loop 1 -i "$in_img" -loop 1 -i "$caption_png" -t 7 \
    -filter_complex "[0:v]scale=1920:1080,zoompan=z='min(zoom+0.0007,1.12)':d=175:s=1280x720:fps=25[bg];[1:v]scale=1280:720[cap];[bg][cap]overlay=0:0" \
    -an -r 25 -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p "$out_mp4"
}

make_segment "$ASSETS/v1_scene1.jpg" "$CAP/v1_s1.png" "$TMP/v1_s1.mp4"
make_segment "$ASSETS/v1_scene2.jpg" "$CAP/v1_s2.png" "$TMP/v1_s2.mp4"
make_segment "$ASSETS/v1_scene3.jpg" "$CAP/v1_s3.png" "$TMP/v1_s3.mp4"

"$FFMPEG" -y -i "$TMP/v1_s1.mp4" -i "$TMP/v1_s2.mp4" -i "$TMP/v1_s3.mp4" \
  -filter_complex "[0:v][1:v]xfade=transition=fade:duration=1:offset=6[v1];[v1][2:v]xfade=transition=fade:duration=1:offset=12[v]" \
  -map "[v]" -an -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p "$BASE/vision-1-utility.mp4"

make_segment "$ASSETS/v2_scene1.jpg" "$CAP/v2_s1.png" "$TMP/v2_s1.mp4"
make_segment "$ASSETS/v2_scene2.jpg" "$CAP/v2_s2.png" "$TMP/v2_s2.mp4"
make_segment "$ASSETS/v2_scene3.jpg" "$CAP/v2_s3.png" "$TMP/v2_s3.mp4"

"$FFMPEG" -y -i "$TMP/v2_s1.mp4" -i "$TMP/v2_s2.mp4" -i "$TMP/v2_s3.mp4" \
  -filter_complex "[0:v][1:v]xfade=transition=fade:duration=1:offset=6[v1];[v1][2:v]xfade=transition=fade:duration=1:offset=12[v]" \
  -map "[v]" -an -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p "$BASE/vision-2-emotional-presence.mp4"

echo "Rendered: $BASE/vision-1-utility.mp4"
echo "Rendered: $BASE/vision-2-emotional-presence.mp4"
