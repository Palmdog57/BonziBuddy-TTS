## Say hello
sleep .5
figlet -f small "PalmersTools"
echo -e "\e[1;95m=====[     bonziBuddy TTS Generator  ]======"
echo -e "=====[         VERSION 1.0.0       ]======\n\e[0m"
sleep .5

## Get voice from user
bonziText="$1"

if [ -z "$bonziText" ]; then
echo "Please enter the text you would like to use, followed by [ENTER]: "
read bonziText
fi

curl -G --data-urlencode "text=$bonziText" localhost:6969/play > /mnt/c/Users/FiercePC/Desktop/tts_cache/bonzi$(date +%Y%m%d-%H%M%S).wav