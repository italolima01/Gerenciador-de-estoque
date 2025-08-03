'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating intelligent restock alerts.
 *
 * This flow analyzes a product's sales history to provide data-driven restock recommendations,
 * moving beyond simple, fixed-level thresholds.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import {
  GenerateIntelligentRestockAlertInput,
  GenerateRestockAlertOutput,
} from '@/lib/types';
import { subDays, parseISO, differenceInDays } from 'date-fns';

const GenerateIntelligentRestockAlertInputSchema = z.object({
  product: z.object({
    id: z.string(),
    name: z.string(),
    quantity: z.number(),
    price: z.number(),
    expirationDate: z.string(),
  }),
  orders: z.array(
    z.object({
      id: z.string(),
      customerName: z.string(),
      address: z.string(),
      deliveryDate: z.string(),
      items: z.array(
        z.object({
          productId: z.string(),
          productName: z.string(),
          quantity: z.number(),
        })
      ),
      notes: z.string().optional(),
      status: z.enum(['Pendente', 'Concluído']),
      createdAt: z.string(),
    })
  ),
});

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

export async function generateIntelligentRestockAlert(
  input: GenerateIntelligentRestockAlertInput
): Promise<GenerateRestockAlertOutput> {
  return generateIntelligentRestockAlertFlow(input);
}

const intelligentRestockAlertPrompt = ai.definePrompt({
  name: 'intelligentRestockAlertPrompt',
  input: {
    schema: z.object({
      productName: z.string(),
      currentStock: z.number(),
      expirationDate: z.string(),
      salesVelocity: z.number(), // Units sold per week
      daysOfStockLeft: z.number(),
    }),
  },
  output: {
    schema: GenerateRestockAlertOutputSchema,
  },
  prompt: `You are an AI inventory management expert for a beverage distributor. Your goal is to provide intelligent, data-driven restock recommendations.

Analyze the following product data:

- Product Name: {{{productName}}}
- Current Stock: {{{currentStock}}} units
- Sales Velocity: Approximately {{{salesVelocity}}} units sold per week.
- Estimated Days of Stock Left: {{{daysOfStockLeft}}} days.
- Expiration Date: {{{expirationDate}}}

Based on this data, determine the stock level zone (green, yellow, or red) and provide a concise, actionable restock recommendation.

- Red Zone: Less than 7 days of stock remaining or expiring in less than 14 days. This is critical.
- Yellow Zone: Between 7 and 21 days of stock remaining. This requires attention.
- Green Zone: More than 21 days of stock remaining. This is an ideal level.

The recommendation should be practical and easy to understand for a busy warehouse manager.
For example: "Com base nas vendas, você tem estoque para mais 15 dias. Recomenda-se fazer um novo pedido na próxima semana."
or "Estoque crítico. Com a demanda atual, o produto pode esgotar em 3 dias. Reabasteça imediatamente."
`,
});

const generateIntelligentRestockAlertFlow = ai.defineFlow(
  {
    name: 'generateIntelligentRestockAlertFlow',
    inputSchema: GenerateIntelligentRestockAlertInputSchema,
    outputSchema: GenerateRestockAlertOutputSchema,
  },
  async (input) => {
    const { product, orders } = input;
    const thirtyDaysAgo = subDays(new Date(), 30);

    // Filter sales for this specific product in the last 30 days
    const recentSales = orders
      .filter(o => o.status === 'Concluído' && parseISO(o.createdAt) >= thirtyDaysAgo)
      .flatMap(o => o.items)
      .filter(item => item.productId === product.id);

    const totalQuantitySold = recentSales.reduce((sum, item) => sum + item.quantity, 0);

    // Calculate sales velocity (units per week)
    const salesVelocity = (totalQuantitySold / 30) * 7;

    // Calculate how many days of stock are left based on velocity
    // If velocity is 0, this will be Infinity, which is fine.
    const daysOfStockLeft = salesVelocity > 0 ? product.quantity / (salesVelocity / 7) : Infinity;

    // If there's no sales history, fall back to a simple rule-based alert
    if (salesVelocity === 0) {
        let zone: 'green' | 'yellow' | 'red' = 'green';
        let recommendation = 'Nenhuma ação necessária. Monitore as vendas.';
        if (product.quantity <= 20) {
            zone = 'red';
            recommendation = 'Estoque baixo. Considere reabastecer para evitar rupturas.';
        } else if (product.quantity <= 50) {
            zone = 'yellow';
            recommendation = 'Nível de atenção. O estoque está diminuindo.';
        }
        return {
            zone,
            restockRecommendation: recommendation,
            confidenceLevel: 'low',
        };
    }

    const { output } = await intelligentRestockAlertPrompt({
        productName: product.name,
        currentStock: product.quantity,
        expirationDate: product.expirationDate,
        salesVelocity: parseFloat(salesVelocity.toFixed(2)),
        daysOfStockLeft: Math.floor(daysOfStockLeft),
    });

    return output!;
  }
);
