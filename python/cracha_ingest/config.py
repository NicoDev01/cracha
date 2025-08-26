"""
CraCha Ingestion Pipeline - Configuration Constants

Centralized configuration for optimal performance and maintainability.
"""

# Chunking Configuration (Best Practices for gemini-embedding-001)
DEFAULT_MAX_TOKENS = 800  # Optimal range: 500-1000 tokens
DEFAULT_OVERLAP = 120     # 15% of max_tokens for context preservation
MIN_CHUNK_LENGTH = 10     # Minimum characters per chunk

# Embedding Configuration
SUPPORTED_DIMENSIONS = [768, 1536, 3072]  # Gemini embedding dimensions
DEFAULT_EMBEDDING_MODEL = "gemini-768"    # Best cost/performance ratio

# Batch Processing Thresholds
GEMINI_BATCH_THRESHOLD = 50      # Use batch mode for 50+ chunks (50% cost reduction)
GEMINI_MAX_BATCH_SIZE = 50       # Max chunks per parallel batch
OPENAI_MAX_BATCH_SIZE = 2048     # OpenAI API limit

# Vectorize Configuration  
MAX_BATCH_REQUEST_SIZE = 500     # Max chunks per vectorize batch
DEFAULT_NAMESPACE_PREFIX = ""    # Tenant-based namespacing

# API Configuration
GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta"
OPENAI_API_BASE = "https://api.openai.com/v1"
VECTORIZE_API_BASE = "https://api.cloudflare.com/client/v4"

# Cost Configuration (per 1M tokens)
EMBEDDING_COSTS = {
    "gemini-768": 0.00015,
    "gemini-1536": 0.00015, 
    "gemini-3072": 0.00015,
    "openai-small": 0.00002,
    "openai-large": 0.00013
}

# Timeout Configuration (seconds)
DEFAULT_HTTP_TIMEOUT = 60
BATCH_HTTP_TIMEOUT = 120
BATCH_COMPLETION_TIMEOUT = 3600

# Concurrency Configuration
DEFAULT_MAX_CONCURRENT = 15      # Memory-adaptive default
MIN_CONCURRENT = 5               # Minimum concurrent requests
MAX_CONCURRENT = 25              # Maximum concurrent requests

# Content Cleaning Patterns
BOILERPLATE_PATTERNS = [
    r'Cookie.*?akzeptieren.*?\n',
    r'Diese Website verwendet Cookies.*?\n',
    r'Impressum\s*\|\s*Datenschutz.*?\n',
    r'Navigation überspringen.*?\n',
    r'Zum Hauptinhalt springen.*?\n',
    r'©.*?\d{4}.*?\n',
    r'Alle Rechte vorbehalten.*?\n',
]

# Retry Configuration
MAX_RETRIES = 3
RETRY_BACKOFF_MULTIPLIER = 1
RETRY_MIN_WAIT = 2
RETRY_MAX_WAIT = 30