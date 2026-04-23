import { MessageFlags } from 'discord.js';
import type { Interaction } from 'discord.js';
import { commands } from '../client.js';
import { config } from '../config.js';
import { handleButton } from '../handlers/buttons.js';
import { handleModal } from '../handlers/modals.js';
import { handleSelectMenu } from '../handlers/selectMenus.js';

export async function interactionCreate(interaction: Interaction) {
  if (!interaction.guildId || interaction.guildId !== config.guildId) return;

  if (interaction.isChatInputCommand()) {
    const command = commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(`[Command Error] ${interaction.commandName}:`, err);
      const payload = { content: 'An error occurred while executing this command.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload);
      } else {
        await interaction.reply(payload);
      }
    }
    return;
  }

  if (interaction.isButton()) {
    await handleButton(interaction);
    return;
  }

  if (interaction.isModalSubmit()) {
    await handleModal(interaction);
    return;
  }

  if (interaction.isStringSelectMenu()) {
    await handleSelectMenu(interaction);
    return;
  }
}
