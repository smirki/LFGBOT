"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
const eris_1 = require("eris");
const knub_command_manager_1 = require("knub-command-manager");
exports.customArgumentTypes = {
    delay(value) {
        const result = utils_1.convertDelayStringToMS(value);
        if (result == null) {
            throw new knub_command_manager_1.TypeConversionError(`Could not convert ${value} to a delay`);
        }
        return result;
    },
    async resolvedUser(value, context) {
        const result = await utils_1.resolveUser(context.bot, value);
        if (result == null || result instanceof utils_1.UnknownUser) {
            throw new knub_command_manager_1.TypeConversionError(`User \`${utils_1.disableCodeBlocks(value)}\` was not found`);
        }
        return result;
    },
    async resolvedUserLoose(value, context) {
        const result = await utils_1.resolveUser(context.bot, value);
        if (result == null) {
            throw new knub_command_manager_1.TypeConversionError(`Invalid user: \`${utils_1.disableCodeBlocks(value)}\``);
        }
        return result;
    },
    async resolvedMember(value, context) {
        if (!(context.message.channel instanceof eris_1.GuildChannel))
            return null;
        const result = await utils_1.resolveMember(context.bot, context.message.channel.guild, value);
        if (result == null) {
            throw new knub_command_manager_1.TypeConversionError(`Member \`${utils_1.disableCodeBlocks(value)}\` was not found or they have left the server`);
        }
        return result;
    },
};
