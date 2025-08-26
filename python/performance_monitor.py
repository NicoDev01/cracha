#!/usr/bin/env python3
"""
Performance Monitoring für CraCha Ingestion Pipeline
"""

import time
import psutil
from typing import Dict, Any, List
from dataclasses import dataclass, asdict
import json


@dataclass
class PerformanceMetrics:
    """Performance-Metriken für Ingestion-Pipeline"""
    
    # Timing
    total_duration: float = 0.0
    crawl_duration: float = 0.0
    embedding_duration: float = 0.0
    vectorize_duration: float = 0.0
    
    # Throughput
    pages_per_second: float = 0.0
    chunks_per_second: float = 0.0
    embeddings_per_second: float = 0.0
    
    # Resource Usage
    peak_memory_mb: float = 0.0
    avg_cpu_percent: float = 0.0
    
    # Quality Metrics
    total_pages: int = 0
    total_chunks: int = 0
    successful_embeddings: int = 0
    failed_embeddings: int = 0
    
    # Cost Metrics
    total_cost: float = 0.0
    cost_per_chunk: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
    
    def print_summary(self):
        """Druckt Performance-Zusammenfassung"""
        print("\n" + "="*60)
        print("🚀 PERFORMANCE SUMMARY")
        print("="*60)
        print(f"📊 Total Duration: {self.total_duration:.2f}s")
        print(f"📄 Pages Processed: {self.total_pages} ({self.pages_per_second:.1f}/s)")
        print(f"🧩 Chunks Created: {self.total_chunks} ({self.chunks_per_second:.1f}/s)")
        print(f"🔮 Embeddings: {self.successful_embeddings}/{self.total_chunks} ({self.embeddings_per_second:.1f}/s)")
        print(f"💾 Peak Memory: {self.peak_memory_mb:.1f} MB")
        print(f"🖥️  Avg CPU: {self.avg_cpu_percent:.1f}%")
        print(f"💰 Total Cost: ${self.total_cost:.6f} (${self.cost_per_chunk:.6f}/chunk)")
        print("="*60)


class PerformanceMonitor:
    """Überwacht Performance der Ingestion-Pipeline"""
    
    def __init__(self):
        self.metrics = PerformanceMetrics()
        self.start_time = 0.0
        self.memory_samples: List[float] = []
        self.cpu_samples: List[float] = []
        
    def start_monitoring(self):
        """Startet Performance-Monitoring"""
        self.start_time = time.time()
        self.memory_samples = []
        self.cpu_samples = []
        
    def sample_resources(self):
        """Sammelt Resource-Usage Sample"""
        try:
            memory_mb = psutil.virtual_memory().used / (1024 * 1024)
            cpu_percent = psutil.cpu_percent()
            
            self.memory_samples.append(memory_mb)
            self.cpu_samples.append(cpu_percent)
        except Exception:
            pass  # Ignore sampling errors
    
    def record_crawl_complete(self, pages: int, duration: float):
        """Zeichnet Crawling-Completion auf"""
        self.metrics.total_pages = pages
        self.metrics.crawl_duration = duration
        self.metrics.pages_per_second = pages / duration if duration > 0 else 0
        
    def record_embedding_complete(self, chunks: int, successful: int, duration: float):
        """Zeichnet Embedding-Completion auf"""
        self.metrics.total_chunks = chunks
        self.metrics.successful_embeddings = successful
        self.metrics.failed_embeddings = chunks - successful
        self.metrics.embedding_duration = duration
        self.metrics.embeddings_per_second = successful / duration if duration > 0 else 0
        
    def record_vectorize_complete(self, duration: float):
        """Zeichnet Vectorize-Upload-Completion auf"""
        self.metrics.vectorize_duration = duration
        
    def record_cost(self, total_cost: float):
        """Zeichnet Kosten auf"""
        self.metrics.total_cost = total_cost
        self.metrics.cost_per_chunk = total_cost / self.metrics.total_chunks if self.metrics.total_chunks > 0 else 0
        
    def finalize_monitoring(self):
        """Finalisiert Monitoring und berechnet finale Metriken"""
        self.metrics.total_duration = time.time() - self.start_time
        self.metrics.chunks_per_second = self.metrics.total_chunks / self.metrics.total_duration if self.metrics.total_duration > 0 else 0
        
        # Resource-Usage
        if self.memory_samples:
            self.metrics.peak_memory_mb = max(self.memory_samples)
        if self.cpu_samples:
            self.metrics.avg_cpu_percent = sum(self.cpu_samples) / len(self.cpu_samples)
            
    def save_metrics(self, filepath: str):
        """Speichert Metriken in JSON-Datei"""
        with open(filepath, 'w') as f:
            json.dump(self.metrics.to_dict(), f, indent=2)
            
    def get_performance_grade(self) -> str:
        """Bewertet Performance und gibt Note zurück"""
        score = 0
        
        # Speed Score (40%)
        if self.metrics.chunks_per_second > 10:
            score += 40
        elif self.metrics.chunks_per_second > 5:
            score += 30
        elif self.metrics.chunks_per_second > 2:
            score += 20
        else:
            score += 10
            
        # Success Rate Score (30%)
        success_rate = self.metrics.successful_embeddings / self.metrics.total_chunks if self.metrics.total_chunks > 0 else 0
        if success_rate > 0.95:
            score += 30
        elif success_rate > 0.9:
            score += 25
        elif success_rate > 0.8:
            score += 20
        else:
            score += 10
            
        # Cost Efficiency Score (20%)
        if self.metrics.cost_per_chunk < 0.0001:
            score += 20
        elif self.metrics.cost_per_chunk < 0.0005:
            score += 15
        elif self.metrics.cost_per_chunk < 0.001:
            score += 10
        else:
            score += 5
            
        # Resource Usage Score (10%)
        if self.metrics.peak_memory_mb < 500:
            score += 10
        elif self.metrics.peak_memory_mb < 1000:
            score += 8
        elif self.metrics.peak_memory_mb < 2000:
            score += 6
        else:
            score += 3
            
        # Grade mapping
        if score >= 90:
            return "A+ (Excellent)"
        elif score >= 80:
            return "A (Very Good)"
        elif score >= 70:
            return "B (Good)"
        elif score >= 60:
            return "C (Average)"
        else:
            return "D (Needs Improvement)"


# Global monitor instance
monitor = PerformanceMonitor()