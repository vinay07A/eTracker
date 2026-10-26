import { ChatOpenAI } from "@langchain/openai";
import { END, MemorySaver, MessagesAnnotation, START, StateGraph } from '@langchain/langgraph'
import db from './database/knex.js';
import { initTools } from "./tools.ts";
import { ToolNode } from '@langchain/langgraph/prebuilt'
import { AIMessage } from "langchain";

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
            content: `You are a helpful expense tracking assistant. Current datetime: ${new Date().toISOString()}.
            call add_expense tool to add the expense to database.`,
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
    if (lastMessage.tool_calls) {
        return 'tools'
    }
    return '__end__'
}

/**
 * Graph
 */

const graph = new StateGraph(MessagesAnnotation)
    .addNode('callModel', callModel)
    .addNode('tools', toolNode)
    .addEdge(START, 'callModel')
    .addConditionalEdges('callModel', whereToGo, { "__end__": END, tools: 'tools' });


const agent = graph.compile({ checkpointer: new MemorySaver() });


async function main() {
    const response = await agent.invoke({
        messages: {
            role: 'human',
            content: 'Supriya bought skin care cream at rupees 55'
        }
    }, { configurable: { thread_id: 'con_v1' } });

    console.log(response.messages[response.messages.length - 1].content)
}

main();

