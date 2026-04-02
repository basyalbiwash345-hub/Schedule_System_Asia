const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncExistingTeams() {
    console.log("Starting team-user synchronization...");
    try {
        // 1. Fetch all teams
        const teams = await prisma.teams.findMany();

        for (const team of teams) {
            // 2. Parse the members JSON string
            let memberIds = [];
            try {
                memberIds = Array.isArray(team.members) ? team.members : JSON.parse(team.members || '[]');
            } catch (e) {
                console.error(`Failed to parse members for team ${team.name}`);
                continue;
            }

            if (memberIds.length > 0) {
                console.log(`Syncing ${memberIds.length} members for team: ${team.name}`);

                // 3. Perform a bulk update for these users
                const updateResult = await prisma.users.updateMany({
                    where: {
                        id: { in: memberIds.map(id => parseInt(id)) }
                    },
                    data: {
                        team_id: team.id
                    }
                });
                console.log(`Successfully updated ${updateResult.count} users.`);
            }
        }
        console.log("✅ Synchronization complete!");
    } catch (error) {
        console.error("❌ Error during sync:", error);
    } finally {
        await prisma.$disconnect();
    }
}

syncExistingTeams();