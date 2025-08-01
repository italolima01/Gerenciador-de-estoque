import { config } from 'dotenv';
config();

import '@/ai/flows/generate-restock-alert.ts';
import '@/ai/flows/generate-multiple-restock-alerts.ts';
import '@/ai/flows/find-relevant-products.ts';
