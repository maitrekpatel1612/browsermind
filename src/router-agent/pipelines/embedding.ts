import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { CohereEmbeddings } from "@langchain/cohere";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone as PineconeClient } from "@pinecone-database/pinecone";
import { uuidv7 } from "uuidv7";

async function loadRawDocs(allDocs: Document[]) {
    return allDocs.flat();
}


//~ Parent Document Retrieval Technique
async function createParentDocs(props: { rawDocs: Document[], userId: string }) {
    const { rawDocs, userId } = props;
    const parentSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 2000, chunkOverlap: 400 });
    const parentSplits = await parentSplitter.splitDocuments(rawDocs);

    return parentSplits.map((split) => {

        const chunkId = uuidv7();
        split.metadata = {
            docType: "parent",
            chunkId: chunkId,
            parentId: chunkId, // Self-referential for parent docs
            source: chunkId,
        }

        return split;
    });
}


async function createChildDocs(props: { parentDocs: Document[], userId: string }) {
    const { parentDocs, userId } = props;
    const childSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 800, chunkOverlap: 100 });
    const childSplits = await childSplitter.splitDocuments(parentDocs);

    return childSplits.map((split, i) => {
        // Get Parent Metadata for this child document
        const parentIndex = Math.floor(i / 4); // Assuming 4 child docs per parent
        const parentMetadata = parentDocs[parentIndex]?.metadata;

        split.metadata = {
            docType: "child",
            parentId: parentMetadata?.chunkId,
            chunkId: `child-${parentMetadata?.chunkId}-${i}`, // Unique child chunk ID
            source: split.metadata.chunkId,
            userId: userId
        }
        return split;
    });
}

export async function docEmbedding(props: { allDocs: Document[], userId: string }) {
    const { allDocs, userId } = props;
    const embeddings = new CohereEmbeddings({
        model: "embed-english-v3.0",
        apiKey: process.env.COHERE_API_KEY,
    })

    const pinecone = new PineconeClient({
        apiKey: process.env.PINECONE_API_KEY as string,
    })

    const pineconeIndex = pinecone.Index({ name: process.env.PINECONE_INDEX_NAME as string });

    console.log("[+] Loading Raw Documents...");
    const rawDocs = await loadRawDocs(allDocs);

    console.log("[+] Creating Parent Documents...");
    const parentDocs = await createParentDocs({ rawDocs, userId });

    console.log("[+] Creating Child Documents...");
    const childDocs = await createChildDocs({ parentDocs, userId });

    console.log("[+] Embedding and Storing Child and Parent Documents...");
    const vectorStore = new PineconeStore(embeddings, { pineconeIndex, maxConcurrency: 5 });
    await vectorStore.addDocuments([...parentDocs, ...childDocs]);

    console.log(`Single Index : ${parentDocs.length} Parent Documents and ${childDocs.length} Child Documents have been embedded and stored in Pinecone for userId: ${userId}.`);
    console.log(`Total Documents Embedded and Stored : ${parentDocs.length + childDocs.length}`);
    console.log("[+] Document Embedding and Storage Completed Successfully.");


}
