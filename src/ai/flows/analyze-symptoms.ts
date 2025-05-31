
// 'use server'
'use server';

/**
 * @fileOverview An AI agent for analyzing symptoms and suggesting potential conditions,
 * including red flags, precautions, home remedies, and OTC ideas.
 *
 * - analyzeSymptoms - A function that handles the symptom analysis process.
 * - AnalyzeSymptomsInput - The input type for the analyzeSymptoms function.
 * - AnalyzeSymptomsOutput - The return type for the analyzeSymptoms function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeSymptomsInputSchema = z.object({
  symptoms: z
    .string()
    .describe(
      'A comma-separated list of symptoms experienced by the user. Example: fever, cough, fatigue'
    ),
});
export type AnalyzeSymptomsInput = z.infer<typeof AnalyzeSymptomsInputSchema>;

const SymptomSummarySchema = z.object({
    generalExplanation: z.string().describe("A general explanation of what the described symptoms might typically indicate (e.g., common cold, muscle strain). This should be reassuring and informative, not a diagnosis."),
    possibleCauses: z.array(z.string()).optional().describe("A list of common, non-alarming possible causes for the symptoms provided. Focus on lifestyle or minor conditions unless severe symptoms are explicitly stated."),
});

const AnalyzeSymptomsOutputSchema = z.object({
  symptomSummary: SymptomSummarySchema.optional().describe("A summary understanding of the user's symptoms."),
  potentialRedFlags: z.array(z.string()).optional().describe("A list of potential red flag symptoms that, if present alongside the reported symptoms, warrant immediate medical attention."),
  helpfulPrecautions: z.array(z.string()).optional().describe("A list of general helpful precautions or self-care advice relevant to the symptoms."),
  suggestedHomeRemedies: z.array(z.string()).optional().describe("A list of commonly suggested home remedies that might offer comfort (non-medical advice)."),
  otcMedicationIdeas: z.array(z.string()).optional().describe("General categories of over-the-counter medications that people might consider for such symptoms (e.g., 'pain relievers', 'decongestants'), with a strong disclaimer to consult a doctor/pharmacist."),
  suggestedConditions: z.array(
    z.object({
      condition: z.string().describe('The name of the suggested potential condition (if distinct from general summary).'),
      explanation: z
        .string()
        .describe(
          'An explanation of why the AI suggests this specific condition based on the symptoms provided.'
        ),
    })
  ).optional().describe('A list of more specific potential conditions suggested by the AI, if applicable beyond the general summary.'),
  disclaimer: z.string().default("This information is for educational purposes only and not a substitute for professional medical advice. Always consult a healthcare provider for diagnosis and treatment.").describe("A standard disclaimer that should always be included."),
});
export type AnalyzeSymptomsOutput = z.infer<typeof AnalyzeSymptomsOutputSchema>;


export async function analyzeSymptoms(
  input: AnalyzeSymptomsInput
): Promise<AnalyzeSymptomsOutput> {
  return analyzeSymptomsFlow(input);
}

const analyzeSymptomsPrompt = ai.definePrompt({
  name: 'analyzeSymptomsRichPrompt',
  input: {schema: AnalyzeSymptomsInputSchema},
  output: {schema: AnalyzeSymptomsOutputSchema},
  prompt: `You are an AI-powered health assistant. Your goal is to provide helpful, informative, and safe insights based on user-described symptoms. You are NOT a doctor and CANNOT give medical advice or diagnoses.

  User-provided symptoms:
  "{{symptoms}}"

  Based on these symptoms, please provide the following information, strictly adhering to the JSON output schema:

  1.  **symptomSummary**:
      *   `generalExplanation`: Provide a general, reassuring explanation of what these symptoms might commonly indicate (e.g., "Fatigue is a common symptom characterized by... It can be caused by..."). Focus on common, often benign scenarios first.
      *   `possibleCauses`: Optionally list a few common, non-alarming possible causes for these symptoms (e.g., "inadequate sleep", "stress", "common cold").

  2.  **potentialRedFlags**: List critical "red flag" symptoms that, if experienced by the user ALONGSIDE their current symptoms, would warrant immediate medical attention. Be specific and concise (e.g., "Severe chest pain", "Difficulty breathing", "Sudden vision changes"). If no specific red flags are strongly indicated by the input symptoms alone, provide a general set of common red flags.

  3.  **helpfulPrecautions**: List 3-5 general helpful precautions or self-care tips that might be relevant (e.g., "Ensure adequate hydration", "Get plenty of rest", "Monitor symptoms for changes").

  4.  **suggestedHomeRemedies**: List 3-5 commonly suggested home remedies that could offer comfort (e.g., "Warm salt water gargle for sore throat", "Honey for cough"). These should be general, safe, and widely known.

  5.  **otcMedicationIdeas**: List 2-3 general CATEGORIES of over-the-counter medications people might consider for such symptoms (e.g., "Pain relievers like ibuprofen or acetaminophen", "Decongestants"). AVOID specific brand names. ALWAYS include a strong advisory to consult a doctor or pharmacist before taking any medication.

  6.  **suggestedConditions** (Optional): If, after providing the general summary, there are distinct, common, and relatively non-severe conditions that strongly align with the symptoms, you can list 1-2 here with a brief explanation for each. Prioritize the general summary; use this section sparingly.

  7.  **disclaimer**: Ensure the default disclaimer is included in your output.

  **IMPORTANT GUIDELINES**:
  *   **Safety First**: Your primary responsibility is user safety. Do not diagnose. Do not give treatment plans.
  *   **Tone**: Empathetic, calm, and informative.
  *   **Clarity**: Use simple, easy-to-understand language. Avoid jargon.
  *   **Conciseness**: Be brief and to the point, especially for lists.
  *   **JSON Output**: Adhere strictly to the output JSON schema. Ensure all fields are correctly populated as per their descriptions.
  *   **Red Flags Example for Fatigue**: If user says "I'm very tired", red flags might include: "Severe chest pain", "Shortness of breath", "Sudden, severe headache", "Unexplained weight loss", "High fever", "Confusion or disorientation", "Vision changes", "Fainting or loss of consciousness".
  *   **Generic Content**: If symptoms are very vague (e.g., "I feel sick"), provide more generic advice for common minor ailments, general red flags, and strongly emphasize seeing a doctor for specifics.

  Generate the response now.
  `,
});

const analyzeSymptomsFlow = ai.defineFlow(
  {
    name: 'analyzeSymptomsFlow',
    inputSchema: AnalyzeSymptomsInputSchema,
    outputSchema: AnalyzeSymptomsOutputSchema,
  },
  async (input) => {
    const {output} = await analyzeSymptomsPrompt(input);
    if (!output) {
        // Fallback if the model fails to produce structured output
        return {
            symptomSummary: { 
                generalExplanation: "I am unable to provide specific insights at this moment. Please try rephrasing your symptoms or consult a healthcare professional.",
                possibleCauses: []
            },
            potentialRedFlags: [
                "Severe or persistent pain",
                "Difficulty breathing",
                "High fever that doesn't respond to treatment",
                "Sudden changes in vision, speech, or balance",
                "Unexplained bleeding or bruising"
            ],
            helpfulPrecautions: ["Monitor your symptoms closely.", "Rest as needed.", "Stay hydrated."],
            suggestedHomeRemedies: [],
            otcMedicationIdeas: [],
            suggestedConditions: [],
            disclaimer: "This information is for educational purposes only and not a substitute for professional medical advice. Always consult a healthcare provider for diagnosis and treatment."
        };
    }
    // Ensure disclaimer is always present, even if model misses it.
    return { ...output, disclaimer: output.disclaimer || AnalyzeSymptomsOutputSchema.shape.disclaimer.default() };
  }
);
