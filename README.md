# ChiBot

## Installation

Install git and node.js.

`git clone && cd ChiBot && npm install && node .`

The clone command creates a ChiBot folder inside the folder you run the command from.

## How to use

### Event organizers
`!signup (full|light|alliance|custom a b c)`
- full: 2 tanks, 2 healers, 4 dps (this is the default if you leave off the argument)
- light: 1 tank, 1 healer, 2 dps
- alliance: 3 tanks, 6 healers, 15 dps

### Signup
Click any roles you **prefer**. The bot will automatically try to sort the current signup list. Unclick all roles to remove yourself from consideration entirely.

Click backup_(role) to sign up as a backup and give yourself low priority on the list, or to let people know you can (but prefer not to) switch to these roles.

## FAQ

### How does the bot decide where to put people?
1) Priority goes to first signups. If the bot can place you, it will place you before anyone else that signs up afterwards.
2) If you pick more than one role, the bot attempts to use you to fill the largest gap between current and needed signups. In the event of a tie, since someone has to win tiebreakers, tank > healer > DPS. (DPS likely often win though because of the larger amount of slots.)
3) Anyone that doesn't fit gets placed at the top of the backup list, sorted by their signup time.
