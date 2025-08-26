import { QueryRequest, QueryResponse } from '@/types'
import { API_CONFIG } from '@/lib/config'

class CraChaAPI {
  private baseUrl = API_CONFIG.worker.baseUrl
  
  async query(params: QueryRequest): Promise<QueryResponse> {
    const response = await fetch(`${this.baseUrl}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }
    
    return response.json()
  }
  
  async streamQuery(params: QueryRequest): Promise<ReadableStream> {
    const response = await fetch(`${this.baseUrl}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, stream: true }),
    })
    
    if (!response.ok) {
      throw new Error(`Stream Error: ${response.status}`)
    }
    
    return response.body!
  }
  
  async health(): Promise<{ status: string; timestamp: number }> {
    const response = await fetch(`${this.baseUrl}/health`)
    return response.json()
  }
}

export const crachApi = new CraChaAPI()