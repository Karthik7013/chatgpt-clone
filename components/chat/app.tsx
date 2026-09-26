"use client";

import { CircleAlert, Loader2 } from "lucide-react";

import { ChatSidebar } from "@/components/chat/sidebar";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatWindow } from "@/components/chat/window";
import { useChats } from "@/components/chat/use-chats";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

/**
 * The chat screen: the chat list on the left, the open conversation on the
 * right. All of the state lives in `useChats`; this component only decides
 * what to show for each state and wires the pieces together.
 */
export function ChatApp({ initialChatId }: { initialChatId?: string } = {}) {
  const {
    chats,
    activeChatId,
    activeTitle,
    activeChatNonEmpty,
    ready,
    storageError,
    dismissStorageError,
    newChat,
    selectChat,
    renameChatById,
    deleteChatById,
    nameFromFirstMessage,
  } = useChats(initialChatId);

  if (!ready) return <FullPageSpinner />;

  if (!activeChatId) {
    return <StorageErrorScreen message={storageError ?? "No chat available."} />;
  }

  return (
    <SidebarProvider className="sidebar-inset-wrapper">
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelect={selectChat}
        onNewChat={() => void newChat()}
        onRename={(id, title) => void renameChatById(id, title)}
        onDelete={(id) => void deleteChatById(id)}
      />

      <SidebarInset className="md:p-3 bg-sidebar">
        <div className="flex h-full flex-1 flex-row overflow-hidden bg-background md:rounded-md">
          <div className="flex flex-1 flex-col overflow-hidden">
            <ChatHeader
              title={activeTitle}
              showOptions={activeChatNonEmpty}
              onRename={(title) => void renameChatById(activeChatId, title)}
              onDelete={() => {
                if (window.confirm(`Delete "${activeTitle}"?`)) {
                  void deleteChatById(activeChatId);
                }
              }}
            />

            {storageError ? (
              <div className="flex items-center gap-2 border border-danger/30 bg-danger/10 px-4 py-2 text-xs text-danger">
                <CircleAlert className="size-3.5 shrink-0" />
                <span className="flex-1">{storageError}</span>
                <button
                  type="button"
                  onClick={dismissStorageError}
                  className="rounded hover:underline"
                >
                  Dismiss
                </button>
              </div>
            ) : null}

            <div className="flex flex-1 flex-col overflow-hidden">
              <ChatWindow
                key={activeChatId}
                chatId={activeChatId}
                onFirstMessage={(message) =>
                  void nameFromFirstMessage(activeChatId, message)
                }
              />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function FullPageSpinner() {
  return (
    <div className="flex h-dvh w-full items-center justify-center bg-background">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/** Shown when there is no chat to open, e.g. the database is unreachable. */
function StorageErrorScreen({ message }: { message: string }) {
  return (
    <div className="flex h-dvh w-full flex-col items-center justify-center gap-3 bg-background">
      <CircleAlert className="size-8 text-danger" />
      <p className="max-w-sm text-center text-sm text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Retry
      </button>
    </div>
  );
}
