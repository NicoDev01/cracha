"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, EllipsisVertical, Library, Loader2, Pencil, Plus, RotateCw, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useHydratedChatStore } from "@/hooks/use-chat-store";
import { groupByDatabase, MAX_TITLE_LENGTH } from "@/lib/chat/history";
import { databaseName } from "@/lib/databases";
import { getDatabases } from "@/stores/chat-store";
import type { ChatSummary } from "@/types/chat";

const CHAT_PATH = "/dashboard/chat";
/** Per knowledge base; the rest is one click away. */
const VISIBLE_PER_GROUP = 5;
/** Coming back to the tab reloads the list at most this often. */
const REFRESH_AFTER_MS = 30_000;

/**
 * The account's chats under the Chat entry of the sidebar, filed under the
 * knowledge base each one asked. `onHold` keeps a hover-expanded sidebar open
 * while a menu or a rename is in progress: the menu is rendered outside the
 * sidebar, and leaving the sidebar for it would otherwise collapse it.
 */
export function ChatHistoryNav({ onHold, onNavigate }: { onHold: (hold: boolean) => void; onNavigate: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    ready,
    history,
    historyStatus,
    selectedConversation,
    selectedDatabase,
    loadHistory,
    selectConversation,
    newConversation,
    renameConversation,
    deleteConversation,
  } = useHydratedChatStore();
  const [names, setNames] = useState<Record<string, string>>({});
  /** Bases a finished lookup covered; one missing from it no longer exists. */
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState<ChatSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const renameRequested = useRef(false);
  const requested = useRef(new Set<string>());

  // Loaded once the account is known, and again when the tab comes back: a
  // chat started or deleted on another device should show up here.
  useEffect(() => {
    if (!ready) return;
    void loadHistory();
    let loadedAt = Date.now();
    const refresh = () => {
      if (document.visibilityState !== "visible" || Date.now() - loadedAt < REFRESH_AFTER_MS) return;
      loadedAt = Date.now();
      void loadHistory();
    };
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [ready, loadHistory]);

  // Names are looked up again only for a base this list has not seen, such as
  // one created since the last lookup.
  const databaseIds = useMemo(() => [...new Set(history.map((chat) => chat.databaseId))], [history]);
  useEffect(() => {
    if (!ready) return;
    const unknown = databaseIds.filter((id) => !requested.current.has(id));
    if (unknown.length === 0) return;
    unknown.forEach((id) => requested.current.add(id));
    getDatabases()
      .then((databases) => {
        setNames(Object.fromEntries(databases.map((database) => [database.id, databaseName(database)])));
        setChecked((current) => new Set([...current, ...unknown]));
      })
      // Asked again with the next change of the list.
      .catch(() => unknown.forEach((id) => requested.current.delete(id)));
  }, [ready, databaseIds]);

  useEffect(() => {
    onHold(menuOpen !== null || editing !== null);
  }, [menuOpen, editing, onHold]);
  useEffect(() => () => onHold(false), [onHold]);

  const groups = useMemo(() => groupByDatabase(history), [history]);
  const onChatPage = pathname === CHAT_PATH;

  const go = () => {
    if (!onChatPage) router.push(CHAT_PATH);
    onNavigate();
  };
  const open = (chat: ChatSummary) => {
    void selectConversation(chat.id);
    go();
  };
  const startNew = (databaseId?: string) => {
    newConversation(databaseId);
    go();
  };
  const commitRename = async () => {
    const current = editing;
    setEditing(null);
    if (!current) return;
    const title = current.title.trim();
    const previous = history.find((chat) => chat.id === current.id)?.title;
    if (title && title !== previous) await renameConversation(current.id, title);
  };
  const confirmDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    const deleted = await deleteConversation(deleting.id);
    setIsDeleting(false);
    if (deleted) setDeleting(null);
  };

  const label = (databaseId: string) => names[databaseId]
    ?? (checked.has(databaseId) ? "Wissensbasis nicht mehr vorhanden" : databaseName({ id: databaseId, name: "" }));

  return (
    <div className="mt-1 ml-5 border-l border-gray-200 pl-2 dark:border-gray-800">
      <button
        type="button"
        onClick={() => startNew(selectedDatabase ?? undefined)}
        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-theme-sm font-medium ${onChatPage && !selectedConversation ? "bg-brand-50 text-brand-500 dark:bg-brand-500/[0.12] dark:text-brand-400" : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"}`}
      >
        <Plus className="size-4 shrink-0" aria-hidden="true" />
        Neuer Chat
      </button>

      {historyStatus === "loading" && history.length === 0 && (
        <p className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400" role="status">
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          Chats werden geladen …
        </p>
      )}
      {historyStatus === "error" && (
        <button
          type="button"
          onClick={() => void loadHistory()}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10"
        >
          <RotateCw className="size-3.5 shrink-0" aria-hidden="true" />
          Chats nicht geladen – erneut versuchen
        </button>
      )}
      {historyStatus === "ready" && history.length === 0 && (
        <p className="px-2 py-1.5 text-xs leading-5 text-gray-400">Deine Chats erscheinen hier, sortiert nach Wissensbasis.</p>
      )}

      {groups.map((group) => {
        const isCollapsed = collapsed[group.databaseId] === true;
        const showAll = expanded[group.databaseId] === true;
        const visible = showAll ? group.chats : group.chats.slice(0, VISIBLE_PER_GROUP);
        const name = label(group.databaseId);
        return (
          <section key={group.databaseId} className="mt-2" aria-label={`Chats zu ${name}`}>
            <div className="group/db flex items-center">
              <button
                type="button"
                onClick={() => setCollapsed((current) => ({ ...current, [group.databaseId]: !isCollapsed }))}
                aria-expanded={!isCollapsed}
                className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg px-1.5 py-1 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                title={name}
              >
                <ChevronRight className={`size-3.5 shrink-0 transition-transform ${isCollapsed ? "" : "rotate-90"}`} aria-hidden="true" />
                <Library className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{name}</span>
                <span className="shrink-0 font-normal tabular-nums">{group.chats.length}</span>
              </button>
              <button
                type="button"
                onClick={() => startNew(group.databaseId)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 focus-visible:opacity-100 dark:hover:bg-white/5 dark:hover:text-gray-200 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/db:opacity-100"
                aria-label={`Neuer Chat mit ${name}`}
                title={`Neuer Chat mit ${name}`}
              >
                <Plus className="size-3.5" aria-hidden="true" />
              </button>
            </div>

            {!isCollapsed && (
              <ul className="mt-0.5 flex flex-col gap-0.5">
                {visible.map((chat) => {
                  const isActive = onChatPage && chat.id === selectedConversation;
                  const isEditing = editing?.id === chat.id;
                  return (
                    <li
                      key={chat.id}
                      className={`group/chat relative flex items-center rounded-lg ${isActive ? "bg-brand-50 text-brand-600 dark:bg-brand-500/[0.12] dark:text-brand-400" : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"}`}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editing.title}
                          maxLength={MAX_TITLE_LENGTH}
                          onChange={(event) => setEditing({ id: chat.id, title: event.target.value })}
                          onFocus={(event) => event.currentTarget.select()}
                          onBlur={() => void commitRename()}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              event.currentTarget.blur();
                            } else if (event.key === "Escape") {
                              event.preventDefault();
                              setEditing(null);
                            }
                          }}
                          aria-label="Neuer Name des Chats"
                          className="m-0.5 min-w-0 flex-1 rounded-md border border-brand-300 bg-white px-2 py-1 text-theme-sm text-gray-900 outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-brand-700 dark:bg-gray-900 dark:text-white"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => open(chat)}
                          aria-current={isActive ? "page" : undefined}
                          // Room for the menu button only where it shows: always on touch, on hover or focus otherwise.
                          className={`min-w-0 flex-1 truncate py-1.5 pl-2 text-left text-theme-sm ${isActive ? "pr-8" : "pr-8 [@media(hover:hover)]:pr-2 [@media(hover:hover)]:group-hover/chat:pr-8 [@media(hover:hover)]:group-focus-within/chat:pr-8 [@media(hover:hover)]:group-has-data-[state=open]/chat:pr-8"}`}
                          title={chat.title}
                        >
                          {chat.title}
                        </button>
                      )}
                      {!isEditing && (
                        <DropdownMenu modal={false} open={menuOpen === chat.id} onOpenChange={(value) => setMenuOpen(value ? chat.id : null)}>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className={`absolute right-1 rounded-md p-1 text-gray-400 hover:bg-gray-200/70 hover:text-gray-700 data-[state=open]:bg-gray-200/70 data-[state=open]:text-gray-700 dark:hover:bg-white/10 dark:hover:text-gray-200 dark:data-[state=open]:bg-white/10 ${isActive ? "" : "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/chat:opacity-100 [@media(hover:hover)]:group-focus-within/chat:opacity-100 [@media(hover:hover)]:data-[state=open]:opacity-100"}`}
                              aria-label={`Optionen für „${chat.title}“`}
                            >
                              <EllipsisVertical className="size-4" aria-hidden="true" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="start"
                            className="w-44 border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
                            // Focus returning to the trigger would end the rename at once.
                            onCloseAutoFocus={(event) => {
                              if (renameRequested.current) {
                                event.preventDefault();
                                renameRequested.current = false;
                              }
                            }}
                          >
                            <DropdownMenuItem
                              onSelect={() => {
                                renameRequested.current = true;
                                setEditing({ id: chat.id, title: chat.title });
                              }}
                              className="gap-2 text-gray-700 dark:text-gray-200"
                            >
                              <Pencil className="size-4" aria-hidden="true" />
                              Umbenennen
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => setDeleting(chat)}
                              className="gap-2 text-error-600 focus:bg-error-50 focus:text-error-700 dark:text-error-400 dark:focus:bg-error-500/10"
                            >
                              <Trash2 className="size-4" aria-hidden="true" />
                              Löschen
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </li>
                  );
                })}
                {group.chats.length > VISIBLE_PER_GROUP && (
                  <li>
                    <button
                      type="button"
                      onClick={() => setExpanded((current) => ({ ...current, [group.databaseId]: !showAll }))}
                      className="w-full rounded-lg px-2 py-1 text-left text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-300"
                    >
                      {showAll ? "Weniger anzeigen" : `Alle ${group.chats.length} anzeigen`}
                    </button>
                  </li>
                )}
              </ul>
            )}
          </section>
        );
      })}

      <AlertDialog open={deleting !== null} onOpenChange={(value) => { if (!value && !isDeleting) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chat löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              {`„${deleting?.title ?? ""}“ wird mit allen Nachrichten endgültig gelöscht. Das lässt sich nicht rückgängig machen.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full" disabled={isDeleting}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
              disabled={isDeleting}
              className="rounded-full bg-error-600 text-white hover:bg-error-700"
            >
              {isDeleting ? "Wird gelöscht …" : "Löschen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
