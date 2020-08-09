# ChiBot

## How to use

### Signing up

Click the `:job(s):` you **prefer**. The bot will automatically try to sort the current signup list. Unclick all roles to remove yourself from consideration entirely.

Click `:backup_[role]:` to sign up as a backup and give yourself low priority on the list, or to let people know you can (but prefer not to) switch to these roles.

### For event organizers

`!signup (full|light|alliance)`
- full: 2 tanks, 2 healers, 4 dps (this is the default if you leave off the argument)
- light: 1 tank, 1 healer, 2 dps
- alliance: 3 tanks, 6 healers, 15 dps
- custom: *a* tanks, *b* healers, *c* dps (disabled for now)

### For installation

Install git and node.js, then `git clone && cd ChiBot && npm install && node .`

The clone command creates a ChiBot folder inside the folder you run the command from.

You will also need emojis for every job in lowercase (`:pld:`, `:war:`, etc.) as well as `:backup_tank:`, `:backup_healers:`, and `:backup_dps:`.

## FAQ

### What does it mean?
![Example](/img/example.png)
- This person is signed up as NIN and RDM.
- The tank icon on the right shows that they are fine with "flexing" to a tank job (but the bot has calculated DPS as a greater need right now).
- Since there is no healer flex icon on the right, they didn't sign up with any healer jobs.
- (This is slightly outdated as of 8/8/2020 but same ideas hold.)

### How does the bot decide where to put people?
1) Priority goes to first signups. If the bot can place you, it will place you before anyone else that signs up afterwards.
2) If you pick more than one role, the bot attempts to use you to fill the largest gap between current and needed signups. In the event of a tie, since someone has to win tiebreakers, tank > healer > DPS. (DPS likely often win though because of the larger amount of slots.)
3) Anyone that doesn't fit gets placed at the top of the backup list, sorted by their signup time.

## To do

1) Backup list is pretty janky
2) More algorithm testing
3) A non-volatile db, lol
