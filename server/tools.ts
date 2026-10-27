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
    const getExpenses = tool(
        async ({ category, minAmount, maxAmount, startDate, endDate, title }) => {
            let query = database('expenses').select('*');

            // Filter by category
            if (category) {
                query = query.whereILike('category', category);
            }

            // Filter by minimum amount
            if (minAmount !== undefined) {
                query = query.where('amount', '>=', minAmount);
            }

            // Filter by maximum amount
            if (maxAmount !== undefined) {
                query = query.where('amount', '<=', maxAmount);
            }

            // Filter by start date
            if (startDate) {
                query = query.where('date', '>=', startDate);
            }

            // Filter by end date
            if (endDate) {
                query = query.where('date', '<=', endDate);
            }

            // Search by title (case-insensitive)
            if (title) {
                query = query.whereILike('title', `%${title}%`);
            }

            const expenses = await query.orderBy('date', 'desc');

            return JSON.stringify({
                status: 'Success',
                count: expenses.length,
                filters: {
                    category,
                    minAmount,
                    maxAmount,
                    startDate,
                    endDate,
                    title,
                },
                expenses,
            });
        },
        {
            name: 'get_expenses',
            description: `
                Retrieve expenses from the database.
                Use category to filter by expense category.
                Use minAmount and maxAmount to filter by spending amount.
                Use startDate and endDate for a date range (YYYY-MM-DD).
                Use title to search for matching expense titles.
                Combine filters when the user specifies multiple conditions.
                Leave unspecified filters undefined.
            `,
            schema: z.object({
                category: z.string().optional()
                    .describe('Expense category, such as Food, Travel, Shopping, Bills, or Entertainment'),
                minAmount: z.number().nonnegative().optional()
                    .describe('Minimum expense amount, inclusive'),
                maxAmount: z.number().nonnegative().optional()
                    .describe('Maximum expense amount, inclusive'),
                startDate: z.string().optional()
                    .describe('Start date inclusive, in YYYY-MM-DD format'),
                endDate: z.string().optional()
                    .describe('End date inclusive, in YYYY-MM-DD format'),
                title: z.string().optional()
                    .describe('Search for a partial match in the expense title'),
            }),
        }
    );
    return [addExpense, getExpenses];
}
