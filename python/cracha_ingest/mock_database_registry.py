"""
Mock Database Registry für Development
Verwendet lokale JSON-Datei statt Cloudflare KV
"""

import json
import os
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from pathlib import Path


class MockDatabaseRegistry:
    """
    Mock Registry für Development - verwendet lokale JSON-Datei
    """
    
    def __init__(self):
        self.data_file = Path(__file__).parent / "mock_databases.json"
        self._ensure_data_file()
    
    def _ensure_data_file(self):
        """Erstellt Mock-Datei falls sie nicht existiert"""
        if not self.data_file.exists():
            initial_data = {
                "databases": {},
                "user_indexes": {}
            }
            with open(self.data_file, 'w') as f:
                json.dump(initial_data, f, indent=2)
    
    def _load_data(self) -> Dict[str, Any]:
        """Lädt Daten aus JSON-Datei"""
        with open(self.data_file, 'r') as f:
            return json.load(f)
    
    def _save_data(self, data: Dict[str, Any]):
        """Speichert Daten in JSON-Datei"""
        with open(self.data_file, 'w') as f:
            json.dump(data, f, indent=2)
    
    async def register_database(self, tenant_id: str, user_id: str, 
                               name: Optional[str] = None, 
                               description: Optional[str] = None,
                               source_url: Optional[str] = None) -> Dict[str, Any]:
        """Registriert eine neue Datenbank"""
        data = self._load_data()
        
        database_info = {
            "id": tenant_id,
            "name": name or tenant_id,
            "description": description or "",
            "user_id": user_id,
            "source_url": source_url or "",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "document_count": 0,
            "last_crawl": None,
            "status": "active"
        }
        
        # Speichere Database
        data["databases"][tenant_id] = database_info
        
        # Update User Index
        if user_id not in data["user_indexes"]:
            data["user_indexes"][user_id] = {"user_id": user_id, "databases": []}
        
        if tenant_id not in data["user_indexes"][user_id]["databases"]:
            data["user_indexes"][user_id]["databases"].append(tenant_id)
        
        data["user_indexes"][user_id]["last_updated"] = datetime.now(timezone.utc).isoformat()
        
        self._save_data(data)
        return database_info
    
    async def update_database(self, tenant_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Aktualisiert Database-Informationen"""
        data = self._load_data()
        
        if tenant_id not in data["databases"]:
            raise ValueError(f"Database {tenant_id} not found")
        
        data["databases"][tenant_id].update(updates)
        data["databases"][tenant_id]["last_updated"] = datetime.now(timezone.utc).isoformat()
        
        self._save_data(data)
        return data["databases"][tenant_id]
    
    async def get_database(self, tenant_id: str) -> Optional[Dict[str, Any]]:
        """Holt Database-Informationen"""
        data = self._load_data()
        return data["databases"].get(tenant_id)
    
    async def list_user_databases(self, user_id: str) -> List[Dict[str, Any]]:
        """Listet alle Datenbanken eines Users"""
        data = self._load_data()
        
        user_index = data["user_indexes"].get(user_id)
        if not user_index:
            return []
        
        databases = []
        for tenant_id in user_index.get("databases", []):
            db_info = data["databases"].get(tenant_id)
            if db_info:
                databases.append(db_info)
        
        # Sortiere nach letzter Aktualisierung
        databases.sort(key=lambda x: x.get("last_updated", ""), reverse=True)
        return databases
    
    async def delete_database(self, tenant_id: str) -> bool:
        """Löscht eine Datenbank"""
        data = self._load_data()
        
        if tenant_id not in data["databases"]:
            return False
        
        db_info = data["databases"][tenant_id]
        user_id = db_info.get("user_id")
        
        # Lösche Database
        del data["databases"][tenant_id]
        
        # Update User Index
        if user_id and user_id in data["user_indexes"]:
            if tenant_id in data["user_indexes"][user_id]["databases"]:
                data["user_indexes"][user_id]["databases"].remove(tenant_id)
            data["user_indexes"][user_id]["last_updated"] = datetime.now(timezone.utc).isoformat()
        
        self._save_data(data)
        return True
    
    async def increment_document_count(self, tenant_id: str, count: int = 1) -> bool:
        """Erhöht den Dokument-Counter"""
        data = self._load_data()
        
        if tenant_id not in data["databases"]:
            return False
        
        current_count = data["databases"][tenant_id].get("document_count", 0)
        data["databases"][tenant_id]["document_count"] = current_count + count
        data["databases"][tenant_id]["last_crawl"] = datetime.now(timezone.utc).isoformat()
        data["databases"][tenant_id]["last_updated"] = datetime.now(timezone.utc).isoformat()
        
        self._save_data(data)
        return True


# Export
__all__ = ["MockDatabaseRegistry"]