"use strict";
const Discord = require("discord.js");
const fs = require("fs");
const config = require("../../config.json");
const time = require("../utility/time.js");
const emojiRegex = require("emoji-regex");


/*
rosters = {
    guildId: {
        channelId: {
            messageId:"msgId",
            tank:1,
            heal:2,
            mdps:9,
            rdps:0,
            signups: {
                1234123412341234: ["Tank", "RDps"]
            },
            prevSignups: {
                123412341234: "Tank",
                567856785678: "RDps"
            }
            log: {
                channelId:"channelId",
                messageId:"messageId",
                messageContent:"blah"
            },
            announceChannelId:"channelId",
            isScheduled:true,
            scheduledTime:whatever,
            mentionRoleId:roleId,
            templateRoleId:roleId,
            tallyMessageId:messageId,
            trial: "vss"
        }
    }
}
*/
let rosters = require("../../storage/rosters.json");

const roleEmojis = [
    "Tank",
    "Healer",
    "MDps",
    "RDps",
    "BackupTank",
    "BackupHealer",
    "BackupMDps",
    "BackupRDps"
];

const emoteIds = [
    "665436372047233064",
    "665436377110020115",
    "665436372831567873",
    "665436375985684511",
    "665436377726320650",
    "665436375591682088",
    "665436373657845760",
    "665436374622535696"
];

const roleToEmoteIds = {
    "Tank": "665436372047233064",
    "Healer": "665436377110020115",
    "MDps": "665436372831567873",
    "RDps": "665436375985684511",
    "BackupTank": "665436377726320650",
    "BackupHealer": "665436375591682088",
    "BackupMDps": "665436373657845760",
    "BackupRDps": "665436374622535696"
};

const guildWhitelist = [
    "390828630537797635" // Umar-khan (Ahyang)
];

const usageWhitelist = {
    // userId : [guildId, guildId]
    "500834044762783747": ["457067601059774466"], // Crimson AttN

    "379768262487179275": ["498973627102789632"], // Unofficial Coup
    "249729135826567178": ["498973627102789632"], // Luck Coup
    "206282926675984384": ["498973627102789632"], // Courier Coup
    "216279164246818835": ["498973627102789632"], // Deltrox Coup

    "189662137327550464": ["649830704577904650"], // Hbrendan Aedric Light
    "478342609975246880": ["649830704577904650"], // gottace Aedric Light
    "177728686571651072": ["649830704577904650", "457067601059774466"], // Pigeon Aedric Light, AttN

    "130508467004768257": ["548657326018527245"], // Ocean Seas of Oblivion
    "304485721991938048": ["548657326018527245"], // broftw Seas of Oblivion
    "196442080787038208": ["548657326018527245"], // Larisian Seas of Oblivion
    "335733144579997696": ["548657326018527245"], // Volno Seas of Oblivion
    "297957778759221249": ["548657326018527245"], // Canine Seas of Oblivion
    "294642778808385557": ["548657326018527245"], // Boundingfeather Seas of Oblivion
    "161169512593489922": ["548657326018527245"], // Ziggie Seas of Oblivion
    "138894265387450368": ["548657326018527245"], // Dodonnas Seas of Oblivion
    "545287556976082955": ["548657326018527245"], // snarky Seas of Oblivion
    "618199283295846410": ["548657326018527245"], // Clawless Seas of Oblivion

    "111111111111111111": [] // DUMMY
};

const attn = {
    "id": "457067601059774466",
    "nonGuildie": ["476550604685312001", "514190432956317732"],
    "aedtCategory": "672539140650434562",
    "needsParse": "681597273599377481"
};

// These data structures are such a mess but I'm rewriting it anyway
const noPing = {
    "538677062290898945": "646523784592883732",
    "538137432176984065": "646524107009163264",
    "641400914124734464": "646524173924958234"
}

let initialized = false;
let interval = null;

/******************************************************************************
 * Called when a user runs the roster command
 *****************************************************************************/
exports.run = function(client, message, args, prefix) {
    if (!initialized)
        exports.initialize(client);

    if (message.author.id != config.owner) {
        if (!guildWhitelist.includes(message.guild.id) && (usageWhitelist[message.author.id] == null || !usageWhitelist[message.author.id].includes(message.guild.id))) {
            message.channel.send("uPleb :D");
            return;
        }
    }

    if (args.length < 1) {
        message.channel.send(getUsageString(prefix));
        return;
    }

    if (args[0] == "create") {
        createOrScheduleRoster(client, message, args, prefix, "");
    }
    else if (args[0] == "schedule") {
        // ]roster schedule 2,2,4,4 #notifications #trial-chat vDLC
        let roleString = args.pop();
        let mentionRole = message.channel.guild.roles.find(val => val.name === roleString);
        if (mentionRole == null) {
            message.channel.send(roleString + " is not a valid role.");
            return;
        }
        createOrScheduleRoster(client, message, args, prefix, mentionRole.id);
    }
    else if (args[0] == "scheduletemplate") {
        // ]roster schedule vas #notifications #trial-chat vDLC
        let roleString = args.pop();
        let mentionRole = message.channel.guild.roles.find(val => val.name === roleString);
        if (mentionRole == null) {
            message.channel.send(roleString + " is not a valid role.");
            return;
        }
        createOrScheduleRoster(client, message, args, prefix, mentionRole.id, true);
    }
    else if (args[0] == "stop") {
        // Stop the roster in current channel
        if (!channelHasRoster(message.channel)) {
            message.channel.send("There is no roster in this channel.");
            return;
        }

        delete rosters[message.channel.guild.id][message.channel.id];
        saveRosters("stopped roster", message);
        message.channel.send("Stopped roster in this channel.");
    }
    else if (args[0] == "time") {
        if (!channelHasRoster(message.channel)) {
            message.channel.send("There is no roster in this channel.");
            return;
        }

        args.shift();
        // ]roster time (24) + 1d 5h
        let scheduledHours = 48;
        if (args[0].match(/\(\d+\)/)) {
            scheduledHours = parseInt(args[0].substr(1, args[0].length - 2));
            args.shift();
        }

        // Add timestamp to bottom of embed
        let date = time.generateTime(args, mesg => message.channel.send(mesg), prefix + "roster ");
        if (date == null)
            return;
        let roster = rosters[message.channel.guild.id][message.channel.id];
        rosters[message.channel.guild.id][message.channel.id].scheduledTime = date.getTime() - (scheduledHours * 60 * 60 * 1000);
        saveRosters("change time", message);
        message.channel.fetchMessage(roster.messageId)
        .then(msg => {
            let embed = new Discord.RichEmbed()
                .setTitle("__**Local Time**__")
                .setDescription("Note that date may not be correct on mobile clients, but time is.")
                .setColor("0x00FF00");
            embed.setTimestamp(date);
            if (roster.isScheduled) {
                msg.edit("__**Event Signup**__\nSignups will open **" + scheduledHours + "** hours before roster time. "
                    + message.channel.guild.roles.get(roster.mentionRoleId) + " can sign up for this event. "
                    + roster.tank + " tanks, " + roster.heal + " healers, " + roster.mdps + " anydps, "
                    + roster.rdps + " rdps", {embed});
            }
            else {
                msg.edit(msg.content, {embed});
            }
        });
    }
    else if (args[0] == "roles") {
        if (!channelHasRoster(message.channel)) {
            message.channel.send("There is no roster in this channel.");
            return;
        }

        if (args.length != 2) {
            message.channel.send("Usage:```" + prefix + "roster roles <#tank,#heal,#dps[,#rdps]>```");
            return;
        }

        let roles = args[1].split(",");
        try {
            roles = roles.map(num => parseInt(num, 10));
        } catch (e) {
            message.channel.send("BAD NUMBERS");
            return;
        }

        rosters[message.channel.guild.id][message.channel.id].tank = roles[0] || 0;
        rosters[message.channel.guild.id][message.channel.id].heal = roles[1] || 0;
        rosters[message.channel.guild.id][message.channel.id].mdps = roles[2] || 0;
        rosters[message.channel.guild.id][message.channel.id].rdps = roles[3] || 0;
        saveRosters("change roles", message);

        let roster = rosters[message.channel.guild.id][message.channel.id];

        message.channel.fetchMessage(roster.messageId)
        .then(msg => {
            generateAndEditMessage(client, msg);
            let announceChannel = message.channel.guild.channels.get(roster.announceChannelId);
            if (announceChannel == null)
                console.log("INVALID ANNOUNCE CHANNEL ID");
            else
                announceChannel.send("Role allocation for roster in <#" + message.channel.id + "> has been changed to "
                    + roster.tank + " tanks, " + roster.heal + " healers, " + roster.mdps + " mdps, " + roster.rdps + " rdps.");
        });
    }
    else if (args[0] == "setannounce") {
        if (!channelHasRoster(message.channel)) {
            message.channel.send("There is no roster in this channel.");
            return;
        }

        if (args.length != 2) {
            message.channel.send("Usage:```" + prefix + "roster setannounce <channel>```");
            return;
        }

        // Parse announce channel
        let announceChannel = args[1].replace(/(^<#)|(>$)/g, "");
        announceChannel = message.channel.guild.channels.get(announceChannel);
        if (announceChannel == null) {
            message.channel.send("Invalid announce channel.");
            return;
        }

        rosters[message.channel.guild.id][message.channel.id].announceChannelId = announceChannel.id;
        saveRosters("change announce channel", message);
        message.react("👌");
    }
    else if (args[0] == "save") {
        saveRosters("manual save", message);
        message.channel.send("Forced a roster save to disk.");
    }
    else if (args[0] == "loadandrefresh") {
        if (!channelHasRoster(message.channel)) {
            message.channel.send("There is no roster in this channel.");
            return;
        }

        if (message.author.id != config.owner) {
            message.channel.send("You're not allowed to use this command, is dangerous af >:O");
            return;
        }

        delete require.cache[require.resolve("../../storage/rosters.json")];
        rosters = require("../../storage/rosters.json");

        let roster = rosters[message.channel.guild.id][message.channel.id];

        message.channel.fetchMessage(roster.messageId)
        .then(msg => {
            generateAndEditMessage(client, msg);
            message.react("👌");
        });
    }
    else if (args[0] == "signup") {
        if (!channelHasRoster(message.channel)) {
            message.channel.send("There is no roster in this channel.");
            return;
        }

        // if (message.author.id != config.owner) {
        //     message.channel.send("You're not allowed to use this command, pleb >:O");
        //     return;
        // }

        if (args.length != 3) {
            message.channel.send("Usage:```" + prefix + "roster signup <@name> role```");
            return;
        }

        let role = args[2];
        if (!roleEmojis.includes(role)) {
            message.channel.send(role + " is not a role");
            return;
        }

        let memberId = args[1].replace(/(^<@!?)|(>$)/g, "");
        if (rosters[message.guild.id][message.channel.id].signups[memberId] == null)
            rosters[message.guild.id][message.channel.id].signups[memberId] = [];
        if (rosters[message.guild.id][message.channel.id].signups[memberId].includes(role)) {
            console.log(memberId + " was already signed up as " + role);
            return;
        }
        rosters[message.guild.id][message.channel.id].signups[memberId].push(role);
        saveRosters("manual signup", message);
        message.channel.fetchMessage(rosters[message.guild.id][message.channel.id].messageId)
        .then(msg => {
            generateAndEditMessage(client, msg);
            message.react("👌");
            let announceChannel = message.channel.guild.channels.get(rosters[message.guild.id][message.channel.id].announceChannelId);
            if (announceChannel == null)
                console.log("INVALID ANNOUNCE CHANNEL ID");
            else
                announceChannel.send("<@" + memberId + ">, you have been signed up as a " + client.emojis.find(val => val.name === role)
                + " for <#" + message.channel.id + ">");
        });
        addToLog(message.guild, message.channel.id, memberId, "+" + client.emojis.find(val => val.name === role));
    }
    else if (args[0] == "unsignup") {
        if (!channelHasRoster(message.channel)) {
            message.channel.send("There is no roster in this channel.");
            return;
        }

        if (args.length != 2) {
            message.channel.send("Usage:```" + prefix + "roster unsignup <@name>```");
            return;
        }

        let memberId = args[1].replace(/(^<@!?)|(>$)/g, "");
        if (rosters[message.guild.id][message.channel.id].signups[memberId] == null) {
            message.channel.send("They're not signed up >:O");
            return;
        }
        delete rosters[message.guild.id][message.channel.id].signups[memberId];
        saveRosters("manual unsignup", message);

        message.channel.fetchMessage(rosters[message.guild.id][message.channel.id].messageId)
        .then(msg => {
            generateAndEditMessage(client, msg);
            message.react("👌");
            let announceChannel = message.channel.guild.channels.get(rosters[message.guild.id][message.channel.id].announceChannelId);
            if (announceChannel == null)
                console.log("INVALID ANNOUNCE CHANNEL ID");
            else
                announceChannel.send("<@" + memberId + ">, you have been removed from the roster for <#" + message.channel.id + ">");
        });
        addToLog(message.guild, message.channel.id, memberId, "- override removed");
    }
    else if (args[0] == "listroleids") {
        let text = "";
        let guildRoles = message.guild.roles;
        for (let guildRole of guildRoles.values()) {
            let roleName = guildRole.name;
            if (roleName.includes("@"))
                roleName = roleName.replace("@", "`@`");
            text += roleName + " " + guildRole.id + "\n";
        }
        message.channel.send("Roles in this guild\n" + text);
        // Trial Lead 550771729635606528
        // vDLC 538137432176984065
        // vCrag 538677062290898945
        // nTrials 478420112236478467

        // Knight who says REEEE 457096988672917504
        // Kwama Warlord 516785548980125696
        // Kwama Champion 535954441682026496
        // Kwama Warrior 494187327913197588
        // Kwama Worker 457068387890233345
        // Kwama Egg 468952917089583104
        // Friend 476550604685312001
        // Unfertilized Kwama Egg 514190432956317732
    }
    else if (args[0] == "tally") {
        if (!channelHasRoster(message.channel)) {
            message.channel.send("There is no roster in this channel.");
            return;
        }

        // ]roster tally <messageId>
        if (args.length != 2) {
            message.channel.send("Usage:```" + prefix + "roster tally <messageId>```");
            return;
        }

        message.channel.fetchMessage(args[1])
        .then(msg => {
            (async () => {
                for (let reaction of msg.reactions.values()) {
                    await reaction.fetchUsers();
                }
                let msg2 = await message.channel.send("__**Vote Tally**__")
                updateTally(client, msg, msg2);
            })();
        });
    }
    else if (args[0] == "addvotes") {
        // ]roster addvotes <messageId>
        if (args.length != 2) {
            message.channel.send("Usage:```" + prefix + "roster addvotes <messageId>```");
            return;
        }

        (async () => {
            let msg = await message.channel.fetchMessage(args[1]);
            let votes = ["⚡", "🐍", "⚔", "🐱", "🐔", "🤖", "🦅", "🐉"];
            for (let vote of votes) {
                await msg.react(vote);
            }
        })();
    }
    else if (args[0] == "addvotes2") {
        // ]roster addvotes2 [messageId]
        if (args.length > 2) {
            message.channel.send("Usage:```" + prefix + "roster addvotes2 [messageId]```");
            return;
        }

        (async () => {
            let msg = null;
            if (args.length == 2) {
                msg = await message.channel.fetchMessage(args[1]);
            }
            else {
                let messages = message.channel.messages.array();
                if (messages.length < 2) {
                    message.channel.send("Previous message isn't cached, use message ID.");
                    return;
                }
                msg = messages[messages.length - 2];
            }

            let votes = [
                "656795797123497984", // vAA
                "656795797010120705", // vSO
                "656795353366134804", // vHRC
                "656795797161115659", // vMoL
                "656795797173567498", // vHoF
                "656795797177892865", // vAS
                "656795796892549122", // vCR
                "656795798234726430", // vSS
                "714537456128622674", // vKA
                "656893432119427077", // vDSA
                // "656893432090066954", // vMA
                "656894011709063180"  // vBRP
            ];
            for (let vote of votes) {
                let emoji = client.emojis.get(vote);
                if (emoji != null) {
                    await msg.react(emoji);
                }
            }
        })();
    }
    else if (args[0] == "ping") {
        if (!channelHasRoster(message.channel)) {
            message.channel.send("There is no roster in this channel.");
            return;
        }

        let pings = "";
        let prevSignups = rosters[message.guild.id][message.channel.id].prevSignups;
        for (let userId in prevSignups) {
            if (!prevSignups[userId].startsWith("Backup")) {
                pings += "<@" + userId + "> ";
            }
        }
        if (pings != "") {
            message.channel.send(pings);
        }
    }
    else if (args[0] == "mentionrole") {
        if (!channelHasRoster(message.channel)) {
            message.channel.send("There is no roster in this channel.");
            return;
        }

        if (args.length != 2) {
            message.channel.send("Usage:```" + prefix + "roster mentionrole <rolename>```");
            return;
        }

        let roleString = args[1];
        let mentionRole = message.channel.guild.roles.find(val => val.name === roleString);
        if (mentionRole == null) {
            message.channel.send(roleString + " is not a valid role.");
            return;
        }

        let currentRole = rosters[message.channel.guild.id][message.channel.id].mentionRoleId;
        currentRole = message.channel.guild.roles.get(currentRole);

        rosters[message.channel.guild.id][message.channel.id].mentionRoleId = mentionRole.id;
        message.channel.fetchMessage(rosters[message.guild.id][message.channel.id].messageId)
        .then(msg => {
            generateAndEditMessage(client, msg);
            message.react("👌");
            let announceChannel = message.channel.guild.channels.get(rosters[message.guild.id][message.channel.id].announceChannelId);
            if (announceChannel == null) {
                console.log("INVALID ANNOUNCE CHANNEL ID");
            }
            else {
                announceChannel.send("Ping role for <#" + message.channel.id
                + "> has been changed from `" + currentRole.name + "` to `"
                + roleString + "`.");
            }
        });
    }
    else if (args[0] == "settrial") {
        if (!channelHasRoster(message.channel)) {
            message.channel.send("There is no roster in this channel.");
            return;
        }

        if (args.length != 2) {
            message.channel.send("Usage:```" + prefix + "roster settrial <trial>```");
            return;
        }

        rosters[message.channel.guild.id][message.channel.id].trial = args[1];
        message.react("👌");
        saveRosters("change trial", message);
    }
    else if (args[0] == "ignoreattn") {
        if (!channelHasRoster(message.channel)) {
            message.channel.send("There is no roster in this channel.");
            return;
        }

        if (args.length != 2) {
            message.channel.send("Usage:```" + prefix + "roster ignoreattn <true|false>```");
            return;
        }

        if (args[1] == "true") {
            rosters[message.channel.guild.id][message.channel.id].ignoreAttn = true;
        }
        else {
            delete rosters[message.channel.guild.id][message.channel.id].ignoreattn;
        }
        message.react("👌");
        saveRosters("ignore attn " + args[1], message);
    }
    else {
        message.channel.send(getUsageString(prefix));
        return;
    }
};

function getUsageString(prefix) {
    return "Usage:```" + prefix + "roster <create|time|stop|roles>```"
        + "Creating a roster:"
        + "```" + prefix + "roster create <#tank,#heal,#dps[,#rdps]> <logChannel> <announceChannel>\n"
        + " - Example: " + prefix + "roster create 1,2,4,5 #notifications #trial-chat```"
        + "Adding local timestamp to roster:```"
        + prefix + "roster time <+|-> <#><d|h|m> [<#><d|h|m>]\n"
        + " - Example: " + prefix + "roster time + 2d 8h 56m```"
        + "Stopping roster in a channel:```" + prefix + "roster stop```"
        + "Changing role allocations:```" + prefix
        + "roster create <#tank,#heal,#dps[,#rdps]>\n"
        + " - Example: " + prefix + "roster roles 2,2,8```";
}

function createOrScheduleRoster(client, message, args, prefix, mentionRole, isTemplate) {
    let isScheduled = false;
    if (mentionRole != "")
        isScheduled = true;

    if (args.length != 4) {
        if (isScheduled)
            message.channel.send("Usage:```" + prefix + "roster schedule <#tank,#heal,#dps[,#rdps]> <logChannel> <announceChannel> <mentionRole>```");
        else
            message.channel.send("Usage:```" + prefix + "roster create <#tank,#heal,#dps[,#rdps]> <logChannel> <announceChannel>```");
        return;
    }

    if (channelHasRoster(message.channel)) {
        message.channel.send("This channel already has a roster. Use `" + prefix
            + "roster stop` to remove it.");
        return;
    }

    let template = null;
    if (isTemplate) {
        let templates = require("../../storage/rostertemplates.json");
        template = templates[args[1]];
        if (template == null) {
            message.channel.send(args[1] + " is not a valid template.");
            return;
        }
        args[1] = template.roles;
    }

    // Parse roles - If 3 arguments, then dps can take any. If 4 arguments, mdps/rdps
    let roles = args[1].split(",");
    try {
        roles = roles.map(num => parseInt(num, 10));
    } catch (e) {
        message.channel.send("BAD NUMBERS");
        return;
    }

    // Parse log channel
    let logChannel = args[2].replace(/(^<#)|(>$)/g, "");
    logChannel = message.channel.guild.channels.get(logChannel);
    if (logChannel == null) {
        message.channel.send("Invalid log channel.");
        return;
    }

    // Parse announce channel
    let announceChannel = args[3].replace(/(^<#)|(>$)/g, "");
    announceChannel = message.channel.guild.channels.get(announceChannel);
    if (announceChannel == null) {
        message.channel.send("Invalid announce channel.");
        return;
    }

    let roster = new Roster(roles[0] || 0, roles[1] || 0, roles[2] || 0, roles[3] || 0);
    if (template != null) {
        roster.signups = cloneSignups(template.signups);
        roster.templateRoleId = template.atRoleId;
    }
    console.log(roster);

    if (rosters[message.channel.guild.id] == null)
        rosters[message.channel.guild.id] = {};
    rosters[message.channel.guild.id][message.channel.id] = roster;

    // Set ignoreAttn if in AttN and under AEDT trials
    if (message.channel.guild.id == attn.id && message.channel.parent.id == attn.aedtCategory) {
        console.log("Setting roster as special ignoreAttn");
        rosters[message.channel.guild.id][message.channel.id].ignoreAttn = true;
    }


    // Set log/announce channel
    rosters[message.channel.guild.id][message.channel.id].log.channelId = logChannel.id;
    rosters[message.channel.guild.id][message.channel.id].announceChannelId = announceChannel.id;
    // Send log message and save the ID
    logChannel.send("**Log for <#" + message.channel.id + "> roster**")
        .then(msg => {
            rosters[message.channel.guild.id][message.channel.id].log.messageId = msg.id;
            rosters[message.channel.guild.id][message.channel.id].log.messageContent = msg.content;
            saveRosters("started log", message);
        });

    // Send the message, then come back with the message ID
    message.channel.send("__**Event Signup**__\nPlease assign roster timestamp.")
        .then(function(msg) {
            rosters[message.channel.guild.id][message.channel.id].messageId = msg.id;
            if (isScheduled) {
                rosters[message.channel.guild.id][message.channel.id].isScheduled = true;
                rosters[message.channel.guild.id][message.channel.id].mentionRoleId = mentionRole;
                return;
            }
            rosters[message.channel.guild.id][message.channel.id].isScheduled = false;
            saveRosters("saving messageid after first send", message);

            // ... and then attach all the emojis
            let emojis = roleEmojis.slice(0);
            generateAndEditMessage(client, msg);
            recursivelyAddEmojis(client, msg, emojis);
        });
}

function Roster(tank, heal, mdps, rdps) {
    this.tank = tank;
    this.heal = heal;
    this.mdps = mdps;
    this.rdps = rdps;
    this.signups = {};
    this.log = {};
}

/**
 * Check whether there is a roster going on in this channel
 */
function channelHasRoster(channel) {
    if (rosters[channel.guild.id] == null || rosters[channel.guild.id][channel.id] == null)
        return false;
    return true;
}

/**
 * Adds a bunch of emojis to a single message
 */
function recursivelyAddEmojis(client, message, emojiNames) {
    if (emojiNames.length == 0) {
        return;
    }
    let emoji = emojiNames.shift();
    if (emoji == null) {
        return;
    }
    message.react(client.emojis.find(val => val.name === emoji))
        .then(msg => recursivelyAddEmojis(client, message, emojiNames));
}

/**
 * Saves rosters to file
 */
function saveRosters(printInfo, message) {
    fs.writeFile("./storage/rosters.json", JSON.stringify(rosters, null, 4),
        function(error) {
            if (error) {
                console.log(error);
            }
            else {
                console.log("saved rosters" + (printInfo ? ": " + printInfo : "")
                    + (message ? " - " + stripEmojis(message.guild.name) + " " + stripEmojis(message.channel.name) : ""));
            }
        }
    );
}

function stripEmojis(s) {
    const regex = emojiRegex();
    return s.replace(regex, "");
}

/**
 * Initializes this module by fetching saved messages and the users who have reacted to it
 */
exports.initialize = function(client) {
    if (initialized)
        return;

    interval = client.setInterval(tickRoster, 30000, client);

    console.log(">>> Rosters exist in:");
    for (let guildId in rosters) {
        let guild = client.guilds.get(guildId);
        if (guild != null) {
            for (let channelId in rosters[guildId]) {
                let channel = guild.channels.get(channelId);
                let messageId = rosters[guildId][channelId].messageId;
                if (channel != null && messageId != null) {
                    channel.fetchMessage(messageId)
                    .then(msg => {
                        for (let i in msg.reactions.array()) {
                            msg.reactions.array()[i].fetchUsers();
                        }
                        generateAndEditMessage(client, msg);
                        console.log(">>> " + stripEmojis(guild.name) + " #" + stripEmojis(msg.channel.name));
                    })
                    .catch(() => {
                        console.log("Error trying to fetch messageId " + messageId + " in " + guild.name + " #" + channel.name);
                        channel.send("There was an error in fetching the message by ID, most likely someone deleted the message or I have connection issues to Discord. This roster probably won't work until roster is reloaded. <@161986000489414656>");
                        // delete rosters[guildId][channelId];
                        // saveRosters("initialization cleanup missing message " + guild.name + " #" + channel.name);
                    });
                }
                else {
                    console.log("CHANNEL OR MESSAGEID IS NULL: guild: " + guild.name
                        + " " + channelId + " " + messageId);
                    delete rosters[guildId][channelId];
                    saveRosters("initialization cleanup missing channel/messageId" + guild.name + " " + channelId + " " + messageId);
                }
            }
        }
    }
    initialized = true;
}

/** Called when a reaction is added to a message */
exports.reactionAdded = function(client, reaction, user) {
    // Check that it's a watched message first
    if (user.bot || !roleEmojis.includes(reaction.emoji.name)
        || rosters[reaction.message.guild.id] == null
        || rosters[reaction.message.guild.id][reaction.message.channel.id] == null
        || rosters[reaction.message.guild.id][reaction.message.channel.id].messageId != reaction.message.id)
        return;

    // Signing up before open
    let roster = rosters[reaction.message.guild.id][reaction.message.channel.id];
    let announceChannel = reaction.message.guild.channels.get(roster.announceChannelId);
    if (roster.isScheduled) {
        if (announceChannel != null) {
            announceChannel.send("<@" + user.id + ">, signups are not open for that yet REEEEEEEEEEEE.");
            reaction.remove(user);
        }
        return;
    }

    reaction.message.guild.fetchMember(user)
    .then(member => {
        // Sign up
        let name = reaction.emoji.name;
        if (rosters[reaction.message.guild.id][reaction.message.channel.id].signups[user.id] == null) {
            rosters[reaction.message.guild.id][reaction.message.channel.id].signups[user.id] = [];

            // Check role only if it's a new signup
            if (reaction.message.guild.id == attn.id
                && roster.mentionRoleId != null
                && member.roles.get(roster.mentionRoleId) == null
                && member.roles.get(noPing[roster.mentionRoleId]) == null) {
                let requiredRole = reaction.message.guild.roles.get(roster.mentionRoleId);
                if (requiredRole != null && announceChannel != null) {
                    let requiredId = requiredRole.id;
                    if (requiredId == "538137432176984065" || requiredId == "538677062290898945" || requiredId == "641400914124734464") {
                        announceChannel.send("<@" + user.id + ">, you signed up for <#" + reaction.message.channel.id
                            + "> but you don't have the `" + requiredRole.name + "` role. Ignore this message if you're a"
                            + " Skooma Addict filling in (" + client.emojis.find(val => val.name === "behehe") + ")."
                            + " If you're a guildie who still needs the roles, post Superstar and/or CMX parses in"
                            + " <#539043053621608448> to be verified. Or yell at <@161986000489414656> if this is a mistake.");
                    }
                }
            }

            // Also the NeedsParse tag
            if (reaction.message.guild.id == attn.id
                && member.roles.get(attn.needsParse) != null) {
                announceChannel.send("<@" + user.id + ">, you still have the `NeedsParse` tag! Since the Greymoor patch changed some metas, we are requiring new parses. Please check the last message in <#479449385336438804> for more info! And yes, this ping is designed to be annoying.");
            }
        }
        
        if (rosters[reaction.message.guild.id][reaction.message.channel.id].signups[user.id].includes(name)) {
            console.log(user.username + " was already signed up as " + name);
            return;
        }
        rosters[reaction.message.guild.id][reaction.message.channel.id].signups[user.id].push(name);

        generateAndEditMessage(client, reaction.message);
        // addToLog(guildId, channelId, userId, plusMinusEmoji)
        addToLog(reaction.message.guild, reaction.message.channel.id, user.id, "+" + reaction.emoji);
    })
    .catch(console.log);
}

/** Called when a reaction is removed from a message */
exports.reactionRemoved = function(client, reaction, user) {
    // Check that it's a watched message first
    if (user.bot || !roleEmojis.includes(reaction.emoji.name)
        || rosters[reaction.message.guild.id] == null
        || rosters[reaction.message.guild.id][reaction.message.channel.id] == null
        || rosters[reaction.message.guild.id][reaction.message.channel.id].messageId != reaction.message.id
        || rosters[reaction.message.guild.id][reaction.message.channel.id].isScheduled)
        return;

    let name = reaction.emoji.name;
    if (rosters[reaction.message.guild.id][reaction.message.channel.id].signups[user.id] != null) {
        let index = rosters[reaction.message.guild.id][reaction.message.channel.id].signups[user.id].indexOf(name);
        if (index > -1) {
            rosters[reaction.message.guild.id][reaction.message.channel.id].signups[user.id].splice(index, 1);
        }

        if (rosters[reaction.message.guild.id][reaction.message.channel.id].signups[user.id].length == 0) {
            delete rosters[reaction.message.guild.id][reaction.message.channel.id].signups[user.id];
        }
        else {
            // If player removes a backup emoji FOR THE FIRST ONE and the next one is a non-backup, move the player to
            // the end of the list, because otherwise they could push someone else out of an
            // already-signed-up spot.
            if (name.startsWith("Backup") && index == 0
                && !rosters[reaction.message.guild.id][reaction.message.channel.id].signups[user.id][0].startsWith("Backup")) {
                let original = rosters[reaction.message.guild.id][reaction.message.channel.id].signups[user.id].slice();
                delete rosters[reaction.message.guild.id][reaction.message.channel.id].signups[user.id];
                rosters[reaction.message.guild.id][reaction.message.channel.id].signups[user.id] = original;
            }
        }
    }

    let afterEmpty = generateAndEditMessage(client, reaction.message);
    // addToLog(guildId, channelId, userId, plusMinusEmoji)
    addToLog(reaction.message.guild, reaction.message.channel.id, user.id, "-" + reaction.emoji);

    // Also send a message about the removal if it is less than 12 hours before the timestamp
    // First check how many empty slots currently
    let beforeEmpty = (reaction.message.content.match(/( - \n)|( -$)/g) || []).length;
    if (beforeEmpty < afterEmpty) {
        // Now check the timestamp, 12 hours in advance is ok
        if (reaction.message.embeds.length != 1 || reaction.message.embeds[0].timestamp == null)
            return;
        let currentTimestamp = new Date(reaction.message.embeds[0].timestamp);
        if (currentTimestamp == null || currentTimestamp.getTime() > Date.now() + (12 * 60 * 60 * 1000))
            return;
        if (rosters[reaction.message.guild.id][reaction.message.channel.id].announceChannelId == null)
            return;

        let announceChannel = reaction.message.guild.channels.get(rosters[reaction.message.guild.id][reaction.message.channel.id].announceChannelId);
        let member = reaction.message.guild.member(user);
        if (member != null && announceChannel != null) {
            let memberName = member.user.username;
            if (member.nickname != null)
                memberName = member.nickname;
            announceChannel.send(memberName + " made a change to <#" + reaction.message.channel.id
                + "> roster within 12 hours from trial time, there is now another spot open 😱");
        }
    }
}

/**
 * Add an entry to the log message
 */
function addToLog(guild, channelId, userId, plusMinusEmoji) {
    let roster = rosters[guild.id][channelId];
    let logChannel = guild.channels.get(roster.log.channelId);
    if (logChannel == null) {
        console.log("Invalid log channel!! " + roster.log.channelId
            + " from someone in guild " + guild.name);
        return;
    }

    if (roster.log.messageId == null) {
        console.log("NO MESSAGEID");
        return;
    }

    logChannel.fetchMessage(roster.log.messageId)
    .then(msg => {
        if (roster.log.messageContent == null) {
            // While in process of migrating, load it when necessary
            roster.log.messageContent = msg.content;
        }

        // Want to determine if it's the same user as the last entry
        let lines = roster.log.messageContent.split("\n");
        let lastLine = lines[lines.length - 1].split(">");

        let finalText = roster.log.messageContent;
        if (finalText.length < 1900) {
            if (lastLine[0].replace("<@", "") == userId) {
                // If yes, just add the emoji to the end.
                finalText += " " + plusMinusEmoji;
            }
            else {
                // Else, need to add the userId too
                finalText += "\n<@" + userId + "> " + plusMinusEmoji;
            }
            rosters[guild.id][channelId].log.messageContent = finalText;
            msg.edit(finalText).then(() => saveRosters("appending to log - " + stripEmojis(guild.name) + " " + stripEmojis(guild.channels.get(channelId).name)));
        }
        else {
            // If text is too long, we want to make a new message, and then ninja edit the name
            // in so the player doesn't get a notification
            rosters[guild.id][channelId].log.messageContent = "**Log for <#" + channelId + "> roster continued**\n<@" + userId + "> " + plusMinusEmoji;
            msg.channel.send("**Log for <#" + channelId + "> roster continued**")
            .then(editMsg => {
                editMsg.edit("**Log for <#" + channelId + "> roster continued**\n<@" + userId + "> " + plusMinusEmoji).then(
                    () => saveRosters("new message for log", msg));
                rosters[guild.id][channelId].log.messageId = editMsg.id;
            });
        }
    })
    .catch(e => console.log("Invalid messageID for log edit"));
}

/**
 * Clone the signups object to avoid weird reference things
 */
function cloneSignups(template) {
    let section = {};
    for (let playerId in template) {
        section[playerId] = template[playerId].slice(0);
    }
    return section;
}

/**
 * Function that ticks once every 30 seconds or so
 */
function tickRoster(client) {
    if (!initialized) {
        return;
    }

    // It is ok to not be right on the dot with the time
    let now = new Date();
    // console.log("Roster tick! " + now);

    // Iterate through all rosters
    for (let guildId in rosters) {
        let guild = client.guilds.get(guildId);
        if (guild != null) {
            for (let channelId in rosters[guildId]) {
                let channel = guild.channels.get(channelId);
                let roster = rosters[guildId][channelId];
                if (roster.isScheduled) {
                    // Simply open the roster and set the flags if it's now later than scheduled time
                    if (roster.scheduledTime <= now.getTime()) {
                        rosters[guildId][channelId].isScheduled = false;
                        channel.fetchMessage(rosters[guildId][channelId].messageId).then(msg => {
                            let emojis = roleEmojis.slice(0);
                            generateAndEditMessage(client, msg);
                            recursivelyAddEmojis(client, msg, emojis);
                            // Also do a mention
                            let mentionRole = roster.mentionRoleId;
                            if (roster.ignoreAttn != null) {
                                mentionRole = "672539894454943786";
                            }
                            if (mentionRole != null) {
                                let additionalRole = "";
                                if (roster.templateRoleId != null) {
                                    additionalRole = " " + guild.roles.get(roster.templateRoleId) + " have been automatically signed up.";
                                }
                                if (roster.ignoreAttn != null) {
                                    additionalRole += " `" + guild.roles.get(roster.mentionRoleId).name + "` can sign up for this.";
                                }
                                channel.send(guild.roles.get(mentionRole) + " Signups are now open!" + additionalRole);
                            }
                        });
                    }
                }
            }
        }
    }
}

exports.unsetInterval = function(client) {
    if (interval == null) {
        return;
    }
    console.log("Clearing interval");
    client.clearInterval(interval);
}

/////////////////////////////////////////////////////////////////////
// ROSTER GENERATION
/////////////////////////////////////////////////////////////////////

/**
 * Generates message from data structure
 * Returns the number of empty spaces for shaming convenience
 */
function generateAndEditMessage(client, message) {
    let roster = rosters[message.guild.id][message.channel.id];

    if (roster.isScheduled) {
        message.edit("__**Event Signup**__\nSignups will open 48 hours before roster time. "
                    + message.channel.guild.roles.get(roster.mentionRoleId) + " can sign up for this event. "
                    + roster.tank + " tanks, " + roster.heal + " healers, " + roster.mdps + " anydps, "
                    + roster.rdps + " rdps");
        return;
    }

    const header = "__**Event Signup**__\nSign up by reacting with the emojis below."
        + " Please do NOT spam the emojis just for fun.\n"
        + client.emojis.find(val => val.name === "Tank")
        + client.emojis.find(val => val.name === "Healer")
        + client.emojis.find(val => val.name === "MDps")
        + client.emojis.find(val => val.name === "RDps")
        + " `Use these to sign up if you would like to join, even if the spots are currently full.`\n"
        + client.emojis.find(val => val.name === "BackupTank")
        + client.emojis.find(val => val.name === "BackupHealer")
        + client.emojis.find(val => val.name === "BackupMDps")
        + client.emojis.find(val => val.name === "BackupRDps")
        + " `Use these backups if you are unsure, or would allow later signups to take priority over yours.`";

    // Need to build a structure like this one and then diff them, to notify people of changes
    let prevSignups = roster.prevSignups;
    let newSignups = {};

    let currentRoles = {};
    let backupNum = 1;
    for (let i = 0; i < roster.tank; i++)
        currentRoles["Tank" + (i + 1)] = "";
    for (let i = 0; i < roster.heal; i++)
        currentRoles["Healer" + (i + 1)] = "";
    for (let i = 0; i < roster.mdps; i++)
        currentRoles["MDps" + (i + 1)] = "";
    for (let i = 0; i < roster.rdps; i++)
        currentRoles["RDps" + (i + 1)] = "";

    // Naive allocation - always assign to first choice, unless there are no slots
    // Otherwise, assign to 2nd choice and so on. Chronological signup > role spots,
    // So if a tank slot is open but someone signed with dps>tank and another dps
    // signs up, the 2nd dps will be set as a reserve.

    for (let userId in roster.signups) {
        let roleAssigned = "";
        // Generate the text for a single player's line
        let line = "<@" + userId + ">";
        for (let i in roster.signups[userId]) {
            let emojiName = roster.signups[userId][i];
            let emoji = client.emojis.find(val => val.name === emojiName);
            if (emoji != null) {
                line += " " + emoji;
                
                // Meanwhile, also attempt to assign role by iterating down choices
                if (roleAssigned != "")
                    continue;

                // Immediately assign as backup if this is in AttN and they are not a guildie
                if (message.channel.guild.id == attn.id) {
                    let guildMember = message.channel.guild.members.get(userId);
                    if (guildMember == null) {
                        console.log("NO MEMBER FOUND FOR ID " + userId
                            + " while trying to assign " + message.channel.guild.name
                            + " " + message.channel.name);
                    }
                    else {
                        for (let guildRole of attn.nonGuildie) {
                            if (guildMember.roles.get(guildRole) != null) {
                                roleAssigned = "Backup" + backupNum;
                                newSignups[userId] = "Backup";
                                backupNum++
                                break;
                            }
                        }
                        if (roleAssigned != "")
                            continue;
                    }
                }

                // Immediately assign as backup if a backup emoji is listed
                if (emojiName.startsWith("Backup")) {
                    roleAssigned = "Backup" + backupNum;
                    newSignups[userId] = "Backup";
                    backupNum++;
                    continue;
                }

                // See if a role is free
                for (let j in Object.keys(currentRoles)) {
                    let possibleRole = Object.keys(currentRoles)[j];
                    if (possibleRole.startsWith(emojiName) && currentRoles[possibleRole] == "") {
                        roleAssigned = possibleRole;
                        newSignups[userId] = emojiName;
                        break;
                    }
                }

                if (roleAssigned != "")
                    continue;

                // It's possible that no ranged slots are open, but melee are
                // In that case, assign to melee slot
                if (emojiName == "RDps") {
                    for (let j in Object.keys(currentRoles)) {
                        let possibleRole = Object.keys(currentRoles)[j];
                        if (possibleRole.startsWith("MDps") && currentRoles[possibleRole] == "") {
                            roleAssigned = possibleRole;
                            newSignups[userId] = "MDps";
                            break;
                        }
                    }
                }
            }
        }
        // Now that the line has been built, assign it
        if (roleAssigned == "") {
            roleAssigned = "Backup" + backupNum;
            newSignups[userId] = "Backup";
            backupNum++;
        }
        currentRoles[roleAssigned] = line;
    }

    let numEmpty = 0;

    let rolesText = "";
    let prevRoleStart = "zzzz";
    for (let currentRole in currentRoles) {
        let displayRole = currentRole;
        if (currentRole.startsWith("MDps") && roster.rdps == 0)
            displayRole = currentRole.substr(1);

        // Spacing between roles
        if (!currentRole.startsWith(prevRoleStart))
            rolesText += "\n";
        prevRoleStart = currentRole[0];

        rolesText += "\n" + displayRole + " - " + currentRoles[currentRole];
        if (currentRoles[currentRole] == "")
            numEmpty++;
    }

    if (roster.trial != null) {
        if (roster.trial == "vss" && roster.rdps == 3) {
            // vSS with 3 rdps as the portals, last 3 mdps as tombs
            rolesText = rolesText.replace(/\bMDps3\b/, "Tomb3");
            rolesText = rolesText.replace(/\bMDps4\b/, "Tomb2");
            rolesText = rolesText.replace(/\bMDps5\b/, "Tomb1");

            rolesText = rolesText.replace(/\bRDps1\b/, "PortalLeft");
            rolesText = rolesText.replace(/\bRDps2\b/, "PortalMid");
            rolesText = rolesText.replace(/\bRDps3\b/, "PortalRight");
        }
    }

    message.edit(header + rolesText);

    // Find the diff between two signups
    rosters[message.guild.id][message.channel.id].prevSignups = newSignups;
    let diffRoles = [];
    if (prevSignups != null) {
        // Do new minus previous. It's theoretically not possible for someone to not be in either
        // if they weren't the person who made the change, so we don't need to notify about that?
        for (let newUserId in newSignups) {
            if (newSignups[newUserId] == prevSignups[newUserId]) {
                // Same role, skip
                continue;
            }

            let prevRole = prevSignups[newUserId];
            let newRole = newSignups[newUserId];
            diffRoles.push("<@" + newUserId + "> your assigned role has changed: "
                + (prevRole != null ? prevRole : "None") + " -> " + (newRole != null ? newRole : "None"));
        }

        // Quick hacky check whether someone dropped
        if (Object.keys(prevSignups).length > Object.keys(newSignups).length) {
            for (let prevUserId in prevSignups) {
                if (newSignups[prevUserId] == null) {
                    diffRoles.push("<@" + prevUserId + "> your assigned role has changed: " + prevSignups[prevUserId] + " -> None");
                    break;
                }
            }
        }

        // If there is a difference of more than 1, i.e. more than just the person who changed it was affected, then notify
        if (diffRoles.length > 1) {
            let announceChannel = message.guild.channels.get(roster.announceChannelId);
            if (announceChannel == null)
                console.log("INVALID ANNOUNCE CHANNEL ID");
            else {
                let roleChangeText = "__**Role Changes**__\nSomeone (too lazy to figure out who) made a change in <#" + message.channel.id + "> that affected multiple people:";
                for (let roleChange of diffRoles) {
                    roleChangeText += "\n" + roleChange;
                }
                let roleChangeJson = "```\n" + JSON.stringify(prevSignups, null, 2) + "\n``````" + JSON.stringify(newSignups, null, 2) + "\n```";
                announceChannel.send(roleChangeText)
                .then(msg => {
                    // msg.channel.send("<@161986000489414656> a gift for you " + roleChangeJson);
                    console.log(roleChangeJson);
                });
            }
        }
    }

    return numEmpty;
}

function updateTally(client, message, tallyMessage) {
    let roster = rosters[message.channel.guild.id][message.channel.id];
    let userIds = Object.keys(roster.signups);

    let text = "__**Vote Tally**__ as of " + new Date() + " because I'm too lazy to make it auto-update";
    let ignored = new Set();

    // Get the message's reactions
    let reactions = message.reactions.values();
    for (let reaction of reactions) {
        let num = 0;
        let ignoredNum = 0;
        let line = "";
        for (let user of reaction.users.values()) {
            if (user.bot) {
                continue;
            }

            if (userIds.includes(user.id)) {
                num++;
                line += " <@" + user.id + ">";
            }
            else {
                ignoredNum++;
                ignored.add("<@" + user.id + ">");
            }
        }

        if (num + ignoredNum > 0) {
            text += "\n" + reaction.emoji + " (" + num + "/" + (num + ignoredNum) + ")" + line;
        }
    }

    if (ignored.size > 0) {
        text += "\nIgnored votes from " + Array.from(ignored).join(" ") + " because they are not in roster";
    }
    tallyMessage.edit(text);
}
