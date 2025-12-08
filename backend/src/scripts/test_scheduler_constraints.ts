import { PrismaClient } from '@prisma/client';
import { campaignService } from '../services/campaignService';

const prisma = new PrismaClient();

async function main() {
    console.log("=== STARTING SCHEDULER STRESS TEST ===");

    // 1. Validate Seeding
    const boiler = await prisma.equipment.findFirst({
        where: { name: { contains: 'Boiler' } }
    });
    console.log(`Boiler Detected: ${boiler?.name}, Capacity: ${Number(boiler?.maxSteamLoad)} TPH`);
    if (!boiler || !boiler.maxSteamLoad || Number(boiler.maxSteamLoad) !== 40) {
        console.error("FAILED: Boiler not seeded correctly with 40 TPH.");
        return;
    }

    const recipe = await prisma.recipe.findFirst({
        where: { name: 'Dicamba' },
        include: { steps: true }
    });

    if (!recipe) {
        console.error("FAILED: Recipe 'Dicamba' not found in database.");
        return;
    }

    console.log(`Recipe Detected: ${recipe.name}`);
    const hydroStep = recipe.steps.find(s => s.name === 'Hydrolysis');
    console.log(`Hydrolysis Steam Req: ${Number(hydroStep?.steamRequired)} TPH`);

    if (!hydroStep || !hydroStep.steamRequired || Number(hydroStep.steamRequired) !== 15) {
        console.error("FAILED: Recipe loads not seeded correctly (Hydrolysis needs 15 TPH).");
        return;
    }

    // 2. Run Scenario
    console.log("\n--- Scheduling 3 Batches (15 * 3 = 45 > 40 Capacity) ---");
    // Target: 3000 units (batch size assumed 1000 in service)
    const batches = await campaignService.generateCampaign(recipe.id, 3000);

    console.log("\n=== GANTT CHART ===");
    batches.forEach(b => {
        console.log(`Batch ${b.batchNo}: Start ${b.startTime.toISOString()} -> End ${b.endTime.toISOString()}`);
    });

    // 3. Assertions
    const startTimes = batches.map(b => b.startTime.getTime());
    const uniqueStarts = new Set(startTimes);

    if (uniqueStarts.size < 2) {
        console.error("\nFAILED: All batches started at same time! Constraint ignored.");
    } else {
        console.log("\nSUCCESS: Batches were staggered to respect utility constraints.");
        const diff = (startTimes[2] - startTimes[0]) / 60000;
        console.log(`Stagger Delay: ${diff} minutes`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
