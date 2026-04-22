import type { GuildMember } from 'discord.js';
import { db, guildConfig } from '@gtps/shared';
import { eq } from 'drizzle-orm';
import { config } from '../config.js';

export async function isStaffMember(member: GuildMember | null): Promise<boolean> {
  if (!member) return false;

  const cfg = await db.query.guildConfig.findFirst({
    where: eq(guildConfig.guildId, config.guildId),
  });

  if (!cfg || !cfg.staffRoleIds.length) return false;

  return cfg.staffRoleIds.some((roleId) => member.roles.cache.has(roleId));
}

export async function requireStaff(member: GuildMember | null): Promise<boolean> {
  return isStaffMember(member);
}
