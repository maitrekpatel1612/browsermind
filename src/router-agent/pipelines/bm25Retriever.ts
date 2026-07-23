import { BM25Retriever } from "@langchain/community/retrievers/bm25";
import { Document} from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export const formatDocumentsAsString = (documents: Document[]) => {
    return documents.map((doc) => doc?.pageContent).join("\n\n");
}


export async function bm25Retriever(document : string, query : string) {
    const newDoc = new Document({
        pageContent : document,
        metadata : {
            title : "user : " + "DAILY_LOG_ARCHIVE"
        }
    })


    const docSplitter = new RecursiveCharacterTextSplitter({ chunkSize : 800, chunkOverlap : 100 });
    const splitDocs = await docSplitter.splitDocuments([newDoc]);

    const retriever = BM25Retriever.fromDocuments([...splitDocs], { k : 4 });

    // 4 Documents with the highest BM25 score will be returned
    const data = await retriever.invoke(query);

    const docToString = formatDocumentsAsString(data);

    return docToString;
}