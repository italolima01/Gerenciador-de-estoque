
'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating restock alerts based on stock levels and expiration dates.
 *
 * The flow analyzes product stock levels and expiration dates to provide restock recommendations, helping to minimize stockouts and waste.
 *
 * @param {GenerateRestockAlertInput} input - The input data for generating restock alerts.
 * @returns {Promise<GenerateRestockAlertOutput>} - A promise that resolves with the generated restock alert.
 *
 * @example
 * // Example usage:
 * const inputData = {
 *   productName: 'Coca-Cola',
 *   currentStock: 50,
 *   expirationDate: '2024-12-31',
 * };
 *
 * generateRestockAlert(inputData)
 *   .then(alert => console.log(alert))
 *   .catch(error => console.error(error));
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateRestockAlertInputSchema = z.object({
  productName: z.string().describe('The name of the product.'),
  currentStock: z.number().describe('The current stock level of the product.'),
  expirationDate: z.string().describe('The expiration date of the product (YYYY-MM-DD).'),
});

export type GenerateRestockAlertInput = z.infer<
  typeof GenerateRestockAlertInputSchema
>;

const GenerateRestockAlertOutputSchema = z.object({
  restockRecommendation: z
    .string()
    .describe(
      'A recommendation on when to restock the product, considering stock levels and expiration date.'
    ),
  confidenceLevel: z
    .string()
    .describe('The confidence level of the restock recommendation (e.g., high, medium, low).'),
  zone: z
    .enum(['green', 'yellow', 'red'])
    .describe(
      'The zone indicating the stock level: green (optimal), yellow (caution), red (critical).'
    ),
});

export type GenerateRestockAlertOutput = z.infer<
  typeof GenerateRestockAlertOutputSchema
>;

export async function generateRestockAlert(
  input: GenerateRestockAlertInput
): Promise<GenerateRestockAlertOutput> {
  return generateRestockAlertFlow(input);
}

const restockAlertPrompt = ai.definePrompt({
  name: 'restockAlertPrompt',
  input: {
    schema: GenerateRestockAlertInputSchema,
  },
  output: {
    schema: GenerateRestockAlertOutputSchema,
  },
  prompt: `You are an AI assistant that analyzes stock levels and expiration dates to provide restock recommendations for a beverage distributor.

  Based on the following information, determine the stock level zone (green, yellow, or red) and provide a recommendation.

  Product Name: {{{productName}}}
  Current Stock: {{{currentStock}}}
  Expiration Date: {{{expirationDate}}}

  - Green zone (ideal stock): More than 50 units.
  - Yellow zone (caution): Between 21 and 50 units.
  - Red zone (critical): 20 units or less.

  Also, consider the expiration date. If a product is expiring in less than 30 days, the situation is more critical.

  Provide a clear and concise restock recommendation, a confidence level (high, medium, low), and the stock level zone.
`,
});

const generateRestockAlertFlow = ai.defineFlow(
  {
    name: 'generateRestockAlertFlow',
    inputSchema: GenerateRestockAlertInputSchema,
    outputSchema: GenerateRestockAlertOutputSchema,
  },
  async input => {
    const {output} = await restockAlertPrompt(input);
    return output!;
  }
);
