# ChiBot

## How to use

Click the `:job(s):` you **prefer** to play.

### For event organizers

`!signup (full|light|alliance)`
- full: 2 tanks, 2 healers, 4 dps (this is the default if you leave off the argument)
- light: 1 tank, 1 healer, 2 dps
- alliance: 3 tanks, 6 healers, 15 dps
- custom: *a* tanks, *b* healers, *c* dps (disabled for now)

Anyone who signs up will be given suggested job or role assignments.

### For installation

Install git and node.js, then `git clone https://github.com/gaogaostegosaurus/ChiBot.git && cd ChiBot && bash start.sh`

The clone command creates a ChiBot folder inside the folder you run the command from.

You will also need emojis for every job in lowercase (`:pld:`, `:war:`, etc.) as well as `:tank:`, `:healer:`, and `:dps:`.

## FAQ

### What does it mean?
![Example](/img/example.png)
- This person is signed up as NIN and RDM.
- The tank icon on the right shows that they are fine with "flexing" to a tank job (but the bot has calculated DPS as a greater need right now).
- Since there is no healer flex icon on the right, they didn't sign up with any healer jobs.
- (This is slightly outdated as of 8/8/2020 but same ideas hold.)

## To do

1) Backup list is pretty janky
2) More algorithm testing
3) A non-volatile db, lol (maybe use Google Sheets API)
