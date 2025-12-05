import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
});

export interface ReactionAnalysisResult {
    reactionType: string;
    description: string;
    thermodynamics: {
        enthalpy?: string;
        entropy?: string;
        exothermic?: boolean;
        heatOfReaction?: string;
    };
    kinetics: {
        rateLimitingStep?: string;
        activationEnergy?: string;
        rateLaw?: string;
        catalystEffect?: string;
    };
    safetyData: {
        hazards: string[];
        precautions: string[];
        runawayRisk?: string;
    };
    optimization: {
        yieldFactors: string[];
        rateFactors: string[];
        criticalParameters: string[];
    };
    literatureRefs: {
        title: string;
        authors?: string;
        year?: string;
        journal?: string;
        doi?: string;
        summary?: string;
    }[];
}

export const aiService = {
    async analyzeReactionStep(
        stepName: string,
        description: string,
        materials: { name: string; quantity: number; unit: string }[],
        conditions: { temp?: number; pressure?: number }
    ): Promise<ReactionAnalysisResult> {
        if (!process.env.OPENAI_API_KEY) {
            console.warn('OPENAI_API_KEY not set. Returning mock data.');
            return getMockAnalysis(stepName);
        }

        const prompt = `
      Analyze the following chemical reaction step for a manufacturing process:
      
      Step Name: ${stepName}
      Description: ${description}
      Materials: ${materials.map(m => `${m.name} (${m.quantity} ${m.unit})`).join(', ')}
      Conditions: ${conditions.temp ? `Temperature: ${conditions.temp}` : ''} ${conditions.pressure ? `Pressure: ${conditions.pressure}` : ''}

      Please provide a detailed chemical engineering analysis including:
      1. Reaction Type (e.g., Methylation, Hydrogenation)
      2. Detailed Description of the chemistry
      3. Thermodynamics (Enthalpy, Exothermic/Endothermic)
      4. Kinetics (Rate limiting steps, activation energy info if known generally)
      5. Safety Data (Specific hazards for this reaction, runaway risks)
      6. Optimization Factors (What affects yield and rate?)
      7. Literature References (Cite 2-3 standard papers or textbooks relevant to this type of reaction)

      Format the output as valid JSON matching this structure:
      {
        "reactionType": "string",
        "description": "string",
        "thermodynamics": { "enthalpy": "string", "exothermic": boolean, "heatOfReaction": "string" },
        "kinetics": { "rateLimitingStep": "string", "activationEnergy": "string", "rateLaw": "string" },
        "safetyData": { "hazards": ["string"], "precautions": ["string"], "runawayRisk": "string" },
        "optimization": { "yieldFactors": ["string"], "rateFactors": ["string"], "criticalParameters": ["string"] },
        "literatureRefs": [{ "title": "string", "authors": "string", "year": "string", "summary": "string" }]
      }
    `;

        try {
            const completion = await openai.chat.completions.create({
                messages: [
                    { role: "system", content: "You are an expert Chemical Engineer and Process Chemist. Provide detailed, technical, and accurate analysis of chemical manufacturing steps." },
                    { role: "user", content: prompt }
                ],
                model: "gpt-4o",
                response_format: { type: "json_object" },
            });

            const content = completion.choices[0].message.content;
            if (!content) throw new Error("No content received from OpenAI");

            return JSON.parse(content) as ReactionAnalysisResult;
        } catch (error) {
            console.error("Error calling OpenAI:", error);
            throw error;
        }
    },
    async extractStructure(rawText: string): Promise<any> {
        if (!process.env.OPENAI_API_KEY) {
            console.warn('OPENAI_API_KEY not set. Returning mock structure.');
            return {
                suggestedName: "Mock Recipe from PDF",
                steps: [
                    { name: "Mix Ingredients", description: "Mix all ingredients in the main reactor.", materials: [{ name: "Water", quantity: 100, unit: "L" }], conditions: { temp: 25 } },
                    { name: "Heat Mixture", description: "Heat to 80C for 2 hours.", materials: [], conditions: { temp: 80 } }
                ],
                ingredients: [
                    { name: "Water", quantity: 100, unit: "L" }
                ],
                outputs: [
                    { name: "Final Product", type: "product", amount: 95, unit: "L" }
                ]
            };
        }

        const prompt = `
            Extract the structured recipe information from the following text.
            Identify the recipe name, list of ingredients with quantities, list of steps with descriptions and conditions, and expected outputs.

            Text:
            ${rawText.substring(0, 15000)} // Limit context window

            Format as JSON:
            {
                "suggestedName": "string",
                "ingredients": [{ "name": "string", "quantity": number, "unit": "string" }],
                "steps": [{ 
                    "name": "string", 
                    "description": "string", 
                    "materials": [{ "name": "string", "quantity": number, "unit": "string" }], 
                    "conditions": { "temp": number, "pressure": number } 
                }],
                "outputs": [{ "name": "string", "type": "product|waste", "amount": number, "unit": "string" }]
            }
        `;

        try {
            const completion = await openai.chat.completions.create({
                messages: [
                    { role: "system", content: "You are an expert Chemical Engineer. Extract structured recipe data from text." },
                    { role: "user", content: prompt }
                ],
                model: "gpt-4o",
                response_format: { type: "json_object" },
            });

            const content = completion.choices[0].message.content;
            if (!content) throw new Error("No content received from OpenAI");

            return JSON.parse(content);
        } catch (error) {
            console.error("Error calling OpenAI:", error);
            throw error;
        }
    }
};

function getMockAnalysis(stepName: string): ReactionAnalysisResult {
    return {
        reactionType: "Simulated Reaction Analysis",
        description: `This is a simulated analysis for ${stepName} because the OpenAI API key is missing. In a real scenario, this would contain detailed chemical insights.`,
        thermodynamics: {
            exothermic: true,
            enthalpy: "-150 kJ/mol",
            heatOfReaction: "High"
        },
        kinetics: {
            rateLimitingStep: "Mass transfer controlled",
            activationEnergy: "50 kJ/mol"
        },
        safetyData: {
            hazards: ["Thermal runaway risk", "Flammable solvent"],
            precautions: ["Maintain cooling", "Inert atmosphere"],
            runawayRisk: "Moderate"
        },
        optimization: {
            yieldFactors: ["Temperature control", "Mixing speed"],
            rateFactors: ["Catalyst concentration"],
            criticalParameters: ["Temperature", "Pressure"]
        },
        literatureRefs: [
            {
                title: "Principles of Chemical Reaction Engineering",
                authors: "Davis & Davis",
                year: "2012",
                summary: "Standard text on reaction engineering."
            }
        ]
    };
}
