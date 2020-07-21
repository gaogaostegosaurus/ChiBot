/* eslint no-param-reassign: ["error", { "props": false }] */
/* eslint-disable no-console */
/* eslint-disable prefer-destructuring */

// Bot requires delete permission (will complain but work otherwise)
// Likely best to give only bot permission to add reactions

// LOOK AT THESE FUCKING GLOBALS
// MAN, ARE YOU IN THE MOOD FOR SOME FUCKING SPAGHETTI CODE TOO?

// Define jobs - these strings need to be defined as emojis in the channel
const tankJobs = ['pld', 'war', 'drk', 'gnb'];
const healerJobs = ['whm', 'sch', 'ast'];
const dpsJobs = ['mnk', 'drg', 'nin', 'sam', 'brd', 'mch', 'dnc', 'blm', 'smn', 'rdm'];
const backupRoles = ['backup_tank', 'backup_healer', 'backup_dps'];
const allJobs = tankJobs.concat(healerJobs, dpsJobs);

const Discord = require('discord.js');
const { prefix, token } = require('./config.json');

const client = new Discord.Client();

const embedDelay = 1000; // How many ms to wait before changing embed (prevent rate limiting?)

client.once('ready', () => {
  console.log('Bot ready. It\'s alive. IT\'S ALIVE!!');
});

client.on('message', (message) => {
  // Stop early if message isn't for bot
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  // Define job emojis
  const reactionEmoji = {};
  const emojiList = [];
  allJobs.forEach((job) => {
    reactionEmoji[job] = message.guild.emojis.cache.find((emoji) => emoji.name === job);
    emojiList.push(reactionEmoji[job]);
  });

  backupRoles.forEach((role) => {
    reactionEmoji[role] = message.guild.emojis.cache.find((emoji) => emoji.name === role);
    emojiList.push(reactionEmoji[role]);
  });

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  // Full party as default
  let tankCap = 2;
  let healerCap = 2;
  let dpsCap = 4;
  let embedTitle = 'Signup List (Full Party)';

  if (command === 'signup') {
    if (args[0] === 'light') {
      tankCap = 1;
      healerCap = 1;
      dpsCap = 2;
      embedTitle = 'Signup List (Light Party)';
    } else if (args[0] === 'full') {
      tankCap = 2;
      healerCap = 2;
      dpsCap = 4;
      embedTitle = 'Signup List (Full Party)';
    } else if (args[0] === 'alliance') {
      tankCap = 3;
      healerCap = 6;
      dpsCap = 15;
      embedTitle = 'Signup List (Alliance Raid)';
    // } else if (args[0] === 'custom') {
    //   tankCap = args[1];
    //   healerCap = args[2];
    //   dpsCap = args[3];
    }

    // Set up signup object and arrays
    const signup = {};
    signup.tank = [];
    signup.healer = [];
    signup.dps = [];
    signup.all = [];

    allJobs.forEach((job) => {
      signup[job] = []; // Creates array for each job
    });

    backupRoles.forEach((role) => {
      signup[role] = [];
    });

    // Set up starter/backup objects - arrays are filled in with function below
    const starter = {};
    const backup = {};

    message.delete({ timeout: 5000, reason: 'Cleanup command phrase after 5 seconds' });

    // Create base embed
    const signupEmbed = new Discord.MessageEmbed()
      .setTitle(embedTitle)
      .setDescription('About: https://github.com/gaogaostegosaurus/ChiBot')
      .setFooter('TL;DR: Click on your preferred job(s). The bot will assign/reassign players to needed roles.\nJust want to be a backup? Click the backup_role you can fill.\n')
      .setTimestamp();

    const openString = '<OPEN>'; // Set string to designate open slots here

    let fieldValue = '';
    for (let i = 1; i <= tankCap; i += 1) {
      fieldValue = fieldValue.concat(openString);
      if (i < tankCap) {
        fieldValue = fieldValue.concat('\n'); // Add carriage return for next line
      }
    }
    signupEmbed.addField('Tank', fieldValue, true);

    fieldValue = '';
    for (let i = 1; i <= healerCap; i += 1) {
      fieldValue = fieldValue.concat(openString);
      if (i < healerCap) {
        fieldValue = fieldValue.concat('\n'); // Add carriage return for next line
      }
    }
    signupEmbed.addField('Healer', fieldValue, true);

    fieldValue = '';
    for (let i = 1; i <= dpsCap; i += 1) {
      fieldValue = fieldValue.concat(openString);
      if (i < dpsCap) {
        fieldValue = fieldValue.concat('\n'); // Add carriage return for next line
      }
    }
    signupEmbed.addField('DPS', fieldValue, true);

    message.channel.send(signupEmbed)
      .then((embedMessage) => {
        const filter = (reaction, user) => emojiList.includes(reaction.emoji) && !user.bot;
        const collector = embedMessage.createReactionCollector(filter, { dispose: true });
        // dispose is needed to track remove events

        emojiList.forEach(async (emoji) => {
          await embedMessage.react(emoji);
        });

        const getRoleStarterFieldValue = ({ // Function to build starter lists
          reaction,
          starterArray,
          role,
        } = {}) => {
          let jobList = tankJobs;
          let roleCap = tankCap;

          if (!role) {
            return '';
          } if (role === 'Tank') {
            jobList = tankJobs;
            roleCap = tankCap;
          } else if (role === 'Healer') {
            jobList = healerJobs;
            roleCap = healerCap;
          } else if (role === 'DPS') {
            jobList = dpsJobs;
            roleCap = dpsCap;
          }

          let starterFieldValue = '';

          // Set role jobs

          starterArray.forEach((id) => {
            // Create string of icons for this ID
            let jobIcons = '';
            let jobIconCount = 0;
            jobList.forEach((job) => {
              // if (signup[job].includes(id) && jobIconCount < 3) {
              if (signup[job].includes(id) && jobIconCount < 5) {
                jobIcons = jobIcons.concat(reactionEmoji[job]);
                jobIconCount += 1;
              }
            });

            // Set displayName to job icons + Discord nickname and add it to field value
            const displayName = jobIcons.concat(' ', reaction.emoji.guild.members.cache.get(id).displayName);

            // Display any flex roles this person can fill
            let flexIcons = '';
            if (signup.tank.includes(id) && role !== 'Tank') {
              flexIcons = flexIcons.concat(reactionEmoji.backup_tank);
            }
            if (signup.healer.includes(id) && role !== 'Healer') {
              flexIcons = flexIcons.concat(reactionEmoji.backup_healer);
            }
            if (signup.dps.includes(id) && role !== 'DPS') {
              flexIcons = flexIcons.concat(reactionEmoji.backup_dps);
            }

            starterFieldValue = starterFieldValue.concat(displayName, ' ', flexIcons);

            // Add a line break if not final ID
            if (starterArray.indexOf(id) + 1 < roleCap) {
              starterFieldValue = starterFieldValue.concat('\n');
            }
          });

          // Fill any remaining slots with open string
          for (let i = starterArray.length + 1; i <= roleCap; i += 1) {
            starterFieldValue = starterFieldValue.concat(`${openString}`);
            if (i < roleCap) {
              starterFieldValue = starterFieldValue.concat('\n');
            }
          }

          return starterFieldValue;
        };

        const addBackupFields = ({
          reaction,
          backupArray,
        } = {}) => {
          if (backupArray.length === 0) { return; }

          let backupField1Value = '';
          let backupField2Value = '';
          let backupField3Value = '';

          backupArray.forEach((id) => {
            // Decide which field to assign to
            const backupField = (backupArray.indexOf(id) % 3) + 1;

            // Add role icons
            let backupIcons = '';

            // Check what backup role icons to put next to each person
            if (signup.backup_tank.includes(id)) {
              backupIcons = backupIcons.concat(reactionEmoji.backup_tank);
            } else {
              for (let i = 0; i < tankJobs.length; i += 1) {
                if (signup[tankJobs[i]].includes(id)) {
                  backupIcons = backupIcons.concat(reactionEmoji.backup_tank);
                  break;
                }
              }
            }

            if (signup.backup_healer.includes(id)) {
              backupIcons = backupIcons.concat(reactionEmoji.backup_healer);
            } else {
              for (let i = 0; i < healerJobs.length; i += 1) {
                if (signup[healerJobs[i]].includes(id)) {
                  backupIcons = backupIcons.concat(reactionEmoji.backup_healer);
                  break;
                }
              }
            }

            if (signup.backup_dps.includes(id)) {
              backupIcons = backupIcons.concat(reactionEmoji.backup_dps);
            } else {
              for (let i = 0; i < dpsJobs.length; i += 1) {
                if (signup[dpsJobs[i]].includes(id)) {
                  backupIcons = backupIcons.concat(reactionEmoji.backup_dps);
                  break;
                }
              }
            }

            let displayName = backupIcons.concat(
              reaction.emoji.guild.members.cache.get(id).displayName,
            );

            if (backupArray.indexOf(id) + 1 + 3 <= backupArray.length) {
              displayName = displayName.concat('\n'); // Add a carriage return if a name will appear under
            }

            if (backupField === 1) { backupField1Value = backupField1Value.concat(displayName); }
            if (backupField === 2) { backupField2Value = backupField2Value.concat(displayName); }
            if (backupField === 3) { backupField3Value = backupField3Value.concat(displayName); }
          });
          if (backupField1Value) { signupEmbed.addField('Backups', backupField1Value, true); }
          if (backupField2Value) { signupEmbed.addField('\u200b', backupField2Value, true); }
          if (backupField3Value) { signupEmbed.addField('\u200b', backupField3Value, true); }
        };

        let collectorTimeout;

        const chooseStarters = ({ // Function for (re)building starter lists
          reaction,
          signupArray,
          // Only using reaction properties to find IDs, not the reaction itself (I think)
        } = {}) => {
          let breakIndex = 0;
          let tankTempArray = [];
          let healerTempArray = [];
          let dpsTempArray = [];

          for (let i = 0; i < signupArray.length; i += 1) {
            if (signupArray.length === 0) { break; }
            breakIndex = i;
            console.log(`Starting assignment loop #${i + 1}`);

            // Reset arrays
            tankTempArray = [];
            healerTempArray = [];
            dpsTempArray = [];

            const thArray = [];
            const tdArray = [];
            const hdArray = [];
            const thdArray = [];

            // const backupTempArray = [];

            console.log('Sorting signups to temp arrays');

            for (let j = 0; j <= i; j += 1) {
              const id = signupArray[j];
              if (signup.tank.includes(id)
              && signup.healer.includes(id) && signup.dps.includes(id)) {
                thdArray.push(id);
              } else if (signup.tank.includes(id) && signup.healer.includes(id)) {
                thArray.push(id);
              } else if (signup.tank.includes(id) && signup.dps.includes(id)) {
                tdArray.push(id);
              } else if (signup.healer.includes(id) && signup.dps.includes(id)) {
                hdArray.push(id);
              } else if (signup.tank.includes(id)) {
                tankTempArray.push(id);
              } else if (signup.healer.includes(id)) {
                healerTempArray.push(id);
              } else if (signup.dps.includes(id)) {
                dpsTempArray.push(id);
              }
            }

            // Reassign flex signups
            let flexCount = thArray.length + tdArray.length
              + hdArray.length + thdArray.length;

            while (flexCount > 0) {
              console.log(`Flex numbers = ${flexCount} (${thArray.length}+${tdArray.length}+${hdArray.length}+${thdArray.length})`);
              const tankCount = tankTempArray.length;
              const healerCount = healerTempArray.length;
              const dpsCount = dpsTempArray.length;
              const thCount = thArray.length;
              const tdCount = tdArray.length;
              const hdCount = hdArray.length;
              const thdCount = thdArray.length;
              const tankFlex = thCount + tdCount + thdCount;
              const healerFlex = thCount + hdCount + thdCount;
              const dpsFlex = tdCount + hdCount + thdCount;
              const tankNeed = tankCap - tankCount;
              const healerNeed = healerCap - healerCount;
              const dpsNeed = dpsCap - dpsCount;

              let tankFlexNeed = 0;
              let healerFlexNeed = 0;
              let dpsFlexNeed = 0;
              if (tankFlex > 0) { tankFlexNeed = tankNeed; }
              if (healerFlex > 0) { healerFlexNeed = healerNeed; }
              if (dpsFlex > 0) { dpsFlexNeed = dpsNeed; }
              const maxFlexNeed = Math.max(tankFlexNeed, healerFlexNeed, dpsFlexNeed);
              // There has got to be an easier way to do this but whatever

              if (tankFlexNeed > 0 && tankFlexNeed >= maxFlexNeed) {
                console.log('Flexing to tank');
                if (healerFlex > 0 && healerNeed - healerFlex <= dpsNeed - dpsFlex && thCount > 0) {
                  tankTempArray.push(thArray[0]);
                  thArray.splice(0, 1);
                  console.log('Reassigned TH => T');
                } else if (dpsFlex > 0 && tdCount > 0) {
                  tankTempArray.push(tdArray[0]);
                  tdArray.splice(0, 1);
                  console.log('Reassigned TD => T');
                } else if (healerFlex > 0 && thCount > 0) {
                  tankTempArray.push(thArray[0]);
                  thArray.splice(0, 1);
                  console.log('Reassigned TH => T (confirm if needed)');
                } else {
                  tankTempArray.push(thdArray[0]);
                  thdArray.splice(0, 1);
                  console.log('Reassigned THD => T');
                }
              } else if (healerFlexNeed > 0 && healerFlexNeed >= maxFlexNeed) {
                console.log('Flexing to H');
                if (tankFlex > 0 && tankNeed - tankFlex <= dpsNeed - dpsFlex && thCount > 0) {
                  healerTempArray.push(thArray[0]);
                  thArray.splice(0, 1);
                  console.log('Reassigned TH => H');
                } else if (dpsFlex > 0 && hdCount > 0) {
                  healerTempArray.push(hdArray[0]);
                  hdArray.splice(0, 1);
                  console.log('Reassigned HD => H');
                } else if (tankFlex > 0 && thCount > 0) {
                  healerTempArray.push(thArray[0]);
                  thArray.splice(0, 1);
                  console.log('Reassigned TH => H (confirm if needed)');
                } else {
                  healerTempArray.push(thdArray[0]);
                  thdArray.splice(0, 1);
                  console.log('Reassigned THD => H');
                }
              } else if (dpsFlexNeed > 0 && dpsFlexNeed >= maxFlexNeed) {
                console.log('Flexing to D');
                if (tankFlex > 0 && tankNeed - tankFlex <= healerNeed - healerFlex && tdCount > 0) {
                  dpsTempArray.push(tdArray[0]);
                  tdArray.splice(0, 1);
                  console.log('Reassigned TD => D');
                } else if (healerFlex > 0 && hdCount > 0) {
                  dpsTempArray.push(hdArray[0]);
                  hdArray.splice(0, 1);
                  console.log('Reassigned HD => D');
                } else if (tankFlex > 0 && tdCount > 0) {
                  dpsTempArray.push(tdArray[0]);
                  tdArray.splice(0, 1);
                  console.log('Reassigned TD => D (confirm if needed)');
                } else {
                  dpsTempArray.push(thdArray[0]);
                  thdArray.splice(0, 1);
                  console.log('Reassigned THD => D');
                }
              }

              // Update flex signup count
              flexCount = thArray.length + tdArray.length
                + hdArray.length + thdArray.length;
            }

            let sufficientTanks = false;
            let sufficientHealers = false;
            let sufficientDPS = false;

            if (tankTempArray.length >= tankCap) { // >= because of single-role shenanigans
              sufficientTanks = true;
            }

            if (healerTempArray.length >= healerCap) {
              sufficientHealers = true;
            }

            if (dpsTempArray.length >= dpsCap) {
              sufficientDPS = true;
            }

            if (sufficientTanks && sufficientHealers && sufficientDPS) {
              console.log(`Breaking loop after ${i + 1} entries`);
              break;
            }
          }

          const tankStarterArray = [];
          const healerStarterArray = [];
          const dpsStarterArray = [];
          const backupArray = [];

          // Push truncated array into new starter array
          // Limit array size due to single-role shenanigans
          for (let i = 0; i <= breakIndex; i += 1) {
            const id = signupArray[i];
            if (tankTempArray.includes(id) && tankStarterArray.length < tankCap) {
              tankStarterArray.push(id);
            } else if (healerTempArray.includes(id) && healerStarterArray.length < healerCap) {
              healerStarterArray.push(id);
            } else if (dpsTempArray.includes(id) && dpsStarterArray.length < dpsCap) {
              dpsStarterArray.push(id);
            }
          }

          signupArray.forEach((id) => {
            if (!tankStarterArray.includes(id) && !healerStarterArray.includes(id)
            && !dpsStarterArray.includes(id) && !backupArray.includes(id)) {
              backupArray.push(id);
            }
          });

          // Add all backup-specific signups to backup list
          backupRoles.forEach((role) => {
            signup[role].forEach((id) => {
              if (!backupArray.includes(id)) {
                backupArray.push(id);
              }
            });
          });

          console.log(`Tank Starters:   ${JSON.stringify(tankStarterArray)}`);
          console.log(`Healer Starters: ${JSON.stringify(healerStarterArray)}`);
          console.log(`DPS Starters:    ${JSON.stringify(dpsStarterArray)}`);
          console.log(`Backups:         ${JSON.stringify(backupArray)}`);

          const tankFieldValue = getRoleStarterFieldValue({ reaction, starterArray: tankStarterArray, role: 'Tank' });
          const healerFieldValue = getRoleStarterFieldValue({ reaction, starterArray: healerStarterArray, role: 'Healer' });
          const dpsFieldValue = getRoleStarterFieldValue({ reaction, starterArray: dpsStarterArray, role: 'DPS' });

          signupEmbed.fields = [];
          signupEmbed.addField('Tank', tankFieldValue, true);
          signupEmbed.addField('Healer', healerFieldValue, true);
          signupEmbed.addField('DPS', dpsFieldValue, true);
          addBackupFields({ reaction, backupArray });

          // clearTimeout(embedTimeout);
          embedMessage.edit(signupEmbed);
        };

        collector.on('collect', (reaction, user) => { // Someone reacts to the embed
          const reactionJob = reaction.emoji.name; // Job they reacted as

          if (!signup.all.includes(user.id)) { // See if user is already in list of signups
            signup.all.push(user.id); // Add user's ID if they are not
          }

          signup[reactionJob].push(user.id); // Add user's ID to list of job's signups

          // Add user to role lists
          if (tankJobs.includes(reactionJob) && !signup.tank.includes(user.id)) {
            signup.tank.push(user.id);
          } else if (healerJobs.includes(reactionJob) && !signup.healer.includes(user.id)) {
            signup.healer.push(user.id);
          } else if (dpsJobs.includes(reactionJob) && !signup.dps.includes(user.id)) {
            signup.dps.push(user.id);
          }

          clearTimeout(collectorTimeout);
          collectorTimeout = setTimeout(chooseStarters, embedDelay, { reaction, signupArray: signup.all });
        });

        collector.on('remove', (reaction, user) => {
          const reactionJob = reaction.emoji.name;
          signup[reactionJob] = signup[reactionJob].filter((item) => item !== user.id);

          if (tankJobs.includes(reactionJob)
          && !signup.pld.includes(user.id) && !signup.war.includes(user.id)
          && !signup.drk.includes(user.id) && !signup.gnb.includes(user.id)) {
            signup.tank = signup.tank.filter((item) => item !== user.id);
            console.log('Removed from tank');
          }

          if (healerJobs.includes(reactionJob)
          && !signup.whm.includes(user.id) && !signup.sch.includes(user.id)
          && !signup.ast.includes(user.id)) {
            signup.healer = signup.healer.filter((item) => item !== user.id);
            console.log('Removed from healer');
          }

          if (dpsJobs.includes(reactionJob)
          && !signup.mnk.includes(user.id) && !signup.drg.includes(user.id)
          && !signup.nin.includes(user.id) && !signup.sam.includes(user.id)
          && !signup.brd.includes(user.id) && !signup.mch.includes(user.id)
          && !signup.dnc.includes(user.id)
          && !signup.blm.includes(user.id) && !signup.smn.includes(user.id)
          && !signup.rdm.includes(user.id)) {
            signup.dps = signup.dps.filter((item) => item !== user.id);
            console.log('Removed from dps');
          }

          if (!signup.tank.includes(user.id) && !signup.healer.includes(user.id)
          && !signup.dps.includes(user.id)) {
            signup.all = signup.all.filter((item) => item !== user.id);
            console.log('Removed from all');
          }

          clearTimeout(collectorTimeout);
          collectorTimeout = setTimeout(chooseStarters, embedDelay, { reaction, signupArray: signup.all });
        });
      }).catch(console.error);
  }
});

client.login(token);
