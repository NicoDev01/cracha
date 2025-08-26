"""
CraCha Database Registry - Tracking von Tenant Databases

Da Cloudflare Vectorize keine API zum Listen von Namespaces bietet,
tracken wir alle erstellten Datenbanken (tenant_ids) in einem eigenen Registry.
"""

import httpx
import os
import json
import time
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone


class DatabaseRegistry:
    """
    Registry für alle erstellten Tenant-Datenbanken.
    Verwendet Cloudflare KV für persistente Speicherung.
    """
    
    def __init__(self, account_id: Optional[str] = None, api_token: Optional[str] = None):
        """
        Initialisiert Database Registry.
        
        Args:
            account_id: Cloudflare Account ID
            api_token: Cloudflare API Token
        """
        self.account_id = (account_id or os.getenv("CLOUDFLARE_ACCOUNT_ID", "")).strip()
        self.api_token = (api_token or os.getenv("CLOUDFLARE_API_TOKEN", "")).strip()
        
        if not self.account_id:
            raise ValueError("CLOUDFLARE_ACCOUNT_ID required")
        
        # Verwende API Token für KV Operations
        if not self.api_token:
            raise ValueError("CLOUDFLARE_API_TOKEN required")
        
        self.headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }
        
        # KV Namespace für Database Registry
        self.kv_namespace_id = os.getenv("DATABASE_REGISTRY_KV_ID", "")
        if not self.kv_namespace_id:
            raise ValueError("DATABASE_REGISTRY_KV_ID environment variable required")
        
        self.base_url = f"https://api.cloudflare.com/client/v4/accounts/{self.account_id}/storage/kv/namespaces/{self.kv_namespace_id}"
    
    async def register_database(self, tenant_id: str, user_id: str, 
                               name: Optional[str] = None, 
                               description: Optional[str] = None,
                               source_url: Optional[str] = None) -> Dict[str, Any]:
        """
        Registriert eine neue Datenbank im Registry.
        
        Args:
            tenant_id: Eindeutige Tenant-ID (Namespace in Vectorize)
            user_id: User-ID des Besitzers
            name: Anzeigename der Datenbank
            description: Beschreibung
            source_url: Ursprungs-URL
            
        Returns:
            Database-Informationen
        """
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
        
        # Speichere in KV
        await self._store_database(tenant_id, database_info)
        
        # Aktualisiere User-Index
        await self._update_user_index(user_id, tenant_id, "add")
        
        return database_info
    
    async def update_database(self, tenant_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """
        Aktualisiert Database-Informationen.
        
        Args:
            tenant_id: Tenant-ID
            updates: Zu aktualisierende Felder
            
        Returns:
            Aktualisierte Database-Informationen
        """
        # Lade aktuelle Daten
        current_data = await self.get_database(tenant_id)
        if not current_data:
            raise ValueError(f"Database {tenant_id} not found")
        
        # Merge Updates
        current_data.update(updates)
        current_data["last_updated"] = datetime.now(timezone.utc).isoformat()
        
        # Speichere aktualisierte Daten
        await self._store_database(tenant_id, current_data)
        
        return current_data
    
    async def get_database(self, tenant_id: str) -> Optional[Dict[str, Any]]:
        """
        Holt Database-Informationen.
        
        Args:
            tenant_id: Tenant-ID
            
        Returns:
            Database-Informationen oder None
        """
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/values/{tenant_id}",
                    headers=self.headers
                )
                
                if response.status_code == 404:
                    return None
                
                response.raise_for_status()
                return response.json()
                
        except Exception as e:
            print(f"Error getting database {tenant_id}: {e}")
            return None
    
    async def list_user_databases(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Listet alle Datenbanken eines Users.
        
        Args:
            user_id: User-ID
            
        Returns:
            Liste von Database-Informationen
        """
        try:
            # Hole User-Index
            user_index = await self._get_user_index(user_id)
            if not user_index:
                return []
            
            # Hole alle Datenbanken des Users
            databases = []
            for tenant_id in user_index.get("databases", []):
                db_info = await self.get_database(tenant_id)
                if db_info:
                    databases.append(db_info)
            
            # Sortiere nach letzter Aktualisierung
            databases.sort(key=lambda x: x.get("last_updated", ""), reverse=True)
            
            return databases
            
        except Exception as e:
            print(f"Error listing databases for user {user_id}: {e}")
            return []
    
    async def delete_database(self, tenant_id: str) -> bool:
        """
        Löscht eine Datenbank aus dem Registry.
        
        Args:
            tenant_id: Tenant-ID
            
        Returns:
            True wenn erfolgreich gelöscht
        """
        try:
            # Hole Database-Info für User-ID
            db_info = await self.get_database(tenant_id)
            if not db_info:
                return False
            
            user_id = db_info.get("user_id")
            
            # Lösche aus KV
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.delete(
                    f"{self.base_url}/values/{tenant_id}",
                    headers=self.headers
                )
                response.raise_for_status()
            
            # Aktualisiere User-Index
            if user_id:
                await self._update_user_index(user_id, tenant_id, "remove")
            
            return True
            
        except Exception as e:
            print(f"Error deleting database {tenant_id}: {e}")
            return False
    
    async def increment_document_count(self, tenant_id: str, count: int = 1) -> bool:
        """
        Erhöht den Dokument-Counter einer Datenbank.
        
        Args:
            tenant_id: Tenant-ID
            count: Anzahl hinzuzufügender Dokumente
            
        Returns:
            True wenn erfolgreich
        """
        try:
            db_info = await self.get_database(tenant_id)
            if not db_info:
                return False
            
            current_count = db_info.get("document_count", 0)
            updates = {
                "document_count": current_count + count,
                "last_crawl": datetime.now(timezone.utc).isoformat()
            }
            
            await self.update_database(tenant_id, updates)
            return True
            
        except Exception as e:
            print(f"Error incrementing document count for {tenant_id}: {e}")
            return False
    
    async def _store_database(self, tenant_id: str, data: Dict[str, Any]) -> None:
        """Speichert Database-Daten in KV."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Debug: Print request details
            url = f"{self.base_url}/values/{tenant_id}"
            print(f"DEBUG: PUT {url}")
            print(f"DEBUG: Headers: {self.headers}")
            print(f"DEBUG: Data: {json.dumps(data, indent=2)}")
            
            response = await client.put(
                url,
                json=data,
                headers=self.headers
            )
            
            # Debug: Print response details
            print(f"DEBUG: Response Status: {response.status_code}")
            print(f"DEBUG: Response Headers: {dict(response.headers)}")
            print(f"DEBUG: Response Body: {response.text}")
            
            if response.status_code != 200:
                raise Exception(f"KV API Error {response.status_code}: {response.text}")
            
            response.raise_for_status()
    
    async def _get_user_index(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Holt User-Index aus KV."""
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.base_url}/values/user_index:{user_id}",
                    headers=self.headers
                )
                
                if response.status_code == 404:
                    return {"user_id": user_id, "databases": []}
                
                response.raise_for_status()
                return response.json()
                
        except Exception:
            return {"user_id": user_id, "databases": []}
    
    async def _update_user_index(self, user_id: str, tenant_id: str, action: str) -> None:
        """Aktualisiert User-Index."""
        user_index = await self._get_user_index(user_id)
        databases = set(user_index.get("databases", []))
        
        if action == "add":
            databases.add(tenant_id)
        elif action == "remove":
            databases.discard(tenant_id)
        
        user_index["databases"] = list(databases)
        user_index["last_updated"] = datetime.now(timezone.utc).isoformat()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.put(
                f"{self.base_url}/values/user_index:{user_id}",
                json=user_index,
                headers=self.headers
            )
            response.raise_for_status()


# Convenience Functions
async def register_tenant_database(tenant_id: str, user_id: str, 
                                  name: Optional[str] = None,
                                  source_url: Optional[str] = None) -> Dict[str, Any]:
    """
    Convenience Function für Database-Registrierung.
    """
    registry = DatabaseRegistry()
    return await registry.register_database(tenant_id, user_id, name, source_url=source_url)


async def get_user_databases(user_id: str) -> List[Dict[str, Any]]:
    """
    Convenience Function für User-Database-Liste.
    """
    registry = DatabaseRegistry()
    return await registry.list_user_databases(user_id)


# Export
__all__ = [
    "DatabaseRegistry",
    "register_tenant_database", 
    "get_user_databases"
]