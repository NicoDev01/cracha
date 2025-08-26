"use strict";exports.id=2714,exports.ids=[2714],exports.modules={42714:(a,b,c)=>{c.d(b,{MockCrawlService:()=>d});class d{static getInstance(){return d.instance||(d.instance=new d),d.instance}async executeCrawl(a){let b=Date.now(),c=`job_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;console.log("\uD83C\uDFAD Mock Crawl Service - Simulating crawl for:",a.url),await new Promise(a=>setTimeout(a,2e3));let d=Date.now()-b;return{success:!0,job_id:c,message:"Mock crawl completed successfully",output:`
🚀 Starting crawl and ingest for tenant: ${a.tenant_id}
🌐 URL: ${a.url}
📊 Type: ${a.type}

📄 Created 25 chunks from 1 pages
✅ Created 25 chunks from crawl
💰 Estimated cost: $0.000210 (${a.embedding_model})
🔮 Creating embeddings with ${a.embedding_model}...
🔮 Processing 25 texts...
✅ Successfully uploaded 25 vectors to Vectorize
✅ Database ${a.tenant_id} registered in registry
✅ Crawl and ingest completed successfully!

📊 Final Statistics:
- Pages crawled: 1
- Chunks created: 25
- Total cost: $0.000210
- Duration: ${d}ms
    `.trim(),duration:`${d}ms`}}}}};