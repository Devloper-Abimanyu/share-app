import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import {
  ArrowLeft,
  ArrowUp,
  CalendarDays,
  Check,
  CheckCheck,
  CircleHelp,
  Clock3,
  Copy,
  Download,
  KeyRound,
  Link2,
  MessageCircle,
  MessageSquarePlus,
  MoreHorizontal,
  Paperclip,
  Phone,
  Search,
  Send,
  Shield,
  Smile,
  Sparkles,
  Users,
  UserPlus,
  Video,
  X,
} from "lucide-react";
import CallOverlay from "./CallOverlay.jsx";

const apiBaseUrl = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "https://orbit-chat-api.onrender.com" : "")
).replace(/\/+$/, "");
const maxAttachmentBytes = 50 * 1024 * 1024;

async function api(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("The API returned a non-JSON response. Check VITE_API_URL and confirm the backend is deployed.");
  }
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error ?? "Something went wrong.");
    error.status = response.status;
    throw error;
  }
  return data;
}

function initials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

function colorFor(value = "") {
  const colors = ["lavender", "peach", "mint", "blue", "rose", "gold"];
  const score = [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return colors[score % colors.length];
}

function Avatar({ name, online = false, size = "normal" }) {
  return (
    <span className={`avatar avatar-${colorFor(name)} avatar-${size}`}>
      {initials(name) || "?"}
      {online && <i className="online-dot" />}
    </span>
  );
}

function AuthScreen({ onAuthenticated }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(form),
      });
      onAuthenticated(data.user);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <a className="brand auth-brand" href="/" aria-label="Orbit home">
          <span className="brand-mark"><MessageCircle size={21} fill="currentColor" /></span>
          <span>orbit<span className="brand-period">.</span></span>
        </a>
        <div className="auth-intro">
          <span className="eyebrow"><Sparkles size={14} /> YOUR PEOPLE, IN ORBIT</span>
          <h1>Good to see you.</h1>
          <p>Sign in and pick up right where the conversation left off.</p>
        </div>
        <form className="auth-form" onSubmit={submit}>
          <label>
            Username ID
            <input
              autoComplete="username"
              maxLength={24}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
              placeholder="Your unique handle"
              required
              value={form.username}
            />
          </label>
          <label>
            Password
            <input
              autoComplete="current-password"
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="Your password"
              required
              type="password"
              value={form.password}
            />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button auth-submit" disabled={busy} type="submit">
            {busy ? "One moment…" : "Sign in"}
            {!busy && <ArrowUp size={17} className="arrow-diagonal" />}
          </button>
        </form>
        <p className="auth-switch">Need an account? Ask an administrator to create one.</p>
        <div className="auth-footnote"><span /> Your conversations stay between you and your people.</div>
      </section>
      <aside className="auth-art" aria-hidden="true">
        <div className="art-orbit orbit-one" />
        <div className="art-orbit orbit-two" />
        <div className="art-orbit orbit-three" />
        <div className="floating-note note-top"><span className="note-dot dot-peach" /> the weekend crew <b>just now</b></div>
        <div className="floating-note note-bottom"><Avatar name="Mia Chen" size="small" /><span>Made it home safe ✨</span><CheckCheck size={15} /></div>
        <div className="art-copy">
          <span>GOOD CONVERSATIONS<br />HAVE A PLACE.</span>
          <h2>Stay close,<br /><em>wherever.</em></h2>
        </div>
        <div className="art-caption">A little corner of the internet, just for your people.</div>
      </aside>
    </main>
  );
}

function AdminPanel({ onClose, onUsersChanged, currentUserId }) {
  const [users, setUsers] = useState([]);
  const [usernameDrafts, setUsernameDrafts] = useState({});
  const [passwordDrafts, setPasswordDrafts] = useState({});
  const [form, setForm] = useState({ username: "", displayName: "", password: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/api/admin/users")
      .then(({ users: results }) => {
        setUsers(results);
        setUsernameDrafts(Object.fromEntries(results.map((user) => [user.id, user.username])));
      })
      .catch((requestError) => setError(requestError.message));
  }, []);

  async function createUser(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const { user } = await api("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setUsers((current) => [...current, user]);
      setUsernameDrafts((current) => ({ ...current, [user.id]: user.username }));
      setForm({ username: "", displayName: "", password: "" });
      setNotice(`Account ${user.username} created.`);
      onUsersChanged();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateUsername(userId) {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const { user } = await api(`/api/admin/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ username: usernameDrafts[userId] }),
      });
      setUsers((current) => current.map((item) => item.id === userId ? user : item));
      setUsernameDrafts((current) => ({ ...current, [userId]: user.username }));
      setNotice(`Username updated to ${user.username}.`);
      onUsersChanged();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(userId) {
    const password = passwordDrafts[userId] ?? "";
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await api(`/api/admin/users/${userId}/password`, {
        method: "PUT",
        body: JSON.stringify({ password }),
      });
      setPasswordDrafts((current) => ({ ...current, [userId]: "" }));
      setNotice(userId === currentUserId
        ? "Password reset. Other sessions for your account were signed out."
        : "Password reset. Existing sessions for that account were signed out.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="admin-modal" aria-labelledby="admin-title" aria-modal="true" role="dialog">
        <header>
          <div><span className="eyebrow">ACCOUNT ACCESS</span><h2 id="admin-title">Admin tools</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button>
        </header>
        <form className="admin-create-form" onSubmit={createUser}>
          <strong><UserPlus size={16} /> Create account</strong>
          <label>Username ID<input autoComplete="off" maxLength={24} onChange={(event) => setForm({ ...form, username: event.target.value })} required value={form.username} /></label>
          <label>Display name<input autoComplete="off" maxLength={48} onChange={(event) => setForm({ ...form, displayName: event.target.value })} required value={form.displayName} /></label>
          <label>Temporary password<input autoComplete="new-password" minLength={8} onChange={(event) => setForm({ ...form, password: event.target.value })} required type="password" value={form.password} /></label>
          <button className="primary-button" disabled={busy} type="submit">{busy ? "Saving…" : "Create account"}</button>
        </form>
        <div className="admin-user-list">
          <strong>Manage accounts</strong>
          {users.map((user) => (
            <div className="admin-user-row" key={user.id}>
              <span className="admin-user-name">{user.displayName}{user.role === "admin" ? " · admin" : ""}</span>
              <div className="admin-user-actions">
                <input
                  aria-label={`Username ID for ${user.displayName}`}
                  maxLength={24}
                  onChange={(event) => setUsernameDrafts({ ...usernameDrafts, [user.id]: event.target.value })}
                  value={usernameDrafts[user.id] ?? user.username}
                />
                <button className="icon-button" disabled={busy || usernameDrafts[user.id] === user.username} onClick={() => updateUsername(user.id)} title="Update username ID" type="button">
                  <Shield size={15} />
                </button>
                <input
                  aria-label={`New password for ${user.displayName}`}
                  autoComplete="new-password"
                  minLength={8}
                  onChange={(event) => setPasswordDrafts({ ...passwordDrafts, [user.id]: event.target.value })}
                  placeholder="New password"
                  type="password"
                  value={passwordDrafts[user.id] ?? ""}
                />
                <button className="icon-button" disabled={busy || (passwordDrafts[user.id] ?? "").length < 8} onClick={() => resetPassword(user.id)} title="Reset password" type="button">
                  <KeyRound size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="admin-notice" role="status">{notice}</p>}
      </section>
    </div>
  );
}

function chatName(chat) {
  if (!chat) return "";
  if (chat.kind === "group") return chat.name;
  return chat.members?.[0]?.displayName ?? chat.members?.[0]?.username ?? "New conversation";
}

function chatMemberCount(chat) {
  return (chat?.members?.length ?? 0) + 1;
}

function chatSubtitle(chat, online) {
  if (chat.kind === "group") {
    const count = chatMemberCount(chat);
    return `${count} ${count === 1 ? "person" : "people"}`;
  }
  const person = chat.members?.[0];
  if (person && online.has(person.id)) return "online now";
  return person ? `@${person.username}` : "Your conversation";
}

function formatTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function dateTimeLocalValue(date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function meetingLink(meetingId) {
  const url = new URL("/", window.location.origin);
  url.searchParams.set("meeting", meetingId);
  return url.toString();
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Sidebar({
  user,
  chats,
  people,
  selectedChatId,
  onSelectChat,
  onStartDirect,
  onNewGroup,
  onLogout,
  onManageUsers,
  online,
  mode,
  onModeChange,
}) {
  const [search, setSearch] = useState("");
  const visibleChats = chats.filter((chat) => chatName(chat).toLowerCase().includes(search.toLowerCase()));
  const visiblePeople = people.filter((person) =>
    `${person.displayName} ${person.username}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <aside className={`sidebar ${selectedChatId ? "sidebar-hidden-mobile" : ""}`}>
      <header className="sidebar-header">
        <a className="brand" href="/" aria-label="Orbit home">
          <span className="brand-mark"><MessageCircle size={19} fill="currentColor" /></span>
          <span>orbit<span className="brand-period">.</span></span>
        </a>
        <div className="sidebar-header-actions">
          {user.role === "admin" && (
            <button className="icon-button" onClick={onManageUsers} title="Admin tools" aria-label="Admin tools">
              <Shield size={18} />
            </button>
          )}
          <button className="icon-button profile-button" onClick={onLogout} title={`Sign out ${user.displayName}`} aria-label="Sign out">
            <Avatar name={user.displayName} size="small" />
          </button>
        </div>
      </header>
      <div className="sidebar-greeting">
        <span className="eyebrow">YOUR LITTLE CORNER</span>
        <h1>Hey, {user.displayName.split(" ")[0]} <span>✳</span></h1>
        <p>Good conversations start here.</p>
      </div>
      <div className="sidebar-tabs" role="tablist">
        <button className={mode === "chats" ? "active" : ""} onClick={() => onModeChange("chats")} role="tab">
          <MessageCircle size={16} /> Chats <span className="tab-count">{chats.length || ""}</span>
        </button>
        <button className={mode === "people" ? "active" : ""} onClick={() => onModeChange("people")} role="tab">
          <Users size={16} /> People
        </button>
        <button className={mode === "meetings" ? "active" : ""} onClick={() => onModeChange("meetings")} role="tab">
          <Video size={16} /> Meetings
        </button>
      </div>
      {mode !== "meetings" && (
        <div className="search-box">
          <Search size={16} />
          <input
            aria-label={mode === "chats" ? "Search conversations" : "Search people"}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={mode === "chats" ? "Find a conversation" : "Find your people"}
            value={search}
          />
          {search && <button aria-label="Clear search" onClick={() => setSearch("")}><X size={14} /></button>}
        </div>
      )}
      {mode === "chats" ? (
        <div className="sidebar-list">
          <div className="list-heading">
            <span>RECENT</span>
            <button onClick={onNewGroup} aria-label="Create a group" title="Create a group">
              <MessageSquarePlus size={16} />
            </button>
          </div>
          {visibleChats.length ? visibleChats.map((chat) => {
            const name = chatName(chat);
            const person = chat.members?.[0];
            return (
              <button
                className={`chat-row ${selectedChatId === chat.id ? "selected" : ""}`}
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
              >
                {chat.kind === "group"
                  ? <span className={`avatar group-avatar avatar-${colorFor(name)}`}><Users size={19} /></span>
                  : <Avatar name={name} online={person && online.has(person.id)} />}
                <span className="chat-row-copy">
                  <span className="chat-row-title">{name}</span>
                  <span className="chat-row-preview">{chat.last_message || chatSubtitle(chat, online)}</span>
                </span>
                <span className="chat-row-meta">{formatTime(chat.last_message_at ?? chat.created_at)}</span>
              </button>
            );
          }) : (
            <div className="list-empty">
              <span className="empty-icon"><MessageCircle size={19} /></span>
              <strong>{search ? "No matches just yet" : "A fresh start"}</strong>
              <p>{search ? "Try a different name." : "Say hello to someone to start a conversation."}</p>
              <button onClick={() => onModeChange("people")}>Find your people <ArrowUp size={14} className="arrow-diagonal" /></button>
            </div>
          )}
        </div>
      ) : mode === "people" ? (
        <div className="sidebar-list">
          <div className="list-heading"><span>YOUR PEOPLE</span></div>
          {visiblePeople.length ? visiblePeople.map((person) => (
            <button className="person-row" key={person.id} onClick={() => onStartDirect(person)}>
              <Avatar name={person.displayName} online={online.has(person.id)} />
              <span className="person-copy">
                <strong>{person.displayName}</strong>
                <span>@{person.username}{online.has(person.id) ? " · online" : ""}</span>
              </span>
              <MessageCircle size={17} className="person-message-icon" />
            </button>
          )) : (
            <div className="list-empty">
              <span className="empty-icon"><Users size={19} /></span>
              <strong>{search ? "No one by that name" : "Your people are on the way"}</strong>
              <p>{search ? "Try another search." : "When others join Orbit, you’ll find them here."}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="sidebar-list">
          <div className="list-heading"><span>MEETINGS</span></div>
          <div className="list-empty">
            <span className="empty-icon"><Video size={19} /></span>
            <strong>Meet your people live</strong>
            <p>Start an instant meeting, schedule one, or join with a meeting link.</p>
          </div>
        </div>
      )}
      <footer className="sidebar-footer">
        <div className="footer-status"><span /> Everything is in orbit</div>
        <button className="footer-help" aria-label="About Orbit" title="A friendly space for your conversations"><CircleHelp size={17} /></button>
      </footer>
    </aside>
  );
}

function GroupModal({ people, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const togglePerson = (id) => {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  };

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onCreate(name, selected);
    } catch (requestError) {
      setError(requestError.message);
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="group-modal" aria-labelledby="group-title" aria-modal="true" role="dialog">
        <header>
          <div><span className="eyebrow">MAKE IT A GROUP</span><h2 id="group-title">Bring everyone in.</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button>
        </header>
        <form onSubmit={submit}>
          <label className="modal-label">
            Group name
            <input autoFocus maxLength={60} onChange={(event) => setName(event.target.value)} placeholder="The good ones" required value={name} />
          </label>
          <div className="modal-people-heading"><span>INVITE PEOPLE</span><span>{selected.length} selected</span></div>
          <div className="modal-people">
            {people.map((person) => (
              <button
                aria-pressed={selected.includes(person.id)}
                className={`modal-person ${selected.includes(person.id) ? "chosen" : ""}`}
                key={person.id}
                onClick={() => togglePerson(person.id)}
                type="button"
              >
                <Avatar name={person.displayName} size="small" />
                <span><strong>{person.displayName}</strong><small>@{person.username}</small></span>
                <span className="selection-check">{selected.includes(person.id) && <Check size={13} />}</span>
              </button>
            ))}
            {!people.length && <p className="modal-empty">More people will show up here when they join Orbit.</p>}
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button modal-submit" disabled={busy || selected.length < 1} type="submit">
            {busy ? "Creating…" : `Create group${selected.length ? ` · ${selected.length + 1}` : ""}`}
            {!busy && <ArrowUp size={16} className="arrow-diagonal" />}
          </button>
        </form>
      </section>
    </div>
  );
}

function ChatView({
  chat,
  user,
  online,
  messages,
  onSend,
  onSendFile,
  onDownloadFile,
  onBack,
  onStartCall,
  loading,
  error,
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const endRef = useRef(null);
  const fileInputRef = useRef(null);
  const title = chatName(chat);
  const person = chat.kind === "direct" ? chat.members?.[0] : null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function submit(event) {
    event.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      if (await onSend(text.trim())) setText("");
    } finally {
      setSending(false);
    }
  }

  async function selectFile(event) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setUploadError("");
    if (!file.size) {
      setUploadError("Empty files cannot be sent.");
      return;
    }
    if (file.size > maxAttachmentBytes) {
      setUploadError("Files must be 50 MB or smaller.");
      return;
    }
    setUploadingFile(true);
    try {
      await onSendFile(file);
    } finally {
      setUploadingFile(false);
    }
  }

  return (
    <section className="conversation">
      <header className="conversation-header">
        <button className="back-button icon-button" onClick={onBack} aria-label="Back to conversations"><ArrowLeft size={20} /></button>
        {chat.kind === "group"
          ? <span className={`avatar group-avatar avatar-${colorFor(title)}`}><Users size={19} /></span>
          : <Avatar name={title} online={person && online.has(person.id)} />}
        <div className="conversation-heading">
          <h2>{title}</h2>
          <span className={person && online.has(person.id) ? "presence-online" : ""}>
            {chatSubtitle(chat, online)}
          </span>
        </div>
        <div className="conversation-actions">
          <button
            className="call-start-button"
            onClick={() => onStartCall("audio")}
            title="Start a voice call"
            aria-label="Start a voice call"
          >
            <Phone size={17} />
          </button>
          <button
            className="call-start-button call-start-video"
            onClick={() => onStartCall("video")}
            title="Start a video call"
            aria-label="Start a video call"
          >
            <Video size={18} />
          </button>
        </div>
        <button className="icon-button header-more" aria-label="Conversation options" title="Conversation options">
          <MoreHorizontal size={21} />
        </button>
      </header>
      <div className="message-scroll">
        <div className="conversation-date"><span /> TODAY <span /></div>
        <div className="message-welcome">
          <div className="welcome-sparkle">✳</div>
          <strong>This is your space.</strong>
          <span>Say hello and let the conversation find its orbit.</span>
        </div>
        {loading && <div className="message-status">Loading messages…</div>}
        {(uploadError || error) && <div className="message-error">{uploadError || error}</div>}
        {messages.map((message, index) => {
          const mine = message.sender.id === user.id;
          const previous = messages[index - 1];
          const grouped = previous && previous.sender.id === message.sender.id &&
            new Date(message.created_at) - new Date(previous.created_at) < 5 * 60 * 1000;
          return (
            <div className={`message-line ${mine ? "message-mine" : ""} ${grouped ? "message-grouped" : ""}`} key={message.id}>
              {!mine && !grouped && <Avatar name={message.sender.displayName} size="tiny" />}
              {!mine && grouped && <span className="avatar-spacer" />}
              <div className="message-content">
                {!mine && chat.kind === "group" && !grouped && <span className="message-author">{message.sender.displayName}</span>}
                <div className="message-bubble">
                  {message.attachment ? (
                    <button
                      className="message-attachment"
                      onClick={() => onDownloadFile(message)}
                      title={`Download ${message.attachment.name}`}
                      type="button"
                    >
                      <Paperclip size={17} />
                      <span>
                        <strong>{message.attachment.name}</strong>
                        <small>{formatFileSize(message.attachment.size)} · Download</small>
                      </span>
                      <Download size={15} />
                    </button>
                  ) : message.text ? <p>{message.text}</p> : null}
                  <span className="message-time">
                    {formatTime(message.created_at)}
                    {mine && <CheckCheck size={14} />}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form className="composer" onSubmit={submit}>
        <div className="composer-box">
          <input
            ref={fileInputRef}
            aria-label="Choose a file"
            className="file-input"
            onChange={selectFile}
            type="file"
          />
          <button
            className="composer-tool"
            disabled={sending || uploadingFile}
            onClick={() => fileInputRef.current?.click()}
            title="Attach a file (up to 50 MB)"
            type="button"
            aria-label="Attach a file"
          >
            <Paperclip size={18} />
          </button>
          <button className="composer-tool" type="button" aria-label="Emoji picker (coming soon)" title="Emoji picker coming soon"><Smile size={19} /></button>
          <textarea
            aria-label="Write a message"
            maxLength={4000}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form.requestSubmit();
              }
            }}
            placeholder="Write something kind…"
            rows={1}
            value={text}
          />
          {text.length > 3500 && <span className="character-count">{4000 - text.length}</span>}
          <button className="send-button" disabled={!text.trim() || sending || uploadingFile} type="submit" aria-label="Send message">
            {sending ? <Send size={17} /> : <ArrowUp size={18} />}
          </button>
        </div>
        <span className="composer-hint">
          {uploadingFile ? "Uploading file…" : <>Enter to send <i /> Shift + Enter for a new line</>}
        </span>
      </form>
    </section>
  );
}

function EmptyConversation({ onFindPeople, error }) {
  return (
    <section className="empty-conversation">
      <div className="empty-art">
        <div className="empty-ring ring-a" /><div className="empty-ring ring-b" />
        <div className="empty-chat-icon"><MessageCircle size={32} fill="currentColor" /></div>
        <span className="floating-star star-a">✳</span><span className="floating-star star-b">✦</span>
      </div>
      <span className="eyebrow">A LITTLE SPACE FOR YOUR PEOPLE</span>
      <h2>Good things start<br />with <em>hello.</em></h2>
      <p>Pick a conversation on the left, or find someone new to say hi to.</p>
      {error && <p className="empty-error" role="alert">{error}</p>}
      <button className="secondary-button" onClick={onFindPeople}><Users size={16} /> Find your people</button>
    </section>
  );
}

function MeetingsView({ meetings, people, user, linkedMeeting, error, onCreate, onJoin, onOpenMeeting }) {
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState(() => dateTimeLocalValue(new Date(Date.now() + 60 * 60 * 1000)));
  const [inviteeIds, setInviteeIds] = useState([]);
  const [meetingLinkInput, setMeetingLinkInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");
  const [copiedMeetingId, setCopiedMeetingId] = useState("");
  const availablePeople = people.filter((person) => person.id !== user.id);
  const meetingRows = [...meetings];
  if (linkedMeeting && !meetingRows.some((meeting) => meeting.id === linkedMeeting.id)) {
    meetingRows.unshift(linkedMeeting);
  }
  meetingRows.sort((left, right) => {
    const leftTime = new Date(left.starts_at).getTime();
    const rightTime = new Date(right.starts_at).getTime();
    const leftPast = left.kind === "scheduled" && leftTime < Date.now();
    const rightPast = right.kind === "scheduled" && rightTime < Date.now();
    if (leftPast !== rightPast) return leftPast ? 1 : -1;
    return leftPast ? rightTime - leftTime : leftTime - rightTime;
  });

  function toggleInvitee(userId) {
    if (inviteeIds.includes(userId)) {
      setInviteeIds((current) => current.filter((id) => id !== userId));
      setLocalError("");
      return;
    }
    if (inviteeIds.length >= 5) {
      setLocalError("A meeting can have up to 6 people, including you.");
      return;
    }
    setInviteeIds((current) => [...current, userId]);
    setLocalError("");
  }

  async function createMeeting(instant) {
    setLocalError("");
    if (!title.trim()) {
      setLocalError("Add a name for your meeting.");
      return;
    }
    if (!instant && (!startsAt || new Date(startsAt) <= new Date())) {
      setLocalError("Choose a future meeting date and time.");
      return;
    }
    setBusy(true);
    try {
      const meeting = await onCreate({
        title: title.trim(),
        startsAt: instant ? null : new Date(startsAt).toISOString(),
        inviteeIds,
        instant,
      });
      setTitle("");
      if (instant) onJoin(meeting, "video");
    } catch (createError) {
      setLocalError(createError.message);
    } finally {
      setBusy(false);
    }
  }

  async function openMeetingLink(event) {
    event.preventDefault();
    setLocalError("");
    const value = meetingLinkInput.trim();
    let meetingId = value;
    try {
      const url = new URL(value, window.location.origin);
      meetingId = url.searchParams.get("meeting") ?? value;
    } catch (linkError) {
      setLocalError(linkError.message);
      return;
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(meetingId)) {
      setLocalError("Paste a valid Orbit meeting link or meeting ID.");
      return;
    }
    try {
      await onOpenMeeting(meetingId);
      setMeetingLinkInput("");
    } catch (linkError) {
      setLocalError(linkError.message);
    }
  }

  async function copyMeetingLink(meetingId) {
    setLocalError("");
    try {
      await navigator.clipboard.writeText(meetingLink(meetingId));
      setCopiedMeetingId(meetingId);
      window.setTimeout(() => setCopiedMeetingId((current) => current === meetingId ? "" : current), 2000);
    } catch (copyError) {
      setLocalError(`Could not copy the meeting link: ${copyError.message}`);
    }
  }

  return (
    <section className="meetings-page">
      <header className="meetings-header">
        <div>
          <span className="eyebrow"><Video size={13} /> ORBIT MEETINGS</span>
          <h1>Make room for a good conversation.</h1>
          <p>Start a video meeting now, schedule one for later, or join with a link.</p>
        </div>
      </header>

      <div className="meetings-content">
        <section className="meeting-panel">
          <div className="meeting-panel-heading">
            <span className="meeting-panel-icon"><CalendarDays size={20} /></span>
            <div><h2>Plan a meeting</h2><p>Invite up to five people from Orbit.</p></div>
          </div>
          <label className="meeting-field">
            <span>MEETING NAME</span>
            <input maxLength={80} onChange={(event) => setTitle(event.target.value)} placeholder="Weekly team check-in" value={title} />
          </label>
          <label className="meeting-field">
            <span>DATE AND TIME</span>
            <input
              min={dateTimeLocalValue(new Date())}
              onChange={(event) => setStartsAt(event.target.value)}
              type="datetime-local"
              value={startsAt}
            />
          </label>
          <div className="meeting-invitees">
            <div className="meeting-invitees-heading"><span>INVITE PEOPLE</span><span>{inviteeIds.length} / 5</span></div>
            <div className="meeting-invitee-list">
              {availablePeople.map((person) => (
                <label className="meeting-invitee" key={person.id}>
                  <input
                    checked={inviteeIds.includes(person.id)}
                    disabled={!inviteeIds.includes(person.id) && inviteeIds.length >= 5}
                    onChange={() => toggleInvitee(person.id)}
                    type="checkbox"
                  />
                  <span>{person.displayName}</span>
                  <small>@{person.username}</small>
                </label>
              ))}
              {!availablePeople.length && <p className="meeting-empty-people">No other accounts are available to invite yet.</p>}
            </div>
          </div>
          {(localError || error) && <p className="meeting-error" role="alert">{localError || error}</p>}
          <div className="meeting-create-actions">
            <button className="primary-button meeting-submit" disabled={busy} onClick={() => createMeeting(false)} type="button">
              <CalendarDays size={16} /> {busy ? "Saving…" : "Schedule"}
            </button>
            <button className="secondary-button meeting-start-now" disabled={busy} onClick={() => createMeeting(true)} type="button">
              <Video size={16} /> Start now
            </button>
          </div>
        </section>

        <div className="meeting-main-column">
          <form className="meeting-join-panel" onSubmit={openMeetingLink}>
            <div><Link2 size={18} /><strong>Join with a link</strong></div>
            <input
              aria-label="Meeting link or ID"
              onChange={(event) => setMeetingLinkInput(event.target.value)}
              placeholder="Paste an Orbit meeting link or ID"
              value={meetingLinkInput}
            />
            <button className="secondary-button" disabled={!meetingLinkInput.trim()} type="submit">Find meeting</button>
          </form>

          {linkedMeeting && (
            <section className="meeting-link-preview">
              <div><span className="eyebrow">MEETING LINK OPENED</span><h2>{linkedMeeting.title}</h2></div>
              <button className="primary-button meeting-join-button" onClick={() => onJoin(linkedMeeting, "video")} type="button">
                <Video size={16} /> Join meeting
              </button>
            </section>
          )}

          <section className="meeting-list-section">
            <div className="meeting-list-heading"><div><span className="eyebrow">YOUR CALENDAR</span><h2>Meetings</h2></div><span>{meetingRows.length}</span></div>
            {meetingRows.length ? (
              <div className="meeting-cards">
                {meetingRows.map((meeting) => {
                  const startDate = new Date(meeting.starts_at);
                  const isPast = meeting.kind === "scheduled" && startDate < new Date();
                  return (
                    <article className="meeting-card" key={meeting.id}>
                      <div className="meeting-card-date"><CalendarDays size={17} /><span>{startDate.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</span></div>
                      <h3>{meeting.title}</h3>
                      <p className="meeting-card-time"><Clock3 size={14} /> {meeting.kind === "instant" ? "Instant meeting" : `${startDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · ${isPast ? "Past meeting" : "Ready to join"}`}</p>
                      <p className="meeting-card-host">{meeting.host?.id === user.id ? "You’re hosting" : `Hosted by ${meeting.host?.displayName ?? "an Orbit member"}`}</p>
                      {meeting.invitees?.length > 0 && (
                        <p className="meeting-card-invitees">With {meeting.invitees.map((invitee) => invitee.displayName).join(", ")}</p>
                      )}
                      <div className="meeting-card-actions">
                        <button className="primary-button meeting-join-button" onClick={() => onJoin(meeting, "video")} type="button">
                          <Video size={15} /> Join
                        </button>
                        <button className="meeting-copy-button" onClick={() => copyMeetingLink(meeting.id)} type="button">
                          {copiedMeetingId === meeting.id ? <Check size={15} /> : <Copy size={15} />}
                          {copiedMeetingId === meeting.id ? "Copied" : "Copy link"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="meeting-empty-state">
                <span className="empty-icon"><CalendarDays size={20} /></span>
                <strong>Your next good conversation starts here.</strong>
                <p>Schedule a meeting or start one right away, then share its private link.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}

function ChatApp({ user, onLogout, appError }) {
  const [chats, setChats] = useState([]);
  const [people, setPeople] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [linkedMeeting, setLinkedMeeting] = useState(null);
  const [meetingError, setMeetingError] = useState("");
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [online, setOnline] = useState(() => new Set());
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageError, setMessageError] = useState("");
  const [showGroup, setShowGroup] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [sidebarMode, setSidebarMode] = useState(() =>
    new URLSearchParams(window.location.search).has("meeting") ? "meetings" : "chats");
  const [socket, setSocket] = useState(null);
  const [call, setCall] = useState(null);
  const selectedChatIdRef = useRef(selectedChatId);
  const callRef = useRef(call);
  selectedChatIdRef.current = selectedChatId;
  callRef.current = call;
  const selectedChat = useMemo(() => chats.find((chat) => chat.id === selectedChatId), [chats, selectedChatId]);

  const loadChats = useCallback(async () => {
    const data = await api("/api/chats");
    setChats(data.chats);
  }, []);

  const loadPeople = useCallback(async () => {
    const data = await api("/api/users");
    setPeople(data.users);
  }, []);

  const loadMeetings = useCallback(async () => {
    const data = await api("/api/meetings");
    setMeetings(data.meetings);
  }, []);

  useEffect(() => {
    loadChats().catch((error) => setMessageError(error.message));
    loadPeople().catch((error) => setMessageError(error.message));
    loadMeetings().catch((error) => setMeetingError(error.message));
  }, [loadChats, loadMeetings, loadPeople]);

  useEffect(() => {
    const meetingId = new URLSearchParams(window.location.search).get("meeting");
    if (!meetingId) return;
    api(`/api/meetings/${encodeURIComponent(meetingId)}`)
      .then((data) => {
        setLinkedMeeting(data.meeting);
        setSidebarMode("meetings");
      })
      .catch((error) => setMeetingError(error.message));
  }, []);

  useEffect(() => {
    const socket = io(apiBaseUrl || undefined, { withCredentials: true });
    setSocket(socket);
    socket.on("message:new", (message) => {
      setMessages((current) => {
        if (message.chat_id !== selectedChatIdRef.current || current.some((item) => item.id === message.id)) return current;
        return [...current, message];
      });
      loadChats().catch((error) => setMessageError(error.message));
    });
    socket.on("presence:update", ({ userId, online: isOnline }) => {
      setOnline((current) => {
        const next = new Set(current);
        if (isOnline) next.add(userId);
        else next.delete(userId);
        return next;
      });
    });
    socket.on("presence:snapshot", (userIds) => setOnline(new Set(userIds)));
    socket.on("call:incoming", (incoming) => {
      if (callRef.current) {
        socket.emit("call:reject", { callId: incoming.callId });
        return;
      }
      setCall({
        ...incoming,
        caller: incoming.caller,
        participants: [incoming.caller],
        status: "incoming",
      });
    });
    socket.on("chat:added", ({ chatId }) => {
      socket.emit("chat:join", { chatId });
      loadChats().catch((error) => setMessageError(error.message));
    });
    socket.on("connect_error", () => setMessageError("Live updates are reconnecting."));
    socket.on("chat:error", ({ error }) => setMessageError(error));
    return () => {
      socket.disconnect();
      setSocket(null);
    };
  }, [loadChats]);

  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }
    let active = true;
    setMessages([]);
    setMessageLoading(true);
    setMessageError("");
    api(`/api/chats/${selectedChatId}/messages`)
      .then((data) => { if (active) setMessages(data.messages); })
      .catch((error) => { if (active) setMessageError(error.message); })
      .finally(() => { if (active) setMessageLoading(false); });
    return () => { active = false; };
  }, [selectedChatId]);

  async function startDirect(person) {
    try {
      const data = await api("/api/chats/direct", {
        method: "POST",
        body: JSON.stringify({ userId: person.id }),
      });
      await loadChats();
      setSelectedChatId(data.chatId);
    } catch (error) {
      setMessageError(error.message);
    }
  }

  async function createGroup(name, memberIds) {
    const data = await api("/api/chats/group", {
      method: "POST",
      body: JSON.stringify({ name, memberIds }),
    });
    await loadChats();
    setShowGroup(false);
    setSelectedChatId(data.chatId);
  }

  async function createMeeting(details) {
    setMeetingError("");
    const data = await api("/api/meetings", {
      method: "POST",
      body: JSON.stringify(details),
    });
    setMeetings((current) => [data.meeting, ...current.filter((meeting) => meeting.id !== data.meeting.id)]);
    return data.meeting;
  }

  async function openMeeting(meetingId) {
    setMeetingError("");
    const data = await api(`/api/meetings/${encodeURIComponent(meetingId)}`);
    setLinkedMeeting(data.meeting);
    setSidebarMode("meetings");
    return data.meeting;
  }

  function joinMeeting(meeting, mode) {
    if (!socket?.connected) {
      setMeetingError("Connecting to the meeting service. Please try again in a moment.");
      return;
    }
    setMeetingError("");
    setCall({
      requestId: crypto.randomUUID(),
      meetingId: meeting.id,
      meetingTitle: meeting.title,
      mode,
      status: "outgoing",
      participants: [],
    });
  }

  async function sendMessage(text) {
    setMessageError("");
    try {
      const data = await api(`/api/chats/${selectedChatId}/messages`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      setMessages((current) => current.some((message) => message.id === data.message.id)
        ? current
        : [...current, data.message]);
      loadChats().catch((error) => setMessageError(error.message));
      return true;
    } catch (error) {
      setMessageError(error.message);
      return false;
    }
  }

  async function sendFile(file) {
    setMessageError("");
    try {
      const data = await api(`/api/chats/${selectedChatId}/attachments`, {
        method: "POST",
        body: file,
        headers: {
          "Content-Type": "application/octet-stream",
          "X-File-Name": encodeURIComponent(file.name),
        },
      });
      setMessages((current) => current.some((message) => message.id === data.message.id)
        ? current
        : [...current, data.message]);
      loadChats().catch((error) => setMessageError(error.message));
      return true;
    } catch (error) {
      setMessageError(error.message);
      return false;
    }
  }

  async function downloadFile(message) {
    setMessageError("");
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/chats/${message.chat_id}/messages/${message.id}/file`,
        { credentials: "include" },
      );
      if (!response.ok) {
        const contentType = response.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          const data = await response.json();
          throw new Error(data.error ?? "Could not download the file.");
        }
        throw new Error("Could not download the file.");
      }
      const objectUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = message.attachment.name;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      setMessageError(error.message);
    }
  }

  function startCall(mode) {
    if (!socket?.connected) {
      setMessageError("Connecting to the call service. Please try again in a moment.");
      return;
    }
    if (chatMemberCount(selectedChat) > 6) {
      setMessageError("Calls currently support up to 6 people.");
      return;
    }
    setMessageError("");
    setCall({
      requestId: crypto.randomUUID(),
      chatId: selectedChat.id,
      chatTitle: chatName(selectedChat),
      mode,
      status: "outgoing",
      participants: [],
    });
  }

  return (
    <main className="app-shell">
      <Sidebar
        chats={chats}
        onManageUsers={() => setShowAdmin(true)}
        onLogout={onLogout}
        onNewGroup={() => setShowGroup(true)}
        onSelectChat={setSelectedChatId}
        onStartDirect={startDirect}
        online={online}
        people={people}
        selectedChatId={selectedChatId}
        user={user}
        mode={sidebarMode}
        onModeChange={(mode) => {
          setSidebarMode(mode);
          if (mode === "meetings") setSelectedChatId(null);
        }}
      />
      {sidebarMode === "meetings" ? (
        <MeetingsView
          error={meetingError}
          linkedMeeting={linkedMeeting}
          meetings={meetings}
          onCreate={createMeeting}
          onJoin={joinMeeting}
          onOpenMeeting={openMeeting}
          people={people}
          user={user}
        />
      ) : selectedChat ? (
        <ChatView
          chat={selectedChat}
          error={messageError}
          key={selectedChatId}
          loading={messageLoading}
          messages={messages}
          onBack={() => setSelectedChatId(null)}
          onDownloadFile={downloadFile}
          onSendFile={sendFile}
          onStartCall={startCall}
          onSend={sendMessage}
          online={online}
          uploading={uploadingFile}
          user={user}
        />
      ) : (
        <EmptyConversation error={messageError} onFindPeople={() => setSidebarMode("people")} />
      )}
      {showGroup && <GroupModal people={people} onClose={() => setShowGroup(false)} onCreate={createGroup} />}
      {showAdmin && user.role === "admin" && (
        <AdminPanel
          currentUserId={user.id}
          onClose={() => setShowAdmin(false)}
          onUsersChanged={() => loadPeople().catch((error) => setMessageError(error.message))}
        />
      )}
      {call && (
        <CallOverlay
          call={call}
          onChange={setCall}
          onClose={() => setCall(null)}
          socket={socket}
          user={user}
        />
      )}
      {appError && <div className="app-toast" role="alert">{appError}</div>}
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [appError, setAppError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    api("/api/me")
      .then((data) => {
        setUser(data.user);
        setSessionError("");
      })
      .catch((error) => {
        if (error.status === 401) {
          setUser(null);
          setSessionError("");
        } else {
          setSessionError(error.message);
        }
      })
      .finally(() => setCheckingSession(false));
  }, [attempt]);

  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
      setAppError("");
      setUser(null);
    } catch (error) {
      setAppError(`Could not sign out: ${error.message}`);
    }
  }

  if (checkingSession) {
    return <main className="loading-screen"><span className="brand-mark"><MessageCircle size={21} fill="currentColor" /></span></main>;
  }
  if (sessionError) {
    return (
      <main className="session-error">
        <span className="brand-mark"><MessageCircle size={21} fill="currentColor" /></span>
        <h1>Orbit is having trouble connecting.</h1>
        <p>{sessionError}</p>
        <button className="primary-button" onClick={() => { setCheckingSession(true); setAttempt((value) => value + 1); }}>
          Try again
        </button>
      </main>
    );
  }
  return user
    ? <ChatApp appError={appError} key={user.id} user={user} onLogout={logout} />
    : <AuthScreen onAuthenticated={setUser} />;
}
