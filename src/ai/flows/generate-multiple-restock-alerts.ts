'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating restock alerts for multiple products at once.
 *
 * This batch processing approach is designed to be more efficient and avoid hitting API rate limits
 * that can occur when fetching alerts for many products individually.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Defines the input for a single product.
const ProductAlertInputSchema = z.object({
    id: z.string().describe('The unique identifier for the product.'),
    productName: z.string().describe('The name of the product.'),
    currentStock: z.number().describe('The current stock level of the product.'),
    averageDailySales: z.number().describe('The average daily sales of the product.'),
    daysToRestock: z.number().describe('The number of days required to restock the product.'),
    expirationDate: z.string().describe('The expiration date of the product (YYYY-MM-DD).'),
});

// Defines the overall input for the flow, which is an array of products.
const GenerateMultipleRestockAlertsInputSchema = z.object({
  products: z.array(ProductAlertInputSchema),
});

export type GenerateMultipleRestockAlertsInput = z.infer<
  typeof GenerateMultipleRestockAlertsInputSchema
>;

// Defines the output for a single product's alert.
const ProductAlertOutputSchema = z.object({
    id: z.string().describe('The unique identifier for the product, matching the input ID.'),
    zone: z.enum(['green', 'yellow', 'red']).describe('The zone indicating the stock level: green (optimal), yellow (caution), red (critical).'),
    restockRecommendation: z.string().describe('A recommendation on when to restock the product.'),
    confidenceLevel: z.string().describe('The confidence level of the recommendation (e.g., high, medium, low).'),
});

// Defines the overall output for the flow.
const GenerateMultipleRestockAlertsOutputSchema = z.array(ProductAlertOutputSchema);

export type GenerateMultipleRestockAlertsOutput = z.infer<
  typeof GenerateMultipleRestockAlertsOutputSchema
>;

export async function generateMultipleRestockAlerts(
  input: GenerateMultipleRestockAlertsInput
): Promise<GenerateMultipleRestockAlertsOutput> {
  return generateMultipleRestockAlertsFlow(input);
}

const multipleRestockAlertsPrompt = ai.definePrompt({
  name: 'multipleRestockAlertsPrompt',
  input: {
    schema: GenerateMultipleRestockAlertsInputSchema,
  },
  output: {
    schema: GenerateMultipleRestockAlertsOutputSchema,
  },
  prompt: `You are an AI assistant that analyzes sales data, stock levels, and expiration dates to provide restock recommendations for a beverage distributor.

  For each of the following products, determine the optimal time to restock, the confidence level of your recommendation, and the corresponding stock level zone (green, yellow, or red).

  {{#each products}}
  - Product ID: {{{id}}}
    - Product Name: {{{productName}}}
    - Current Stock: {{{currentStock}}}
    - Average Daily Sales: {{{averageDailySales}}}
    - Days to Restock: {{{daysToRestock}}}
    - Expiration Date: {{{expirationDate}}}
  {{/each}}

  Provide a clear and concise restock recommendation, a confidence level (high, medium, low), and the stock level zone for each product.
  Ensure that the restock recommendation considers the remaining shelf life of the product and the time required to restock.
  Return the results as an array of objects, with each object containing the 'id', 'zone', 'restockRecommendation', and 'confidenceLevel'.
`,
});

const generateMultipleRestockAlertsFlow = ai.defineFlow(
  {
    name: 'generateMultipleRestockAlertsFlow',
    inputSchema: GenerateMultipleRestockAlertsInputSchema,
    outputSchema: GenerateMultipleRestockAlertsOutputSchema,
  },
  async input => {
    if (input.products.length === 0) {
        return [];
    }
    const {output} = await multipleRestockAlertsPrompt(input);
    return output!;
  }
);
