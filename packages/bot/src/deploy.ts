import { REST, Routes } from 'discord.js';
import { config } from './config.js';
import { ticketCommand } from './commands/ticket.js';
import { panelCommand } from './commands/panel.js';
import { adminCommand } from './commands/admin.js';
import { itemImgCommand } from './commands/item-img.js';

const rest = new REST().setToken(config.token);

const commandData = [
  ticketCommand.data.toJSON(),
  panelCommand.data.toJSON(),
  adminCommand.data.toJSON(),
  itemImgCommand.data.toJSON(),
];

await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
  body: commandData,
});

console.log(`Deployed ${commandData.length} commands to guild ${config.guildId}`);
