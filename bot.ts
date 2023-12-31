import { Client, GatewayIntentBits, Message, VoiceChannel } from "discord.js";
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
} from "@discordjs/voice";
import * as ytdl from "ytdl-core";
import config from "./config";
import * as youtubeSearch from "youtube-search";
import { OpusEncoder } from "@discordjs/opus";

var ytOptions: youtubeSearch.YouTubeSearchOptions = {
  maxResults: 1,
  key: config.dataApiKey,
  type: "video",
  videoCategoryId: "10",
};

function searchYT(search: string): Promise<string> {
  return new Promise((resolve, reject) => {
    youtubeSearch.default(search, ytOptions, (err, results) => {
      if (err) {
        reject(err);
      } else {
        console.log(results);
        resolve(results[0].link);
      }
    });
  });
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

type Song = {
  title: string;
  url: string;
};

const queue = new Map<string, Song[]>();
const audioPlayer = createAudioPlayer();

client.once("ready", () => {
  console.log("Bot is online!");
});

client.on("messageCreate", async (message: Message) => {
  if (message.author.bot || !message.content.startsWith("!")) return;

  const args = message.content.slice(1).split(" ");
  const command = args.shift()?.toLowerCase();

  if (command === "p" || command === "play") {
    let url: string;
    try {
      const searchTerm = args.join(" ");
      url = await searchYT(searchTerm);
    } catch (err) {
      message.channel.send("No matches found!");
      return;
    }

    if (!ytdl.validateURL(url)) {
      message.channel.send("Invalid YouTube URL!");
      return;
    }

    const songInfo = await ytdl.getInfo(url);
    const song: Song = {
      title: songInfo.videoDetails.title,
      url: songInfo.videoDetails.video_url,
    };

    if (!queue.has(message.guild?.id || "")) {
      queue.set(message.guild?.id || "", []);
    }

    queue.get(message.guild?.id || "")?.push(song);
    message.channel.send(`Added to queue: ${song.title}`);

    // Play the song if it's the only one in the queue
    if (queue.get(message.guild?.id || "")?.length === 1) {
      playSong(message);
    }
  } else if (command === "s" || command === "skip") {
    skipSong(message);
  } else if (command === "q" || command === "queue") {
    showQueue(message);
  } else if (command === "u" || command === "url") {
    const url = args[0];

    if (!ytdl.validateURL(url)) {
      message.channel.send("Invalid YouTube URL!");
      return;
    }

    const songInfo = await ytdl.getInfo(url);
    const song: Song = {
      title: songInfo.videoDetails.title,
      url: songInfo.videoDetails.video_url,
    };

    if (!queue.has(message.guild?.id || "")) {
      queue.set(message.guild?.id || "", []);
    }

    queue.get(message.guild?.id || "")?.push(song);
    message.channel.send(`Added to queue: ${song.title}`);

    // Play the song if it's the only one in the queue
    if (queue.get(message.guild?.id || "")?.length === 1) {
      playSong(message);
    }
  } else if (command === "h" || command === "help") {
    message.channel.send(`
    Commands:
    !p or !play - Play a song
    !s or !skip - Skip the current song
    !q or !queue - Show the current queue
    !u or !url - Play a song from a YouTube URL
    `);
  }
});

async function playSong(
  message: Message,
  retries: number = 3,
  startTime: number = 0
) {
  const guildId = message.guild?.id || "";
  const songs = queue.get(guildId);

  if (!songs || songs.length === 0) {
    message.channel.send("No songs in the queue to play!");
    return;
  }

  const song = songs[0];
  const songInfo = await ytdl.getInfo(song.url);
  const voiceChannel = message.member?.voice.channel as VoiceChannel;

  if (!voiceChannel) {
    message.channel.send("You need to be in a voice channel to play music!");
    return;
  }

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: message.guild?.id || "",
    adapterCreator: message.guild?.voiceAdapterCreator || undefined,
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 30e3);

    const stream = ytdl.downloadFromInfo(songInfo, {
      filter: "audioonly",
      quality: "highestaudio",
    });

    // @ts-expect-error
    const audioResource = createAudioResource(stream, { start: startTime });
    audioPlayer.play(audioResource);
    connection.subscribe(audioPlayer);

    audioPlayer.once(AudioPlayerStatus.Idle, () => {
      queue.get(guildId)?.shift();
      playSong(message);
    });

    audioPlayer.once("error", async (error) => {
      console.error(`Error in audio player: ${error.message}`);
      console.error(error);
      message.channel.send(
        "Error playing the song, attempting to reconnect and continue..."
      );

      if (retries > 0) {
        const currentTime = audioResource.playbackDuration;
        audioPlayer.stop(true);

        // Wait for a short period before retrying
        setTimeout(() => {
          playSong(message, retries - 1, currentTime);
        }, 1000);
      } else {
        message.channel.send(
          "Failed to reconnect after multiple retries, skipping to the next song."
        );
        queue.get(guildId)?.shift();
        playSong(message);
      }
    });

    message.channel.send(`Now playing: ${song.title}`);
  } catch (error) {
    console.error(`Error creating voice connection: ${error.message}`);
    message.channel.send("Error joining the voice channel!");

    if (retries > 0) {
      console.error(`Retrying to play the song (${retries} retries left)`);
      setTimeout(() => playSong(message, retries - 1, startTime), 1000);
    } else {
      console.error(`Failed to play the song after ${retries} retries`);
      message.channel.send(
        "Failed to play the song after multiple retries, skipping to the next one!"
      );
      queue.get(guildId)?.shift();
      playSong(message);
    }
  }
}

function skipSong(message: Message) {
  const songs = queue.get(message.guild?.id || "");

  if (!songs || songs.length === 0) {
    message.channel.send("No songs in the queue to skip!");
    return;
  }

  audioPlayer.stop();
  message.channel.send("Song skipped!");
}

function showQueue(message: Message) {
  const songs = queue.get(message.guild?.id || "");

  if (!songs || songs.length === 0) {
    message.channel.send("No songs in the queue!");
    return;
  }

  let response = "Current queue:\n";
  songs.forEach((song, index) => {
    response += `${index + 1}. ${song.title}\n`;
  });

  message.channel.send(response);
}

client.login(config.token);
