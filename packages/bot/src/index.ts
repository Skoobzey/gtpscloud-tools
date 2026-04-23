import { client, commands } from './client.js';
import { config } from './config.js';
import { ready } from './events/ready.js';
import { interactionCreate } from './events/interactionCreate.js';
import { messageCreate } from './events/messageCreate.js';
import { ticketCommand } from './commands/ticket.js';
import { panelCommand } from './commands/panel.js';
import { adminCommand } from './commands/admin.js';
import { itemImgCommand } from './commands/item-img.js';

commands.set(ticketCommand.data.name, ticketCommand);
commands.set(panelCommand.data.name, panelCommand);
commands.set(adminCommand.data.name, adminCommand);
commands.set(itemImgCommand.data.name, itemImgCommand);

client.once('clientReady', ready);
client.on('interactionCreate', interactionCreate);
client.on('messageCreate', messageCreate);

client.login(config.token);
