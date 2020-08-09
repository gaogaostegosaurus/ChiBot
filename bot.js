/* eslint no-param-reassign: ["error", { "props": false }] */
/* eslint-disable no-console */
/* eslint-disable prefer-destructuring */

// Bot requires delete permission (will complain but work otherwise)
// Likely best to give only bot permission to add reactions

// LOOK AT THESE FUCKING GLOBALS
// MAN, ARE YOU IN THE MOOD FOR SOME FUCKING SPAGHETTI CODE TOO?

// Embed config variables
const embedDelay = 1000; // ms to wait before changing embed (to prevent rate limiting?)
const openString = '<OPEN>'; // Set string to designate open slots
const maxJobIcons = 2; // Maximum number of icons next to a name - changes to role icon after this

const Discord = require('discord.js');
const { prefix, token } = require('./config.json');

const client = new Discord.Client();

// Define jobs - these strings need to be defined as emojis in the channel
const tankJobs = ['pld', 'war', 'drk', 'gnb'];
const healerJobs = ['whm', 'sch', 'ast'];
const dpsJobs = ['mnk', 'drg', 'nin', 'sam', 'brd', 'mch', 'dnc', 'blm', 'smn', 'rdm'];
const allRoles = ['tank', 'healer', 'dps'];
const allJobs = tankJobs.concat(healerJobs, dpsJobs);

client.once('ready', () => {
  console.log('Bot ready. It\'s alive. IT\'S ALIVE!!');
});

client.on('message', (message) => {
  // Stop early if message isn't for bot (or is from a bot)
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  // Create array to keep track of all player info
  const signupArray = [];

  // This keeps track of overflow between groups
  let overflowArray = [];

  // Define job emojis
  const reactionEmoji = {};
  const emojiList = []; // After the forEach below, this contains all the job emojis
  allJobs.forEach((job) => {
    reactionEmoji[job] = message.guild.emojis.cache.find((emoji) => emoji.name === job);
    emojiList.push(reactionEmoji[job]);
  });

  allRoles.forEach((role) => {
    reactionEmoji[role] = message.guild.emojis.cache.find((emoji) => emoji.name === role);
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

    const groupCap = tankCap + healerCap + dpsCap;

    // Set up signup object and arrays
    // const signup = {};
    // signup.tank = [];
    // signup.healer = [];
    // signup.dps = [];
    // signup.all = [];
    // backupRoles.forEach((role) => {
    //   signup[role] = [];
    // });

    // Set up starter/backup objects - arrays are filled in with function below
    // const starter = {};
    // const backup = {};

    message.delete({ timeout: 5000, reason: 'Cleanup command phrase after 5 seconds' });

    // Create base embed
    const signupEmbed = new Discord.MessageEmbed()
      .setTitle(embedTitle)
      .setDescription('How to use: https://github.com/gaogaostegosaurus/ChiBot\nTL;DR: Click on job(s) you actually want to play.')
      // .setFooter('')
      .setTimestamp();

    let initialFieldValue = '';
    for (let i = 1; i <= groupCap; i += 1) {
      // Fill with string showing open slots
      initialFieldValue = initialFieldValue.concat(openString);
      // Add carriage return for next line
      if (i < groupCap) { initialFieldValue = initialFieldValue.concat('\n'); }
    }
    signupEmbed.addField('Group 1', initialFieldValue, true);

    message.channel.send(signupEmbed)
      .then((embedMessage) => {
        const filter = (reaction, user) => emojiList.includes(reaction.emoji) && !user.bot;
        const collector = embedMessage.createReactionCollector(filter, {
          dispose: true, // dispose true is needed to track remove events, I don't know why
        });

        // Add job emojis for reacting
        emojiList.forEach(async (emoji) => {
          await embedMessage.react(emoji);
        });

        let group1Array = [];
        let group2Array = [];
        let group3Array = [];
        let embedTimeout;

        const getGroupFieldValue = ({ // Function to build starter lists
          groupArray,
        } = {}) => {
          // Start with empty string
          let groupFieldValue = '';

          // Loop through array
          groupArray.forEach((e) => {
            // Add job icons for current role
            let jobIcons = '';
            let jobIconCount = 0;
            if (e.tank) {
              e.tank.forEach((job) => {
                if (jobIconCount < maxJobIcons) {
                  jobIcons = jobIcons.concat(reactionEmoji[job]);
                  jobIconCount += 1;
                } else {
                  jobIcons = '';
                  jobIcons = jobIcons.concat(reactionEmoji.tank);
                }
              });
            } else if (e.healer) {
              e.healer.forEach((job) => {
                if (jobIconCount < maxJobIcons) {
                  jobIcons = jobIcons.concat(reactionEmoji[job]);
                  jobIconCount += 1;
                } else {
                  jobIcons = '';
                  jobIcons = jobIcons.concat(reactionEmoji.healer);
                }
              });
            } else if (e.dps) {
              e.dps.forEach((job) => {
                if (jobIconCount < maxJobIcons) {
                  jobIcons = jobIcons.concat(reactionEmoji[job]);
                  jobIconCount += 1;
                } else {
                  jobIcons = '';
                  jobIcons = jobIcons.concat(reactionEmoji.dps);
                }
              });
            }

            // Add icons for flex roles
            let flexIcons = '';
            if (e.flex) {
              e.flex.forEach((role) => {
                flexIcons = flexIcons.concat(reactionEmoji[role]);
              });
            }

            // Create display for field
            let display = jobIcons.concat(' ', e.name.slice(0, 21));
            if (flexIcons) {
              display = display.concat('  (Flex:', flexIcons, ')');
            }

            // Add entire string to group field value
            groupFieldValue = groupFieldValue.concat(display);

            // Add return to field if not final entry
            if (groupArray.indexOf(e) < groupCap - 1) {
              groupFieldValue = groupFieldValue.concat('\n');
            }
          });

          // Fill any remaining slots with open string
          for (let i = groupArray.length + 1; i <= groupCap; i += 1) {
            groupFieldValue = groupFieldValue.concat(`${openString}`);
            if (i < groupCap) {
              groupFieldValue = groupFieldValue.concat('\n');
            }
          }

          return groupFieldValue;
        };

        const fillGroup = ({ // Function for (re)building starter lists
          currentArray,
          group,
        } = {}) => {
          let tankArray = [];
          let healerArray = [];
          let dpsArray = [];

          // This loop tries to create a group with the fewest possible signups
          // If it fails, then it increases by 1 and repeats.
          for (let i = 0; i < currentArray.length; i += 1) {
            if (currentArray.length === 0) { break; } // Array is empty
            // Reset arrays
            tankArray = [];
            healerArray = [];
            dpsArray = [];
            overflowArray = [];

            const thArray = [];
            const tdArray = [];
            const hdArray = [];
            const thdArray = [];

            for (let j = 0; j <= i; j += 1) {
              if (currentArray[j].tank.length >= 1
              && currentArray[j].healer.length >= 1
              && currentArray[j].dps.length >= 1) {
                thdArray.push(currentArray[j]);
              } else if (currentArray[j].tank.length >= 1
              && currentArray[j].healer.length >= 1) {
                thArray.push(currentArray[j]);
              } else if (currentArray[j].tank.length >= 1
              && currentArray[j].dps.length >= 1) {
                tdArray.push(currentArray[j]);
              } else if (currentArray[j].healer.length >= 1
              && currentArray[j].dps.length >= 1) {
                hdArray.push(currentArray[j]);
              } else if (currentArray[j].tank.length >= 1) {
                if (tankArray.length < tankCap) {
                  tankArray.push({
                    time: currentArray[j].time,
                    id: currentArray[j].id,
                    name: currentArray[j].name,
                    tank: currentArray[j].tank,
                  });
                } else {
                  overflowArray.push(currentArray[j]);
                }
              } else if (currentArray[j].healer.length >= 1) {
                if (healerArray.length < healerCap) {
                  healerArray.push({
                    time: currentArray[j].time,
                    id: currentArray[j].id,
                    name: currentArray[j].name,
                    healer: currentArray[j].healer,
                  });
                } else {
                  overflowArray.push(currentArray[j]);
                }
              } else if (currentArray[j].dps.length >= 1) {
                if (dpsArray.length < dpsCap) {
                  dpsArray.push({
                    time: currentArray[j].time,
                    id: currentArray[j].id,
                    name: currentArray[j].name,
                    dps: currentArray[j].dps,
                  });
                } else {
                  overflowArray.push(currentArray[j]);
                }
              }
            }

            // Reassign flex signups
            let flexCount = thArray.length + tdArray.length
              + hdArray.length + thdArray.length;

            while (flexCount > 0) {
              const tankCount = tankArray.length;
              const healerCount = healerArray.length;
              const dpsCount = dpsArray.length;
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
                if (healerFlex > 0 && healerNeed - healerFlex <= dpsNeed - dpsFlex && thCount > 0) {
                  tankArray.push({
                    time: thArray[0].time,
                    id: thArray[0].id,
                    name: thArray[0].name,
                    tank: thArray[0].tank,
                    flex: ['healer'],
                  });
                  thArray.splice(0, 1);
                } else if (dpsFlex > 0 && tdCount > 0) {
                  tankArray.push({
                    time: tdArray[0].time,
                    id: tdArray[0].id,
                    name: tdArray[0].name,
                    tank: tdArray[0].tank,
                    flex: ['dps'],
                  });
                  tdArray.splice(0, 1);
                } else if (healerFlex > 0 && thCount > 0) {
                  tankArray.push({
                    time: thArray[0].time,
                    id: thArray[0].id,
                    name: thArray[0].name,
                    tank: thArray[0].tank,
                    flex: ['healer'],
                  });
                  thArray.splice(0, 1);
                } else {
                  tankArray.push({
                    time: thdArray[0].time,
                    id: thdArray[0].id,
                    name: thdArray[0].name,
                    tank: thdArray[0].tank,
                    flex: ['healer', 'dps'],
                  });
                  thdArray.splice(0, 1);
                }
              } else if (healerFlexNeed > 0 && healerFlexNeed >= maxFlexNeed) {
                if (tankFlex > 0 && tankNeed - tankFlex <= dpsNeed - dpsFlex && thCount > 0) {
                  healerArray.push({
                    time: thArray[0].time,
                    id: thArray[0].id,
                    name: thArray[0].name,
                    healer: thArray[0].healer,
                    flex: ['tank'],
                  });
                  thArray.splice(0, 1);
                } else if (dpsFlex > 0 && hdCount > 0) {
                  healerArray.push({
                    time: hdArray[0].time,
                    id: hdArray[0].id,
                    name: hdArray[0].name,
                    healer: hdArray[0].healer,
                    flex: ['dps'],
                  });
                  hdArray.splice(0, 1);
                } else if (tankFlex > 0 && thCount > 0) {
                  healerArray.push({
                    time: thArray[0].time,
                    id: thArray[0].id,
                    name: thArray[0].name,
                    healer: thArray[0].healer,
                    flex: ['tank'],
                  });
                  thArray.splice(0, 1);
                } else {
                  healerArray.push({
                    time: thdArray[0].time,
                    id: thdArray[0].id,
                    name: thdArray[0].name,
                    healer: thdArray[0].healer,
                    flex: ['tank', 'dps'],
                  });
                  thdArray.splice(0, 1);
                }
              } else if (dpsFlexNeed > 0 && dpsFlexNeed >= maxFlexNeed) {
                if (tankFlex > 0 && tankNeed - tankFlex <= healerNeed - healerFlex && tdCount > 0) {
                  dpsArray.push({
                    time: tdArray[0].time,
                    id: tdArray[0].id,
                    name: tdArray[0].name,
                    dps: tdArray[0].dps,
                    flex: ['tank'],
                  });
                  tdArray.splice(0, 1);
                } else if (healerFlex > 0 && hdCount > 0) {
                  dpsArray.push({
                    time: hdArray[0].time,
                    id: hdArray[0].id,
                    name: hdArray[0].name,
                    dps: hdArray[0].dps,
                    flex: ['healer'],
                  });
                  hdArray.splice(0, 1);
                } else if (tankFlex > 0 && tdCount > 0) {
                  dpsArray.push({
                    time: tdArray[0].time,
                    id: tdArray[0].id,
                    name: tdArray[0].name,
                    dps: tdArray[0].dps,
                    flex: ['tank'],
                  });
                  tdArray.splice(0, 1);
                  console.log('Reassigned TD => D (Just here to confirm if it\'s even needed)');
                } else {
                  dpsArray.push({
                    time: thdArray[0].time,
                    id: thdArray[0].id,
                    name: thdArray[0].name,
                    dps: thdArray[0].dps,
                    flex: ['tank', 'healer'],
                  });
                  thdArray.splice(0, 1);
                }
              }

              // Update flex signup count
              flexCount = thArray.length + tdArray.length
                + hdArray.length + thdArray.length;
            }

            let sufficientTanks = false;
            let sufficientHealers = false;
            let sufficientDPS = false;

            if (tankArray.length >= tankCap) { // >= because of single-role shenanigans
              sufficientTanks = true;
            }

            if (healerArray.length >= healerCap) {
              sufficientHealers = true;
            }

            if (dpsArray.length >= dpsCap) {
              sufficientDPS = true;
            }

            if (sufficientTanks && sufficientHealers && sufficientDPS) {
              console.log(`Found sufficient members after ${i + 1} entries`);
              // Dump everyone else in overflow
              overflowArray = overflowArray.concat(thArray, tdArray, hdArray, thdArray);
              break;
            }
          }

          if (group === '1') {
            group1Array = tankArray.concat(healerArray, dpsArray);
            group1Array.sort((a, b) => ((a.time > b.time) ? 1 : -1));
          } else if (group === '2') {
            group2Array = tankArray.concat(healerArray, dpsArray);
            group2Array.sort((a, b) => ((a.time > b.time) ? 1 : -1));
          } else if (group === '3') {
            group3Array = tankArray.concat(healerArray, dpsArray);
            group3Array.sort((a, b) => ((a.time > b.time) ? 1 : -1));
          }
          overflowArray.sort((a, b) => ((a.time > b.time) ? 1 : -1));
        };

        const editEmbed = () => {
          signupEmbed.fields = [];
          fillGroup({ currentArray: signupArray, group: '1' });
          if (group1Array && group1Array.length > 0) {
            const group1FieldValue = getGroupFieldValue({ groupArray: group1Array, group: '1' });
            signupEmbed.addField('Group 1', group1FieldValue, true);
          } else {
            let group1FieldValue = '';
            for (let i = 1; i <= groupCap; i += 1) {
              // Fill with string showing open slots
              group1FieldValue = group1FieldValue.concat(openString);
              // Add carriage return for next line
              if (i < groupCap) { group1FieldValue = group1FieldValue.concat('\n'); }
            }
            signupEmbed.addField('Group 1', group1FieldValue, true);
            // signupEmbed.addField('\u200B', group1FieldValue[1], true);
            // signupEmbed.addField('\u200B', group1FieldValue[2], true);
          }

          fillGroup({ currentArray: overflowArray, group: '2' });
          if (group2Array && group2Array.length > 0) {
            // signupEmbed.addField('\u200B', '\u200B') // Create a spacer field
            const group2FieldValue = getGroupFieldValue({ groupArray: group2Array, group: '2' });
            signupEmbed.addField('Group 2', group2FieldValue, true);
          }

          fillGroup({ currentArray: overflowArray, group: '3' });
          if (group3Array && group3Array.length > 0) {
            // signupEmbed.addField('\u200B', '\u200B') // Create a spacer field
            const group3FieldValue = getGroupFieldValue({ groupArray: group3Array, group: '3' });
            signupEmbed.addField('Group 3', group3FieldValue, true);
          }

          if (overflowArray && overflowArray.length > 0) {
            let overflowFieldValue = '';
            overflowArray.forEach((e) => {
              overflowFieldValue = overflowFieldValue.concat(e.name);
              if (overflowArray.indexOf(e) < overflowArray.length - 1) {
                overflowFieldValue = overflowFieldValue.concat(', ');
              }
            });
            signupEmbed.addField('Overflow', overflowFieldValue);
          }

          clearTimeout(embedTimeout);
          embedTimeout = setTimeout(() => {
            embedMessage.edit(signupEmbed);
          }, embedDelay);
        };

        collector.on('collect', (reaction, user) => { // Someone reacts to the embed
          const reactionJob = reaction.emoji.name; // Job they reacted as
          let index = 0;
          // Add to signupArray //
          if (signupArray.some((e) => e.id === user.id)) {
            // Player has already signed up (is found in array)
            // Find index of ID
            // Since ID is unique (I think) best to use this for searching
            index = signupArray.findIndex((e) => e.id === user.id);
            // Update name (if it has changed?)
            signupArray[index].name = reaction.emoji.guild.members.cache.get(user.id).displayName;
          } else {
            // Player has not signed up yet
            // Push player info to array
            signupArray.push({
              time: Date.now(), // To sort later
              id: user.id,
              name: reaction.emoji.guild.members.cache.get(user.id).displayName,
              tank: [],
              healer: [],
              dps: [],
            });
            // Set index of final element
            index = signupArray.length - 1;
          }

          // Add jobs
          if (tankJobs.includes(reactionJob)) {
            signupArray[index].tank = signupArray[index].tank.concat([reactionJob]);
          } else if (healerJobs.includes(reactionJob)) {
            signupArray[index].healer = signupArray[index].healer.concat([reactionJob]);
          } else if (dpsJobs.includes(reactionJob)) {
            signupArray[index].dps = signupArray[index].dps.concat([reactionJob]);
          }

          // Debug check for signup Array
          console.log(`${JSON.stringify(signupArray)}`);

          editEmbed();
        });

        collector.on('remove', (reaction, user) => {
          const reactionJob = reaction.emoji.name;
          const index = signupArray.findIndex((e) => e.id === user.id);

          // Update name
          signupArray[index].name = reaction.emoji.guild.members.cache.get(user.id).displayName;

          // Remove job from the array of jobs
          if (tankJobs.includes(reactionJob)) {
            signupArray[index].tank = signupArray[index].tank.filter(
              (job) => job !== reactionJob,
            );
          } else if (healerJobs.includes(reactionJob)) {
            signupArray[index].healer = signupArray[index].healer.filter(
              (job) => job !== reactionJob,
            );
          } else if (dpsJobs.includes(reactionJob)) {
            signupArray[index].dps = signupArray[index].dps.filter(
              (job) => job !== reactionJob,
            );
          }

          // Remove array entry if no longer signed up as anything
          if (Math.max(
            signupArray[index].tank.length,
            signupArray[index].healer.length,
            signupArray[index].dps.length,
          ) === 0) {
            signupArray.splice(index, 1);
          }

          // Debug check for signup Array
          console.log(`${JSON.stringify(signupArray)}`);

          editEmbed();
        });
      }).catch(console.error);
  }
});

client.login(token);
