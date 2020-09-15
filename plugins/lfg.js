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
Object.defineProperty(exports, "__esModule", { value: true });
const knub_1 = require("knub");
const eris_1 = require("eris");
const util_1 = require("util");
const perf_hooks_1 = require("perf_hooks");
const utils_1 = require("../utils");
const blockedWords_1 = require("../blockedWords");
class LfgPlugin extends knub_1.Plugin {
    constructor() {
        super(...arguments);
        this.delay = [];
        this.current_pos = 0;
    }
    getDefaultOptions() {
        return {
            config: {
                lfg_command_ident: "!lfg",
                lfg_unshrink_ident: "!unshrink",
                lfg_voice_ident: "",
                lfg_text_ident: "lfg",
                lfg_message_compact: true,
                lfg_list_others: true,
                lfg_enable_emotes: false,
                lfg_emotes_chan_ident: "ranked",
                lfg_emotes_idents: ["examplename1", "examplename2"],
                lfg_emotes_names: ["<:test2:671473369891340293>", "<:testEmoji:608348601575407661>"],
                lfg_emotes_found_append: "\n**Ranks in this message: **",
                lfg_emotes_notfound_append: "\n**No ranks in this message**",
                lfg_enable_shrink: false,
                lfg_shrink_text_idents: ["duo", "1v1", "solo"],
                lfg_shrink_shrunk_amts: [2, 2, 1],
                lfg_shrink_normal_amt: 3,
                can_delay: false,
            },
            overrides: [
                {
                    level: ">=50",
                    config: {
                        can_delay: true,
                    },
                },
            ],
        };
    }
    async lfgRequest(msg) {
        let cfg = this.getConfig();
        let requestor = msg.member;
        let text = this.bot.getChannel(msg.channel.id);
        const start = perf_hooks_1.performance.now();
        // check if the text channel is a valid LFG text channel
        if (text.name.toLowerCase().includes(cfg.lfg_text_ident.toLowerCase())) {
            // why this weird german character: "ß"? Because [\s\S] didnt work
            let regex = new RegExp("^" + cfg.lfg_command_ident + "([^ß]|[ß])*$", "i");
            // check if the message is an actual LFG request
            if (!util_1.isNullOrUndefined(msg.content.match(regex))) {
                knub_1.logger.info(`${requestor.id}: ${requestor.username}#${requestor.discriminator} Started LFG request in ${text.name}`);
                // make sure the text does not include a word blocked in blocked.yml
                if (blockedWords_1.passesFilter(msg.cleanContent)) {
                    try {
                        let voice = this.bot.getChannel(requestor.voiceState.channelID);
                        regex = new RegExp("^([^ß]|[ß])*" + cfg.lfg_voice_ident + "([^ß]|[ß])*$", "i");
                        // make sure the users voice channel is a valid lfg voice channel
                        if (!util_1.isNullOrUndefined(voice.name.match(regex))) {
                            const voiceLimit = voice.userLimit > 0 ? voice.userLimit : 999;
                            if (voice.voiceMembers.size < voiceLimit) {
                                let userMessage = msg.content.substring(cfg.lfg_command_ident.length).trim();
                                // todo: change to config option
                                if (userMessage.length <= 275) {
                                    regex = new RegExp("`", "g");
                                    userMessage = userMessage.replace(regex, "");
                                    if (userMessage !== "") {
                                        if (cfg.lfg_message_compact) {
                                            userMessage = "`" + userMessage + "`";
                                        }
                                        else {
                                            userMessage = "```" + userMessage + "```";
                                        }
                                    }
                                    let emotes = false;
                                    if (cfg.lfg_enable_emotes) {
                                        emotes = text.name.includes(cfg.lfg_emotes_chan_ident);
                                    }
                                    try {
                                        await msg.channel.getMessage(msg.id);
                                    }
                                    catch (error) {
                                        knub_1.logger.info(`${requestor.id}: ${requestor.username}#${requestor.discriminator} stopped LFG request: Source message not found (${msg.id}). It was probably deleted. [${error}]`);
                                        return;
                                    }
                                    await this.shrinkChannel(voice, userMessage, cfg);
                                    let toPost = await this.handleMessageCreation(voice, requestor.user, userMessage, emotes);
                                    msg.channel.createMessage(toPost);
                                    knub_1.logger.info(`${requestor.id}: ${requestor.username}#${requestor.discriminator} Succesfully completed LFG request`);
                                    // add time taken for this command to the delays array so the delay command has up-to-date info
                                    this.updateDelayTime(start);
                                }
                                else {
                                    text.createMessage("Sorry, but that message is too long! " + requestor.mention);
                                    knub_1.logger.info(`${requestor.id}: ${requestor.username}#${requestor.discriminator} stopped LFG request: Message length = ${userMessage.length}`);
                                }
                            }
                            else {
                                text.createMessage("Sorry, but that voice channel is full! " + requestor.mention);
                                knub_1.logger.info(`${requestor.id}: ${requestor.username}#${requestor.discriminator} stopped LFG request: Channel full`);
                            }
                        }
                        else {
                            text.createMessage("Sorry, but you have to be in a lfg voice channel! " + requestor.mention);
                            knub_1.logger.info(`${requestor.id}: ${requestor.username}#${requestor.discriminator} stopped LFG request: Not in channel`);
                        }
                    }
                    catch (error) {
                        text.createMessage("Sorry, but you have to be in a lfg voice channel! " + requestor.mention);
                        // tslint:disable-next-line: max-line-length
                        knub_1.logger.info(`${requestor.id}: ${requestor.username}#${requestor.discriminator} stopped LFG request: Not in channel`);
                    }
                }
                else {
                    knub_1.logger.info(`${requestor.id}: ${requestor.username}#${requestor.discriminator} stopped LFG request: triggered word filter`);
                }
                try {
                    await msg.delete("LFG Request");
                }
                catch (error) {
                    knub_1.logger.error(`Failed to delete source message (${msg.id}). It was probably deleted already or we had a timeout`);
                    knub_1.logger.error(error);
                }
            }
            else {
                regex = new RegExp("^" + cfg.lfg_unshrink_ident + "([^ß]|[ß])*$", "i");
                if (cfg.lfg_enable_shrink && !util_1.isNullOrUndefined(msg.content.match(regex))) {
                    let voice = this.bot.getChannel(requestor.voiceState.channelID);
                    regex = new RegExp("^([^ß]|[ß])*" + cfg.lfg_voice_ident + "([^ß]|[ß])*$", "i");
                    if (!util_1.isNullOrUndefined(voice.name.match(regex))) {
                        if (voice.userLimit !== cfg.lfg_shrink_normal_amt) {
                            try {
                                voice.edit({ userLimit: cfg.lfg_shrink_normal_amt });
                                text.createMessage("I have returned the channel to its normal capacity! " + requestor.mention);
                            }
                            catch (error) {
                                knub_1.logger.error(`Ran into an error trying to unshrink channel (${voice.id}). Are we missing a permission?`);
                                knub_1.logger.error(error);
                            }
                        }
                        else {
                            text.createMessage("Sorry, but that voice channel is already at normal capacity! " + requestor.mention);
                        }
                    }
                    else {
                        text.createMessage("Sorry, but you have to be in a LFG voice channel to unshrink! " + requestor.mention);
                    }
                    try {
                        await msg.delete("Unshrink Request");
                    }
                    catch (error) {
                        knub_1.logger.error(`Failed to delete source message (${msg.id}). It was probably deleted already or we had a timeout`);
                        knub_1.logger.error(error);
                    }
                }
            }
        }
    }
    async resetChannelLimitLeave(member, vc) {
        let cfg = this.getConfig();
        if (cfg.lfg_enable_shrink &&
            vc.voiceMembers.size === 0 &&
            vc.userLimit !== cfg.lfg_shrink_normal_amt &&
            vc.name.toLowerCase().includes(cfg.lfg_voice_ident)) {
            vc.edit({ userLimit: cfg.lfg_shrink_normal_amt });
        }
    }
    async resetChannelLimitSwitch(member, newVC, oldVC) {
        let cfg = this.getConfig();
        if (cfg.lfg_enable_shrink &&
            oldVC.voiceMembers.size === 0 &&
            oldVC.userLimit !== cfg.lfg_shrink_normal_amt &&
            oldVC.name.toLowerCase().includes(cfg.lfg_voice_ident)) {
            oldVC.edit({ userLimit: cfg.lfg_shrink_normal_amt });
        }
    }
    async delayRequest(msg) {
        if (this.delay.length > 1) {
            const highest = Math.round(Math.max(...this.delay));
            const lowest = Math.round(Math.min(...this.delay));
            const mean = Math.round(this.delay.reduce((t, v) => t + v, 0) / this.delay.length);
            msg.channel.createMessage(utils_1.trimLines(`
      **LFG Delay:**
      Lowest: **${lowest}ms**
      Highest: **${highest}ms**
      Mean: **${mean}ms**
    `));
        }
        else {
            this.sendErrorMessage(msg.channel, "No LFG requests yet, cannot display delays!");
        }
        knub_1.logger.info(`${msg.author.id}: ${msg.author.username}#${msg.author.discriminator} Requested lfg delays`);
    }
    async handleMessageCreation(vc, user, message, ranked) {
        let cfg = this.getConfig();
        let channelInfo = null;
        let invite = await createInvite(vc);
        if (invite !== null) {
            if (cfg.lfg_message_compact) {
                channelInfo = user.mention;
                if (cfg.lfg_list_others) {
                    let otherUsers = vc.voiceMembers;
                    otherUsers.forEach(vcUser => {
                        if (vcUser.id !== user.id) {
                            let nick = vcUser.nick;
                            if (nick === null) {
                                nick = vcUser.username;
                            }
                            channelInfo += " + " + nick;
                        }
                    });
                }
                channelInfo += ` in ${vc.name}: ${message} ${knub_1.getInviteLink(invite)}`;
            }
            else {
                channelInfo = "Join " + user.mention;
                if (cfg.lfg_list_others) {
                    let otherUsers = vc.voiceMembers;
                    otherUsers.forEach(vcUser => {
                        if (vcUser.id !== user.id) {
                            let nick = vcUser.nick;
                            if (nick === null) {
                                nick = vcUser.username;
                            }
                            channelInfo += " + " + nick;
                        }
                    });
                }
                channelInfo += ` in ${vc.name} ${knub_1.getInviteLink(invite)}\n${message}`;
            }
        }
        if (ranked && cfg.lfg_enable_emotes) {
            let rankEmoji = "";
            let firstRank = true;
            const idents = cfg.lfg_emotes_idents;
            const emotes = cfg.lfg_emotes_names;
            for (let i = 0; i < idents.length; i++) {
                if (message.toLowerCase().includes(idents[i])) {
                    if (firstRank) {
                        firstRank = false;
                        rankEmoji = cfg.lfg_emotes_found_append;
                    }
                    rankEmoji += `${emotes[i]} `;
                }
            }
            if (firstRank) {
                rankEmoji = cfg.lfg_emotes_notfound_append;
            }
            channelInfo += rankEmoji;
        }
        return channelInfo;
    }
    async shrinkChannel(voice, userMessage, cfg) {
        if (cfg.lfg_enable_shrink) {
            let shrink;
            for (let i = 0; i < cfg.lfg_shrink_text_idents.length; i++) {
                if (userMessage.includes(cfg.lfg_shrink_text_idents[i])) {
                    shrink = cfg.lfg_shrink_shrunk_amts[i];
                    break;
                }
            }
            try {
                if (shrink) {
                    voice.edit({ userLimit: shrink });
                }
                else {
                    voice.edit({ userLimit: cfg.lfg_shrink_normal_amt });
                }
            }
            catch (error) {
                knub_1.logger.error(`Ran into an error trying to shrink/unshrink channel (${voice.id}). Are we missing a permission?`);
                knub_1.logger.error(error);
            }
        }
    }
    async updateDelayTime(start) {
        this.delay[this.current_pos] = perf_hooks_1.performance.now() - start;
        this.current_pos++;
        if (this.current_pos >= 5) {
            this.current_pos = 0;
        }
    }
}
LfgPlugin.pluginName = "lfg";
__decorate([
    knub_1.decorators.event("messageCreate", "guild", true),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [eris_1.Message]),
    __metadata("design:returntype", Promise)
], LfgPlugin.prototype, "lfgRequest", null);
__decorate([
    knub_1.decorators.event("voiceChannelLeave", "guild", true),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [eris_1.Member, eris_1.VoiceChannel]),
    __metadata("design:returntype", Promise)
], LfgPlugin.prototype, "resetChannelLimitLeave", null);
__decorate([
    knub_1.decorators.event("voiceChannelSwitch", "guild", true),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [eris_1.Member, eris_1.VoiceChannel, eris_1.VoiceChannel]),
    __metadata("design:returntype", Promise)
], LfgPlugin.prototype, "resetChannelLimitSwitch", null);
__decorate([
    knub_1.decorators.command("delay"),
    knub_1.decorators.permission("can_delay"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [eris_1.Message]),
    __metadata("design:returntype", Promise)
], LfgPlugin.prototype, "delayRequest", null);
exports.LfgPlugin = LfgPlugin;
async function createInvite(vc) {
    let existingInvites = await vc.getInvites();
    if (existingInvites.length !== 0) {
        return existingInvites[0];
    }
    else {
        return vc.createInvite(undefined);
    }
}
exports.createInvite = createInvite;
