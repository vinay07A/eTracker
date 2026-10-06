import type { Knex } from 'knex';
import { tool } from 'langchain';
import * as z from 'zod';


export function initTools(database: Knex) {
    const addExpense = tool(
        async ({ title, amount, date, category }) => {
            console.log({
                title,
                amount,
                date,
                category,
            });
            //todo Proper validation
            // Add expense to PostgreSQL
            await database('expenses').insert({
                title,
                amount,
                date,
                category,
            });

            return JSON.stringify({
                status: 'Success',
                message: 'Expense added successfully',
            });

        },
        {
            name: 'add_expense',
            description: 'Add the given expense to database',
            schema: z.object({
                title: z.string().describe('Short title describing the expense'),
                amount: z.number().describe('Amount of money spent'),
                date: z.string().describe('Date when the expense occurred, in YYYY-MM-DD format'),
                category: z.string().describe('Category of the expense, such as Food, Travel, Shopping, Bills, or Entertainment'),
            })
        }
    )
    return [addExpense];
}
