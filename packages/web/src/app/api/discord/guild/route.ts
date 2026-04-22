import { NextResponse } from 'next/server';

const GUILD_ID = process.env.GUILD_ID ?? '1347199940920606730';

async function discordFetch(path: string) {
  const res = await fetch(`https://discord.com/api/v10${path}`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`Discord API ${res.status}`);
  return res.json();
}

export async function GET() {
  try {
    const [channels, roles] = await Promise.all([
      discordFetch(`/guilds/${GUILD_ID}/channels`),
      discordFetch(`/guilds/${GUILD_ID}/roles`),
    ]);

    const textChannels = (channels as Array<{ id: string; name: string; type: number }>)
      .filter((c) => c.type === 0)
      .map((c) => ({ id: c.id, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const discordCategories = (channels as Array<{ id: string; name: string; type: number }>)
      .filter((c) => c.type === 4)
      .map((c) => ({ id: c.id, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const filteredRoles = (roles as Array<{ id: string; name: string; color: number; managed: boolean }>)
      .filter((r) => !r.managed && r.name !== '@everyone')
      .map((r) => ({ id: r.id, name: r.name, color: r.color }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ channels: textChannels, discordCategories, roles: filteredRoles });
  } catch {
    return NextResponse.json({ channels: [], roles: [] }, { status: 500 });
  }
}
