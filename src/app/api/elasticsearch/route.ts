import { NextRequest, NextResponse } from 'next/server';
import { apiConfig, apiHeaders } from '@/config/api';

type EndpointKey = keyof typeof apiConfig.endpoints;

function buildAuthHeader(username: string, password: string) {
  const credentials = `${username}:${password}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, baseUrl, username, password, method = 'GET', customPath, body: requestBody } = body as {
      endpoint?: EndpointKey;
      baseUrl: string;
      username?: string;
      password?: string;
      method?: 'GET' | 'POST' | 'PUT';
      customPath?: string;
      body?: string;
    };

    if (!baseUrl) {
      return NextResponse.json(
        { error: 'Missing required parameter: baseUrl' },
        { status: 400 }
      );
    }

        let endpointPath: string;
        if (customPath) {
          endpointPath = customPath;
        } else if (endpoint) {
          // Special handling for nodesDetailed endpoint
          if (endpoint === 'nodesDetailed') {
            endpointPath = apiConfig.endpoints.nodesDetailed;
          } else {
            endpointPath = apiConfig.endpoints[endpoint];
          }
          if (!endpointPath) {
            return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 });
          }
        } else {
          return NextResponse.json(
            { error: 'Either endpoint or customPath is required' },
            { status: 400 }
          );
        }

    const url = `${baseUrl}${endpointPath}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), apiConfig.requestTimeoutMs);

    try {
      const headers: HeadersInit = { ...apiHeaders };
      if (username && password) {
        headers.Authorization = buildAuthHeader(username, password);
      }

      // For PUT/POST requests with body, ensure Content-Type is set
      if (requestBody && (method === 'PUT' || method === 'POST')) {
        headers['Content-Type'] = 'application/json';
      }

      const fetchOptions: RequestInit = {
        method,
        headers,
        cache: 'no-store',
        signal: controller.signal
      };

      if (requestBody && (method === 'PUT' || method === 'POST')) {
        fetchOptions.body = requestBody;
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        return NextResponse.json(
          {
            error: `Elasticsearch ${response.status} ${response.statusText}`,
            details: errorText
          },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout' },
          { status: 408 }
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    let errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Normalize error messages - convert fetch/network errors to "Network error"
    if (errorMessage.toLowerCase().includes('fetch') && 
        (errorMessage.toLowerCase().includes('failed') || errorMessage.toLowerCase().includes('error'))) {
      errorMessage = 'Network error';
    }
    
    return NextResponse.json(
      {
        error: errorMessage
      },
      { status: 500 }
    );
  }
}

