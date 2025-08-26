#!/usr/bin/env python3
"""
CraCha Ingestion Pipeline - ASCII CLI Interface (Windows-compatible)
"""

import sys
import os

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the original main module
from main import CraChaIngestionCLI
import argparse
import asyncio
import logging

# Configure logging without Unicode emojis
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%H:%M:%S'
)

class ASCIICraChaIngestionCLI(CraChaIngestionCLI):
    """ASCII-compatible version of CraChaIngestionCLI"""
    
    def __init__(self):
        super().__init__()
    
    async def crawl_and_ingest(self, args):
        """ASCII version of crawl_and_ingest"""
        logger = logging.getLogger(__name__)
        
        logger.info(f"Starting crawl and ingest for tenant: {args.tenant_id}")
        logger.info(f"URL: {args.url}")
        logger.info(f"Type: {args.type}")
        
        try:
            # Call the original method but catch Unicode errors
            result = await super().crawl_and_ingest(args)
            return result
        except UnicodeEncodeError as e:
            logger.error(f"Unicode encoding error: {str(e)}")
            return {"success": False, "error": f"Unicode encoding error: {str(e)}"}
        except Exception as e:
            logger.error(f"Crawl and ingest failed: {str(e)}")
            return {"success": False, "error": str(e)}

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='CraCha Ingestion Pipeline (ASCII)')
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Crawl command
    crawl_parser = subparsers.add_parser('crawl', help='Crawl website and ingest')
    crawl_parser.add_argument('--url', required=True, help='URL to crawl')
    crawl_parser.add_argument('--tenant-id', required=True, help='Tenant ID')
    crawl_parser.add_argument('--user-id', default='default_user', help='User ID')
    crawl_parser.add_argument('--type', default='single', choices=['single', 'recursive', 'sitemap', 'batch'])
    crawl_parser.add_argument('--embedding-model', default='gemini-768')
    crawl_parser.add_argument('--max-depth', type=int, default=3)
    crawl_parser.add_argument('--limit', type=int, default=100)
    crawl_parser.add_argument('--max-concurrent', type=int, default=5)
    crawl_parser.add_argument('--force', action='store_true', help='Skip cost confirmation')
    crawl_parser.add_argument('--cleanup', action='store_true', default=True)
    crawl_parser.add_argument('--generate-summaries', action='store_true', default=True)
    crawl_parser.add_argument('--ultra-fast', action='store_true', default=True)
    crawl_parser.add_argument('--exclude-external', action='store_true')
    crawl_parser.add_argument('--exclude-social-media', action='store_true', default=True)
    crawl_parser.add_argument('--include-patterns', nargs='*', default=[])
    crawl_parser.add_argument('--exclude-domains', nargs='*', default=[])
    crawl_parser.add_argument('--include-domains', nargs='*', default=[])
    crawl_parser.add_argument('--url-filter', default='')
    crawl_parser.add_argument('--dry-run', action='store_true', help='Dry run mode')
    crawl_parser.add_argument('--urls-file', help='File with URLs for batch processing')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    # Create CLI instance
    cli = ASCIICraChaIngestionCLI()
    
    if args.command == 'crawl':
        try:
            result = asyncio.run(cli.crawl_and_ingest(args))
            if result.get('success'):
                print("SUCCESS: Crawl completed successfully")
                sys.exit(0)
            else:
                print(f"ERROR: {result.get('error', 'Unknown error')}")
                sys.exit(1)
        except Exception as e:
            print(f"FATAL ERROR: {str(e)}")
            sys.exit(1)

if __name__ == "__main__":
    main()