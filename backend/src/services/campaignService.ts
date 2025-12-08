import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ResourceUsage {
    startTime: number; // Unix timestamp
    endTime: number;
    steamLoad: number;
}

export const campaignService = {
    async generateCampaign(
        recipeId: number,
        targetQuantity: number,
        requestStartTime: Date = new Date()
    ) {
        console.log(`Generating campaign for Recipe ID ${recipeId}, Target: ${targetQuantity}`);

        // 1. Fetch Request & Constraints
        const recipe = await prisma.recipe.findUnique({
            where: { id: recipeId },
            include: { steps: true }
        });
        if (!recipe) throw new Error("Recipe not found");

        const batchSize = 1000; // Assume standard batch size for now, or fetch from recipe
        const numBatches = Math.ceil(targetQuantity / batchSize);
        console.log(`Requires ${numBatches} batches.`);

        // Find Boiler Capacity (Total Steam Available)
        // We look for equipment that *provides* steam. 
        // In our seed, Boiler has maxSteamLoad = 40. 
        // Let's assume maxSteamLoad on a BOILER represents Capacity.
        const sources = await prisma.equipment.findMany({
            where: {
                OR: [
                    { name: { contains: 'Boiler', mode: 'insensitive' } },
                    { equipmentId: { contains: 'BO' } }
                ]
            }
        });

        // Sum total capacity if multiple boilers
        const totalSteamCapacity = sources.reduce((sum, eq) => sum + Number(eq.maxSteamLoad || 0), 0);
        console.log(`Total Plant Steam Capacity: ${totalSteamCapacity} TPH`);

        // 2. Scheduler State
        const scheduledBatches = [];
        const steamUsageTimeline: ResourceUsage[] = [];

        let earliestStart = requestStartTime.getTime();

        for (let i = 0; i < numBatches; i++) {
            let tentativeStart = earliestStart;
            let schedulingComplete = false;

            // Greedily find slot
            while (!schedulingComplete) {
                let valid = true;
                const batchSteamUsage: ResourceUsage[] = [];

                // Check each step for this batch at this tentative time
                let currentStepOffset = 0;
                for (const step of recipe.steps.sort((a, b) => a.stepNumber - b.stepNumber)) {
                    const stepStart = tentativeStart + currentStepOffset;
                    const stepDuration = Number(step.duration || 60);
                    const stepEnd = stepStart + (stepDuration * 60000);

                    const steamReq = Number(step.steamRequired || 0);

                    if (steamReq > 0) {
                        // Check overlap with global timeline
                        if (!this.checkCapacity(stepStart, stepEnd, steamReq, steamUsageTimeline, totalSteamCapacity)) {
                            valid = false;
                            break;
                        }
                        batchSteamUsage.push({ startTime: stepStart, endTime: stepEnd, steamLoad: steamReq });
                    }
                    currentStepOffset += (stepDuration * 60000);
                }

                if (valid) {
                    // Commit
                    steamUsageTimeline.push(...batchSteamUsage);
                    scheduledBatches.push({
                        batchNo: i + 1,
                        startTime: new Date(tentativeStart),
                        endTime: new Date(tentativeStart + currentStepOffset) // End of last step
                    });

                    // Optimization: We could start the *next* batch earlier if strictly parallel, 
                    // but for simplicity let's say next batch tries to start immediately (0 lag) and gets pushed if needed.
                    // Actually, "Campaign" usually implies sequential or overlapped. 
                    // Let's try to start next batch at same time (maximally parallel) and let constraints push it?
                    // Or standard Campaign logic: start as soon as possible.
                    // We leave `earliestStart` as requestStartTime to attempt full parallel.

                    schedulingComplete = true;
                } else {
                    // Bump time by 15 minutes and retry
                    tentativeStart += (15 * 60000);
                }
            }
        }

        return scheduledBatches;
    },

    checkCapacity(start: number, end: number, required: number, timeline: ResourceUsage[], limit: number): boolean {
        // Simple discrete check?
        // Check every usage block in timeline that overlaps
        // We need to find the MAX peak usage during [start, end]

        // Find all intervals overlapping with [start, end]
        const relevant = timeline.filter(u => u.startTime < end && u.endTime > start);

        // Create critical points (start/end times within the window)
        const points = new Set<number>();
        points.add(start);
        points.add(end);
        relevant.forEach(r => {
            if (r.startTime >= start && r.startTime <= end) points.add(r.startTime);
            if (r.endTime >= start && r.endTime <= end) points.add(r.endTime);
        });

        const sortedPoints = Array.from(points).sort((a, b) => a - b);

        // Check each segment
        for (let i = 0; i < sortedPoints.length - 1; i++) {
            const segStart = sortedPoints[i];
            const segEnd = sortedPoints[i + 1];
            const mid = (segStart + segEnd) / 2;

            // Sum load at 'mid'
            let currentLoad = 0;
            relevant.forEach(r => {
                if (r.startTime <= mid && r.endTime >= mid) {
                    currentLoad += r.steamLoad;
                }
            });

            if (currentLoad + required > limit) {
                return false; // Constraint violated
            }
        }

        return true;
    }
};
