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
  let tankMax = 2;
  let healerMax = 2;
  let dpsMax = 4;
  let embedTitle = 'Signup List (Full Party)';

  if (command === 'signup') {
    if (args[0] === 'light') {
      tankMax = 1;
      healerMax = 1;
      dpsMax = 2;
      embedTitle = 'Signup List (Light Party)';
    } else if (args[0] === 'full') {
      tankMax = 2;
      healerMax = 2;
      dpsMax = 4;
      embedTitle = 'Signup List (Full Party)';
    } else if (args[0] === 'alliance') {
      tankMax = 3;
      healerMax = 6;
      dpsMax = 15;
      embedTitle = 'Signup List (Alliance Raid)';
    // } else if (args[0] === 'custom') {
    //   tankMax = args[1];
    //   healerMax = args[2];
    //   dpsMax = args[3];
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
    for (let i = 1; i <= tankMax; i += 1) {
      fieldValue = fieldValue.concat(openString);
      if (i < tankMax) {
        fieldValue = fieldValue.concat('\n'); // Add carriage return for next line
      }
    }
    signupEmbed.addField('Tank', fieldValue, true);

    fieldValue = '';
    for (let i = 1; i <= healerMax; i += 1) {
      fieldValue = fieldValue.concat(openString);
      if (i < healerMax) {
        fieldValue = fieldValue.concat('\n'); // Add carriage return for next line
      }
    }
    signupEmbed.addField('Healer', fieldValue, true);

    fieldValue = '';
    for (let i = 1; i <= dpsMax; i += 1) {
      fieldValue = fieldValue.concat(openString);
      if (i < dpsMax) {
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
        } = {}) => {
          let starterFieldValue = '';

          // Set role jobs
          let jobList = tankJobs;
          let roleMax = tankMax;
          if (starterArray === starter.tank) {
            jobList = tankJobs;
            roleMax = tankMax;
          } else if (starterArray === starter.healer) {
            jobList = healerJobs;
            roleMax = healerMax;
          } else if (starterArray === starter.dps) {
            jobList = dpsJobs;
            roleMax = dpsMax;
          }

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
            if (starterArray.indexOf(id) + 1 < roleMax) {
              starterFieldValue = starterFieldValue.concat('\n');
            }
          });

          // Fill any remaining slots with open string
          for (let i = starterArray.length + 1; i <= roleMax; i += 1) {
            starterFieldValue = starterFieldValue.concat(`${openString}`);
            if (i < roleMax) {
              starterFieldValue = starterFieldValue.concat('\n');
            }
          }

          return starterFieldValue;
        };

        const getBackupFieldValue = ({
          reaction,
        } = {}) => {
          let backupFieldValue = '';

          backup.all.forEach((id) => {
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

            const displayName = backupIcons.concat(
              reaction.emoji.guild.members.cache.get(id).displayName,
            );

            backupFieldValue = backupFieldValue.concat(displayName);
            if (backup.all.indexOf(id) + 1 < backup.all.length) {
              // Comma + space separated seems better than \n because this field can be pretty long
              backupFieldValue = backupFieldValue.concat(', ');
            }
          });

          return backupFieldValue;
        };

        
        const chooseStarters = ({ // Function for (re)building starter lists
          reaction,
        } = {}) => {
          // Reset all starter/backup data so that roles can be re-assigned

          starter.all = [];
          starter.tank = [];
          starter.healer = [];
          starter.dps = [];

          backup.all = [];

          // Loop through entire signup array to decide who goes where
          // Not 100% sure about this algorithm but whatever
          signup.all.forEach((id) => {
            // Calculate which role has the greatest current need
            const tankInNeed = tankMax - signup.tank.length;
            const healerInNeed = healerMax - signup.healer.length;
            const dpsInNeed = dpsMax - signup.dps.length;
            console.log(`In need numbers: Tank=${tankInNeed} Healer=${healerInNeed} DPS=${dpsInNeed}`);

            // Attempt to place player in roles that have not enough or just enough signups

            if (tankInNeed >= Math.max(healerInNeed, dpsInNeed, 1) && signup.tank.includes(id)) {
              starter.all.push(id);
              starter.tank.push(id);
              return;
            }

            if (healerInNeed >= Math.max(tankInNeed, dpsInNeed, 1) && signup.healer.includes(id)) {
              starter.all.push(id);
              starter.healer.push(id);
              return;
            }

            if (dpsInNeed >= Math.max(tankInNeed, healerInNeed, 1) && signup.dps.includes(id)) {
              starter.all.push(id);
              starter.dps.push(id);
              return;
            }

            // Place player in the role with largest current number of open starter positions

            const tankOpenings = tankMax - starter.tank.length;
            const healerOpenings = healerMax - starter.healer.length;
            const dpsOpenings = dpsMax - starter.dps.length;

            if (tankOpenings >= Math.max(healerOpenings, dpsOpenings, 1)
            && signup.tank.includes(id)) {
              starter.all.push(id);
              starter.tank.push(id);
              return;
            }

            if (healerOpenings >= Math.max(tankOpenings, dpsOpenings, 1)
            && signup.healer.includes(id)) {
              starter.all.push(id);
              starter.healer.push(id);
              return;
            }

            if (dpsOpenings >= Math.max(tankOpenings, healerOpenings, 1)
            && signup.dps.includes(id)) {
              starter.all.push(id);
              starter.dps.push(id);
              return;
            }

            // Place in first available opening

            if (tankOpenings > 0 && signup.tank.includes(id)) {
              starter.all.push(id);
              starter.tank.push(id);
              return;
            }

            if (healerOpenings > 0 && signup.healer.includes(id)) {
              starter.all.push(id);
              starter.healer.push(id);
              return;
            }

            if (dpsOpenings > 0 && signup.dps.includes(id)) {
              starter.all.push(id);
              starter.dps.push(id);
              return;
            }

            // No openings
            if (!backup.all.includes(id)) {
              backup.all.push(id);
            }
          }); // End of forEach signup loop here

          // Add all backup-specific signups to backup list
          backupRoles.forEach((role) => {
            signup[role].forEach((id) => {
              if (!backup.all.includes(id)) {
                backup.all.push(id);
              }
            });
          });

          // Starters and backups are all chosen at this point
          console.log(`Full list of starters ${JSON.stringify(starter.all)}`);
          console.log(`Tank starters ${JSON.stringify(starter.tank)}`);
          console.log(`Healer starters ${JSON.stringify(starter.healer)}`);
          console.log(`DPS starters ${JSON.stringify(starter.dps)}`);
          console.log(`Backups ${JSON.stringify(backup.all)}`);

          signupEmbed.fields = [];

          signupEmbed.addField('Tank', getRoleStarterFieldValue({ reaction, starterArray: starter.tank }), true);
          signupEmbed.addField('Healer', getRoleStarterFieldValue({ reaction, starterArray: starter.healer }), true);
          signupEmbed.addField('DPS', getRoleStarterFieldValue({ reaction, starterArray: starter.dps }), true);
          if (getBackupFieldValue({ reaction })) {
            signupEmbed.addField('Backups', getBackupFieldValue({ reaction }));
          }
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
          collectionTimeout = setTimeout(chooseStarters, 3000, { reaction });
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
          collectionTimeout = setTimeout(chooseStarters, 3000, { reaction });

          
        });
      }).catch(console.error);
  }
});

client.login(token);
