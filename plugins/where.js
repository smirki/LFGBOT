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
const humanize_duration_1 = __importDefault(require("humanize-duration"));
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const lfg_1 = require("./lfg");
const utils_1 = require("../utils");
const utility_1 = require("./utility");
class Notification {
    constructor(modId, subjectId, channelId, endTime, persist, activeFollow) {
        this.modId = modId;
        this.subjectId = subjectId;
        this.channelId = channelId;
        this.endTime = endTime;
        this.persist = persist;
        this.activeFollow = activeFollow;
    }
}
var ChannelType;
(function (ChannelType) {
    ChannelType[ChannelType["TextChannel"] = 0] = "TextChannel";
    ChannelType[ChannelType["VoiceChannel"] = 2] = "VoiceChannel";
    ChannelType[ChannelType["Category"] = 4] = "Category";
})(ChannelType || (ChannelType = {}));
class WherePlugin extends knub_1.Plugin {
    constructor() {
        super(...arguments);
        this.activeNotifications = [];
        this.activeVCNotifications = [];
    }
    getDefaultOptions() {
        return {
            config: {
                where_timeout: 600000,
                update_notification: true,
                can_where: false,
                can_notify: false,
                can_follow: false,
                can_usage: false,
            },
            overrides: [
                {
                    level: ">=50",
                    config: {
                        can_where: true,
                        can_notify: true,
                        can_follow: true,
                        can_usage: true,
                    },
                },
            ],
        };
    }
    async whereRequest(msg, args) {
        let member;
        if (!(args.user instanceof utils_1.UnknownUser)) {
            // member = await resolveMember(this.bot, this.guild, args.user.id);
            try {
                member = await this.bot.getRESTGuildMember(this.guildId, args.user.id);
            }
            catch (err) {
                console.error(err);
            }
        }
        else {
            this.sendErrorMessage(msg.channel, "Unknown user/member! Is the ID correct?");
            return;
        }
        let newVer = "";
        if (utility_1.UtilityPlugin.NEW_AVAILABLE && this.getConfig().update_notification) {
            newVer = `⚙️ New bot version available! Version **${utility_1.UtilityPlugin.NEWEST_VERSION}**\n`;
        }
        sendWhere(this.guild, member, msg.channel, newVer + msg.author.mention + " ");
        knub_1.logger.info(`${msg.author.id}: ${msg.author.username}#${msg.author.discriminator} Requested where for ${member.id}`);
    }
    async notifyRequest(msg, args) {
        let member;
        if (!(args.user instanceof utils_1.UnknownUser)) {
            member = await utils_1.resolveMember(this.bot, this.guild, args.user.id);
        }
        else {
            this.sendErrorMessage(msg.channel, "Unknown user/member! Is the ID correct?");
            return;
        }
        const cfg = this.getConfig();
        let timeout = args.time != null ? args.time : cfg.where_timeout;
        const endTime = moment_timezone_1.default().add(timeout, "ms");
        this.activeNotifications.push(new Notification(msg.author.id, member.id, msg.channel.id, endTime, false, false));
        msg.channel.createMessage(`If <@!${member.id}> joins or switches VC in the next ${humanize_duration_1.default(timeout)} i will notify you`);
        knub_1.logger.info(`${msg.author.id}: ${msg.author.username}#${msg.author.discriminator} Requested notify for ${member.id}`);
    }
    async vcNotifyRequest(msg, args) {
        const cfg = this.getConfig();
        const timeout = args.time != null ? args.time : cfg.where_timeout;
        const channel = this.bot.getChannel(args.channelId);
        if (channel == null) {
            this.sendErrorMessage(msg.channel, "Couldnt find channel");
            return;
        }
        const endTime = moment_timezone_1.default().add(timeout, "ms");
        this.activeVCNotifications.push(new Notification(msg.author.id, args.channelId, msg.channel.id, endTime, false, false));
        msg.channel.createMessage(`I will notify you of all changes in \`${channel.name}\` for the next ${humanize_duration_1.default(timeout)}`);
        knub_1.logger.info(`${msg.author.id}: ${msg.author.username}#${msg.author.discriminator} Requested notify for vc ${args.channelId}`);
    }
    async followRequest(msg, args) {
        const cfg = this.getConfig();
        const timeout = args.time != null ? args.time : cfg.where_timeout;
        const active = args.active != null ? args.active : false;
        let member;
        if (!(args.user instanceof utils_1.UnknownUser)) {
            member = await utils_1.resolveMember(this.bot, this.guild, args.user.id);
        }
        else {
            this.sendErrorMessage(msg.channel, "Unknown user/member! Is the ID correct?");
            return;
        }
        const endTime = moment_timezone_1.default().add(timeout, "ms");
        this.activeNotifications.push(new Notification(msg.author.id, member.id, msg.channel.id, endTime, true, active));
        if (!active) {
            msg.channel.createMessage(`I will let you know each time <@!${member.id}> switches channel in the next ${humanize_duration_1.default(timeout)}`);
        }
        else {
            msg.channel.createMessage(`I will let you know each time <@!${member.id}> switches channel in the next ${humanize_duration_1.default(timeout)}.\nI will also move you to the users channel, please join a voice channel now so that i can move you!`);
        }
        knub_1.logger.info(`${msg.author.id}: ${msg.author.username}#${msg.author.discriminator} Requested follow for ${member.id} - Active Follow: ${active}`);
    }
    async followStopRequest(msg, args) {
        this.removeNotifyforUserId(args.user.id);
        msg.channel.createMessage(utils_1.successMessage(`Deleted all your follow and notify requests for <@!${args.user.id}>!`));
        knub_1.logger.info(`${msg.author.id}: ${msg.author.username}#${msg.author.discriminator} Requested notify/follow deletion for ${args.user.id}`);
    }
    async voiceUsageRequest(msg) {
        const channels = this.guild.channels;
        const channelMap = new Map();
        const categories = [];
        channels.forEach(ch => {
            if (ChannelType[ch.type] === "VoiceChannel") {
                channelMap.set(ch, ch.parentID);
            }
            else if (ChannelType[ch.type] === "Category") {
                categories.push(ch);
            }
        });
        const col = new Intl.Collator(undefined, { numeric: true, sensitivity: `base` });
        categories.sort((a, b) => col.compare(a.name, b.name));
        let reply = "Channel usage:";
        for (const cat of categories) {
            const catChannels = [...channelMap.entries()]
                .filter(({ 1: id }) => id === cat.id)
                .map(([k]) => k);
            if (catChannels.length === 0) {
                continue;
            }
            let freeAmt = 0;
            catChannels.forEach(ch => {
                const vc = this.bot.getChannel(ch.id);
                if (vc.voiceMembers.size === 0) {
                    freeAmt++;
                }
            });
            reply += `\n__${cat.name}__: **${freeAmt}** of **${catChannels.length}** free`;
        }
        msg.channel.createMessage(reply);
        knub_1.logger.info(`${msg.author.id}: ${msg.author.username}#${msg.author.discriminator} Requested current VC usage`);
    }
    async userJoinedVC(member, newChannel) {
        let obsolete = false;
        this.activeNotifications.forEach(async (notif) => {
            if (notif.subjectId === member.id) {
                if (notif.endTime >= Date.now()) {
                    const channel = this.bot.getChannel(notif.channelId);
                    sendWhere(this.guild, member, channel, "<@!" + notif.modId + "> a notification requested by you has triggered:\n");
                    if (notif.activeFollow) {
                        const modMember = await this.bot.getRESTGuildMember(this.guildId, notif.modId);
                        if (modMember.voiceState.channelID != null) {
                            try {
                                await modMember.edit({
                                    channelID: newChannel.id,
                                });
                            }
                            catch (e) {
                                channel.createMessage(utils_1.errorMessage("Failed to move you. Are you in a voice channel?"));
                                return;
                            }
                        }
                    }
                    if (!notif.persist) {
                        obsolete = true;
                    }
                }
                else {
                    obsolete = true;
                }
            }
        });
        if (obsolete) {
            this.removeNotifyforUserId(member.id);
        }
        obsolete = false;
        this.activeVCNotifications.forEach(notif => {
            if (notif.subjectId === newChannel.id) {
                if (Date.now() >= notif.endTime) {
                    obsolete = true;
                }
                else {
                    const text = this.bot.getChannel(notif.channelId);
                    const voice = this.bot.getChannel(notif.subjectId);
                    text.createMessage(`🔵 <@!${notif.modId}> The user <@!${member.id}> joined the channel \`${voice.name}\``);
                }
            }
        });
        if (obsolete) {
            this.removeVCNotifyforChannelId(member.id);
        }
    }
    async userSwitchedVC(member, newChannel, oldChannel) {
        let obsolete = false;
        const newVoice = this.bot.getChannel(newChannel.id);
        const oldVoice = this.bot.getChannel(oldChannel.id);
        this.activeNotifications.forEach(async (notif) => {
            if (notif.subjectId === member.id) {
                if (notif.endTime >= Date.now()) {
                    const channel = this.bot.getChannel(notif.channelId);
                    sendWhere(this.guild, member, channel, "<@!" + notif.modId + "> a notification requested by you has triggered:\n");
                    if (notif.activeFollow) {
                        const modMember = await this.bot.getRESTGuildMember(this.guildId, notif.modId);
                        if (modMember.voiceState.channelID != null) {
                            try {
                                await modMember.edit({
                                    channelID: newChannel.id,
                                });
                            }
                            catch (e) {
                                channel.createMessage(utils_1.errorMessage("Failed to move you. Are you in a voice channel?"));
                                return;
                            }
                        }
                    }
                    if (!notif.persist) {
                        obsolete = true;
                    }
                }
                else {
                    obsolete = true;
                }
            }
        });
        if (obsolete) {
            this.removeNotifyforUserId(member.id);
        }
        obsolete = false;
        this.activeVCNotifications.forEach(notif => {
            if (notif.subjectId === newChannel.id) {
                if (Date.now() >= notif.endTime) {
                    obsolete = true;
                }
                else {
                    const text = this.bot.getChannel(notif.channelId);
                    text.createMessage(`🔵 <@!${notif.modId}> The user <@!${member.id}> switched to the channel \`${newVoice.name}\` from \`${oldVoice.name}\``);
                }
            }
        });
        this.activeVCNotifications.forEach(notif => {
            if (notif.subjectId === oldChannel.id) {
                if (Date.now() >= notif.endTime) {
                    obsolete = true;
                }
                else {
                    const text = this.bot.getChannel(notif.channelId);
                    text.createMessage(`🔴 <@!${notif.modId}> The user <@!${member.id}> switched out of the channel \`${oldVoice.name}\` and joined \`${newVoice.name}\``);
                }
            }
        });
        if (obsolete) {
            this.removeVCNotifyforChannelId(member.id);
        }
    }
    async userLeftVC(member, channel) {
        let obsolete = false;
        this.activeVCNotifications.forEach(notif => {
            if (notif.subjectId === channel.id) {
                if (Date.now() >= notif.endTime) {
                    obsolete = true;
                }
                else {
                    const text = this.bot.getChannel(notif.channelId);
                    const voice = this.bot.getChannel(notif.subjectId);
                    text.createMessage(`🔴 <@!${notif.modId}> The user <@!${member.id}> disconnected out of the channel \`${voice.name}\``);
                }
            }
        });
        if (obsolete) {
            this.removeVCNotifyforChannelId(member.id);
        }
        this.activeNotifications.forEach(async (notif) => {
            if (notif.subjectId === member.id) {
                if (notif.endTime >= Date.now()) {
                    if (notif.persist) {
                        const tchannel = this.bot.getChannel(notif.channelId);
                        const voice = this.bot.getChannel(channel.id);
                        tchannel.createMessage(`<@!${notif.modId}> The user <@!${member.id}> disconnected out of the channel \`${voice.name}\``);
                    }
                }
                else {
                    obsolete = true;
                }
            }
        });
        if (obsolete) {
            this.removeNotifyforUserId(member.id);
        }
    }
    async onGuildBanAdd(_, user) {
        this.removeNotifyforUserId(user.id);
    }
    async removeNotifyforUserId(userId) {
        let newNotifies = [];
        for (let index = 0; index < this.activeNotifications.length; index++) {
            const notif = this.activeNotifications[index];
            if (notif.subjectId !== userId) {
                newNotifies.push(notif);
            }
        }
        this.activeNotifications = newNotifies;
    }
    async removeVCNotifyforChannelId(userId) {
        let newNotifies = [];
        for (let index = 0; index < this.activeVCNotifications.length; index++) {
            const notif = this.activeVCNotifications[index];
            if (notif.subjectId !== userId) {
                newNotifies.push(notif);
            }
        }
        this.activeVCNotifications = newNotifies;
    }
}
WherePlugin.pluginName = "where";
__decorate([
    knub_1.decorators.command("where", "<user:resolvedUserLoose>", {
        aliases: ["w"],
    }),
    knub_1.decorators.permission("can_where"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [eris_1.Message, Object]),
    __metadata("design:returntype", Promise)
], WherePlugin.prototype, "whereRequest", null);
__decorate([
    knub_1.decorators.command("notify", "<user:resolvedUserLoose> [time:delay]", {
        aliases: ["n"],
    }),
    knub_1.decorators.permission("can_notify"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [eris_1.Message, Object]),
    __metadata("design:returntype", Promise)
], WherePlugin.prototype, "notifyRequest", null);
__decorate([
    knub_1.decorators.command("vcnotify", "<channelId:string> [time:delay]", {
        aliases: ["v", "vc", "vcn"],
    }),
    knub_1.decorators.permission("can_notify"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [eris_1.Message, Object]),
    __metadata("design:returntype", Promise)
], WherePlugin.prototype, "vcNotifyRequest", null);
__decorate([
    knub_1.decorators.command("follow", "<user:resolvedUserLoose> [time:delay]", {
        aliases: ["f"],
        options: [
            {
                name: "active",
                isSwitch: true,
                shortcut: "a",
            },
        ],
    }),
    knub_1.decorators.permission("can_follow"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [eris_1.Message, Object]),
    __metadata("design:returntype", Promise)
], WherePlugin.prototype, "followRequest", null);
__decorate([
    knub_1.decorators.command("follow stop", "<user:resolvedUserLoose>", {
        aliases: ["fs", "fd", "ns", "nd"],
    }),
    knub_1.decorators.permission("can_follow"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [eris_1.Message, Object]),
    __metadata("design:returntype", Promise)
], WherePlugin.prototype, "followStopRequest", null);
__decorate([
    knub_1.decorators.cooldown(30 * 1000),
    knub_1.decorators.command("voice_usage", "", {
        aliases: ["voiceusage", "vu"],
    }),
    knub_1.decorators.permission("can_usage"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [eris_1.Message]),
    __metadata("design:returntype", Promise)
], WherePlugin.prototype, "voiceUsageRequest", null);
__decorate([
    knub_1.decorators.event("voiceChannelJoin"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [eris_1.Member, eris_1.Channel]),
    __metadata("design:returntype", Promise)
], WherePlugin.prototype, "userJoinedVC", null);
__decorate([
    knub_1.decorators.event("voiceChannelSwitch"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [eris_1.Member, eris_1.Channel, eris_1.Channel]),
    __metadata("design:returntype", Promise)
], WherePlugin.prototype, "userSwitchedVC", null);
__decorate([
    knub_1.decorators.event("voiceChannelLeave"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [eris_1.Member, eris_1.Channel]),
    __metadata("design:returntype", Promise)
], WherePlugin.prototype, "userLeftVC", null);
__decorate([
    knub_1.decorators.event("guildBanAdd"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, eris_1.User]),
    __metadata("design:returntype", Promise)
], WherePlugin.prototype, "onGuildBanAdd", null);
exports.WherePlugin = WherePlugin;
async function sendWhere(guild, member, channel, prepend) {
    let voice = null;
    try {
        voice = guild.channels.get(member.voiceState.channelID);
    }
    catch (e) {
        channel.createMessage(utils_1.errorMessage("Could not retrieve information on that user!\nAre they on the server?"));
        return;
    }
    if (voice == null) {
        channel.createMessage(prepend + "That user is not in a channel");
    }
    else {
        let invite = null;
        try {
            invite = await lfg_1.createInvite(voice);
        }
        catch (e) {
            channel.createMessage(utils_1.errorMessage(`Could not create an invite to that channel!\nReason: \`${e}\``));
            knub_1.logger.info(`${e}\nGuild: ${guild.name}\nMember: ${member.id}\nPrepend: ${prepend}`);
            return;
        }
        channel.createMessage(`${prepend}<@!${member.id}> is in the following channel: \`${voice.name}\` ${knub_1.getInviteLink(invite)}`);
    }
}
exports.sendWhere = sendWhere;
