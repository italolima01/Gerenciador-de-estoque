'use server';
/**
 * @fileOverview This file defines a Genkit flow for finding relevant products based on a search query.
 *
 * It uses an AI model to perform a semantic search over a list of product names.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FindRelevantProductsInputSchema = z.object({
  query: z.string().describe('The user\'s search query.'),
  productNames: z.array(z.string()).describe('The list of all available product names.'),
});

export type FindRelevantProductsInput = z.infer<
  typeof FindRelevantProductsInputSchema
>;

const FindRelevantProductsOutputSchema = z.object({
  relevantProductNames: z
    .array(z.string())
    .describe(
      'A list of product names that are considered relevant to the search query. This can be a subset of the input product names.'
    ),
});

export type FindRelevantProductsOutput = z.infer<
  typeof FindRelevantProductsOutputSchema
>;

export async function findRelevantProducts(
  input: FindRelevantProductsInput
): Promise<FindRelevantProductsOutput> {
  return findRelevantProductsFlow(input);
}

const findRelevantProductsPrompt = ai.definePrompt({
  name: 'findRelevantProductsPrompt',
  input: {
    schema: FindRelevantProductsInputSchema,
  },
  output: {
    schema: FindRelevantProductsOutputSchema,
  },
  prompt: `You are a search assistant for a beverage distributor's inventory system. Your task is to find products relevant to the user's search query from a list of available product names.

Search Query: "{{query}}"

Available Products:
{{#each productNames}}
- {{this}}
{{/each}}

Based on the search query, return a list of product names that are a good match. The match should be fuzzy, meaning it should account for typos, partial words, and semantic similarity. If the query is empty, return all product names.
`,
});

const findRelevantProductsFlow = ai.defineFlow(
  {
    name: 'findRelevantProductsFlow',
    inputSchema: FindRelevantProductsInputSchema,
    outputSchema: FindRelevantProductsOutputSchema,
  },
  async input => {
    if (!input.query) {
      return { relevantProductNames: input.productNames };
    }
    const {output} = await findRelevantProductsPrompt(input);
    return output!;
  }
);
