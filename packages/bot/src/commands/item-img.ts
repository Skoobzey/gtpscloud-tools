import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../client.js';
import { config } from '../config.js';

const TEXTURE_BASE = 'https://api.gtps.cloud/api/item/texture';
const UPSCALE = 8;

export const itemImgCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('item-img')
    .setDescription('Look up a GTPS item texture by item ID')
    .addIntegerOption((o) =>
      o
        .setName('id')
        .setDescription('The item ID to look up')
        .setRequired(true)
        .setMinValue(0),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const itemId = interaction.options.getInteger('id', true);

    await interaction.deferReply();

    const textureUrl = `${TEXTURE_BASE}/${itemId}`;

    const res = await fetch(textureUrl);

    if (!res.ok) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(config.brand.colorDanger)
            .setTitle('Item Not Found')
            .setDescription(`No texture found for item ID \`${itemId}\`.`)
            .setFooter({ text: config.brand.name }),
        ],
      });
      return;
    }

    const contentType = res.headers.get('content-type') ?? 'image/png';
    const rawBuffer = Buffer.from(await res.arrayBuffer());

    let finalBuffer: Buffer;
    let ext = 'png';

    try {
      const { default: sharp } = await import('sharp');
      const metadata = await sharp(rawBuffer).metadata();
      const w = (metadata.width ?? 32) * UPSCALE;
      const h = (metadata.height ?? 32) * UPSCALE;
      finalBuffer = await sharp(rawBuffer).resize(w, h, { kernel: 'nearest' }).png().toBuffer();
    } catch {
      finalBuffer = rawBuffer;
      if (contentType.includes('gif')) ext = 'gif';
    }

    const attachment = new AttachmentBuilder(finalBuffer, { name: `item_${itemId}.${ext}` });

    const embed = new EmbedBuilder()
      .setColor(config.brand.color)
      .setTitle(`Item #${itemId}`)
      .setImage(`attachment://item_${itemId}.${ext}`)
      .setFooter({ text: `${config.brand.name} • Item ID: ${itemId}` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], files: [attachment] });
  },
};
