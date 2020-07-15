/* eslint no-param-reassign: ["error", { "props": false }] */
/* eslint-disable no-console */
/* eslint-disable prefer-destructuring */

// Bot requires delete permission (will complain but work otherwise)
// Likely best to give only bot permission to add reactions

const Discord = require('discord.js');
const { prefix, token } = require('./config.json');

const client = new Discord.Client();

const chooseStarters = ({
  reaction,
  signups,
  starters,
  backups,
  signupEmbed,
  embedMessage,
} = {}) => {
  // This function when called deletes and re-generates the data showing who is in what role

  // Delete all data first
  starters.all = [];
  starters.tank = [];
  starters.healer = [];
  starters.dps = [];

  backups.all = [];

  // Loop through entire signup array to decide who goes where
  signups.all.forEach((id) => {
    // Calculate which role has the greatest current need
    const tankInNeed = starters.tankMax - signups.tank.length;
    const healerInNeed = starters.healerMax - signups.healer.length;
    const dpsInNeed = starters.dpsMax - signups.dps.length;
    console.log(`In need numbers: Tank=${tankInNeed} Healer=${healerInNeed} DPS=${dpsInNeed}`);

    // Attempt to place player in roles that have not enough or just enough signups

    if (tankInNeed >= Math.max(healerInNeed, dpsInNeed, 1) && signups.tank.includes(id)) {
      console.log('Player placed as tank starter');
      starters.all.push(id);
      starters.tank.push(id);
      return;
    }

    if (healerInNeed >= Math.max(tankInNeed, dpsInNeed, 1) && signups.healer.includes(id)) {
      console.log('Player placed as healer starter');
      starters.all.push(id);
      starters.healer.push(id);
      return;
    }

    if (dpsInNeed >= Math.max(tankInNeed, healerInNeed, 1) && signups.dps.includes(id)) {
      console.log('Player placed as DPS starter');
      starters.all.push(id);
      starters.dps.push(id);
      return;
    }

    // Place player in the role with largest current number of open starter positions

    const tankOpenings = starters.tankMax - starters.tank.length;
    const healerOpenings = starters.healerMax - starters.healer.length;
    const dpsOpenings = starters.dpsMax - starters.dps.length;

    if (tankOpenings >= Math.max(healerOpenings, dpsOpenings, 1) && signups.tank.includes(id)) {
      console.log('Player placed as tank starter');
      starters.all.push(id);
      starters.tank.push(id);
      return;
    }

    if (healerOpenings >= Math.max(tankOpenings, dpsOpenings, 1) && signups.healer.includes(id)) {
      console.log('Player placed as healer starter');
      starters.all.push(id);
      starters.healer.push(id);
      return;
    }

    if (dpsOpenings >= Math.max(tankOpenings, healerOpenings, 1) && signups.dps.includes(id)) {
      console.log('Player placed as DPS starter');
      starters.all.push(id);
      starters.dps.push(id);
      return;
    }

    // Place in first available opening

    if (tankOpenings > 0 && signups.tank.includes(id)) {
      console.log('Player placed as tank starter');
      starters.all.push(id);
      starters.tank.push(id);
      return;
    }

    if (healerOpenings > 0 && signups.healer.includes(id)) {
      console.log('Player placed as healer starter');
      starters.all.push(id);
      starters.healer.push(id);
      return;
    }

    if (dpsOpenings > 0 && signups.dps.includes(id)) {
      console.log('Player placed as DPS starter');
      starters.all.push(id);
      starters.dps.push(id);
      return;
    }

    // No openings
    console.log('Player placed as backup');
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

  starters.tank.forEach((id) => {
    signupEmbed.addField('Tank', reaction.emoji.guild.members.cache.get(id).displayName);
  });

  starters.healer.forEach((id) => {
    signupEmbed.addField('Healer', reaction.emoji.guild.members.cache.get(id).displayName);
  });

  starters.dps.forEach((id) => {
    signupEmbed.addField('DPS', reaction.emoji.guild.members.cache.get(id).displayName);
  });

  backups.all.forEach((id) => {
    signupEmbed.addField('Backup', reaction.emoji.guild.members.cache.get(id).displayName);
  });

  embedMessage.edit(signupEmbed);
};

client.once('ready', () => {
  console.log('Bot client ready: It\'s alive. IT\'S ALIVE!!');
});

client.on('message', (message) => {
  // Stop early if message isn't for bot
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  // Define jobs
  const tankJobs = ['pld', 'war', 'drk', 'gnb'];
  const healerJobs = ['whm', 'sch', 'ast'];
  const dpsJobs = ['mnk', 'drg', 'nin', 'sam', 'brd', 'mch', 'dnc', 'blm', 'smn', 'rdm'];
  const allJobs = tankJobs.concat(healerJobs, dpsJobs);

  // Define job emojis
  const reactionEmoji = {};

  const jobEmojis = [];
  allJobs.forEach((job) => {
    reactionEmoji[job] = message.guild.emojis.cache.find((emoji) => emoji.name === job);
    jobEmojis.push(reactionEmoji[job]);
  });

  // const pldEmoji = message.guild.emojis.cache.find((emoji) => emoji.name === 'pld');
  // const warEmoji = message.guild.emojis.cache.find((emoji) => emoji.name === 'war');
  // const drkEmoji = message.guild.emojis.cache.find((emoji) => emoji.name === 'drk');
  // const gnbEmoji = message.guild.emojis.cache.find((emoji) => emoji.name === 'gnb');
  // const whmEmoji = message.guild.emojis.cache.find((emoji) => emoji.name === 'whm');
  // const schEmoji = message.guild.emojis.cache.find((emoji) => emoji.name === 'sch');
  // const astEmoji = message.guild.emojis.cache.find((emoji) => emoji.name === 'ast');
  // const mnkEmoji = message.guild.emojis.cache.find((emoji) => emoji.name === 'mnk');
  // const drgEmoji = message.guild.emojis.cache.find((emoji) => emoji.name === 'drg');
  // const ninEmoji = message.guild.emojis.cache.find((emoji) => emoji.name === 'nin');
  // const samEmoji = message.guild.emojis.cache.find((emoji) => emoji.name === 'sam');
  // const brdEmoji = message.guild.emojis.cache.find((emoji) => emoji.name === 'brd');
  // const mchEmoji = message.guild.emojis.cache.find((emoji) => emoji.name === 'mch');
  // const dncEmoji = message.guild.emojis.cache.find((emoji) => emoji.name === 'dnc');
  // const blmEmoji = message.guild.emojis.cache.find((emoji) => emoji.name === 'blm');
  // const smnEmoji = message.guild.emojis.cache.find((emoji) => emoji.name === 'smn');
  // const rdmEmoji = message.guild.emojis.cache.find((emoji) => emoji.name === 'rdm');
  // const nojobEmoji = message.guild.emojis.cache.find(emoji => emoji.name === 'nojob');

  // const jobEmojis = [
  //   pldEmoji, warEmoji, drkEmoji, gnbEmoji,
  //   whmEmoji, schEmoji, astEmoji,
  //   mnkEmoji, drgEmoji, ninEmoji, samEmoji,
  //   brdEmoji, mchEmoji, dncEmoji,
  //   blmEmoji, smnEmoji, rdmEmoji,
  // ];

  const signups = {};
  signups.tank = [];
  signups.healer = [];
  signups.dps = [];
  signups.all = [];

  allJobs.forEach((job) => {
    signups[job] = [];
  });

  const starters = {};

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'test') {
    const backups = {};
    backups.all = [];
    if (args[0] === 'light') {
      starters.tankMax = 1;
      starters.healerMax = 1;
      starters.dpsMax = 2;
    } else if (args[0] === 'full') {
      starters.tankMax = 2;
      starters.healerMax = 2;
      starters.dpsMax = 4;
    } else if (args[0] === 'alliance') {
      starters.tankMax = 3;
      starters.healerMax = 6;
      starters.dpsMax = 15;
    } else if (args[0] === 'custom') {
      starters.tankMax = args[1];
      starters.healerMax = args[2];
      starters.dpsMax = args[3];
    } else {
      starters.tankMax = 2;
      starters.healerMax = 2;
      starters.dpsMax = 4;
    }

    message.delete({ timeout: 1000, reason: 'Commands are ugly' }) // Wait 1 second before deleting message
      .then((msg) => console.log(`Received and removed command ${prefix}${command} from ${msg.author.username}`))
      .catch(console.error);

    const signupEmbed = new Discord.MessageEmbed()
      .setTitle('Signup')
      .setTimestamp();

    message.channel.send(signupEmbed)
      .then((embedMessage) => {
        // console.log(JSON.stringify(embedMessage));
        const filter = (reaction, user) => jobEmojis.includes(reaction.emoji) && !user.bot;
        const collector = embedMessage.createReactionCollector(filter, { dispose: true });
        jobEmojis.forEach(async (emoji) => {
          await embedMessage.react(emoji);
        });

        // await embedMessage.react(pldEmoji);
        // await embedMessage.react(warEmoji);
        // await embedMessage.react(drkEmoji);
        // await embedMessage.react(gnbEmoji);
        // await embedMessage.react(whmEmoji);
        // await embedMessage.react(schEmoji);
        // await embedMessage.react(astEmoji);
        // await embedMessage.react(mnkEmoji);
        // await embedMessage.react(drgEmoji);
        // await embedMessage.react(ninEmoji);
        // await embedMessage.react(samEmoji);
        // await embedMessage.react(brdEmoji);
        // await embedMessage.react(mchEmoji);
        // await embedMessage.react(dncEmoji);
        // await embedMessage.react(blmEmoji);
        // await embedMessage.react(smnEmoji);
        // await embedMessage.react(rdmEmoji);

        collector.on('collect', (reaction, user) => {
        // Reset starter lists
          starters.tank = [];
          starters.healer = [];
          starters.dps = [];
          starters.all = [];
          signupEmbed.fields = [];

          const job = reaction.emoji.name;

          // See if user is already in list of signups
          if (!signups.all.includes(user.id)) {
            signups.all.push(user.id);
            console.log(`Added ${user.username} to signup list`);
            console.log(`Current list of signups: ${JSON.stringify(signups.all)}`);
          }

          signups[job].push(user.id);
          console.log(`Current list of ${job.toUpperCase()} signups: ${JSON.stringify(signups[job])}`);

          // Add user to role lists
          if (tankJobs.includes(job) && !signups.tank.includes(user.id)) {
            signups.tank.push(user.id);
            console.log(`Current list of tank signups: ${JSON.stringify(signups.tank)}`);
          } else if (healerJobs.includes(job) && !signups.healer.includes(user.id)) {
            signups.healer.push(user.id);
            console.log(`Current list of healer signups: ${JSON.stringify(signups.healer)}`);
          } else if (dpsJobs.includes(job) && !signups.dps.includes(user.id)) {
            signups.dps.push(user.id);
            console.log(`Current list of DPS signups: ${JSON.stringify(signups.dps)}`);
          }

          chooseStarters({
            reaction, signups, starters, backups, signupEmbed, embedMessage,
          });
        });

        collector.on('remove', (reaction, user) => {
        // Reset starter lists
          starters.tank = [];
          starters.healer = [];
          starters.dps = [];
          starters.all = [];
          signupEmbed.fields = [];

          const job = reaction.emoji.name;
          signups[job] = signups[job].filter((item) => item !== user.id);
          console.log(`Current list of ${job.toUpperCase()} signups: ${JSON.stringify(signups[job])}`);

          if (tankJobs.includes(job)
          && !signups.pld.includes(user.id) && !signups.war.includes(user.id)
          && !signups.drk.includes(user.id) && !signups.gnb.includes(user.id)) {
            signups.tank = signups.tank.filter((item) => item !== user.id);
            console.log(`Current list of tank signups: ${JSON.stringify(signups.tank)}`);
          }

          if (healerJobs.includes(job)
          && !signups.whm.includes(user.id) && !signups.sch.includes(user.id)
          && !signups.ast.includes(user.id)) {
            signups.healer = signups.healer.filter((item) => item !== user.id);
            console.log(`Current list of healer signups: ${JSON.stringify(signups.healer)}`);
          }

          if (dpsJobs.includes(job)
          && !signups.mnk.includes(user.id) && !signups.drg.includes(user.id)
          && !signups.nin.includes(user.id) && !signups.sam.includes(user.id)
          && !signups.brd.includes(user.id) && !signups.mch.includes(user.id)
          && !signups.dnc.includes(user.id)
          && !signups.blm.includes(user.id) && !signups.smn.includes(user.id)
          && !signups.rdm.includes(user.id)) {
            signups.dps = signups.dps.filter((item) => item !== user.id);
            console.log(`Current list of DPS signups: ${JSON.stringify(signups.dps)}`);
          }

          if (!signups.tank.includes(user.id) && !signups.healer.includes(user.id)
          && !signups.dps.includes(user.id)) {
            signups.all = signups.all.filter((item) => item !== user.id);
            console.log(`Current list of signups: ${JSON.stringify(signups.all)}`);
          }

          chooseStarters({
            reaction, signups, starters, backups, signupEmbed, embedMessage,
          });
        });
      }).catch(console.error);
  }
});

client.login(token);
