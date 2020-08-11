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

    message.delete({ timeout: 5000, reason: 'Cleanup command phrase after 5 seconds' });

    // Create base embed
    const signupEmbed = new Discord.MessageEmbed()
      .setTitle(embedTitle)
      .setDescription('How to use: https://github.com/gaogaostegosaurus/ChiBot\nTL;DR: Click on job(s) you really want to play.')
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
      .then(async (embedMessage) => {
        const filter = (reaction, user) => emojiList.includes(reaction.emoji) && !user.bot;
        const collector = embedMessage.createReactionCollector(filter, {
          dispose: true, // dispose true is needed to track remove events, I don't know why
        });

        // Add job emojis for reacting
        for (let i = 0; i < emojiList.length; i += 1) {
          if (embedMessage) {
            embedMessage.react(emojiList[i]);
          }
        }

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
            let display = jobIcons.concat(' ', e.name.slice(0, 15));
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

        const getGroupArray = ({ // Function for (re)building starter lists
          array,
        } = {}) => {
          if (!array || array.length === 0) {
            console.log('Received empty array; returning empty array');
            return [[], []];
          }

          let tankArray = [];
          let healerArray = [];
          let dpsArray = [];

          // This loop tries to create a group with the fewest possible signups
          // If it fails, then it increases by 1 and repeats.
          for (let i = 0; i < array.length; i += 1) {
            console.log(`Starting loop with ${i + 1} entries`);
            // Reset arrays
            tankArray = [];
            healerArray = [];
            dpsArray = [];

            const thArray = [];
            const tdArray = [];
            const hdArray = [];
            const thdArray = [];

            for (let j = 0; j <= i; j += 1) {
              if (array[j].tank.length >= 1
              && array[j].healer.length >= 1
              && array[j].dps.length >= 1) {
                thdArray.push(array[j]);
              } else if (array[j].tank.length >= 1
              && array[j].healer.length >= 1) {
                thArray.push(array[j]);
              } else if (array[j].tank.length >= 1
              && array[j].dps.length >= 1) {
                tdArray.push(array[j]);
              } else if (array[j].healer.length >= 1
              && array[j].dps.length >= 1) {
                hdArray.push(array[j]);
              } else if (array[j].tank.length >= 1) {
                if (tankArray.length < tankCap) {
                  tankArray.push({
                    time: array[j].time,
                    id: array[j].id,
                    name: array[j].name,
                    tank: array[j].tank,
                  });
                }
              } else if (array[j].healer.length >= 1) {
                if (healerArray.length < healerCap) {
                  healerArray.push({
                    time: array[j].time,
                    id: array[j].id,
                    name: array[j].name,
                    healer: array[j].healer,
                  });
                }
              } else if (array[j].dps.length >= 1) {
                if (dpsArray.length < dpsCap) {
                  dpsArray.push({
                    time: array[j].time,
                    id: array[j].id,
                    name: array[j].name,
                    dps: array[j].dps,
                  });
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
                } else
                if (dpsFlex > 0 && tdCount > 0) {
                  tankArray.push({
                    time: tdArray[0].time,
                    id: tdArray[0].id,
                    name: tdArray[0].name,
                    tank: tdArray[0].tank,
                    flex: ['dps'],
                  });
                  tdArray.splice(0, 1);
                } else
                if (healerFlex > 0 && thCount > 0) {
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
              } else
              if (healerFlexNeed > 0 && healerFlexNeed >= maxFlexNeed) {
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

            if (tankArray.length >= tankCap && healerArray.length >= healerCap
            && dpsArray.length >= dpsCap) {
              // Break early if all members for group found
              console.log(`Found sufficient members after ${i + 1} entries`);
              break;
            } else {
              console.log(`Did not find sufficient members with ${i + 1} entries`);
            }
          }

          const returnArray = [[], []];

          console.log('Sorting role arrays');

          // Sort arrays by time (just in case? probably?)
          if (tankArray.length > 1) { tankArray.sort((a, b) => ((a.time > b.time) ? 1 : -1)); }
          if (healerArray.length > 1) { healerArray.sort((a, b) => ((a.time > b.time) ? 1 : -1)); }
          if (dpsArray.length > 1) { dpsArray.sort((a, b) => ((a.time > b.time) ? 1 : -1)); }

          console.log('Adding people by role to returnArray[0]');

          for (let i = 0; i < Math.min(tankArray.length, tankCap); i += 1) {
            returnArray[0].push(tankArray[i]);
          }
          for (let i = 0; i < Math.min(healerArray.length, healerCap); i += 1) {
            returnArray[0].push(healerArray[i]);
          }
          for (let i = 0; i < Math.min(dpsArray.length, dpsCap); i += 1) {
            returnArray[0].push(dpsArray[i]);
          }

          // Sort final array by time
          if (returnArray[0].length > 1) {
            returnArray[0].sort((a, b) => ((a.time > b.time) ? 1 : -1));
          }

          const tempArray = [...array];

          console.log('Splicing duplicates from temp array');

          for (let i = 0; i < returnArray[0].length; i += 1) {
            for (let j = tempArray.length - 1; j >= 0; j -= 1) {
              // Go backwards due to splicing
              if (tempArray[j].id === returnArray[0][i].id) {
                console.log(`Splicing ${JSON.stringify(tempArray[j])}`);
                tempArray.splice(j, 1);
              }
            }
          }

          returnArray[1] = tempArray;
          console.log(`Returning ${JSON.stringify(returnArray)}`);
          return returnArray;
        };

        const editEmbed = () => {
          signupEmbed.fields = [];

          // Set signupArray to a temporary fill Array
          console.log('Getting group 1');
          const tempArray1 = getGroupArray({ array: signupArray });
          const group1FieldValue = getGroupFieldValue({ groupArray: tempArray1[0] });
          signupEmbed.addField('Group 1', group1FieldValue, true);

          console.log('Getting group 2');
          const tempArray2 = getGroupArray({ array: tempArray1[1] });
          if (tempArray2[0] && tempArray2[0].length > 0) {
            const group2FieldValue = getGroupFieldValue({ groupArray: tempArray2[0] });
            signupEmbed.addField('Group 2', group2FieldValue, true);
          }

          console.log('Getting group 3');
          const tempArray3 = getGroupArray({ array: tempArray2[1] });
          if (tempArray3[0] && tempArray3[0].length > 0) {
            const group3FieldValue = getGroupFieldValue({ groupArray: tempArray3[0] });
            signupEmbed.addField('Group 3', group3FieldValue, true);
          }

          if (tempArray3[1] && tempArray3[1].length > 0) {
            console.log('Getting overflow');
            let overflowFieldValue = '';
            tempArray3[1].forEach((e) => {
              overflowFieldValue = overflowFieldValue.concat(e.name);
              if (tempArray3[1].indexOf(e) < tempArray3[1].length - 1) {
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
            // Update name to allow for changes
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
          // console.log(`${JSON.stringify(signupArray)}`);

          editEmbed();
        });

        collector.on('remove', (reaction, user) => {
          const reactionJob = reaction.emoji.name;
          const index = signupArray.findIndex((e) => e.id === user.id);

          // Update name
          signupArray[index].name = reaction.emoji.guild.members.cache.get(user.id).displayName;

          // Remove reacted job from the array of jobs
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
