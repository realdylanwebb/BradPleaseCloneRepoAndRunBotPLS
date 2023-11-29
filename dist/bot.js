"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const voice_1 = require("@discordjs/voice");
const ytdl = __importStar(require("ytdl-core"));
const config_1 = __importDefault(require("./config"));
const youtubeSearch = __importStar(require("youtube-search"));
var ytOptions = {
    maxResults: 1,
    key: config_1.default.dataApiKey,
    type: "video",
    videoCategoryId: "10",
};
function searchYT(search) {
    return new Promise((resolve, reject) => {
        youtubeSearch.default(search, ytOptions, (err, results) => {
            if (err) {
                reject(err);
            }
            else {
                console.log(results);
                resolve(results[0].link);
            }
        });
    });
}
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.GuildVoiceStates,
        discord_js_1.GatewayIntentBits.MessageContent,
    ],
});
const queue = new Map();
const audioPlayer = (0, voice_1.createAudioPlayer)();
client.once("ready", () => {
    console.log("Bot is online!");
});
client.on("messageCreate", (message) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    if (message.author.bot || !message.content.startsWith("!"))
        return;
    const args = message.content.slice(1).split(" ");
    const command = (_a = args.shift()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
    if (command === "p" || command === "play") {
        let url;
        try {
            const searchTerm = args.join(" ");
            url = yield searchYT(searchTerm);
        }
        catch (err) {
            message.channel.send("No matches found!");
            return;
        }
        if (!ytdl.validateURL(url)) {
            message.channel.send("Invalid YouTube URL!");
            return;
        }
        const songInfo = yield ytdl.getInfo(url);
        const song = {
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
        };
        if (!queue.has(((_b = message.guild) === null || _b === void 0 ? void 0 : _b.id) || "")) {
            queue.set(((_c = message.guild) === null || _c === void 0 ? void 0 : _c.id) || "", []);
        }
        (_e = queue.get(((_d = message.guild) === null || _d === void 0 ? void 0 : _d.id) || "")) === null || _e === void 0 ? void 0 : _e.push(song);
        message.channel.send(`Added to queue: ${song.title}`);
        // Play the song if it's the only one in the queue
        if (((_g = queue.get(((_f = message.guild) === null || _f === void 0 ? void 0 : _f.id) || "")) === null || _g === void 0 ? void 0 : _g.length) === 1) {
            playSong(message);
        }
    }
    else if (command === "s" || command === "skip") {
        skipSong(message);
    }
    else if (command === "q" || command === "queue") {
        showQueue(message);
    }
    else if (command === "u" || command === "url") {
        const url = args[0];
        if (!ytdl.validateURL(url)) {
            message.channel.send("Invalid YouTube URL!");
            return;
        }
        const songInfo = yield ytdl.getInfo(url);
        const song = {
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
        };
        if (!queue.has(((_h = message.guild) === null || _h === void 0 ? void 0 : _h.id) || "")) {
            queue.set(((_j = message.guild) === null || _j === void 0 ? void 0 : _j.id) || "", []);
        }
        (_l = queue.get(((_k = message.guild) === null || _k === void 0 ? void 0 : _k.id) || "")) === null || _l === void 0 ? void 0 : _l.push(song);
        message.channel.send(`Added to queue: ${song.title}`);
        // Play the song if it's the only one in the queue
        if (((_o = queue.get(((_m = message.guild) === null || _m === void 0 ? void 0 : _m.id) || "")) === null || _o === void 0 ? void 0 : _o.length) === 1) {
            playSong(message);
        }
    }
    else if (command === "h" || command === "help") {
        message.channel.send(`
    Commands:
    !p or !play - Play a song
    !s or !skip - Skip the current song
    !q or !queue - Show the current queue
    !u or !url - Play a song from a YouTube URL
    `);
    }
}));
function playSong(message) {
    var _a, _b, _c, _d;
    return __awaiter(this, void 0, void 0, function* () {
        const guildId = ((_a = message.guild) === null || _a === void 0 ? void 0 : _a.id) || "";
        const songs = queue.get(guildId);
        if (!songs || songs.length === 0) {
            message.channel.send("No songs in the queue to play!");
            return;
        }
        const song = songs[0];
        const songInfo = yield ytdl.getInfo(song.url);
        // Join the same voice channel as the user who requested the song
        const voiceChannel = (_b = message.member) === null || _b === void 0 ? void 0 : _b.voice.channel;
        if (!voiceChannel) {
            message.channel.send("You need to be in a voice channel to play music!");
            return;
        }
        const connection = (0, voice_1.joinVoiceChannel)({
            channelId: voiceChannel.id,
            guildId: ((_c = message.guild) === null || _c === void 0 ? void 0 : _c.id) || "",
            adapterCreator: ((_d = message.guild) === null || _d === void 0 ? void 0 : _d.voiceAdapterCreator) || undefined,
        });
        try {
            // Make sure the connection is ready before playing audio
            yield (0, voice_1.entersState)(connection, voice_1.VoiceConnectionStatus.Ready, 30e3);
            const stream = ytdl.downloadFromInfo(songInfo, {
                filter: "audioonly",
                quality: "highestaudio",
            });
            const audioResource = (0, voice_1.createAudioResource)(stream);
            audioPlayer.play(audioResource);
            connection.subscribe(audioPlayer);
            audioPlayer.once(voice_1.AudioPlayerStatus.Idle, () => {
                var _a;
                // Remove the finished song from the queue and play the next song
                (_a = queue.get(guildId)) === null || _a === void 0 ? void 0 : _a.shift();
                playSong(message);
            });
            audioPlayer.once("error", (error) => {
                var _a;
                console.error(`Error in audio player: ${error.message}`);
                message.channel.send("Error playing the song, skipping to the next one!");
                (_a = queue.get(guildId)) === null || _a === void 0 ? void 0 : _a.shift();
                playSong(message);
            });
            message.channel.send(`Now playing: ${song.title}`);
        }
        catch (error) {
            console.error(`Error creating voice connection: ${error.message}`);
            message.channel.send("Error joining the voice channel!");
        }
    });
}
function skipSong(message) {
    var _a;
    const songs = queue.get(((_a = message.guild) === null || _a === void 0 ? void 0 : _a.id) || "");
    if (!songs || songs.length === 0) {
        message.channel.send("No songs in the queue to skip!");
        return;
    }
    audioPlayer.stop();
    message.channel.send("Song skipped!");
}
function showQueue(message) {
    var _a;
    const songs = queue.get(((_a = message.guild) === null || _a === void 0 ? void 0 : _a.id) || "");
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
client.login(config_1.default.token);
//# sourceMappingURL=bot.js.map