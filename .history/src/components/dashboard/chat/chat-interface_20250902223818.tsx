"use client"
</div>
) : (
messages.map((message) => (
<Message key={message.id} from={message.type === 'user' ? 'user' : 'assistant'}>
<MessageContent>
<Response>{message.content}</Response>


{/* Sources for assistant messages */}
{message.type === 'assistant' && message.sources && message.sources.length > 0 && (
<Sources>
<SourcesTrigger count={message.sources.length} />
<SourcesContent>
{message.sources.map((source) => (
<Source
key={source.id}
href={source.url}
title={source.title}
>
{source.snippet}
</Source>
))}
</SourcesContent>
</Sources>
)}
</MessageContent>
</Message>
))
)}


{/* Loading indicator */}
{isLoading && (
<Message from="assistant">
<MessageContent>
<Loader />
</MessageContent>
</Message>
)}
</ConversationContent>


<ConversationScrollButton />
</Conversation>


{/* Fixed Input Row (no sticky-in-scroll conflicts) */}
<div className=\"shrink-0 p-3 lg:p-4 border-t border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/70 backdrop-blur supports-[backdrop-filter]:bg-white/60\">
<PromptInput onSubmit={handleSubmit}>
<PromptInputTextarea
value={input}
onChange={(e) => setInput(e.target.value)}
placeholder={selectedDatabase ? "Stelle eine Frage zu deinen Daten..." : "Wähle zuerst eine Datenbank aus"}
disabled={!selectedDatabase}
className="p-2 sm:p-3"
/>
<PromptInputToolbar>
<PromptInputTools>
{/* Mobile: echter Dropdown-Selector links im Toolbar */}
<div className="lg:hidden">
<DatabaseSelector />
</div>
{/* Desktop: alter Info-Button beibehalten */}
<div className="hidden lg:block">
<PromptInputButton variant="ghost">
<Database className="w-4 h-4" />
{selectedDatabase || 'Keine DB'}
</PromptInputButton>
</div>
</PromptInputTools>


<PromptInputSubmit
disabled={!input.trim() || !selectedDatabase}
status={submitStatus}
/>
</PromptInputToolbar>
</PromptInput>
</div>
</div>
</>
);
}