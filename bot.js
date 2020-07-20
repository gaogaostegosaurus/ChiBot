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
      .setDescription('https://github.com/gaogaostegosaurus/ChiBot')
      .setFooter('Click on your preferred job(s) to sign up, and the bot will attempt to assign/reassign you to a needed role.\nJust want to be a backup? Click the backup_role you can fill.\n')
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
            jobList.forEach((job) => {
              if (signup[job].includes(id)) {
                jobIcons = jobIcons.concat(reactionEmoji[job]);
              }
            });

            // Set displayName to job icons + Discord nickname and add it to field value
            const displayName = jobIcons.concat(' ', reaction.emoji.guild.members.cache.get(id).displayName);
            starterFieldValue = starterFieldValue.concat(displayName);

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
          if (!backupArray) { return; }

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

            if (backup.all.indexOf(id) + 1 + 3 < backup.all.length) {
              // Comma + space separated seems better than \n because this field can be pretty long
              displayName = displayName.concat('\n');
            }

            if (backupField === 1) { backupField1Value = backupField1Value.concat(displayName); }
            if (backupField === 2) { backupField2Value = backupField2Value.concat(displayName); }
            if (backupField === 3) { backupField3Value = backupField3Value.concat(displayName); }
          });
          if (backupField1Value) { signupEmbed.addField('Backups', backupField1Value, true); }
          if (backupField2Value) { signupEmbed.addField('', backupField2Value, true); }
          if (backupField3Value) { signupEmbed.addField('', backupField3Value, true); }
        };

        const chooseStarters = ({ // Function for (re)building starter lists
          reaction,
          // Only using reaction properties to find IDs, not the reaction itself (I think)
        } = {}) => {
          // Reset all starter/backup data so that roles can be re-assigned
          starter.all = [];
          starter.tank = [];
          starter.healer = [];
          starter.dps = [];
          backup.all = [];

          // Outline of algorithm process:
          // Go through array to find at what index there are enough tank/healer/DPS/total members
          // Create new array ending on that index
          // With priority to time, place anyone who is single role
          // Follow with double and triple role
          // If someone wasn't placed, add them to backup
          // Add all other signups to backup

          // Step 1:
          // Go through array to find at what index there are enough tank/healer/DPS/total members
          // Create new array ending on that index

          let tankCount = 0;
          let healerCount = 0;
          let dpsCount = 0;
          let totalCount = 0;
          const shortlist = [];

          for (let i = 0; i < signup.all.length; i += 1) {
            const id = signup.all[i];
            shortlist.push(id); // Place ID into shortlist
            if (signup.tank.includes(id)) {
              tankCount += 1;
            }
            if (signup.healer.includes(id)) {
              healerCount += 1;
            }
            if (signup.dps.includes(id)) {
              dpsCount += 1;
            }

            totalCount += 1;

            if (tankCount >= tankCap && healerCount >= healerCap && dpsCount >= dpsCap
            && totalCount >= tankCap + healerCap + dpsCap) {
              break; // Stop making array once sufficient IDs have been pushed
            }

            // Just runs through the whole array if signups are insufficient
          }
          console.log(`Shortlist: ${JSON.stringify(shortlist)}`);

          // Step 2:
          // With priority to time, place anyone who is single role
          // Follow with double or triple flex

          const tankTempArray = [];
          const healerTempArray = [];
          const dpsTempArray = [];

          for (let i = 0; i < shortlist.length; i += 1) {
            const id = shortlist[i];
            let flex = 0;
            if (signup.tank.includes(id)) { flex += 1; }
            if (signup.healer.includes(id)) { flex += 1; }
            if (signup.dps.includes(id)) { flex += 1; }

            if (flex === 1) {
              if (signup.tank.includes(id) && tankTempArray.length < tankCap) {
                tankTempArray.push(id);
              } else if (signup.healer.includes(id) && healerTempArray.length < healerCap) {
                healerTempArray.push(id);
              } else if (signup.dps.includes(id) && dpsTempArray.length < dpsCap) {
                dpsTempArray.push(id);
              }
            }
          }

          for (let i = 0; i < shortlist.length; i += 1) {
            const id = shortlist[i];
            let flex = 0;
            if (signup.tank.includes(id)) { flex += 1; }
            if (signup.healer.includes(id)) { flex += 1; }
            if (signup.dps.includes(id)) { flex += 1; }

            if (flex === 2) {
              if (signup.tank.includes(id) && tankTempArray.length < tankCap) {
                tankTempArray.push(id);
              } else if (signup.healer.includes(id) && healerTempArray.length < healerCap) {
                healerTempArray.push(id);
              } else if (signup.dps.includes(id) && dpsTempArray.length < dpsCap) {
                dpsTempArray.push(id);
              }
            }
          }

          for (let i = 0; i < shortlist.length; i += 1) {
            const id = shortlist[i];
            let flex = 0;
            if (signup.tank.includes(id)) { flex += 1; }
            if (signup.healer.includes(id)) { flex += 1; }
            if (signup.dps.includes(id)) { flex += 1; }

            if (flex === 3) {
              if (signup.tank.includes(id) && tankTempArray.length < tankCap) {
                tankTempArray.push(id);
              } else if (signup.healer.includes(id) && healerTempArray.length < healerCap) {
                healerTempArray.push(id);
              } else if (signup.dps.includes(id) && dpsTempArray.length < dpsCap) {
                dpsTempArray.push(id);
              }
            }
          }

          // Since IDs are now out of order, resort for "real" array
          const tankStarterArray = [];
          const healerStarterArray = [];
          const dpsStarterArray = [];
          const starterArray = [];

          for (let i = 0; i < shortlist.length; i += 1) {
            const id = shortlist[i];

            if (tankTempArray.includes(id)) {
              tankStarterArray.push(id);
              starterArray.push(id);
            } else if (healerTempArray.includes(id)) {
              healerStarterArray.push(id);
              starterArray.push(id);
            } else if (dpsTempArray.includes(id)) {
              dpsStarterArray.push(id);
              starterArray.push(id);
            }
          }

          
          const backupArray = [];

          signup.all.forEach((id) => {
            if (!starterArray.includes(id)) {
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

          // signupEmbed.addField('Tank', getRoleStarterFieldValue({ reaction, starterArray: starter.tank }), true);
          // signupEmbed.addField('Healer', getRoleStarterFieldValue({ reaction, starterArray: starter.healer }), true);
          // signupEmbed.addField('DPS', getRoleStarterFieldValue({ reaction, starterArray: starter.dps }), true);
          // if () {
          //   signupEmbed.addField('Backups', getBackupFieldValue({ reaction, backupArray }));
          // }
          embedMessage.edit(signupEmbed);
        };

        let collectionTimeout;

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

          // Backup roles specifically not handled here
          clearTimeout(collectionTimeout);
          collectionTimeout = setTimeout(chooseStarters, embedDelay, { reaction });
        });

        collector.on('remove', (reaction, user) => {
          const reactionJob = reaction.emoji.name;
          signup[reactionJob] = signup[reactionJob].filter((item) => item !== user.id);

          if (tankJobs.includes(reactionJob)
          && !signup.pld.includes(user.id) && !signup.war.includes(user.id)
          && !signup.drk.includes(user.id) && !signup.gnb.includes(user.id)) {
            signup.tank = signup.tank.filter((item) => item !== user.id);
          }

          if (healerJobs.includes(reactionJob)
          && !signup.whm.includes(user.id) && !signup.sch.includes(user.id)
          && !signup.ast.includes(user.id)) {
            signup.healer = signup.healer.filter((item) => item !== user.id);
          }

          if (dpsJobs.includes(reactionJob)
          && !signup.mnk.includes(user.id) && !signup.drg.includes(user.id)
          && !signup.nin.includes(user.id) && !signup.sam.includes(user.id)
          && !signup.brd.includes(user.id) && !signup.mch.includes(user.id)
          && !signup.dnc.includes(user.id)
          && !signup.blm.includes(user.id) && !signup.smn.includes(user.id)
          && !signup.rdm.includes(user.id)) {
            signup.dps = signup.dps.filter((item) => item !== user.id);
          }

          if (!signup.tank.includes(user.id) && !signup.healer.includes(user.id)
          && !signup.dps.includes(user.id)) {
            signup.all = signup.all.filter((item) => item !== user.id);
          }

          clearTimeout(collectionTimeout);
          collectionTimeout = setTimeout(chooseStarters, embedDelay, { reaction });
        });
      }).catch(console.error);
  }
});

client.login(token);
