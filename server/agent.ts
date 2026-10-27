import { ChatOpenAI } from "@langchain/openai";
import { END, MemorySaver, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph'
import db from './database/knex.js';
import { initTools } from "./tools.ts";
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { AIMessage } from "langchain";
import readline from "node:readline/promises";

const tools = initTools(db);

const llm = new ChatOpenAI({
    model: "gpt-5.5"
});

/**
 * Tool Node
 */
const toolNode = new ToolNode(tools)

/**
 * 
 * @param state Call Model
 * @returns 
 */

async function callModel(state: typeof MessagesAnnotation.State) {
    const llmWithTools = llm.bindTools(tools);

    const response = await llmWithTools.invoke([
        {
            role: 'system',
            content: `
                You are a helpful expense tracking assistant.

                Current datetime: ${new Date().toISOString()}

                Rules:
                1. When the user wants to add or record an expense,
                   call the add_expense tool.

                2. When the user wants to view, search, filter,
                   or analyze existing expenses, call the
                   get_expenses tool.

                3. Pass the appropriate filters to get_expenses,
                   including category, minAmount, maxAmount,
                   startDate, endDate, and title, when specified
                   by the user.

                4. If the user asks for a summary or total,
                   calculate it from the returned expense records.

                5. After receiving tool results, explain the
                   results in clear, human-readable language.

                6. If no expenses match the filters, tell the
                   user that no matching expenses were found.

                7. Never invent expense records or amounts.
                   Use the database results as the source of truth.

                8. If the user asks a general question that does
                   not require database access, answer directly.
            `,
        },
        ...state.messages,
    ]);

    return { messages: [response] };
}

/**
 * Graph condition
 */

function whereToGo(state: typeof MessagesAnnotation.State) {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;

    if (
        lastMessage &&
        lastMessage.getType() === 'ai' &&
        lastMessage.tool_calls?.length
    ) {
        return 'tools';
    }

    return '__end__';
}

/**
 * Graph
 */

const graph = new StateGraph(MessagesAnnotation)
    .addNode('callModel', callModel)
    .addNode('tools', toolNode)
    .addEdge(START, 'callModel')
    .addConditionalEdges('callModel', whereToGo, { "__end__": END, tools: 'tools' })
    .addEdge('tools', 'callModel');


const agent = graph.compile({ checkpointer: new MemorySaver() });


async function main() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

    while (true) {
        const userQuery = await rl.question('You: ');
        if (userQuery == '/bye') break;
        const result = await agent.invoke({
            messages: [
                {
                    role: 'human',
                    content: userQuery
                }
            ]
        }, { configurable: { thread_id: 'con_1' } })

        console.log("ASSISTANT: ", result.messages[result.messages.length - 1]?.content);
    }

    rl.close();
}

main();

