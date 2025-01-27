export async function getCollectionData(className: string, properties: { name: string; dataType: string }[]): Promise<CollectionData[]> {
  try {
    const query = `{
      Get {
        ${className} {
          ${properties.map(p => p.name).join('\n')}
        }
      }
    }`;
    const response = await executeQuery(query);
    
    if (!response?.data?.Get) {
      throw new Error('Invalid response structure from Weaviate');
    }
    
    return response.data.Get[className] || [];
  } catch (error) {
    console.error('Error in getCollectionData:', error);
    throw error;
  }
}

export interface CollectionInfo {
  name: string;
  description?: string;
  count: number;
  properties: {
    name: string;
    description?: string;
    dataType?: string[];
  }[];
}

export type { WeaviateCollection };

export interface Copertine {
  testataName: string;
  editionId: string;
  editionDateIsoStr: string;
  captionStr: string;
  kickerStr: string;
  captionAIStr: string;
  imageAIDeStr: string;
  modelAIName: string;
}

/**
 * A generic object type for Weaviate item data.
 */
export type CollectionData = Record<string, unknown>;

/**
 * The shape of the GraphQL /v1/graphql "Get" query response.
 * Example:
 * {
 *   data: {
 *     Get: {
 *       Person: [{ name: "Alice" }, { name: "Bob" }]
 *     }
 *   }
 * }
 */
type WeaviateResponse = {
  data: {
    Get: Record<string, CollectionData[]>;
  };
};

/**
 * The shape of the GraphQL /v1/graphql "Aggregate" query response.
 * Example:
 * {
 *   data: {
 *     Aggregate: {
 *       Person: [
 *         {
 *           meta: {
 *             count: 42
 *           }
 *         }
 *       ]
 *     }
 *   }
 * }
 */
type AggregateResponse = {
  data: {
    Aggregate: Record<string, { meta: { count: number } }[]>;
  };
};

/**
 * The shape of a single Weaviate class in the /v1/schema response.
 */
type WeaviateClass = {
  class: string;
  description?: string;
  properties?: {
    name: string;
  }[];
};

/**
 * The complete shape of the /v1/schema response.
 * Example:
 * {
 *   classes: [
 *     {
 *       class: "Person",
 *       description: "Holds Person data",
 *       properties: [{ name: "name" }, { name: "age" }]
 *     }
 *   ]
 * }
 */
type WeaviateSchemaResponse = {
  classes?: WeaviateClass[];
};

type WeaviateCollection = {
  name: string;
  description?: string;
  count: number;
  properties: string[];
};

import getConfig from 'next/config';

const { serverRuntimeConfig, publicRuntimeConfig } = getConfig();
// Use serverRuntimeConfig in server components, fallback to publicRuntimeConfig for client components
const WEAVIATE_URL = serverRuntimeConfig?.weaviateUrl || publicRuntimeConfig?.weaviateUrl;

if (!WEAVIATE_URL) {
  throw new Error('Weaviate URL is not configured');
}

/**
 * Executes a GraphQL query against Weaviate’s /v1/graphql endpoint.
 */
export async function executeQuery(queryStr: string): Promise<WeaviateResponse> {
  console.log(`Attempting to connect to Weaviate at: ${WEAVIATE_URL}`);
  try {
    const response = await fetch(`${WEAVIATE_URL}/v1/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: queryStr }),
    });

    if (!response.ok) {
      console.error(`Weaviate query failed with status: ${response.status} ${response.statusText}`);
      throw new Error(`Query failed: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Detailed Weaviate connection error:', {
      url: WEAVIATE_URL,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        cause: error.cause,
        stack: error.stack
      } : error
    });
    throw error;
  }
}

/**
 * Returns objects of a given Weaviate class by making a GraphQL query
 * for the `_additional { id }` field. Modify as needed for other fields.
 */
export async function getObjectsByClass(className: string): Promise<CollectionData[]> {
  const query = `
  {
    Get {
      ${className} {
        _additional {
          id
        }
      }
    }
  }`;

  const response = await executeQuery(query);
  const results = response.data.Get[className] || [];
  return results;
}

/**
 * Fetches the list of classes (collections) from Weaviate’s /v1/schema,
 * then for each class, retrieves the total count of objects in it.
 */
export async function getCollections(): Promise<CollectionInfo[]> {
  console.log(`Fetching schema from Weaviate at: ${WEAVIATE_URL}`);
  try {
    const response = await fetch(`${WEAVIATE_URL}/v1/schema`);
    if (!response.ok) {
      console.error(`Failed to fetch schema. Status: ${response.status} ${response.statusText}`);
      throw new Error(`Failed to fetch schema: ${response.statusText}`);
    }

    // Parse as Weaviate schema
    const schema: WeaviateSchemaResponse = await response.json();
    const classes = schema.classes ?? [];

    const result: CollectionInfo[] = [];
    for (const weavClass of classes) {
      const count = await getObjectCount(weavClass.class);
      result.push({
        name: weavClass.class,
        description: weavClass.description,
        count,
        properties: weavClass.properties?.map((p) => ({
          name: p.name,
        })) ?? [],
      });
    }

    return result;
  } catch (error) {
    console.error('Error fetching collections:', {
      url: WEAVIATE_URL,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        cause: error.cause,
        stack: error.stack
      } : error
    });
    throw error;
  }
}

/**
 * Executes a GraphQL aggregate query (COUNT, etc.) for a given class name.
 */
async function executeAggregateQuery(queryStr: string): Promise<AggregateResponse> {
  console.log(`Executing aggregate query to Weaviate at: ${WEAVIATE_URL}`);
  try {
    const response = await fetch(`${WEAVIATE_URL}/v1/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: queryStr }),
    });

    if (!response.ok) {
      console.error(`Aggregate query failed with status: ${response.status} ${response.statusText}`);
      throw new Error(`Query failed: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Detailed aggregate query error:', {
      url: WEAVIATE_URL,
      query: queryStr,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        cause: error.cause,
        stack: error.stack
      } : error
    });
    throw error;
  }
}

/**
 * Retrieves the total count of objects in a given class by using the
 * Weaviate “Aggregate” GraphQL query.
 */
async function getObjectCount(className: string): Promise<number> {
  const aggregateQuery = `
  {
    Aggregate {
      ${className} {
        meta {
          count
        }
      }
    }
  }`;

  let aggregateResponse: AggregateResponse | null = null;
  try {
    aggregateResponse = await executeAggregateQuery(aggregateQuery);
  } catch (error) {
    console.error('Error executing aggregate query:', error);
    // Optionally rethrow or return 0
    return 0;
  }

  // Access the aggregated data
  const aggregateData =
    aggregateResponse?.data.Aggregate[className] ?? [];

  // Return the count if available, or 0 otherwise
  return aggregateData[0]?.meta?.count ?? 0;
}
