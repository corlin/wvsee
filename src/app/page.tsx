'use client';

import { useState, useEffect } from 'react';
import { CollectionsList } from '@/components/CollectionsList';
import { CollectionInfo, getCollections } from '@/lib/weaviate';

export default function Home() {
  const [collections, setCollections] = useState<CollectionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCollections() {
      try {
        setLoading(true);
        console.log('Initializing connection to Weaviate...');
        const result = await getCollections();
        console.log('Successfully connected to Weaviate and fetched collections');
        setCollections(result);
        setError(null);
      } catch (err) {
        console.error('Failed to connect to Weaviate:', {
          error: err instanceof Error ? {
            name: err.name,
            message: err.message,
            cause: err.cause,
            stack: err.stack
          } : err
        });
        setError(err instanceof Error ? err.message : 'Failed to fetch collections');
      } finally {
        setLoading(false);
      }
    }
    fetchCollections();
  }, []);

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">
        Weaviate collections <span className="font-normal text-gray-500">on localhost:8080</span>
      </h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4" role="alert">
          <p>{error}</p>
        </div>
      )}
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <CollectionsList collections={collections} />
      )}
    </main>
  );
}
