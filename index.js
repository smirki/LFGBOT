"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const js_yaml_1 = __importDefault(require("js-yaml"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const fsp = fs_1.default.promises;
const eris_1 = require("eris");
const knub_1 = require("knub");
const lfg_1 = require("./plugins/lfg");
const where_1 = require("./plugins/where");
const utility_1 = require("./plugins/utility");
const utils_1 = require("./utils");
const customArgumentTypes_1 = require("./customArgumentTypes");
const blockedWords_1 = require("./blockedWords");
require("dotenv").config({ path: path_1.default.resolve(process.cwd(), "bot.env") });
const botClient = new eris_1.Client(`Bot ${process.env.TOKEN}`, {
    restMode: true,
});
const moment_timezone_1 = __importDefault(require("moment-timezone"));
// set TZ to UTC
moment_timezone_1.default.tz.setDefault("Etc/UTC");
const bot = new knub_1.Knub(botClient, {
    plugins: [utility_1.UtilityPlugin, lfg_1.LfgPlugin, where_1.WherePlugin],
    globalPlugins: [],
    options: {
        sendSuccessMessageFn(channel, body) {
            channel.createMessage(utils_1.successMessage(body));
        },
        sendErrorMessageFn(channel, body) {
            channel.createMessage(utils_1.errorMessage(body));
        },
        async getConfig(id) {
            const configFile = id ? `${id}.yml` : "global.yml";
            const configPath = path_1.default.join("config", configFile);
            try {
                await fsp.access(configPath);
            }
            catch (e) {
                return {};
            }
            const yamlString = await fsp.readFile(configPath, {
                encoding: "utf8",
            });
            return js_yaml_1.default.safeLoad(yamlString);
        },
        logFn: (level, msg) => {
            // tslint:disable-next-line
            if (level === "debug")
                return;
            console.log(`[${level.toUpperCase()}] [${moment_timezone_1.default().toISOString()}] ${msg}`);
        },
        customArgumentTypes: customArgumentTypes_1.customArgumentTypes,
    },
});
knub_1.logger.info("Starting the bot");
bot.run();
blockedWords_1.loadRegex();
utils_1.startUptimeCount();
