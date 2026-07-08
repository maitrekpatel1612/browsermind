import {z} from "zod";
import {tool} from "@langchain/core/tools";
import {ExaSearchResults} from "@langchain/exa";
import Exa from 'exa-js';
import {CheerioWebBaseLoader} from "@langchain/community/document_loaders/web/cheerio";

if (!process.env.EXASEARCH_API_KEY) {
    throw new Error("EXASEARCH_API_KEY is not defined.");
}

const client = new Exa(process.env.EXASEARCH_API_KEY);
//~ Search Tool for Web Search
export const searchTool = tool(
    async ({ query }) => {
        try{

            const exaTool = new ExaSearchResults({
                    client,
                    searchArgs : {
                        numResults : 2,
                        type : "auto",
                    },
                })

                const result = await exaTool.invoke({ query });
                return result;
        }
        catch(err)
        {
            return JSON.stringify({error : "Error occurred while searching the web."});
        }
    },
    {
        name : "web_search",
        description : "Search the web for relevant information. Input should be a search query string.",
        schema : z.object({
            query : z.string().describe("The search query string to search the web for relevant information."),
        }),
    }
)

//~ Web Scraper Tool for Web Scraping
export const webScrapperTool = tool(
    async ({ webLink }) => {
        try{
            const loader = new CheerioWebBaseLoader(webLink);
            const docs = await loader.load();
            const serializedData = JSON.stringify(docs)
            return serializedData;
        } catch (error) {
            return JSON.stringify({error : "Error occurred while scraping the web."});
        }
    },
    {   
        name : "scrape_url",
        description : "Scrape the web for relevant information. Input should be a URL string.",
        schema : z.object({
            webLink : z.string().describe("The URL of the webpage to scrape for relevant information."),
        }),
    }
)

export const searchTools = [webScrapperTool, searchTool]; 
