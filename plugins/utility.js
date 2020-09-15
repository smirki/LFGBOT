"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const knub_1 = require("knub");
const eris_1 = require("eris");
const utils_1 = require("knub/dist/utils");
const utils_2 = require("../utils");
const perf_hooks_1 = require("perf_hooks");
const humanize_duration_1 = __importDefault(require("humanize-duration"));
const fs_1 = __importDefault(require("fs"));
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const https_1 = __importDefault(require("https"));
const UPDATE_LOOP_TIME = 60 * 60 * 1000;
class UtilityPlugin extends knub_1.Plugin {
    getDefaultOptions() {
        return {
            config: {
                can_ping: false,
                can_level: false,
                can_uptime: false,
                can_version: false,
                dm_response: "Sorry, but you can only control this bot through commands within the server!",
            },
            overrides: [
                {
                    level: ">=1",
                    config: {
                        can_level: true,
                    },
                },
                {
                    level: ">=50",
                    config: {
                        can_ping: true,
                        can_uptime: true,
                        can_version: true,
                    },
                },
            ],
        };
    }
    onLoad() {
        this.updateLoop();
    }
    async updateLoop() {
        https_1.default.get({
            hostname: "api.github.com",
            path: `/repos/DarkView/JS-MRVNLFG/tags`,
            headers: {
                "User-Agent": `MRVN Bot version ${UtilityPlugin.VERSION} (https://github.com/DarkView/JS-MRVNLFG)`,
            },
        }, async (res) => {
            if (res.statusCode !== 200) {
                knub_1.logger.warn(`[WARN] Got status code ${res.statusCode} when checking for available updates`);
                return;
            }
            let data = "";
            res.on("data", chunk => (data += chunk));
            res.on("end", async () => {
                const parsed = JSON.parse(data);
                if (!Array.isArray(parsed) || parsed.length === 0) {
                    return;
                }
                UtilityPlugin.NEWEST_VERSION = parsed[0].name;
                UtilityPlugin.NEW_AVAILABLE = await this.compareVersions(UtilityPlugin.NEWEST_VERSION, UtilityPlugin.VERSION);
                knub_1.logger.info(`Newest bot version: ${UtilityPlugin.NEWEST_VERSION} | Current bot version: ${UtilityPlugin.VERSION} | New available: ${UtilityPlugin.NEW_AVAILABLE}`);
            });
        });
        this.updateTimeout = setTimeout(() => this.updateLoop(), UPDATE_LOOP_TIME);
    }
    async compareVersions(newer, older) {
        const newerParts = newer.split(".");
        const olderParts = older.split(".");
        for (let i = 0; i < Math.max(newerParts.length, olderParts.length); i++) {
            let newerPart = parseInt((newerParts[i] || "0").match(/\d+/)[0] || "0", 10);
            let olderPart = parseInt((olderParts[i] || "0").match(/\d+/)[0] || "0", 10);
            if (newerPart > olderPart) {
                return true;
            }
            if (newerPart < olderPart) {
                return false;
            }
        }
        return false;
    }
    async pingRequest(msg) {
        const times = [];
        const messages = [];
        let msgToMsgDelay = null;
        for (let i = 0; i < 4; i++) {
            const start = perf_hooks_1.performance.now();
            const message = await msg.channel.createMessage(`Calculating ping... ${i + 1}`);
            times.push(perf_hooks_1.performance.now() - start);
            messages.push(message);
            if (msgToMsgDelay === null) {
                msgToMsgDelay = message.timestamp - msg.timestamp;
            }
        }
        const highest = Math.round(Math.max(...times));
        const lowest = Math.round(Math.min(...times));
        const mean = Math.round(times.reduce((t, v) => t + v, 0) / times.length);
        msg.channel.createMessage(utils_2.trimLines(`
      **Ping:**
      Lowest: **${lowest}ms**
      Highest: **${highest}ms**
      Mean: **${mean}ms**
      Time between ping command and first reply: **${msgToMsgDelay}ms**
    `));
        this.bot
            .deleteMessages(messages[0].channel.id, messages.map(m => m.id))
            .catch(utils_1.noop);
        knub_1.logger.info(`${msg.author.id}: ${msg.author.username}#${msg.author.discriminator} Requested bot ping`);
    }
    async levelRequest(msg, args) {
        const member = args.member || msg.member;
        const level = this.getMemberLevel(member);
        msg.channel.createMessage(`The permission level of ${member.username}#${member.discriminator} is **${level}**`);
        knub_1.logger.info(`${msg.author.id}: ${msg.author.username}#${msg.author.discriminator} Requested ${member.id}'s user level (${level})`);
    }
    async uptimeRequest(msg) {
        msg.channel.createMessage(`**Current Uptime:** ${humanize_duration_1.default(utils_2.getUptime(), {
            largest: 2,
            round: true,
        })}`);
        knub_1.logger.info(`${msg.author.id}: ${msg.author.username}#${msg.author.discriminator} Requested bot uptime`);
    }
    async versionRequest(msg) {
        let reply;
        if (UtilityPlugin.NEW_AVAILABLE) {
            reply = `New bot version available!\nCurrent bot version: **${UtilityPlugin.VERSION}**\nLatest version: **${UtilityPlugin.NEWEST_VERSION}**`;
        }
        else {
            reply = `You have the newest bot version! Version: **${UtilityPlugin.VERSION}**`;
        }
        msg.channel.createMessage(reply);
    }
    async dmReceived(msg) {
        knub_1.logger.log(`${msg.author.id} said the following in DMs: ${msg.cleanContent}`);
        const cfg = this.getConfig();
        msg.channel.createMessage(cfg.dm_response);
        // tslint:disable-next-line: max-line-length
        fs_1.default.appendFile("DMMessages.txt", `\n${moment_timezone_1.default().toISOString()} | ${msg.author.id} | ${msg.author.username}#${msg.author.discriminator}: ${msg.cleanContent}`, err => {
            if (err) {
                knub_1.logger.info(err.name + "\n" + err.message);
            }
        });
    }
}
UtilityPlugin.pluginName = "utility";
UtilityPlugin.VERSION = "1.0.4";
UtilityPlugin.NEWEST_VERSION = UtilityPlugin.VERSION;
UtilityPlugin.NEW_AVAILABLE = false;
__decorate([
    knub_1.decorators.cooldown(10 * 1000),
    knub_1.decorators.command("ping"),
    knub_1.decorators.permission("can_ping"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [eris_1.Message]),
    __metadata("design:returntype", Promise)
], UtilityPlugin.prototype, "pingRequest", null);
__decorate([
    knub_1.decorators.command("level", "[member:resolvedMember]"),
    knub_1.decorators.permission("can_level"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [eris_1.Message, Object]),
    __metadata("design:returntype", Promise)
], UtilityPlugin.prototype, "levelRequest", null);
__decorate([
    knub_1.decorators.cooldown(5 * 1000),
    knub_1.decorators.command("uptime"),
    knub_1.decorators.permission("can_uptime"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [eris_1.Message]),
    __metadata("design:returntype", Promise)
], UtilityPlugin.prototype, "uptimeRequest", null);
__decorate([
    knub_1.decorators.cooldown(5 * 1000),
    knub_1.decorators.command("version"),
    knub_1.decorators.permission("can_version"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [eris_1.Message]),
    __metadata("design:returntype", Promise)
], UtilityPlugin.prototype, "versionRequest", null);
__decorate([
    knub_1.decorators.event("messageCreate", "dm", true),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [eris_1.Message]),
    __metadata("design:returntype", Promise)
], UtilityPlugin.prototype, "dmReceived", null);
exports.UtilityPlugin = UtilityPlugin;
