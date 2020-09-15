"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const knub_1 = require("knub");
const delayStringMultipliers = {
    w: 1000 * 60 * 60 * 24 * 7,
    d: 1000 * 60 * 60 * 24,
    h: 1000 * 60 * 60,
    m: 1000 * 60,
    s: 1000,
};
function successMessage(str) {
    return `👍 ${str}`;
}
exports.successMessage = successMessage;
function errorMessage(str) {
    return `⚠ ${str}`;
}
exports.errorMessage = errorMessage;
function trimLines(str) {
    return str
        .trim()
        .split("\n")
        .map(l => l.trim())
        .join("\n")
        .trim();
}
exports.trimLines = trimLines;
let start = 0;
function startUptimeCount() {
    start = Date.now();
}
exports.startUptimeCount = startUptimeCount;
function getUptime() {
    return Date.now() - start;
}
exports.getUptime = getUptime;
// if you dont like Dragorys Code, dont read this :Eyes:
class UnknownUser {
    constructor(props = {}) {
        this.id = null;
        this.username = "Unknown";
        this.discriminator = "0000";
        // tslint:disable-next-line: forin
        for (const key in props) {
            this[key] = props[key];
        }
    }
}
exports.UnknownUser = UnknownUser;
const unknownUsers = new Set();
const unknownMembers = new Set();
function disableCodeBlocks(content) {
    return content.replace(/`/g, "`\u200b");
}
exports.disableCodeBlocks = disableCodeBlocks;
async function resolveMember(bot, guild, value) {
    // start by resolving the user
    const user = await resolveUser(bot, value);
    if (!user || user instanceof UnknownUser) {
        return null;
    }
    // see if we have the member cached...
    let member = guild.members.get(user.id);
    // we only fetch the member from the API if we haven't tried it before:
    // - If the member was found, the bot has them in the guild's member cache
    // - If the member was not found, they'll be in unknownMembers
    const unknownKey = `${guild.id}-${user.id}`;
    if (!unknownMembers.has(unknownKey)) {
        // if not, fetch it from the API
        if (!member) {
            try {
                knub_1.logger.debug(`Fetching unknown member (${user.id} in ${guild.name} (${guild.id})) from the API`);
                member = await bot.getRESTGuildMember(guild.id, user.id);
                member.id = user.id;
                member.guild = guild;
            }
            catch (e) { } // tslint:disable-line
        }
        if (!member) {
            unknownMembers.add(unknownKey);
        }
    }
    return member;
}
exports.resolveMember = resolveMember;
async function resolveUser(bot, value) {
    if (value == null || typeof value !== "string") {
        return new UnknownUser();
    }
    let userId;
    // a user mention?
    const mentionMatch = value.match(/^<@!?(\d+)>$/);
    if (mentionMatch) {
        userId = mentionMatch[1];
    }
    // a non-mention, full username?
    if (!userId) {
        const usernameMatch = value.match(/^@?([^#]+)#(\d{4})$/);
        if (usernameMatch) {
            const user = bot.users.find(u => u.username === usernameMatch[1] && u.discriminator === usernameMatch[2]);
            if (user) {
                userId = user.id;
            }
        }
    }
    // just a user ID?
    if (!userId) {
        const idMatch = value.match(/^\d+$/);
        if (!idMatch) {
            return null;
        }
        userId = value;
    }
    const cachedUser = bot.users.find(u => u.id === userId);
    if (cachedUser) {
        return cachedUser;
    }
    // we only fetch the user from the API if we haven't tried it before:
    // - If the user was found, the bot has them in its cache
    // - If the user was not found, they'll be in unknownUsers
    if (!unknownUsers.has(userId)) {
        try {
            const freshUser = await bot.getRESTUser(userId);
            bot.users.add(freshUser, bot);
            return freshUser;
        }
        catch (e) { } // tslint:disable-line
        unknownUsers.add(userId);
    }
    return new UnknownUser({ id: userId });
}
exports.resolveUser = resolveUser;
function convertDelayStringToMS(str, defaultUnit = "m") {
    const regex = /^([0-9]+)\s*([wdhms])?[a-z]*\s*/;
    let match;
    let ms = 0;
    str = str.trim();
    // tslint:disable-next-line
    while (str !== "" && (match = str.match(regex)) !== null) {
        ms += match[1] * ((match[2] && delayStringMultipliers[match[2]]) || delayStringMultipliers[defaultUnit]);
        str = str.slice(match[0].length);
    }
    // invalid delay string
    if (str !== "") {
        return null;
    }
    return ms;
}
exports.convertDelayStringToMS = convertDelayStringToMS;
