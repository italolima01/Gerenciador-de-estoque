'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating restock alerts based on sales data and stock levels.
 *
 * The flow analyzes product sales data and stock levels to predict optimal restock times, helping to minimize stockouts and waste due to expiration.
 * It uses an AI model to analyze sales data and forecast optimal times for restocking.
 *
 * @param {GenerateRestockAlertInput} input - The input data for generating restock alerts.
 * @returns {Promise<GenerateRestockAlertOutput>} - A promise that resolves with the generated restock alert.
 *
 * @example
 * // Example usage:
 * const inputData = {
 *   productName: 'Coca-Cola',
 *   currentStock: 50,
 *   averageDailySales: 10,
 *   daysToRestock: 7,
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
  averageDailySales: z
    .number()
    .describe('The average daily sales of the product.'),
  daysToRestock: z.number().describe('The number of days required to restock the product.'),
  expirationDate: z.string().describe('The expiration date of the product (YYYY-MM-DD).'),
});

export type GenerateRestockAlertInput = z.infer<
  typeof GenerateRestockAlertInputSchema
>;

const GenerateRestockAlertOutputSchema = z.object({
  restockRecommendation: z
    .string()
    .describe(
      'A recommendation on when to restock the product, considering stock levels, sales data, and expiration date.'
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
  prompt: `You are an AI assistant that analyzes sales data, stock levels, and expiration dates to provide restock recommendations for a beverage distributor.

  Based on the following information, determine the optimal time to restock the product, the confidence level of your recommendation, and the corresponding stock level zone (green, yellow, or red).

  Product Name: {{{productName}}}
  Current Stock: {{{currentStock}}}
  Average Daily Sales: {{{averageDailySales}}}
  Days to Restock: {{{daysToRestock}}}
  Expiration Date: {{{expirationDate}}}

  Provide a clear and concise restock recommendation, a confidence level (high, medium, low), and the stock level zone.
  Ensure that the restock recommendation considers the remaining shelf life of the product and the time required to restock.
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
