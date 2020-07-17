/* eslint no-param-reassign: ["error", { "props": false }] */
/* eslint-disable no-console */
/* eslint-disable prefer-destructuring */

// Bot requires delete permission (will complain but work otherwise)
// Likely best to give only bot permission to add reactions

// LOOK AT THESE FUCKING GLOBALS
// MAN, ARE YOU IN THE MOOD FOR SOME FUCKING SPAGHETTI CODE TOO?

// Define jobs
const tankJobs = ['pld', 'war', 'drk', 'gnb'];
const healerJobs = ['whm', 'sch', 'ast'];
const dpsJobs = ['mnk', 'drg', 'nin', 'sam', 'brd', 'mch', 'dnc', 'blm', 'smn', 'rdm'];
const allJobs = tankJobs.concat(healerJobs, dpsJobs);
const backupRoles = ['backup_tank', 'backup_healer', 'backup_dps'];

const Discord = require('discord.js');
const { prefix, token } = require('./config.json');

const client = new Discord.Client();

const chooseStarters = ({
  reaction,
  reactionEmoji,
  signups,
  tankMax,
  healerMax,
  dpsMax,
  signupEmbed,
  embedMessage,
} = {}) => {
  // This function when called deletes and re-generates the data showing who is in what role

  // Delete all data first
  const starters = {};
  const backups = {};

  starters.all = [];
  starters.tank = [];
  starters.healer = [];
  starters.dps = [];

  backups.all = [];

  // Loop through entire signup array to decide who goes where
  signups.all.forEach((id) => {
    // Calculate which role has the greatest current need (largest value for slots - signups)
    const tankInNeed = tankMax - signups.tank.length;
    const healerInNeed = healerMax - signups.healer.length;
    const dpsInNeed = dpsMax - signups.dps.length;
    console.log(`In need numbers: Tank=${tankInNeed} Healer=${healerInNeed} DPS=${dpsInNeed}`);

    // Attempt to place player in roles that have not enough or just enough signups

    if (tankInNeed >= Math.max(healerInNeed, dpsInNeed, 1) && signups.tank.includes(id)) {
      starters.all.push(id);
      starters.tank.push(id);
      return;
    }

    if (healerInNeed >= Math.max(tankInNeed, dpsInNeed, 1) && signups.healer.includes(id)) {
      starters.all.push(id);
      starters.healer.push(id);
      return;
    }

    if (dpsInNeed >= Math.max(tankInNeed, healerInNeed, 1) && signups.dps.includes(id)) {
      starters.all.push(id);
      starters.dps.push(id);
      return;
    }

    // Place player in the role with largest current number of open starter positions

    const tankOpenings = tankMax - starters.tank.length;
    const healerOpenings = healerMax - starters.healer.length;
    const dpsOpenings = dpsMax - starters.dps.length;

    if (tankOpenings >= Math.max(healerOpenings, dpsOpenings, 1) && signups.tank.includes(id)) {
      starters.all.push(id);
      starters.tank.push(id);
      return;
    }

    if (healerOpenings >= Math.max(tankOpenings, dpsOpenings, 1) && signups.healer.includes(id)) {
      starters.all.push(id);
      starters.healer.push(id);
      return;
    }

    if (dpsOpenings >= Math.max(tankOpenings, healerOpenings, 1) && signups.dps.includes(id)) {
      starters.all.push(id);
      starters.dps.push(id);
      return;
    }

    // Place in first available opening

    if (tankOpenings > 0 && signups.tank.includes(id)) {
      starters.all.push(id);
      starters.tank.push(id);
      return;
    }

    if (healerOpenings > 0 && signups.healer.includes(id)) {
      starters.all.push(id);
      starters.healer.push(id);
      return;
    }

    if (dpsOpenings > 0 && signups.dps.includes(id)) {
      starters.all.push(id);
      starters.dps.push(id);
      return;
    }

    // No openings
    backups.all.push(id);
  });

  // Build starter arrays
  // Prioritize any roles with zero or otherwise insufficient numbers of signups
  // Not 100% sure about this algorithm but whatever

  console.log(`Full list of starters ${JSON.stringify(starters.all)}`);
  console.log(`Tank starters ${JSON.stringify(starters.tank)}`);
  console.log(`Healer starters ${JSON.stringify(starters.healer)}`);
  console.log(`DPS starters ${JSON.stringify(starters.dps)}`);

  // Regenerate embed
  signupEmbed.fields = [];
  let tankFieldValue = '';
  let healerFieldValue = '';
  let dpsFieldValue = '';
  let backupFieldValue = '';

  // TO DO: Make these loops use same variables, reset them for next loop
  // This sucks to debug.

  starters.tank.forEach((id) => {
    // Each of these sections does roughly the same things
    // Create string of icons for this ID
    let jobIcons = '';
    tankJobs.forEach((job) => {
      if (signups[job].includes(id)) {
        jobIcons = jobIcons.concat(reactionEmoji[job]);
      }
    });

    // Set displayName to job icons + Discord nickname and add it to field
    const displayName = jobIcons.concat(' ', reaction.emoji.guild.members.cache.get(id).displayName);
    tankFieldValue = tankFieldValue.concat(displayName);

    // Add a line break if not final ID
    if (starters.tank.indexOf(id) < tankMax - 1) {
      tankFieldValue = tankFieldValue.concat('\n');
    }
  });

  let openSlots; // I hate doing this

  // Show any open slots with "OPEN" text
  openSlots = tankMax - starters.tank.length;
  while (openSlots > 0) {
    tankFieldValue = tankFieldValue.concat('OPEN\n');
    openSlots -= 1;
  }

  if (tankFieldValue) { // Prevents crash if the field is empty
    signupEmbed.addField('Tanks', tankFieldValue, true);
  }

  starters.healer.forEach((id) => {
    let jobIcons = '';
    healerJobs.forEach((job) => {
      if (signups[job].includes(id)) {
        jobIcons = jobIcons.concat(reactionEmoji[job]);
      }
    });
    const displayName = jobIcons.concat(' ', reaction.emoji.guild.members.cache.get(id).displayName);
    healerFieldValue = healerFieldValue.concat(displayName);
    if (starters.healer.indexOf(id) < healerMax - 1) {
      healerFieldValue = healerFieldValue.concat('\n');
    }
  });

  openSlots = healerMax - starters.healer.length;
  while (openSlots > 0) {
    healerFieldValue = healerFieldValue.concat('OPEN\n');
    openSlots -= 1;
  }

  if (healerFieldValue) {
    signupEmbed.addField('Healers', healerFieldValue, true);
  }

  starters.dps.forEach((id) => {
    let jobIcons = '';
    dpsJobs.forEach((job) => {
      if (signups[job].includes(id)) {
        jobIcons = jobIcons.concat(reactionEmoji[job]);
      }
    });
    const displayName = jobIcons.concat(' ', reaction.emoji.guild.members.cache.get(id).displayName);
    dpsFieldValue = dpsFieldValue.concat(displayName);
    if (starters.dps.indexOf(id) < dpsMax - 1) {
      dpsFieldValue = dpsFieldValue.concat('\n');
    }
  });

  // Show any open slots with "OPEN" text
  openSlots = dpsMax - starters.dps.length;
  while (openSlots > 0) {
    dpsFieldValue = dpsFieldValue.concat('OPEN\n');
    openSlots -= 1;
  }

  if (dpsFieldValue) {
    signupEmbed.addField('DPS', dpsFieldValue, true);
  }

  backups.all.forEach((id) => {
    // Backup field doesn't use job icons
    const displayName = reaction.emoji.guild.members.cache.get(id).displayName;
    backupFieldValue = backupFieldValue.concat(displayName);
    if (backups.all.indexOf(id) < backups.all.length - 1) {
      // Comma + space separated seems better because this field can be pretty long
      backupFieldValue = backupFieldValue.concat(', ');
    }
  });

  if (backupFieldValue) {
    signupEmbed.addField('Backups', backupFieldValue);
  }

  embedMessage.edit(signupEmbed);
};

client.once('ready', () => {
  console.log('Bot client ready: It\'s alive. IT\'S ALIVE!!');
});

client.on('message', (message) => {
  // Stop early if message isn't for bot
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  // Define job emojis
  const reactionEmoji = {};
  const jobEmojis = [];
  allJobs.forEach((job) => {
    reactionEmoji[job] = message.guild.emojis.cache.find((emoji) => emoji.name === job);
    jobEmojis.push(reactionEmoji[job]);
  });

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Full party as default
  let tankMax = 2;
  let healerMax = 2;
  let dpsMax = 4;

  if (command === 'test') {
    if (args[0] === 'light') {
      tankMax = 1;
      healerMax = 1;
      dpsMax = 2;
    } else if (args[0] === 'full') {
      tankMax = 2;
      healerMax = 2;
      dpsMax = 4;
    } else if (args[0] === 'alliance') {
      tankMax = 3;
      healerMax = 6;
      dpsMax = 15;
    } else if (args[0] === 'custom') {
      tankMax = args[1];
      healerMax = args[2];
      dpsMax = args[3];
    }

    // Set up signup arrays
    const signups = {};
    signups.tank = [];
    signups.healer = [];
    signups.dps = [];
    signups.all = [];
    allJobs.forEach((job) => {
      signups[job] = [];
    });

    message.delete({ timeout: 5000, reason: 'Cleanup command phrase' }) // Waits 5 seconds before deleting message
      .then((msg) => console.log(`Received and removed command ${prefix}${command} from ${msg.author.username}`))
      .catch(console.error);

    const signupEmbed = new Discord.MessageEmbed()
      .setTitle('Signup')
      .setTimestamp();

    message.channel.send(signupEmbed)
      .then((embedMessage) => {
        const filter = (reaction, user) => jobEmojis.includes(reaction.emoji) && !user.bot;
        const collector = embedMessage.createReactionCollector(filter, { dispose: true });
        jobEmojis.forEach(async (emoji) => {
          await embedMessage.react(emoji);
        });

        collector.on('collect', (reaction, user) => {
        // Reset starter lists

          const job = reaction.emoji.name;

          // See if user is already in list of signups
          if (!signups.all.includes(user.id)) {
            signups.all.push(user.id);
          }

          signups[job].push(user.id);

          // Add user to role lists
          if (tankJobs.includes(job) && !signups.tank.includes(user.id)) {
            signups.tank.push(user.id);
          } else if (healerJobs.includes(job) && !signups.healer.includes(user.id)) {
            signups.healer.push(user.id);
          } else if (dpsJobs.includes(job) && !signups.dps.includes(user.id)) {
            signups.dps.push(user.id);
          }

          chooseStarters({
            reaction,
            reactionEmoji,
            signups,
            tankMax,
            healerMax,
            dpsMax,
            signupEmbed,
            embedMessage,
          });
        });

        collector.on('remove', (reaction, user) => {
          const job = reaction.emoji.name;
          signups[job] = signups[job].filter((item) => item !== user.id);

          if (tankJobs.includes(job)
          && !signups.pld.includes(user.id) && !signups.war.includes(user.id)
          && !signups.drk.includes(user.id) && !signups.gnb.includes(user.id)) {
            signups.tank = signups.tank.filter((item) => item !== user.id);
          }

          if (healerJobs.includes(job)
          && !signups.whm.includes(user.id) && !signups.sch.includes(user.id)
          && !signups.ast.includes(user.id)) {
            signups.healer = signups.healer.filter((item) => item !== user.id);
          }

          if (dpsJobs.includes(job)
          && !signups.mnk.includes(user.id) && !signups.drg.includes(user.id)
          && !signups.nin.includes(user.id) && !signups.sam.includes(user.id)
          && !signups.brd.includes(user.id) && !signups.mch.includes(user.id)
          && !signups.dnc.includes(user.id)
          && !signups.blm.includes(user.id) && !signups.smn.includes(user.id)
          && !signups.rdm.includes(user.id)) {
            signups.dps = signups.dps.filter((item) => item !== user.id);
          }

          if (!signups.tank.includes(user.id) && !signups.healer.includes(user.id)
          && !signups.dps.includes(user.id)) {
            signups.all = signups.all.filter((item) => item !== user.id);
          }

          chooseStarters({
            reaction,
            reactionEmoji,
            signups,
            tankMax,
            healerMax,
            dpsMax,
            signupEmbed,
            embedMessage,
          });
        });
      }).catch(console.error);
  }
});

client.login(token);
