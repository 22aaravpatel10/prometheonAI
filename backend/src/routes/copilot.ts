import express from 'express';
import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Tool definitions
const tools = [
  {
    type: "function" as const,
    function: {
      name: "get_schedule",
      description: "Get equipment schedule for a given date range",
      parameters: {
        type: "object",
        properties: {
          equipmentIds: {
            type: "array",
            items: { type: "string" },
            description: "List of equipment IDs (e.g. ['GLR-101'])"
          },
          from: { type: "string", description: "Start date (ISO timestamp)" },
          to: { type: "string", description: "End date (ISO timestamp)" }
        },
        required: ["from", "to"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_inventory",
      description: "Get inventory levels for given material codes or names",
      parameters: {
        type: "object",
        properties: {
          materialCodes: {
            type: "array",
            items: { type: "string" },
            description: "List of material names or codes"
          }
        },
        required: ["materialCodes"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "add_events_from_plan",
      description: "Add process plan steps as calendar events",
      parameters: {
        type: "object",
        properties: {
          equipmentId: { type: "string", description: "Equipment ID to add events for" },
          planItems: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                start: { type: "string", description: "ISO timestamp" },
                end: { type: "string", description: "ISO timestamp" },
                type: { type: "string", enum: ["BATCH", "MAINTENANCE", "CLEANING", "OTHER"] }
              },
              required: ["title", "start", "end"]
            }
          }
        },
        required: ["equipmentId", "planItems"]
      }
    }
  }
];

// Helper functions for tools
async function getSchedule(equipmentIds: string[] | undefined, from: string, to: string) {
  const whereClause: any = {
    startTimestamp: { gte: new Date(from) },
    endTimestamp: { lte: new Date(to) }
  };

  if (equipmentIds && equipmentIds.length > 0) {
    // Find equipment DB IDs from string IDs
    const equipment = await prisma.equipment.findMany({
      where: {
        OR: [
          { name: { in: equipmentIds } },
          { equipmentId: { in: equipmentIds } }
        ]
      },
      select: { id: true }
    });
    const ids = equipment.map(e => e.id);
    if (ids.length > 0) {
      whereClause.equipmentId = { in: ids };
    }
  }

  const batchEvents = await prisma.batchEvent.findMany({
    where: whereClause,
    include: { equipment: true }
  });

  const maintenanceEvents = await prisma.maintenanceEvent.findMany({
    where: whereClause,
    include: { equipment: true }
  });

  return [
    ...batchEvents.map(e => ({
      id: `batch-${e.id}`,
      title: `Batch ${e.batchNo} - ${e.productName}`,
      start: e.startTimestamp,
      end: e.endTimestamp,
      type: 'BATCH',
      equipmentId: e.equipment.name
    })),
    ...maintenanceEvents.map(e => ({
      id: `maint-${e.id}`,
      title: `Maintenance: ${e.reason}`,
      start: e.startTimestamp,
      end: e.endTimestamp,
      type: 'MAINTENANCE',
      equipmentId: e.equipment.name
    }))
  ];
}

async function getInventory(materialCodes: string[]) {
  const materials = await prisma.material.findMany({
    where: {
      OR: [
        { name: { in: materialCodes, mode: 'insensitive' } },
        { materialId: { in: materialCodes, mode: 'insensitive' } }
      ]
    }
  });

  return materials.map(m => ({
    materialCode: m.materialId || m.name,
    description: m.name,
    qtyOnHand: m.currentQuantity,
    uom: m.unit,
    location: 'Warehouse A' // Placeholder as location isn't on Material model
  }));
}

async function addEventsFromPlan(equipmentId: string, planItems: any[]) {
  // Find equipment
  const equipment = await prisma.equipment.findFirst({
    where: {
      OR: [
        { name: { equals: equipmentId, mode: 'insensitive' } },
        { equipmentId: { equals: equipmentId, mode: 'insensitive' } }
      ]
    }
  });

  if (!equipment) {
    throw new Error(`Equipment ${equipmentId} not found`);
  }

  const createdEvents = [];

  for (const item of planItems) {
    if (item.type === 'MAINTENANCE') {
      const event = await prisma.maintenanceEvent.create({
        data: {
          equipmentId: equipment.id,
          reason: 'scheduled', // Default
          startTimestamp: new Date(item.start),
          endTimestamp: new Date(item.end),
          changesMade: item.title
        }
      });
      createdEvents.push(event);
    } else {
      // Default to Batch
      const event = await prisma.batchEvent.create({
        data: {
          equipmentId: equipment.id,
          batchNo: `PLAN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          productName: item.title,
          startTimestamp: new Date(item.start),
          endTimestamp: new Date(item.end),
          status: 'scheduled'
        }
      });
      createdEvents.push(event);
    }
  }

  return { success: true, count: createdEvents.length };
}

// Mock Chat Handler for Simulation Mode
async function handleMockChat(messages: any[]) {
  const lastMessage = messages[messages.length - 1];
  const content = lastMessage.content.toLowerCase();

  // Simple keyword matching to simulate tool usage
  if (content.includes('schedule') || content.includes('calendar') || content.includes('events')) {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const events = await getSchedule(undefined, today.toISOString(), nextWeek.toISOString());
    const eventSummary = events.map(e => `- ${e.title} (${new Date(e.start).toLocaleDateString()})`).join('\n');

    return {
      role: 'assistant',
      content: `[SIMULATION MODE] Here is the schedule for the next 7 days:\n\n${eventSummary || 'No upcoming events found.'}\n\n(Note: Connect OpenAI API Key for full natural language processing)`
    };
  }

  if (content.includes('inventory') || content.includes('stock') || content.includes('material')) {
    // Just fetch a few common materials for demo
    const materials = await getInventory(['Acetone', 'Methanol', 'Water']);
    const materialSummary = materials.map(m => `- ${m.description}: ${m.qtyOnHand} ${m.uom}`).join('\n');

    return {
      role: 'assistant',
      content: `[SIMULATION MODE] Here is a sample of the current inventory:\n\n${materialSummary}\n\n(Note: Connect OpenAI API Key for full natural language processing)`
    };
  }

  return {
    role: 'assistant',
    content: `[SIMULATION MODE] I am PrometheonAI. I see you haven't configured an OpenAI API Key yet.\n\nI can still help you with basic tasks:\n- Ask about "schedule" to see upcoming events\n- Ask about "inventory" to check stock levels\n\nTo enable full AI capabilities, please add your OPENAI_API_KEY to the backend environment variables.`
  };
}

router.post('/', async (req, res) => {
  try {
    const { messages, actionType, context } = req.body;

    // Check for API Key
    if (!process.env.OPENAI_API_KEY) {
      const mockResponse = await handleMockChat(messages);
      return res.json(mockResponse);
    }

    let currentMessages = [...messages];

    // Handle quick actions by appending a system message
    if (actionType === 'optimize_process') {
      currentMessages.push({
        role: 'system',
        content: `You are a manufacturing scheduling assistant. Using the current calendar and inventory, suggest specific schedule changes that increase throughput without violating constraints. Context: ${JSON.stringify(context || {})}`
      });
    } else if (actionType === 'suggest_maintenance') {
      currentMessages.push({
        role: 'system',
        content: `Based on recent events and utilization patterns, suggest a preventative maintenance schedule for the next 30 days, specifying which equipment and recommended downtimes. Context: ${JSON.stringify(context || {})}`
      });
    } else {
      // Default System Prompt
      currentMessages.push({
        role: 'system',
        content: `You are PrometheonAI, an advanced manufacturing assistant for the Batch Processing Assistant "Mission Control".
        
        CAPABILITIES:
        - You HAVE ACCESS to the plant's real-time schedule, inventory, and equipment status via the provided tools.
        - You can read the "Progress" timeline (which users might call "progress bar", "timeline", or "schedule") using the 'get_schedule' tool.
        - You can check inventory levels using 'get_inventory'.
        - You can add new events using 'add_events_from_plan'.

        INSTRUCTIONS:
        - If the user asks about the "progress bar", "timeline", "schedule", or "status", you MUST use the 'get_schedule' tool to fetch the data. 
        - DO NOT claim you cannot access visual interfaces. Instead, say "Let me check the schedule for you..." and call the tool.
        - For 'get_schedule', if no date range is specified, default to the current week.
        - Be concise, high-tech, and helpful.
        
        Context: ${JSON.stringify(context || {})}`
      });
    }

    // Initial call to OpenAI
    let response = await openai.chat.completions.create({
      model: 'gpt-4o', // Using a modern model
      messages: currentMessages,
      tools: tools,
      tool_choice: 'auto',
    });

    let responseMessage = response.choices[0].message;

    // Loop to handle tool calls
    while (responseMessage.tool_calls) {
      currentMessages.push(responseMessage);

      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        let functionResult;

        try {
          if (functionName === 'get_schedule') {
            functionResult = await getSchedule(functionArgs.equipmentIds, functionArgs.from, functionArgs.to);
          } else if (functionName === 'get_inventory') {
            functionResult = await getInventory(functionArgs.materialCodes);
          } else if (functionName === 'add_events_from_plan') {
            functionResult = await addEventsFromPlan(functionArgs.equipmentId, functionArgs.planItems);
          }
        } catch (error: any) {
          functionResult = { error: error.message };
        }

        currentMessages.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: functionName,
          content: JSON.stringify(functionResult),
        });
      }

      // Call OpenAI again with tool results
      response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: currentMessages,
        tools: tools,
        tool_choice: 'auto',
      });

      responseMessage = response.choices[0].message;
    }

    res.json(responseMessage);

  } catch (error: any) {
    console.error('Copilot Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
