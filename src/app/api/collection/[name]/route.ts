// File: src/app/api/collection/[name]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCollections, getCollectionData, deleteCollection } from '@/lib/weaviate';

export type Copertine = {
 [key: string]: unknown;
};

export async function DELETE(
 request: NextRequest,
) {
 try {
   const name = request.url.split('/').pop();
   if (!name) {
     return NextResponse.json({ error: 'Collection name is required' }, { status: 400 });
   }

   await deleteCollection(name);
   return NextResponse.json({ success: true });
 } catch (error) {
   console.error('API Route - Error deleting collection:', {
     error: error instanceof Error ? {
       name: error.name,
       message: error.message,
       cause: error.cause,
       stack: error.stack
     } : error
   });
   return NextResponse.json({ 
     error: 'Failed to delete collection',
     details: error instanceof Error ? error.message : 'Unknown error'
   }, { status: 500 });
 }
}

export async function GET(request: NextRequest) {
  try {
    console.log('API Route - Processing request for collection data');
    const url = new URL(request.url);
    const name = url.pathname.split('/').pop();
    const sortProperty = url.searchParams.get('sortProperty');
    const sortOrder = url.searchParams.get('sortOrder') as 'asc' | 'desc' | null;

    if (!name) {
      console.log('API Route - Missing collection name in URL');
      return NextResponse.json({ error: 'Collection name is required' }, { status: 400 });
    }

    console.log(`API Route - Fetching collections for: ${name}`);
    const collections = await getCollections();
    const collectionInfo = collections.find((c) => c.name === name);

    if (!collectionInfo) {
      console.log(`API Route - Collection not found: ${name}`);
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    console.log(`API Route - Found collection, fetching data for: ${name}`);
    const data = await getCollectionData(
      name,
      collectionInfo.properties.map((prop) => ({
        name: prop.name,
        dataType: prop.dataType || ['string']
      })),
      sortProperty && sortOrder ? { property: sortProperty, order: sortOrder } : undefined
    );

   console.log(`API Route - Successfully fetched data for: ${name}`);
   return NextResponse.json({ data });
 } catch (error) {
   console.error('API Route - Error fetching collection data:', {
     error: error instanceof Error ? {
       name: error.name,
       message: error.message,
       cause: error.cause,
       stack: error.stack
     } : error,
     env: {
       weaviateUrl: process.env.WEAVIATE_URL
     }
   });
   return NextResponse.json({ 
     error: 'Failed to fetch data',
     details: error instanceof Error ? error.message : 'Unknown error'
   }, { status: 500 });
 }
}
